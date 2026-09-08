import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
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

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"phone" | "email">("phone");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [googleOn, setGoogleOn] = useState(true);

  const fullPhone = `+91${phone.replace(/\D/g, "").slice(-10)}`;

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

    const [{ data: vendor }, { data: partner }] = await Promise.all([
      supabase.from("vendors").select("id").eq("owner_id", uid).maybeSingle(),
      supabase.from("delivery_partners").select("id").eq("user_id", uid).maybeSingle(),
    ]);

    if (saved?.startsWith("/vendor")) return navigate({ to: "/vendor" });
    if (saved?.startsWith("/rider") || saved?.startsWith("/delivery")) return navigate({ to: "/rider" });
    if (vendor) return navigate({ to: "/vendor" });
    if (partner) return navigate({ to: "/rider" });
    navigate({ to: "/" });
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) goAfterLogin();
    });
    supabase
      .from("system_settings")
      .select("enable_google_login")
      .maybeSingle()
      .then(({ data }) => setGoogleOn(data?.enable_google_login ?? true));
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
            options: { emailRedirectTo: window.location.origin },
          })
        : await supabase.auth.signInWithOtp({ phone: fullPhone });
    setBusy(false);
    if (error) {
      return setMsg(
        mode === "phone"
          ? "We could not send the SMS code right now. Please use email or Google."
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
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) return setMsg("Google sign-in failed. Try the code instead.");
    if (result.redirected) return;
    await goAfterLogin();
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

            {googleOn ? (
              <button
                onClick={google}
                className="press mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-bold"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4"><path fill="#EA4335" d="M12 10.2v3.9h5.5a4.7 4.7 0 01-2 3.1l3.2 2.5c1.9-1.7 3-4.3 3-7.4 0-.7-.1-1.4-.2-2z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.3l-3.2-2.5c-.9.6-2.1 1-3.5 1a6 6 0 01-5.7-4.1l-3.3 2.5A10 10 0 0012 22z"/><path fill="#FBBC05" d="M6.3 14.1a6 6 0 010-3.8L3 7.8a10 10 0 000 8.4z"/><path fill="#4285F4" d="M12 6.1c1.5 0 2.8.5 3.9 1.5l2.9-2.9A10 10 0 003 7.8l3.3 2.5A6 6 0 0112 6.1z"/></svg>
                Continue with Google
              </button>
            ) : null}

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
