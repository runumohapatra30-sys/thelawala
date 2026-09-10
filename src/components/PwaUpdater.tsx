import { RefreshCw } from "lucide-react";
import { usePwaUpdate } from "@/lib/pwaUpdate";

/** Small pill shown next to the "Install app" button when a new version is ready. */
export function UpdateAppButton({ className = "" }: { className?: string }) {
  const { updateReady, apply } = usePwaUpdate();
  if (!updateReady || !apply) return null;

  return (
    <button
      type="button"
      onClick={() => void apply()}
      className={`press flex items-center gap-1.5 rounded-full bg-brand px-3 py-2 text-[11px] font-extrabold text-brand-foreground ${className}`}
    >
      <RefreshCw className="h-4 w-4" />
      Update
    </button>
  );
}

export function PwaUpdater() {
  const { updateReady, apply } = usePwaUpdate();
  if (!updateReady || !apply) return null;

  return (
    <div className="fixed inset-x-4 bottom-24 z-[90] mx-auto max-w-sm rounded-2xl border border-border bg-foreground p-3 text-background shadow-2xl">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-foreground">
          <RefreshCw className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold">New Thaleewala version available</p>
          <p className="text-xs text-background/70">Update now for the latest fixes.</p>
        </div>
        <button
          type="button"
          onClick={() => void apply()}
          className="rounded-xl bg-brand px-3 py-2 text-xs font-extrabold text-brand-foreground"
        >
          Update now
        </button>
      </div>
    </div>
  );
}
