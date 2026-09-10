import { useEffect, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { ArrowLeftRight, Check, X } from "lucide-react";

const THRESHOLD = 120;

/** Bidirectional swipe bar: drag right to accept an order, drag left to decline it. */
export function RiderOrderSwipe({
  secs,
  total = 30,
  onAccept,
  onDecline,
}: {
  secs: number;
  total?: number;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const x = useMotionValue(0);
  const [locked, setLocked] = useState(false);
  const [label, setLabel] = useState<"idle" | "accept" | "decline">("idle");
  const bg = useTransform(
    x,
    [-THRESHOLD, 0, THRESHOLD],
    ["color-mix(in oklab, var(--color-destructive) 85%, white)", "var(--color-muted)", "color-mix(in oklab, var(--color-primary) 85%, white)"],
  );
  const left = Math.max(0, Math.min(secs, total));
  const pct = (left / total) * 100;

  useEffect(() => {
    if (locked) return;
    return x.on("change", (value) => {
      if (Math.abs(value) >= THRESHOLD) navigator.vibrate?.(50);
    });
  }, [x, locked]);

  function release() {
    if (locked) return;
    const value = x.get();
    if (value >= THRESHOLD) {
      setLocked(true);
      setLabel("accept");
      animate(x, 170, { type: "spring", stiffness: 300, damping: 26 });
      onAccept();
      return;
    }
    if (value <= -THRESHOLD) {
      setLocked(true);
      setLabel("decline");
      animate(x, -170, { type: "spring", stiffness: 300, damping: 26 });
      onDecline();
      return;
    }
    animate(x, 0, { type: "spring", stiffness: 420, damping: 30 });
  }

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex items-center justify-center gap-3">
        <div
          className="grid h-14 w-14 shrink-0 place-items-center rounded-full"
          style={{ background: `conic-gradient(var(--color-primary) ${pct}%, var(--color-border) 0)` }}
        >
          <span className="grid h-11 w-11 place-items-center rounded-full bg-card text-base font-black text-primary">{left}</span>
        </div>
        <p className="text-xs font-bold text-muted-foreground">
          {label === "accept" ? "Accepting…" : label === "decline" ? "Declining…" : "Slide right to accept · left to decline"}
        </p>
      </div>

      <motion.div style={{ background: bg }} className="relative flex h-16 min-w-0 items-center justify-between overflow-hidden rounded-full px-4">
        <span className="flex items-center gap-1 text-[11px] font-extrabold text-destructive-foreground/90">
          <X className="h-4 w-4" /> Decline
        </span>
        <span className="flex items-center gap-1 text-[11px] font-extrabold text-primary-foreground/90">
          Accept <Check className="h-4 w-4" />
        </span>
        <motion.button
          type="button"
          aria-label="Slide to accept or decline"
          drag={locked ? false : "x"}
          dragConstraints={{ left: -170, right: 170 }}
          dragElastic={0.05}
          style={{ x }}
          onDragEnd={release}
          className="press absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-card text-foreground shadow-lg"
        >
          <ArrowLeftRight className="h-5 w-5" />
        </motion.button>
      </motion.div>
    </div>
  );
}
