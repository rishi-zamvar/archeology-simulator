/**
 * useAudioManager — ambient audio singleton for the renderer.
 *
 * AudioManager is a module-level singleton so the AudioContext and
 * buffer source persist across React re-renders and component remounts.
 *
 * Design constraints:
 *  - Web Audio API requires a user gesture before AudioContext can play;
 *    callers must invoke playAmbient() from a click/keypress handler, NOT
 *    on component mount.
 *  - Audio assets are optional: if the file is missing or the network
 *    request fails, playAmbient() logs a warning and returns silently.
 *    The app must never crash because of a missing audio file.
 *  - Tab visibility changes can suspend the AudioContext; the module-level
 *    visibilitychange handler resumes it automatically.
 */

// AudioManager singleton — created once at module load, shared across all renders.
const AudioManager = {
  context: null as AudioContext | null,
  currentSource: null as AudioBufferSourceNode | null,
  currentGain: null as GainNode | null,

  /**
   * Fetch and play an audio asset as a looping ambient track.
   * Fades in over fadeInMs milliseconds at the given volume (0–1).
   *
   * Gracefully handles:
   *  - Missing asset (HTTP 4xx/5xx) — returns without throwing
   *  - Suspended AudioContext — calls resume() first
   *  - AudioContext not yet created — creates it on first call
   */
  async playAmbient(url: string, volume = 0.4, fadeInMs = 2000): Promise<void> {
    try {
      if (!this.context) {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.context = new AudioContextClass();
      }

      // Resume suspended context (can happen after tab hide/show or autoplay block)
      if (this.context.state === 'suspended') {
        await this.context.resume();
      }

      // Fetch the audio asset — non-fatal if missing
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`[AudioManager] Asset not found (${response.status}): ${url}`);
        return;
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = await this.context.decodeAudioData(arrayBuffer);

      // Stop any currently playing source before starting the new one
      if (this.currentSource) {
        try {
          this.currentSource.stop();
        } catch {
          // Ignore: source may have already ended
        }
        this.currentSource = null;
        this.currentGain = null;
      }

      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const gain = this.context.createGain();
      gain.gain.value = 0;
      gain.gain.linearRampToValueAtTime(
        volume,
        this.context.currentTime + fadeInMs / 1000
      );

      source.connect(gain);
      gain.connect(this.context.destination);
      source.start(0);

      this.currentSource = source;
      this.currentGain = gain;
    } catch (err) {
      // Non-fatal: audio failure must never crash the app
      console.warn('[AudioManager] playAmbient failed (non-fatal):', err);
    }
  },

  /**
   * Fade out and stop the current ambient track.
   * No-op if nothing is playing.
   */
  stopAmbient(fadeOutMs = 1000): void {
    if (!this.context || !this.currentGain || !this.currentSource) return;

    const stopAt = this.context.currentTime + fadeOutMs / 1000;
    this.currentGain.gain.linearRampToValueAtTime(0, stopAt);

    const src = this.currentSource;
    this.currentSource = null;
    this.currentGain = null;

    // Stop the source node after the fade completes
    setTimeout(() => {
      try {
        src.stop();
      } catch {
        // Ignore: may already be stopped
      }
    }, fadeOutMs + 50);
  },
};

// Register visibilitychange handler once at module load.
// When the tab regains focus, resume a suspended AudioContext so ambient
// audio continues without the user needing to click again.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && AudioManager.context?.state === 'suspended') {
      AudioManager.context.resume().catch(() => {
        // Non-fatal: context may not be resumable in all browsers
      });
    }
  });
}

/**
 * Returns the module-level AudioManager singleton.
 * Components call audio.playAmbient(url) on first user interaction.
 */
export function useAudioManager(): typeof AudioManager {
  return AudioManager;
}
