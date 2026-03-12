/**
 * useGeneratedAmbient — synthesized Mediterranean port ambient soundscape.
 *
 * Generates a looping ambient soundscape entirely via Web Audio API oscillators
 * and noise nodes. No external file fetches or network dependencies.
 *
 * Soundscape layers:
 *  1. Ocean waves  — filtered white noise with LFO wave-rhythm modulation
 *  2. Wind drone   — two detuned sine oscillators (55 Hz + 58 Hz beating)
 *  3. Seagull calls — periodic short chirps scheduled recursively
 *  4. Master gain  — routes all layers with 3-second fade-in
 *
 * Design constraints:
 *  - All synthesis happens inside start(); no audio until user gesture
 *  - Audio failure never throws to caller — all errors caught internally
 *  - Tab visibility changes suspend/resume the AudioContext automatically
 */

// ── Types ─────────────────────────────────────────────────────────────────────

type AudioContextClass = typeof AudioContext;

function getAudioContextClass(): AudioContextClass | null {
  if (typeof window === 'undefined') return null;
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: AudioContextClass }).webkitAudioContext ||
    null
  );
}

// ── Seagull chirp scheduler ────────────────────────────────────────────────────

function scheduleNextChirp(
  ctx: AudioContext,
  master: GainNode,
  chirpGain: GainNode
): void {
  // Random interval 8–15 seconds between calls
  const delayMs = 8000 + Math.random() * 7000;
  setTimeout(() => {
    if (ctx.state !== 'running') return;
    try {
      const now = ctx.currentTime;
      // Brief attack then quick decay — seagull-like shape
      chirpGain.gain.cancelScheduledValues(now);
      chirpGain.gain.setValueAtTime(0, now);
      chirpGain.gain.linearRampToValueAtTime(0.07, now + 0.05);
      chirpGain.gain.linearRampToValueAtTime(0.04, now + 0.2);
      chirpGain.gain.linearRampToValueAtTime(0, now + 0.6);
      // Schedule the next chirp
      scheduleNextChirp(ctx, master, chirpGain);
    } catch {
      // Non-fatal: chirp scheduling can fail silently
    }
  }, delayMs);
}

// ── GeneratedAmbientManager singleton ─────────────────────────────────────────

const GeneratedAmbientManager = {
  context: null as AudioContext | null,
  playing: false,

  /**
   * Synthesize and start the ambient soundscape.
   * Must be called from a user gesture handler (click/keypress).
   * Idempotent — safe to call multiple times; subsequent calls are no-ops.
   */
  async start(): Promise<void> {
    if (this.playing) return;
    try {
      const AudioContextClass = getAudioContextClass();
      if (!AudioContextClass) {
        console.warn('[GeneratedAmbient] Web Audio API not available in this environment');
        return;
      }

      if (!this.context) {
        this.context = new AudioContextClass();
      }

      if (this.context.state === 'suspended') {
        await this.context.resume();
      }

      const ctx = this.context;
      const sampleRate = ctx.sampleRate;

      // ── Master gain — all layers route through here ──────────────────────
      const master = ctx.createGain();
      master.gain.setValueAtTime(0, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 3);
      master.connect(ctx.destination);

      // ── Layer 1: Ocean waves — filtered white noise with LFO ────────────
      // White noise buffer (2 seconds, looping)
      const bufferLength = sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferLength, sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferLength; i++) {
        noiseData[i] = Math.random() * 2 - 1;
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      // Low-pass filter to shape noise into wave-like rumble
      const waveFilter = ctx.createBiquadFilter();
      waveFilter.type = 'lowpass';
      waveFilter.frequency.value = 600;
      waveFilter.Q.value = 1.2;

      // Primary wave gain
      const waveGain = ctx.createGain();
      waveGain.gain.value = 0.15;

      // LFO modulation gain — creates wave-rhythm swell
      const lfoModGain = ctx.createGain();
      lfoModGain.gain.value = 0.08;

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.15; // ~9 cycles per minute — gentle wave rhythm

      // Chain: noiseSource → waveFilter → waveGain → master
      noiseSource.connect(waveFilter);
      waveFilter.connect(waveGain);
      waveGain.connect(master);

      // LFO modulates waveGain.gain to create swell effect
      lfo.connect(lfoModGain);
      lfoModGain.connect(waveGain.gain);

      noiseSource.start(0);
      lfo.start(0);

      // ── Layer 2: Wind drone — detuned sine oscillators ───────────────────
      const windFreqs = [55, 58]; // slight frequency beating creates shimmer
      for (const freq of windFreqs) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;

        const oscGain = ctx.createGain();
        oscGain.gain.value = 0.04;

        const bandpass = ctx.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.value = 55;
        bandpass.Q.value = 0.5;

        osc.connect(oscGain);
        oscGain.connect(bandpass);
        bandpass.connect(master);
        osc.start(0);
      }

      // ── Layer 3: Seagull calls — periodic short chirps ───────────────────
      const seagullOsc = ctx.createOscillator();
      seagullOsc.type = 'sine';
      seagullOsc.frequency.value = 1200;

      const seagullGain = ctx.createGain();
      seagullGain.gain.value = 0;

      seagullOsc.connect(seagullGain);
      seagullGain.connect(master);
      seagullOsc.start(0);

      // Begin the recursive chirp scheduling after an initial 5–10 second delay
      const initialDelay = 5000 + Math.random() * 5000;
      setTimeout(() => {
        if (ctx.state === 'running') {
          scheduleNextChirp(ctx, master, seagullGain);
        }
      }, initialDelay);

      this.playing = true;
    } catch (err) {
      // Non-fatal: audio synthesis failure must never crash the app
      console.warn('[GeneratedAmbient] start() failed (non-fatal):', err);
    }
  },

  /**
   * Suspend the AudioContext (e.g., tab hidden).
   * No-op if not playing.
   */
  suspend(): void {
    if (this.context && this.context.state === 'running') {
      this.context.suspend().catch(() => {
        // Non-fatal: suspend failure is acceptable
      });
    }
  },
};

// ── visibilitychange handler — registered once at module load ─────────────────
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!GeneratedAmbientManager.context) return;
    if (document.hidden) {
      GeneratedAmbientManager.suspend();
    } else if (GeneratedAmbientManager.context.state === 'suspended') {
      GeneratedAmbientManager.context.resume().catch(() => {
        // Non-fatal: resume failure is acceptable
      });
    }
  });
}

/**
 * Returns the module-level GeneratedAmbientManager singleton.
 * Components call ambient.start() on first user interaction.
 */
export function useGeneratedAmbient(): typeof GeneratedAmbientManager {
  return GeneratedAmbientManager;
}
