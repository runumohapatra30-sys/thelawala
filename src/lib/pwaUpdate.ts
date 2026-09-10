import { useEffect, useState } from "react";

type State = { updateReady: boolean; apply: (() => Promise<void>) | null };

let state: State = { updateReady: false, apply: null };
let started = false;
const listeners = new Set<(s: State) => void>();

function set(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l(state));
}

export const isBlockedPreviewContext = () => {
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

export async function unregisterAppServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations
      .filter(
        (registration) =>
          registration.active?.scriptURL.endsWith("/sw.js") ||
          registration.waiting?.scriptURL.endsWith("/sw.js") ||
          registration.installing?.scriptURL.endsWith("/sw.js"),
      )
      .map((registration) => registration.unregister()),
  );
}

export function startPwaUpdates() {
  if (started) return;
  started = true;

  if (isBlockedPreviewContext()) {
    void unregisterAppServiceWorker();
    return;
  }

  void import("virtual:pwa-register")
    .then(({ registerSW }) => {
      const updateServiceWorker = registerSW({
        immediate: true,
        onRegisteredSW(_swUrl, registration) {
          if (!registration) return;
          window.setInterval(() => {
            void registration.update();
          }, 60_000);
        },
        onNeedRefresh() {
          set({ updateReady: true });
        },
      });
      set({ apply: async () => void (await updateServiceWorker(true)) });
    })
    .catch(() => {
      // The virtual module is absent in development; production builds provide it.
    });
}

export function usePwaUpdate() {
  const [snap, setSnap] = useState(state);
  useEffect(() => {
    startPwaUpdates();
    listeners.add(setSnap);
    setSnap(state);
    return () => {
      listeners.delete(setSnap);
    };
  }, []);
  return snap;
}
