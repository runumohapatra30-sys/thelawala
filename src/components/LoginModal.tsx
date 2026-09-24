import { X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const OPEN_LOGIN_EVENT = "thelawala:open-login";

export function openLoginModal() {
  window.dispatchEvent(new Event(OPEN_LOGIN_EVENT));
}

type LoginModalProps = {
  open: boolean;
  onClose: () => void;
};

export function LoginModal({ open, onClose }: LoginModalProps) {
  const [mode, setMode] = useState<"phone" | "email">("phone");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!open) return null;

  const fullPhone = `+91${phone.replace(/\D/g, "").slice(-10)}`;
  const canContinue = mode === "phone"
    ? name.trim().length > 1 && phone.replace(/\D/g, "").length === 10
    : email.includes("@") && password.length >= 6;

  async function continueLogin() {
    setBusy(true);
    setMessage(null);
    if (mode === "phone") {
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
      return;
    }

    if (mode === "email") {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      setBusy(false);
      if (error) return setMessage("Email or password is incorrect. Try Phone OTP instead.");
      onClose();
      toast.success("You are signed in");
      return;
    }
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
            <p className="mt-1 text-xs text-muted-foreground">Continue instantly with your name and mobile number.</p>
          </div>
          <button type="button" aria-label="Close login" onClick={onClose} className="press grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
          {(["phone", "email"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => { setMode(option); setMessage(null); }}
              className={`rounded-full py-2 text-xs font-black ${mode === option ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}
            >
              {option === "phone" ? "Phone / Guest" : "Email & password"}
            </button>
          ))}
        </div>

        {mode === "phone" ? (
          <div className="mt-3 space-y-2">
            <label className="block text-xs font-semibold text-muted-foreground">
              Your name
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-primary" />
            </label>
            <label className="block text-xs font-semibold text-muted-foreground">
              Mobile number
            <div className="mt-1 flex rounded-xl border border-border bg-background focus-within:border-primary">
              <span className="px-3 py-3 text-sm font-bold text-muted-foreground">+91</span>
              <input value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" placeholder="10-digit number" className="min-w-0 flex-1 rounded-r-xl bg-transparent py-3 pr-3 text-sm outline-none" />
            </div>
            </label>
          </div>
        ) : (
          <label className="mt-3 block text-xs font-semibold text-muted-foreground">
            Email address
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="you@example.com" className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-primary" />
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Password" className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-primary" />
          </label>
        )}

        <button type="button" disabled={busy || !canContinue} onClick={continueLogin} className="press mt-3 w-full rounded-full bg-primary py-3.5 text-sm font-black text-primary-foreground disabled:opacity-50">
          {busy ? "Please wait..." : mode === "email" ? "Sign in" : "Continue"}
        </button>
        {message ? <p className="mt-3 text-center text-xs font-semibold text-muted-foreground">{message}</p> : null}
      </section>
    </div>
  );
}
