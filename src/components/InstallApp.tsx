import { useEffect, useState } from 'react';

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowButton(true);

      // Optionally try to auto-trigger once if allowed by browser
      try {
        (e as any).prompt();
      } catch (err) {
        console.log("Auto prompt deferred to user action");
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowButton(false);
    }
    setDeferredPrompt(null);
  };

  if (!showButton) return null;

  return (
    <button
      onClick={handleInstallClick}
      className="fixed bottom-20 right-4 z-50 flex items-center gap-2 bg-[#FF6600] text-white px-4 py-3 rounded-full shadow-2xl font-bold text-xs animate-bounce border-2 border-white"
    >
      📥 Install ThelaWala App
    </button>
  );
}
