import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ThelaLogo } from "@/components/Shell";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — ThelaWala" },
      { name: "description", content: "Sign in to ThelaWala with your mobile number, an email code or Google to order street food in 15 minutes." },
      { property: "og:title", content: "Sign in — ThelaWala" },
      { property: "og:description", content: "Mobile OTP, email code or Google sign-in for Bhubaneswar street food delivery." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

export function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"phone" | "email">("phone");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const fullPhone = `+91${phone.replace(/\D/g, "").slice(-10)}`;

  function authRedirectUrl() {
    let next = "/";
    try {
      const saved = sessionStorage.getItem("thelawala.redirect");
      if (saved?.startsWith("/")) next = saved;
    } catch {
      next = "/";
    }
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  }

  async function goAfterLogin() {
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
      supabase.from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle(),
    ]);

    if (saved?.startsWith("/vendor")) return navigate({ to: "/vendor" });
    if (saved?.startsWith("/rider") || saved?.startsWith("/delivery")) return navigate({ to: "/rider" });
    if (saved?.startsWith("/admin") || adminRole) return navigate({ to: "/admin" });
    if (vendor) return navigate({ to: "/vendor" });
    if (partner) return navigate({ to: "/rider" });
    navigate({ to: "/" });
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) goAfterLogin();
    });
  }, [navigate]);

  function switchMode(next: "phone" | "email") {
    setMode(next);
    setSent(false);
    setCode("");
    setMsg(null);
  }

  async function sendCode() {
    setBusy(true);
    setMsg(null);
    const { error } =
      mode === "email"
        ? await supabase.auth.signInWithOtp({
            email: email.trim(),
            options: { emailRedirectTo: authRedirectUrl() },
          })
        : await supabase.auth.signInWithOtp({ phone: fullPhone });
    setBusy(false);
    if (error) {
      return setMsg(
        mode === "phone"
          ? "We could not send the SMS code right now. Please use email instead."
          : error.message,
      );
    }
    setSent(true);
    setMsg(
      mode === "email"
        ? "We emailed you a 6-digit code. It is valid for a few minutes."
        : `We sent a 6-digit code to ${fullPhone}.`,
    );
  }

  async function verify() {
    setBusy(true);
    setMsg(null);
    const { error } =
      mode === "email"
        ? await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" })
        : await supabase.auth.verifyOtp({ phone: fullPhone, token: code.trim(), type: "sms" });
    setBusy(false);
    if (error) return setMsg("That code did not work. Please check it and try again.");
    await goAfterLogin();
  }

  async function google() {
    setMsg("OAuth login is not configured yet, please use OTP / Email.");
  }

  const canSend = mode === "email" ? email.includes("@") : phone.replace(/\D/g, "").length === 10;

  return (
    <div className="food-grid-bg min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col px-5 pb-8 pt-4">
        <div className="flex justify-end">
          <Link to="/" className="press rounded-full bg-card/80 px-3 py-1.5 text-xs font-bold text-primary">
            Skip login ›
          </Link>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="grid h-20 w-20 place-items-center rounded-3xl bg-card shadow-md">
            <ThelaLogo className="h-12 w-12" />
          </div>
          <h1 className="mt-3 text-2xl font-black tracking-tight">ThelaWala</h1>
          <p className="mt-0.5 text-xs font-semibold text-muted-foreground">Local Thela · Super Fast Delivery</p>

          <div className="mt-6 w-full rounded-3xl bg-card p-4 shadow-lg">
            <p className="text-sm font-black">Log in or sign up</p>
            <p className="text-[11px] text-muted-foreground">Customers, stall owners and delivery partners</p>

            <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
              {(["phone", "email"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  className={`rounded-lg py-2 text-xs font-black ${
                    mode === m ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  {m === "phone" ? "Mobile OTP" : "Email code"}
                </button>
              ))}
            </div>

            {mode === "email" ? (
              <>
                <label className="mt-3 block text-[11px] font-semibold text-muted-foreground">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-1 w-full rounded-xl border border-border px-3 py-3 text-sm outline-none focus:border-primary"
                />
              </>
            ) : (
              <>
                <label className="mt-3 block text-[11px] font-semibold text-muted-foreground">Mobile number</label>
                <div className="mt-1 flex items-center rounded-xl border border-border focus-within:border-primary">
                  <span className="px-3 text-sm font-bold text-muted-foreground">+91</span>
                  <input
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="10-digit number"
                    className="w-full rounded-r-xl py-3 pr-3 text-sm outline-none"
                  />
                </div>
              </>
            )}

            {sent ? (
              <>
                <label className="mt-3 block text-[11px] font-semibold text-muted-foreground">Enter the code</label>
                <input
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6-digit code"
                  className="mt-1 w-full rounded-xl border border-border px-3 py-3 text-center text-lg font-bold tracking-[0.4em] outline-none focus:border-primary"
                />
                <button
                  disabled={busy || code.length < 4}
                  onClick={verify}
                  className="press mt-3 w-full rounded-xl bg-primary py-3.5 text-sm font-black text-primary-foreground disabled:opacity-50"
                >
                  Continue
                </button>
                <button onClick={sendCode} className="mt-2 w-full text-xs font-bold text-primary">
                  Resend code
                </button>
              </>
            ) : (
              <button
                disabled={busy || !canSend}
                onClick={sendCode}
                className="press mt-3 w-full rounded-xl bg-primary py-3.5 text-sm font-black text-primary-foreground disabled:opacity-50"
              >
                {busy ? "Sending…" : "Continue"}
              </button>
            )}
            {msg ? <p className="mt-2 text-xs text-muted-foreground">{msg}</p> : null}

            <button
              onClick={google}
              className="press mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-bold"
            >
              Continue with Google
            </button>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link to="/vendor" className="rounded-xl border border-border py-2.5 text-center text-[11px] font-black text-primary">
                Stall partner portal
              </Link>
              <Link to="/rider" className="rounded-xl border border-border py-2.5 text-center text-[11px] font-black text-primary">
                Delivery partner portal
              </Link>
            </div>
          </div>

          <p className="mt-4 px-4 text-center text-[11px] text-muted-foreground">
            Need help? Call our care team on{" "}
            <a href="tel:9078492360" className="font-bold text-primary">9078492360</a>
          </p>
        </div>
      </div>
    </div>
  );
}
