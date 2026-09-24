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
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [guestName, setGuestName] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!open) return null;

  const fullPhone = `+91${phone.replace(/\D/g, "").slice(-10)}`;
  const canSend = mode === "phone" ? phone.replace(/\D/g, "").length === 10 : email.includes("@") && password.length >= 6;

  async function sendCode() {
    setBusy(true);
    setMessage(null);
    if (mode === "email") {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      setBusy(false);
      if (error) return setMessage("Email or password is incorrect. Try Phone OTP instead.");
      onClose();
      toast.success("You are signed in");
      return;
    }
    const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });
    setBusy(false);
    if (error) return setMessage("We could not send the SMS code. Try email and password instead.");
    setSent(true);
    setMessage(mode === "phone" ? `Code sent to ${fullPhone}.` : "Check your email for the sign-in link or code.");
  }

  async function verifyCode() {
    setBusy(true);
    setMessage(null);
    const { error } = mode === "phone"
      ? await supabase.auth.verifyOtp({ phone: fullPhone, token: code.trim(), type: "sms" })
      : await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
    setBusy(false);
    if (error) return setMessage("That code did not work. Please try again.");
    onClose();
    toast.success("You are signed in");
  }

  async function continueAsGuest() {
    const name = guestName.trim();
    if (!name) return setMessage("Enter your name to continue as a guest.");
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.auth.signInAnonymously({ data: { full_name: name } });
    setBusy(false);
    if (error) return setMessage("Guest checkout is temporarily unavailable. Please use OTP or email.");
    localStorage.setItem("thelawala.guest_name", name);
    onClose();
    toast.success(`Welcome, ${name}`);
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
            <p className="mt-1 text-xs text-muted-foreground">Use OTP, email, or continue as a guest.</p>
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
              onClick={() => { setMode(option); setSent(false); setCode(""); setMessage(null); }}
              className={`rounded-full py-2 text-xs font-black ${mode === option ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}
            >
              {option === "phone" ? "Phone OTP" : "Email & password"}
            </button>
          ))}
        </div>

        {mode === "phone" ? (
          <label className="mt-3 block text-xs font-semibold text-muted-foreground">
            Mobile number
            <div className="mt-1 flex rounded-xl border border-border bg-background focus-within:border-primary">
              <span className="px-3 py-3 text-sm font-bold text-muted-foreground">+91</span>
              <input value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" placeholder="10-digit number" className="min-w-0 flex-1 rounded-r-xl bg-transparent py-3 pr-3 text-sm outline-none" />
            </div>
          </label>
        ) : (
          <label className="mt-3 block text-xs font-semibold text-muted-foreground">
            Email address
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="you@example.com" className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-primary" />
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Password" className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-primary" />
          </label>
        )}

        {sent ? (
          <input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="Enter 6-digit code" className="mt-3 w-full rounded-xl border border-border bg-background px-3 py-3 text-center text-lg font-bold tracking-[0.35em] outline-none focus:border-primary" />
        ) : null}
        <button type="button" disabled={busy || (!sent && !canSend) || (sent && code.length < 4)} onClick={sent ? verifyCode : sendCode} className="press mt-3 w-full rounded-full bg-primary py-3.5 text-sm font-black text-primary-foreground disabled:opacity-50">
          {busy ? "Please wait..." : sent ? "Verify and continue" : mode === "email" ? "Sign in" : "Send sign-in code"}
        </button>

        <button type="button" onClick={() => toast("OAuth login is not configured yet, please use OTP / Email")} className="press mt-2 w-full rounded-full border border-border py-3 text-xs font-bold text-muted-foreground">
          Continue with Google
        </button>

        <div className="my-4 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground"><span className="h-px flex-1 bg-border" /> Or guest checkout <span className="h-px flex-1 bg-border" /></div>
        <div className="flex gap-2">
          <input value={guestName} onChange={(event) => setGuestName(event.target.value)} placeholder="Your name" className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-primary" />
          <button type="button" disabled={busy} onClick={continueAsGuest} className="press rounded-full border border-primary px-4 text-xs font-black text-primary disabled:opacity-50">Continue</button>
        </div>
        {message ? <p className="mt-3 text-center text-xs font-semibold text-muted-foreground">{message}</p> : null}
      </section>
    </div>
  );
}
