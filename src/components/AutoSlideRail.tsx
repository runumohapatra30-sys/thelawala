import { useEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";

/** Horizontal rail of equal-size cards that slides one card every few seconds and loops. */
export function AutoSlideRail({ children, intervalMs = 3000 }: { children: ReactNode; intervalMs?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (reduced || paused) return;
    const timer = window.setInterval(() => {
      const rail = ref.current;
      if (!rail || document.visibilityState !== "visible") return;
      const card = rail.firstElementChild as HTMLElement | null;
      if (!card || rail.scrollWidth <= rail.clientWidth + 4) return;
      const step = card.offsetWidth + 12;
      if (rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 4) rail.scrollTo({ left: 0, behavior: "smooth" });
      else rail.scrollBy({ left: step, behavior: "smooth" });
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [reduced, paused, intervalMs]);
  return (
    <div
      ref={ref}
      className="home-promotion-rail no-scrollbar"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => window.setTimeout(() => setPaused(false), 2500)}
    >
      {children}
    </div>
  );
}
