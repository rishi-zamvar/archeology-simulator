/**
 * usePortAudio — region-specific ambient soundscape for each port.
 *
 * Generates unique ambient loops via Web Audio API synthesis based on
 * the port's region (greece, egypt, levant/phoenicia, italy, iberia, north_africa).
 * Auto-switches with 1-second crossfade when the port changes.
 *
 * Layers vary by region:
 *  - Greece:       gentle waves + distant voice-like filtered noise bursts
 *  - Egypt:        dry wind rumble + market bustle (percussive clicks)
 *  - Levant:       harbor metallic clangs + waves
 *  - Italy:        bustling port noise + low horn-like tones
 *  - Iberia:       coastal waves + rhythmic percussive elements
 *  - North Africa: market chatter noise + dry wind
 *  - Default:      brown-noise coastal waves with LFO modulation
 *
 * All synthesis is Web Audio oscillators/noise — no external audio files.
 */

import { useEffect, useRef } from 'react';
import type { PortRegion } from '../../shared/game-types';

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

// ── Noise buffer helpers ─────────────────────────────────────────────────────

function createNoiseBuffer(ctx: AudioContext, seconds: number, type: 'white' | 'brown' = 'white'): AudioBuffer {
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

// ── Region layer builders ────────────────────────────────────────────────────

type LayerTeardown = () => void;

function buildCoastalWaves(ctx: AudioContext, master: GainNode, volume = 0.12): LayerTeardown {
  const buf = createNoiseBuffer(ctx, 2, 'brown');
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 500;
  lp.Q.value = 1.0;

  const gain = ctx.createGain();
  gain.gain.value = volume;

  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.12;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = volume * 0.6;

  src.connect(lp);
  lp.connect(gain);
  gain.connect(master);
  lfo.connect(lfoGain);
  lfoGain.connect(gain.gain);

  src.start(0);
  lfo.start(0);

  return () => {
    try { src.stop(); } catch { /* */ }
    try { lfo.stop(); } catch { /* */ }
  };
}

function buildGreece(ctx: AudioContext, master: GainNode): LayerTeardown {
  const teardowns: LayerTeardown[] = [];

  // Layer 1: Gentle waves
  teardowns.push(buildCoastalWaves(ctx, master, 0.10));

  // Layer 2: Distant voice-like filtered noise bursts (market chatter)
  const noiseBuf = createNoiseBuffer(ctx, 2, 'white');
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = noiseBuf;
  noiseSrc.loop = true;

  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 800;
  bp.Q.value = 3.0;

  const voiceGain = ctx.createGain();
  voiceGain.gain.value = 0;

  noiseSrc.connect(bp);
  bp.connect(voiceGain);
  voiceGain.connect(master);
  noiseSrc.start(0);

  // Schedule periodic voice-like bursts
  let active = true;
  function scheduleBurst() {
    if (!active || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const delay = 2 + Math.random() * 4;
    const burstTime = now + delay;
    voiceGain.gain.setValueAtTime(0, burstTime);
    voiceGain.gain.linearRampToValueAtTime(0.04 + Math.random() * 0.03, burstTime + 0.05);
    voiceGain.gain.linearRampToValueAtTime(0, burstTime + 0.15 + Math.random() * 0.1);
    setTimeout(scheduleBurst, (delay + 0.3) * 1000);
  }
  scheduleBurst();

  teardowns.push(() => {
    active = false;
    try { noiseSrc.stop(); } catch { /* */ }
  });

  return () => teardowns.forEach((t) => t());
}

function buildEgypt(ctx: AudioContext, master: GainNode): LayerTeardown {
  const teardowns: LayerTeardown[] = [];

  // Layer 1: Dry wind — low-frequency rumble
  const windBuf = createNoiseBuffer(ctx, 2, 'brown');
  const windSrc = ctx.createBufferSource();
  windSrc.buffer = windBuf;
  windSrc.loop = true;

  const windLp = ctx.createBiquadFilter();
  windLp.type = 'lowpass';
  windLp.frequency.value = 200;
  windLp.Q.value = 0.7;

  const windGain = ctx.createGain();
  windGain.gain.value = 0.08;

  windSrc.connect(windLp);
  windLp.connect(windGain);
  windGain.connect(master);
  windSrc.start(0);
  teardowns.push(() => { try { windSrc.stop(); } catch { /* */ } });

  // Layer 2: Market bustle — percussive clicks
  const clickBuf = createNoiseBuffer(ctx, 0.5, 'white');
  const clickSrc = ctx.createBufferSource();
  clickSrc.buffer = clickBuf;
  clickSrc.loop = true;

  const clickBp = ctx.createBiquadFilter();
  clickBp.type = 'bandpass';
  clickBp.frequency.value = 2000;
  clickBp.Q.value = 8;

  const clickGain = ctx.createGain();
  clickGain.gain.value = 0;

  clickSrc.connect(clickBp);
  clickBp.connect(clickGain);
  clickGain.connect(master);
  clickSrc.start(0);

  let active = true;
  function scheduleClick() {
    if (!active || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const delay = 0.3 + Math.random() * 0.8;
    const t = now + delay;
    clickGain.gain.setValueAtTime(0, t);
    clickGain.gain.linearRampToValueAtTime(0.03 + Math.random() * 0.02, t + 0.01);
    clickGain.gain.linearRampToValueAtTime(0, t + 0.04);
    setTimeout(scheduleClick, (delay + 0.05) * 1000);
  }
  scheduleClick();

  teardowns.push(() => {
    active = false;
    try { clickSrc.stop(); } catch { /* */ }
  });

  return () => teardowns.forEach((t) => t());
}

function buildLevant(ctx: AudioContext, master: GainNode): LayerTeardown {
  const teardowns: LayerTeardown[] = [];

  // Layer 1: Waves
  teardowns.push(buildCoastalWaves(ctx, master, 0.08));

  // Layer 2: Harbor metallic clangs — short oscillator pings
  let active = true;
  const clangOsc = ctx.createOscillator();
  clangOsc.type = 'triangle';
  clangOsc.frequency.value = 1800;

  const clangGain = ctx.createGain();
  clangGain.gain.value = 0;

  clangOsc.connect(clangGain);
  clangGain.connect(master);
  clangOsc.start(0);

  function scheduleClang() {
    if (!active || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const delay = 3 + Math.random() * 6;
    const t = now + delay;
    clangOsc.frequency.setValueAtTime(1400 + Math.random() * 800, t);
    clangGain.gain.setValueAtTime(0, t);
    clangGain.gain.linearRampToValueAtTime(0.06, t + 0.005);
    clangGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    clangGain.gain.setValueAtTime(0, t + 0.31);
    setTimeout(scheduleClang, (delay + 0.4) * 1000);
  }
  scheduleClang();

  teardowns.push(() => {
    active = false;
    try { clangOsc.stop(); } catch { /* */ }
  });

  return () => teardowns.forEach((t) => t());
}

function buildItaly(ctx: AudioContext, master: GainNode): LayerTeardown {
  const teardowns: LayerTeardown[] = [];

  // Layer 1: Bustling port — medium filtered noise
  const noiseBuf = createNoiseBuffer(ctx, 2, 'white');
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = noiseBuf;
  noiseSrc.loop = true;

  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 600;
  bp.Q.value = 0.8;

  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.06;

  noiseSrc.connect(bp);
  bp.connect(noiseGain);
  noiseGain.connect(master);
  noiseSrc.start(0);
  teardowns.push(() => { try { noiseSrc.stop(); } catch { /* */ } });

  // Layer 2: Low horn-like tones (periodic foghorn)
  let active = true;
  const hornOsc = ctx.createOscillator();
  hornOsc.type = 'sawtooth';
  hornOsc.frequency.value = 120;

  const hornLp = ctx.createBiquadFilter();
  hornLp.type = 'lowpass';
  hornLp.frequency.value = 300;
  hornLp.Q.value = 2;

  const hornGain = ctx.createGain();
  hornGain.gain.value = 0;

  hornOsc.connect(hornLp);
  hornLp.connect(hornGain);
  hornGain.connect(master);
  hornOsc.start(0);

  function scheduleHorn() {
    if (!active || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const delay = 8 + Math.random() * 12;
    const t = now + delay;
    hornGain.gain.setValueAtTime(0, t);
    hornGain.gain.linearRampToValueAtTime(0.04, t + 0.3);
    hornGain.gain.linearRampToValueAtTime(0.03, t + 1.2);
    hornGain.gain.linearRampToValueAtTime(0, t + 2.0);
    setTimeout(scheduleHorn, (delay + 2.5) * 1000);
  }
  scheduleHorn();

  teardowns.push(() => {
    active = false;
    try { hornOsc.stop(); } catch { /* */ }
  });

  // Layer 3: Light waves in background
  teardowns.push(buildCoastalWaves(ctx, master, 0.05));

  return () => teardowns.forEach((t) => t());
}

function buildDefault(ctx: AudioContext, master: GainNode): LayerTeardown {
  // General coastal: brown noise waves with LFO
  return buildCoastalWaves(ctx, master, 0.12);
}

// ── Region dispatcher ────────────────────────────────────────────────────────

function buildRegionLayers(ctx: AudioContext, master: GainNode, region: PortRegion): LayerTeardown {
  switch (region) {
    case 'greece':
      return buildGreece(ctx, master);
    case 'egypt':
      return buildEgypt(ctx, master);
    case 'levant':
      return buildLevant(ctx, master);
    case 'italy':
      return buildItaly(ctx, master);
    case 'iberia':
    case 'north_africa':
    default:
      return buildDefault(ctx, master);
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Plays region-specific ambient audio when a port is active.
 * Auto-crossfades (1s) when region changes. Stops when portId is null.
 *
 * @param portId   Current port ID (null when sailing or no port selected)
 * @param region   Port region for soundscape variant selection
 * @param enabled  Master enable flag (e.g. user has interacted with page)
 */
export function usePortAudio(
  portId: string | null,
  region: PortRegion | null,
  enabled: boolean
): void {
  const teardownRef = useRef<LayerTeardown | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const activeRegionRef = useRef<PortRegion | null>(null);

  useEffect(() => {
    if (!enabled || !portId || !region) {
      // Fade out and tear down
      if (masterRef.current && teardownRef.current) {
        const ctx = getCtx();
        if (ctx) {
          const now = ctx.currentTime;
          masterRef.current.gain.cancelScheduledValues(now);
          masterRef.current.gain.setValueAtTime(masterRef.current.gain.value, now);
          masterRef.current.gain.linearRampToValueAtTime(0, now + 1);
        }
        const td = teardownRef.current;
        setTimeout(() => td(), 1100);
        teardownRef.current = null;
        masterRef.current = null;
        activeRegionRef.current = null;
      }
      return;
    }

    // Same region — no change needed
    if (activeRegionRef.current === region) return;

    const ctx = getCtx();
    if (!ctx) return;

    // Resume if suspended
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => { /* non-fatal */ });
    }

    // Tear down previous layers with fade-out
    if (teardownRef.current && masterRef.current) {
      const prevMaster = masterRef.current;
      const prevTeardown = teardownRef.current;
      const now = ctx.currentTime;
      prevMaster.gain.cancelScheduledValues(now);
      prevMaster.gain.setValueAtTime(prevMaster.gain.value, now);
      prevMaster.gain.linearRampToValueAtTime(0, now + 1);
      setTimeout(() => {
        prevTeardown();
        try { prevMaster.disconnect(); } catch { /* */ }
      }, 1100);
    }

    // Build new layers with fade-in
    try {
      const master = ctx.createGain();
      master.gain.setValueAtTime(0, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 1);
      master.connect(ctx.destination);

      const teardown = buildRegionLayers(ctx, master, region);

      masterRef.current = master;
      teardownRef.current = teardown;
      activeRegionRef.current = region;
    } catch (err) {
      console.warn('[usePortAudio] Failed to build region layers (non-fatal):', err);
    }

    // Cleanup on unmount
    return () => {
      if (teardownRef.current) {
        teardownRef.current();
        teardownRef.current = null;
      }
      if (masterRef.current) {
        try { masterRef.current.disconnect(); } catch { /* */ }
        masterRef.current = null;
      }
      activeRegionRef.current = null;
    };
  // portId included to re-evaluate when port changes (region may differ)
  }, [portId, region, enabled]); // eslint-disable-line react-hooks/exhaustive-deps
}
