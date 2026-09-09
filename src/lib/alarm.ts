import { useEffect, useRef, useState } from "react";

/**
 * Loud, looping two-tone siren used for new-order alerts on the vendor and
 * delivery partner portals. Falls back silently when audio is unavailable.
 */
export function useLoudAlarm(active: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    if (!active || muted) return;
    let stopped = false;

    const ring = () => {
      if (stopped) return;
      try {
        const Ctx =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = (ctxRef.current ??= new Ctx());
        if (ctx.state === "suspended") void ctx.resume();

        const master = ctx.createGain();
        master.gain.value = 1;
        master.connect(ctx.destination);

        // Four rising wails, square wave = piercing and easy to hear in a busy stall.
        [0, 0.3, 0.6, 0.9].forEach((offset) => {
          const t = ctx.currentTime + offset;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "square";
          osc.frequency.setValueAtTime(740, t);
          osc.frequency.linearRampToValueAtTime(1180, t + 0.22);
          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.exponentialRampToValueAtTime(0.85, t + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
          osc.connect(gain).connect(master);
          osc.start(t);
          osc.stop(t + 0.28);
        });
      } catch {
        /* audio unavailable */
      }
      try {
        navigator.vibrate?.([400, 150, 400, 150, 400]);
      } catch {
        /* vibration unavailable */
      }
    };

    ring();
    const timer = setInterval(ring, 2000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [active, muted]);

  useEffect(() => {
    if (!active) setMuted(false);
  }, [active]);

  return { muted, setMuted };
}
