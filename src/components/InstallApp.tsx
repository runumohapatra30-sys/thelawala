import { useEffect, useState } from "react";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function useInstallApp() {
  const [deferred, setDeferred] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    setIsIOS(/iphone|ipad|ipod/i.test(window.navigator.userAgent));

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as InstallPrompt);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!deferred) return false;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setDeferred(null);
    return choice.outcome === "accepted";
  }

  return { canInstall: !!deferred, installed, isIOS, install };
}

export function InstallAppButton({ className = "" }: { className?: string }) {
  const { canInstall, installed, isIOS, install } = useInstallApp();
  const [tip, setTip] = useState(false);
  if (installed) return null;
  if (!canInstall && !isIOS) return null;

  return (
    <>
      <button
        onClick={() => (canInstall ? void install() : setTip(true))}
        className={`press flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-extrabold glass-chip ${className}`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4">
          <path d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Install app
      </button>
      {tip ? (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/40 p-4" onClick={() => setTip(false)}>
          <div className="w-full rounded-3xl bg-card p-5 text-foreground" onClick={(e) => e.stopPropagation()}>
            <p className="text-base font-extrabold">Add Thaleewala to your home screen</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Tap the Share button in Safari, then choose “Add to Home Screen”.
            </p>
            <button
              onClick={() => setTip(false)}
              className="mt-4 w-full rounded-2xl bg-primary py-3 text-sm font-extrabold text-primary-foreground"
            >
              Got it
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
