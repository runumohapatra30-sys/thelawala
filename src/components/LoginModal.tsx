import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isGoogleIdentityConfigured, waitForGoogleIdentity } from "@/lib/googleIdentity";

export const OPEN_LOGIN_EVENT = "thelawala:open-login";

export function openLoginModal() {
  window.dispatchEvent(new Event(OPEN_LOGIN_EVENT));
}

type LoginModalProps = {
  open: boolean;
  onClose: () => void;
};

export function LoginModal({ open, onClose }: LoginModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setBusy(false);
        onClose();
      }
    });
    return () => subscription.subscription.unsubscribe();
  }, [open, onClose]);

  if (!open) return null;

  const fullPhone = `+91${phone.replace(/\D/g, "").slice(-10)}`;
  const canContinue = name.trim().length > 1 && phone.replace(/\D/g, "").length === 10;

  function signInWithGoogle() {
    if (!isGoogleIdentityConfigured()) {
      toast("Google sign-in is not configured yet. Continue with your name and mobile number.");
      return;
    }
    setBusy(true);
    waitForGoogleIdentity(true);
    setMessage("Choose your Google account to continue.");
  }

  async function continueAsGuest() {
    setBusy(true);
    setMessage(null);
    const { data, error } = await supabase.auth.signInAnonymously({
      options: { data: { full_name: name.trim(), mobile: fullPhone } },
    });
    if (error || !data.user) {
      setBusy(false);
      return setMessage("We could not start guest checkout right now. Please try again.");
    }
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: data.user.id,
      full_name: name.trim(),
      mobile: fullPhone,
      email: data.user.email ?? null,
    });
    setBusy(false);
    if (profileError) return setMessage("Your session started, but we could not save your profile. Please try again.");
    localStorage.setItem("thelawala.guest_name", name.trim());
    localStorage.setItem("thelawala.guest_mobile", fullPhone);
    onClose();
    toast.success(`Welcome, ${name.trim()}`);
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-foreground/35 px-3 pb-3 sm:items-center" onClick={onClose}>
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
            <h2 id="login-modal-title" className="mt-1 font-display text-3xl text-primary">Log in to continue</h2>
            <p className="mt-1 text-xs text-muted-foreground">Fast sign-in for your next street food order.</p>
          </div>
          <button type="button" aria-label="Close login" onClick={onClose} className="press grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <button type="button" onClick={signInWithGoogle} className="press mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-black text-primary-foreground">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-white text-xs font-black text-[#4285F4]">G</span>
          Sign in with Google
        </button>
        <div className="my-4 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground"><span className="h-px flex-1 bg-border" /> Or continue as guest <span className="h-px flex-1 bg-border" /></div>
        <div className="space-y-2">
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-primary" />
          <div className="flex rounded-xl border border-border bg-background focus-within:border-primary">
            <span className="px-3 py-3 text-sm font-bold text-muted-foreground">+91</span>
            <input value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" placeholder="10-digit mobile number" className="min-w-0 flex-1 rounded-r-xl bg-transparent py-3 pr-3 text-sm outline-none" />
          </div>
          <button type="button" disabled={busy || !canContinue} onClick={continueAsGuest} className="press w-full rounded-full border border-primary py-3 text-sm font-black text-primary disabled:opacity-50">
            {busy ? "Please wait..." : "Continue as guest"}
          </button>
        </div>
        {message ? <p className="mt-3 text-center text-xs font-semibold text-muted-foreground">{message}</p> : null}
      </section>
    </div>
  );
}
