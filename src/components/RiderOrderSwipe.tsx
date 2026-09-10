import { useEffect, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Check, ChevronsLeft, ChevronsRight, X } from "lucide-react";

const THRESHOLD = 110;

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
  const acceptGlow = useTransform(x, [0, THRESHOLD], [0, 1]);
  const declineGlow = useTransform(x, [0, -THRESHOLD], [0, 1]);
  const left = Math.max(0, Math.min(secs, total));
  const pct = (left / total) * 100;
  const urgent = left <= 8;

  useEffect(() => {
    if (locked) return;
    return x.on("change", (value) => {
      if (Math.abs(value) >= THRESHOLD) navigator.vibrate?.(40);
    });
  }, [x, locked]);

  function release() {
    if (locked) return;
    const value = x.get();
    if (value >= THRESHOLD) {
      setLocked(true);
      setLabel("accept");
      animate(x, 150, { type: "spring", stiffness: 300, damping: 26 });
      navigator.vibrate?.([30, 40, 30]);
      onAccept();
      return;
    }
    if (value <= -THRESHOLD) {
      setLocked(true);
      setLabel("decline");
      animate(x, -150, { type: "spring", stiffness: 300, damping: 26 });
      navigator.vibrate?.(60);
      onDecline();
      return;
    }
    animate(x, 0, { type: "spring", stiffness: 420, damping: 30 });
  }

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex items-center gap-3">
        <div
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full transition-colors"
          style={{
            background: `conic-gradient(${urgent ? "var(--color-destructive)" : "var(--color-primary)"} ${pct}%, color-mix(in oklab, var(--color-border) 70%, white) 0)`,
          }}
        >
          <span className={`grid h-9 w-9 place-items-center rounded-full bg-card text-sm font-black ${urgent ? "text-destructive" : "text-primary"}`}>
            {left}
          </span>
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-black">
            {label === "accept" ? "Accepting order…" : label === "decline" ? "Passing to next rider…" : "Swipe to respond"}
          </p>
          <p className="truncate text-[11px] font-medium text-muted-foreground">
            {label === "idle" ? "Right = accept · Left = decline" : "Please wait…"}
          </p>
        </div>
      </div>

      <div className="relative flex h-[68px] min-w-0 items-center overflow-hidden rounded-[1.6rem] border border-border bg-[color-mix(in_oklab,var(--color-muted)_70%,white)] p-1.5">
        <motion.div
          style={{ opacity: declineGlow }}
          className="pointer-events-none absolute inset-0 rounded-[1.6rem] bg-[color-mix(in_oklab,var(--color-destructive)_82%,white)]"
        />
        <motion.div
          style={{ opacity: acceptGlow }}
          className="pointer-events-none absolute inset-0 rounded-[1.6rem] bg-[color-mix(in_oklab,var(--color-primary)_82%,white)]"
        />

        <div className="relative flex w-full items-center justify-between px-4">
          <span className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wide text-destructive">
            <ChevronsLeft className="h-4 w-4" /> Decline
          </span>
          <span className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wide text-primary">
            Accept <ChevronsRight className="h-4 w-4" />
          </span>
        </div>

        <motion.button
          type="button"
          aria-label="Swipe right to accept, left to decline"
          drag={locked ? false : "x"}
          dragConstraints={{ left: -150, right: 150 }}
          dragElastic={0.04}
          whileTap={{ scale: 1.06 }}
          style={{ x }}
          onDragEnd={release}
          className="absolute left-1/2 top-1/2 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 cursor-grab place-items-center rounded-full bg-card shadow-[0_8px_20px_rgba(0,0,0,0.18)] active:cursor-grabbing"
        >
          {label === "accept" ? (
            <Check className="h-6 w-6 text-primary" />
          ) : label === "decline" ? (
            <X className="h-6 w-6 text-destructive" />
          ) : (
            <span className="flex items-center text-muted-foreground">
              <ChevronsLeft className="h-4 w-4" />
              <ChevronsRight className="h-4 w-4" />
            </span>
          )}
        </motion.button>
      </div>
    </div>
  );
}
