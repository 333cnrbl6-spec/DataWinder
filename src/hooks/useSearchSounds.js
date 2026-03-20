import { useRef, useCallback } from 'react';

/**
 * Generates soft UI sounds using the Web Audio API.
 * No external files needed — all synthesised in-browser.
 */
export function useSearchSounds() {
  const mutedRef = useRef(false);
  const tickIntervalRef = useRef(null);

  const getCtx = () => {
    if (typeof window === 'undefined') return null;
    return new (window.AudioContext || window.webkitAudioContext)();
  };

  // Soft metronome tick: a short, low-volume sine blip
  const playTick = useCallback(() => {
    if (mutedRef.current) return;
    const ctx = getCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
  }, []);

  // Pleasant rising two-note chime for success
  const playSuccess = useCallback(() => {
    if (mutedRef.current) return;
    const ctx = getCtx();
    if (!ctx) return;
    [[523.25, 0], [783.99, 0.12]].forEach(([freq, delay]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
      gain.gain.setValueAtTime(0.12, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.4);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.4);
    });
  }, []);

  // Short descending blip for error
  const playError = useCallback(() => {
    if (mutedRef.current) return;
    const ctx = getCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  }, []);

  const startTicking = useCallback((intervalMs = 4000) => {
    stopTicking();
    tickIntervalRef.current = setInterval(playTick, intervalMs);
    playTick(); // immediate first tick
  }, [playTick]);

  const stopTicking = useCallback(() => {
    if (tickIntervalRef.current) {
      clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }
  }, []);

  const toggleMute = useCallback(() => {
    mutedRef.current = !mutedRef.current;
    return mutedRef.current;
  }, []);

  const isMuted = () => mutedRef.current;

  return { playTick, playSuccess, playError, startTicking, stopTicking, toggleMute, isMuted };
}