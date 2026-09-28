import { X } from "lucide-react";
import { useState } from "react";
import { lovable } from "@/integrations/lovable";

export const OPEN_LOGIN_EVENT = "thelawala:open-login";
export const GUEST_PROFILE_EVENT = "thelawala:guest-profile";

export function openLoginModal() {
  window.dispatchEvent(new Event(OPEN_LOGIN_EVENT));
}

type LoginModalProps = {
  open: boolean;
  onClose: () => void;
};

export function GoogleButton({ className = "" }: { className?: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  async function signIn() {
    setBusy(true);
    setMsg(null);
    const res = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/auth",
      extraParams: { prompt: "select_account" },
    });
    if (res.error) {
      setBusy(false);
      setMsg("Google sign-in failed. Please try again.");
      return;
    }
    if (res.redirected) return;
    setBusy(false);
    window.location.assign("/auth");
  }
  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={signIn}
        className={`press flex w-full items-center justify-center gap-3 rounded-full border border-border bg-card py-3.5 text-sm font-black text-foreground shadow-sm disabled:opacity-50 ${className}`}
      >
        <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
        {busy ? "Opening Google…" : "Continue with Google"}
      </button>
      {msg ? <p className="mt-2 text-center text-xs text-destructive">{msg}</p> : null}
    </>
  );
}

export function LoginModal({ open, onClose }: LoginModalProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-foreground/35 px-3 pb-3 sm:items-center"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-modal-title"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-[460px] rounded-[2rem] bg-card p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Welcome to ThelaWala</p>
            <h2 id="login-modal-title" className="mt-1 font-display text-3xl text-primary">One tap sign in</h2>
            <p className="mt-1 text-xs text-muted-foreground">Use your Google account — no password, no OTP.</p>
          </div>
          <button
            type="button"
            aria-label="Close login"
            onClick={onClose}
            className="press grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5">
          <GoogleButton />
        </div>
      </section>
    </div>
  );
}
