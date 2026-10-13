import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GoogleButton, SocialAuthButton } from "@/components/LoginModal";
import { Eye, EyeOff, Facebook, Twitter } from "lucide-react";

const ONBOARDING_KEY = "thelawala_onboarding_completed";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    mode: search["mode"] === "signup" ? "signup" as const : "signin" as const,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — ThelaWala" },
      { name: "description", content: "Continue to ThelaWala with one-tap Google sign-in." },
      { property: "og:title", content: "Sign in — ThelaWala" },
      {
        property: "og:description",
        content: "Sign in to ThelaWala for local street food delivery in Bhubaneswar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

export function AuthPage() {
  const navigate = useNavigate();
  const { mode } = Route.useSearch();
  const [formMode, setFormMode] = useState<"signin" | "signup">(mode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const goAfterLogin = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) return navigate({ to: "/" });

    let saved: string | null = null;
    try {
      saved = sessionStorage.getItem("thelawala.redirect");
      sessionStorage.removeItem("thelawala.redirect");
    } catch {
      saved = null;
    }

    const [{ data: vendor }, { data: partner }, { data: adminRole }] = await Promise.all([
      supabase.from("vendors").select("id").eq("owner_id", uid).maybeSingle(),
      supabase.from("delivery_partners").select("id").eq("user_id", uid).maybeSingle(),
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .eq("role", "admin")
        .maybeSingle(),
    ]);

    if (saved?.startsWith("/vendor")) return navigate({ to: "/vendor" });
    if (saved?.startsWith("/rider") || saved?.startsWith("/delivery"))
      return navigate({ to: "/rider" });
    if (saved?.startsWith("/admin") || adminRole) return navigate({ to: "/admin" });
    if (vendor) return navigate({ to: "/vendor" });
    if (partner) return navigate({ to: "/rider" });
    return navigate({ to: "/" });
  }, [navigate]);

  useEffect(() => {
    let alive = true;
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" || !session) return;
      window.localStorage.setItem(ONBOARDING_KEY, "true");
      queueMicrotask(() => {
        if (alive) void goAfterLogin();
      });
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (alive && data.session) void goAfterLogin();
    });
    return () => {
      alive = false;
      subscription.subscription.unsubscribe();
    };
  }, [goAfterLogin]);

  useEffect(() => setFormMode(mode), [mode]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setErrorMessage(null);
    if (!agreed) {
      setErrorMessage("Please accept the terms and privacy policy to continue.");
      return;
    }
    if (formMode === "signup" && password !== confirmPassword) {
      setErrorMessage("Your passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      if (formMode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/`,
            data: { onboarding_completed: true },
          },
        });
        if (error) throw error;
        if (data.session) {
          window.localStorage.setItem(ONBOARDING_KEY, "true");
          await supabase.auth.updateUser({ data: { onboarding_completed: true } });
          await goAfterLogin();
        } else {
          setMessage("Check your email to confirm your account, then sign in.");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        if (data.session) {
          window.localStorage.setItem(ONBOARDING_KEY, "true");
          await supabase.auth.updateUser({ data: { onboarding_completed: true } });
          await goAfterLogin();
        }
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not complete sign-in.");
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    setMessage(null);
    setErrorMessage(null);
    if (!email.trim()) {
      setErrorMessage("Enter your email address first.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/profile`,
    });
    if (error) setErrorMessage(error.message);
    else setMessage("Password reset instructions have been sent to your email.");
  }

  const isSignup = formMode === "signup";
  const inputClass = "h-12 w-full rounded-xl border border-[#E8E1DC] bg-white px-3.5 text-sm text-[#302820] outline-none transition focus:border-[#F4511E] focus:ring-2 focus:ring-[#F4511E]/15";

  return (
    <main className="min-h-[100svh] bg-[#FFF8F2] px-4 pb-8 text-[#302820]">
      <div className="mx-auto w-full max-w-[440px]">
        {isSignup ? (
          <header className="flex h-28 items-center justify-between px-2">
            <Link to="/" className="font-display text-2xl font-extrabold text-[#F4511E]">ThelaWala</Link>
            <Link to="/" className="text-sm font-semibold text-[#76685F]">Back</Link>
          </header>
        ) : (
          <header className="relative flex h-[31svh] min-h-52 flex-col justify-end overflow-hidden rounded-b-[2.5rem] bg-[#F4511E] px-6 pb-12 text-white">
            <Link to="/" className="absolute right-5 top-5 rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold text-white">Back</Link>
            <span className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-white text-xs font-black text-[#F4511E]">TW</span>
            <h1 className="font-display text-3xl font-extrabold">ThelaWala</h1>
            <p className="mt-1 text-sm text-white/90">Local favourites, delivered with care.</p>
          </header>
        )}

        <section className={`relative rounded-[1.5rem] bg-white p-5 shadow-[0_18px_50px_-28px_rgba(90,55,35,0.3)] ${isSignup ? "mt-1" : "-mt-7"}`}>
          <p className="text-xs font-bold uppercase text-[#A18F82]">ThelaWala account</p>
          <h2 className="mt-1 text-2xl font-extrabold">{isSignup ? "Create account" : "Sign in"}</h2>
          <form onSubmit={(event) => void submit(event)} className="mt-5 space-y-3.5">
            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-[#5F5148]">Email Address</span>
              <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-[#5F5148]">Password</span>
              <span className="relative block">
                <input type={showPassword ? "text" : "password"} autoComplete={isSignup ? "new-password" : "current-password"} required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} className={`${inputClass} pr-12`} />
                <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((visible) => !visible)} className="absolute inset-y-0 right-0 grid w-11 place-items-center text-[#8D7D72]">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </span>
            </label>
            {!isSignup ? (
              <div className="flex justify-end">
                <button type="button" onClick={() => void resetPassword()} className="text-xs font-bold text-[#F4511E]">Forgot password?</button>
              </div>
            ) : (
              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-[#5F5148]">Confirm Password</span>
                <input type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={6} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={inputClass} />
              </label>
            )}
            <label className="flex cursor-pointer items-start gap-2.5 pt-1 text-xs leading-5 text-[#75665C]">
              <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#F4511E]" />
              <span>I agree to the <Link to="/terms" className="font-bold text-[#F4511E]">Terms</Link> and Privacy Policy.</span>
            </label>
            {message ? <p role="status" className="text-xs text-emerald-700">{message}</p> : null}
            {errorMessage ? <p role="alert" className="text-xs text-red-700">{errorMessage}</p> : null}
            <button type="submit" disabled={busy} className="flex h-12 w-full items-center justify-center rounded-full bg-[#F4511E] text-sm font-extrabold text-white transition hover:bg-[#D84315] disabled:opacity-60">
              {busy ? "Please wait…" : isSignup ? "Sign up" : "Sign in"}
            </button>
          </form>

          <div className="my-4 flex items-center gap-3 text-[11px] font-semibold text-[#9A8A7F]">
            <span className="h-px flex-1 bg-[#E9E2DC]" /><span>or continue with</span><span className="h-px flex-1 bg-[#E9E2DC]" />
          </div>
          <div className="flex justify-center gap-3">
            <SocialAuthButton provider="facebook" label="Facebook"><Facebook className="h-5 w-5 fill-current" /></SocialAuthButton>
            <GoogleButton iconOnly className="!h-11 !w-11 !border-[#E9E2DC] !shadow-none" />
            <SocialAuthButton provider="twitter" label="Twitter"><Twitter className="h-5 w-5" /></SocialAuthButton>
          </div>
          <p className="mt-4 text-center text-xs text-[#75665C]">
            {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
            <Link to="/auth" search={{ mode: isSignup ? "signin" : "signup" }} className="font-extrabold text-[#F4511E]">
              {isSignup ? "Sign In" : "Sign Up"}
            </Link>
          </p>
        </section>
        <div className="mt-4 flex justify-center gap-4 text-[11px] font-semibold text-[#8D7D72]">
          <Link to="/vendor" className="hover:text-[#F4511E]">Stall partner</Link>
          <Link to="/rider" className="hover:text-[#F4511E]">Delivery partner</Link>
          <Link to="/admin" className="hover:text-[#F4511E]">Admin</Link>
        </div>
      </div>
    </main>
  );
}
