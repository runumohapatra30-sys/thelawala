import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

const isBlockedPreviewContext = () => {
  if (typeof window === "undefined") return true;
  const host = window.location.hostname;
  return (
    !import.meta.env.PROD ||
    window.self !== window.top ||
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host === "lovableproject.com" ||
    host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" ||
    host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" ||
    host.endsWith(".beta.lovable.dev") ||
    new URLSearchParams(window.location.search).get("sw") === "off"
  );
};

async function unregisterAppServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations
      .filter((registration) =>
        registration.active?.scriptURL.endsWith("/sw.js") ||
        registration.waiting?.scriptURL.endsWith("/sw.js") ||
        registration.installing?.scriptURL.endsWith("/sw.js"),
      )
      .map((registration) => registration.unregister()),
  );
}

export function PwaUpdater() {
  const [updateReady, setUpdateReady] = useState(false);
  const [applyUpdate, setApplyUpdate] = useState<(() => Promise<void>) | null>(null);

  useEffect(() => {
    if (isBlockedPreviewContext()) {
      void unregisterAppServiceWorker();
      return;
    }

    let interval: number | undefined;
    let cancelled = false;

    void import("virtual:pwa-register")
      .then(({ registerSW }) => {
        if (cancelled) return;
        const updateServiceWorker = registerSW({
          immediate: true,
          onRegisteredSW(_swUrl, registration) {
            if (!registration) return;
            interval = window.setInterval(() => {
              void registration.update();
            }, 60_000);
          },
          onNeedRefresh() {
            setUpdateReady(true);
          },
        });
        setApplyUpdate(() => async () => {
          await updateServiceWorker(true);
        });
      })
      .catch(() => {
        // The virtual module is absent in development; production builds provide it.
      });

    return () => {
      cancelled = true;
      if (interval) window.clearInterval(interval);
    };
  }, []);

  if (!updateReady || !applyUpdate) return null;

  return (
    <div className="fixed inset-x-4 bottom-24 z-[90] mx-auto max-w-sm rounded-2xl border border-border bg-foreground p-3 text-background shadow-2xl">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-foreground">
          <RefreshCw className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold">New ThelaWala version available</p>
          <p className="text-xs text-background/70">Update now for the latest fixes.</p>
        </div>
        <button
          type="button"
          onClick={() => void applyUpdate()}
          className="rounded-xl bg-brand px-3 py-2 text-xs font-extrabold text-brand-foreground"
        >
          Update now
        </button>
      </div>
    </div>
  );
}
