/**
 * useSailingAudio — synthesized sailing soundscape active during voyages.
 *
 * Generates three ambient layers via Web Audio API:
 *  1. Creaking wood  — low-frequency filtered noise, periodic groans
 *  2. Waves          — brown noise with LFO, volume varies with weather
 *  3. Wind           — white noise bandpass filtered, intensity matches stormWeight
 *
 * Active only during sailing state. Fades in on SET_SAIL (1s), fades out on ARRIVE (1s).
 * All synthesis uses oscillators/noise — no external audio files.
 */

import { useEffect, useRef } from 'react';

// ── Shared AudioContext ──────────────────────────────────────────────────────

let sharedCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!sharedCtx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    sharedCtx = new Ctor();
  }
  return sharedCtx;
}

// ── Noise helpers ────────────────────────────────────────────────────────────

function createNoiseBuffer(ctx: AudioContext, seconds: number, type: 'white' | 'brown'): AudioBuffer {
  const length = ctx.sampleRate * seconds;
  const buf = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buf.getChannelData(0);
  if (type === 'brown') {
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
  } else {
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }
  return buf;
}

// ── Sailing layers ───────────────────────────────────────────────────────────

interface SailingLayers {
  master: GainNode;
  waveGain: GainNode;
  windGain: GainNode;
  windFilter: BiquadFilterNode;
  teardown: () => void;
}

function buildSailingLayers(ctx: AudioContext): SailingLayers {
  const master = ctx.createGain();
  master.gain.setValueAtTime(0, ctx.currentTime);
  master.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 1);
  master.connect(ctx.destination);

  const teardowns: (() => void)[] = [];

  // ── Layer 1: Creaking wood — low-frequency filtered noise, periodic ─────
  const creakBuf = createNoiseBuffer(ctx, 1, 'brown');
  const creakSrc = ctx.createBufferSource();
  creakSrc.buffer = creakBuf;
  creakSrc.loop = true;

  const creakBp = ctx.createBiquadFilter();
  creakBp.type = 'bandpass';
  creakBp.frequency.value = 100;
  creakBp.Q.value = 5;

  const creakGain = ctx.createGain();
  creakGain.gain.value = 0;

  creakSrc.connect(creakBp);
  creakBp.connect(creakGain);
  creakGain.connect(master);
  creakSrc.start(0);

  // Schedule periodic creaks
  let creakActive = true;
  function scheduleCreak() {
    if (!creakActive || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const delay = 2 + Math.random() * 5;
    const t = now + delay;
    const duration = 0.3 + Math.random() * 0.4;
    creakGain.gain.setValueAtTime(0, t);
    creakGain.gain.linearRampToValueAtTime(0.06 + Math.random() * 0.04, t + 0.08);
    creakGain.gain.linearRampToValueAtTime(0.03, t + duration * 0.6);
    creakGain.gain.linearRampToValueAtTime(0, t + duration);
    setTimeout(scheduleCreak, (delay + duration + 0.1) * 1000);
  }
  scheduleCreak();
  teardowns.push(() => {
    creakActive = false;
    try { creakSrc.stop(); } catch { /* */ }
  });

  // ── Layer 2: Waves — brown noise with LFO ──────────────────────────────
  const waveBuf = createNoiseBuffer(ctx, 2, 'brown');
  const waveSrc = ctx.createBufferSource();
  waveSrc.buffer = waveBuf;
  waveSrc.loop = true;

  const waveLp = ctx.createBiquadFilter();
  waveLp.type = 'lowpass';
  waveLp.frequency.value = 400;
  waveLp.Q.value = 1.0;

  const waveGain = ctx.createGain();
  waveGain.gain.value = 0.10; // default; will be adjusted by stormWeight

  const waveLfo = ctx.createOscillator();
  waveLfo.type = 'sine';
  waveLfo.frequency.value = 0.18;
  const waveLfoGain = ctx.createGain();
  waveLfoGain.gain.value = 0.06;

  waveSrc.connect(waveLp);
  waveLp.connect(waveGain);
  waveGain.connect(master);
  waveLfo.connect(waveLfoGain);
  waveLfoGain.connect(waveGain.gain);

  waveSrc.start(0);
  waveLfo.start(0);
  teardowns.push(() => {
    try { waveSrc.stop(); } catch { /* */ }
    try { waveLfo.stop(); } catch { /* */ }
  });

  // ── Layer 3: Wind — white noise bandpass filtered ──────────────────────
  const windBuf = createNoiseBuffer(ctx, 2, 'white');
  const windSrc = ctx.createBufferSource();
  windSrc.buffer = windBuf;
  windSrc.loop = true;

  const windFilter = ctx.createBiquadFilter();
  windFilter.type = 'bandpass';
  windFilter.frequency.value = 800;
  windFilter.Q.value = 0.5;

  const windGain = ctx.createGain();
  windGain.gain.value = 0.03; // default; will be adjusted by stormWeight

  windSrc.connect(windFilter);
  windFilter.connect(windGain);
  windGain.connect(master);
  windSrc.start(0);
  teardowns.push(() => { try { windSrc.stop(); } catch { /* */ } });

  return {
    master,
    waveGain,
    windGain,
    windFilter,
    teardown: () => teardowns.forEach((t) => t()),
  };
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Plays sailing ambient audio during voyages.
 * Adjusts wind/wave intensity based on stormWeight (0-100).
 *
 * @param isSailing   Whether the game is currently in sailing state
 * @param stormWeight Weather storm weight (0-100) — higher = more intense wind/waves
 * @param enabled     Master enable flag (user has interacted with page)
 */
export function useSailingAudio(
  isSailing: boolean,
  stormWeight: number,
  enabled: boolean
): void {
  const layersRef = useRef<SailingLayers | null>(null);

  // Start/stop based on sailing state
  useEffect(() => {
    if (!enabled) return;

    if (isSailing) {
      // Already playing
      if (layersRef.current) return;

      const ctx = getCtx();
      if (!ctx) return;

      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => { /* non-fatal */ });
      }

      try {
        layersRef.current = buildSailingLayers(ctx);
      } catch (err) {
        console.warn('[useSailingAudio] Failed to build layers (non-fatal):', err);
      }
    } else {
      // Fade out and tear down
      if (layersRef.current) {
        const layers = layersRef.current;
        layersRef.current = null;
        const ctx = getCtx();
        if (ctx) {
          const now = ctx.currentTime;
          layers.master.gain.cancelScheduledValues(now);
          layers.master.gain.setValueAtTime(layers.master.gain.value, now);
          layers.master.gain.linearRampToValueAtTime(0, now + 1);
        }
        setTimeout(() => {
          layers.teardown();
          try { layers.master.disconnect(); } catch { /* */ }
        }, 1100);
      }
    }

    return () => {
      if (layersRef.current) {
        layersRef.current.teardown();
        try { layersRef.current.master.disconnect(); } catch { /* */ }
        layersRef.current = null;
      }
    };
  }, [isSailing, enabled]);

  // Adjust wind/wave intensity when stormWeight changes
  useEffect(() => {
    if (!layersRef.current) return;
    const ctx = getCtx();
    if (!ctx) return;

    const now = ctx.currentTime;
    const normalizedStorm = Math.max(0, Math.min(stormWeight, 100)) / 100;

    // Wave volume: 0.06 (calm) to 0.18 (storm)
    const waveVol = 0.06 + normalizedStorm * 0.12;
    layersRef.current.waveGain.gain.cancelScheduledValues(now);
    layersRef.current.waveGain.gain.setValueAtTime(layersRef.current.waveGain.gain.value, now);
    layersRef.current.waveGain.gain.linearRampToValueAtTime(waveVol, now + 0.5);

    // Wind volume: 0.02 (calm) to 0.14 (storm)
    const windVol = 0.02 + normalizedStorm * 0.12;
    layersRef.current.windGain.gain.cancelScheduledValues(now);
    layersRef.current.windGain.gain.setValueAtTime(layersRef.current.windGain.gain.value, now);
    layersRef.current.windGain.gain.linearRampToValueAtTime(windVol, now + 0.5);

    // Wind filter center: shifts lower in storms for deeper howl
    const windFreq = 900 - normalizedStorm * 500;
    layersRef.current.windFilter.frequency.cancelScheduledValues(now);
    layersRef.current.windFilter.frequency.setValueAtTime(layersRef.current.windFilter.frequency.value, now);
    layersRef.current.windFilter.frequency.linearRampToValueAtTime(windFreq, now + 0.5);
  }, [stormWeight]);
}
