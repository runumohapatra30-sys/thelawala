import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const OPEN_LOGIN_EVENT = "thelawala:open-login";
export const GUEST_PROFILE_EVENT = "thelawala:guest-profile";

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

  if (!open) return null;

  const fullPhone = `+91${phone.replace(/\D/g, "").slice(-10)}`;
  function continueAsGuest() {
    const profile = { name: name.trim() || "Guest", mobile: fullPhone };
    localStorage.setItem("thelawala.guest_name", name.trim());
    localStorage.setItem("thelawala.guest_mobile", fullPhone);
    window.dispatchEvent(new CustomEvent(GUEST_PROFILE_EVENT, { detail: profile }));
    onClose();
    toast.success(`Welcome, ${profile.name}`);
  }

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
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">
              Welcome to ThelaWala
            </p>
            <h2 id="login-modal-title" className="mt-1 font-display text-3xl text-primary">
              Log in to continue
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Fast sign-in for your next street food order.
            </p>
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

        <div className="space-y-2">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your name"
            className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-primary"
          />
          <div className="flex rounded-xl border border-border bg-background focus-within:border-primary">
            <span className="px-3 py-3 text-sm font-bold text-muted-foreground">+91</span>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))}
              inputMode="numeric"
              placeholder="10-digit mobile number"
              className="min-w-0 flex-1 rounded-r-xl bg-transparent py-3 pr-3 text-sm outline-none"
            />
          </div>
          <button
            type="button"
            onClick={continueAsGuest}
            className="press w-full rounded-full bg-primary py-3 text-sm font-black text-primary-foreground"
          >
            Continue
          </button>
        </div>
      </section>
    </div>
  );
}
