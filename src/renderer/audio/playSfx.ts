/**
 * playSfx — short one-shot UI sound effects via Web Audio API synthesis.
 *
 * Each sound is generated entirely from oscillators and noise nodes.
 * No external audio files are loaded or fetched.
 *
 * Available effects:
 *  - coin_clink:  short metallic ping (high-freq triangle oscillator, fast exponential decay)
 *  - parchment:   noise burst with bandpass filter (papery rustling, ~100ms)
 *  - quill:       very short high-frequency noise burst (scratchy, ~50ms)
 *
 * Usage:
 *   playSfx('coin_clink');   // after buy/sell
 *   playSfx('parchment');    // on panel open
 *   playSfx('quill');        // on journal entry
 *
 * Design constraints:
 *  - All failures are non-fatal (never throws)
 *  - AudioContext created lazily on first call
 *  - Safe to call before user gesture — will silently fail if context is suspended
 */

export type SfxName = 'coin_clink' | 'parchment' | 'quill';

// ── Shared AudioContext ──────────────────────────────────────────────────────

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

// ── Sound generators ─────────────────────────────────────────────────────────

function playCoinClink(ac: AudioContext): void {
  const now = ac.currentTime;

  // Primary metallic ping — triangle wave at ~2400 Hz
  const osc = ac.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(2400, now);
  osc.frequency.exponentialRampToValueAtTime(1800, now + 0.08);

  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

  // Secondary harmonic — adds metallic shimmer
  const osc2 = ac.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(4800, now);
  osc2.frequency.exponentialRampToValueAtTime(3600, now + 0.06);

  const gain2 = ac.createGain();
  gain2.gain.setValueAtTime(0.06, now);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

  osc.connect(gain);
  gain.connect(ac.destination);
  osc2.connect(gain2);
  gain2.connect(ac.destination);

  osc.start(now);
  osc.stop(now + 0.16);
  osc2.start(now);
  osc2.stop(now + 0.11);
}

function playParchment(ac: AudioContext): void {
  const now = ac.currentTime;

  // Short noise burst through bandpass — papery rustle
  const bufLen = ac.sampleRate * 0.15;
  const buf = ac.createBuffer(1, bufLen, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const src = ac.createBufferSource();
  src.buffer = buf;

  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(3000, now);
  bp.frequency.linearRampToValueAtTime(1500, now + 0.1);
  bp.Q.value = 1.5;

  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

  src.connect(bp);
  bp.connect(gain);
  gain.connect(ac.destination);
  src.start(now);
}

function playQuill(ac: AudioContext): void {
  const now = ac.currentTime;

  // Very short high-frequency noise burst — scratchy pen sound
  const bufLen = ac.sampleRate * 0.06;
  const buf = ac.createBuffer(1, bufLen, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const src = ac.createBufferSource();
  src.buffer = buf;

  const hp = ac.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 4000;
  hp.Q.value = 2;

  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.07, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

  src.connect(hp);
  hp.connect(gain);
  gain.connect(ac.destination);
  src.start(now);
}

// ── Public API ───────────────────────────────────────────────────────────────

const GENERATORS: Record<SfxName, (ac: AudioContext) => void> = {
  coin_clink: playCoinClink,
  parchment: playParchment,
  quill: playQuill,
};

/**
 * Play a short one-shot sound effect.
 * Non-fatal: silently returns if AudioContext unavailable or suspended.
 */
export function playSfx(name: SfxName): void {
  try {
    const ac = getCtx();
    if (!ac || ac.state === 'suspended') return;
    const gen = GENERATORS[name];
    if (gen) gen(ac);
  } catch {
    // Non-fatal: SFX failure must never crash the app
  }
}
