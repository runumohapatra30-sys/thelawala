import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { GreenButton, PortalHeader, Shell } from "@/components/Shell";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — ThelaWala" },
      { name: "description", content: "Sign in to ThelaWala with an email code or Google to order street food in 15 minutes." },
      { property: "og:title", content: "Sign in — ThelaWala" },
      { property: "og:description", content: "Email code or Google sign-in for Bhubaneswar street food delivery." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [googleOn, setGoogleOn] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
    supabase
      .from("system_settings")
      .select("enable_google_login")
      .maybeSingle()
      .then(({ data }) => setGoogleOn(data?.enable_google_login ?? true));
  }, [navigate]);

  async function sendCode() {
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) return setMsg(error.message);
    setSent(true);
    setMsg("We emailed you a 6-digit code. It is valid for a few minutes.");
  }

  async function verify() {
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });
    setBusy(false);
    if (error) return setMsg(error.message);
    navigate({ to: "/" });
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) return setMsg("Google sign-in failed. Try the email code.");
    if (result.redirected) return;
    navigate({ to: "/" });
  }

  return (
    <Shell>
      <PortalHeader title="Sign in to ThelaWala" subtitle="Order hot street food in 15 minutes" />
      <div className="space-y-4 p-4">
        <div className="card-soft border border-border p-4">
          <label className="block text-xs font-semibold text-muted-foreground">Email address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          {sent ? (
            <>
              <label className="mt-3 block text-xs font-semibold text-muted-foreground">Enter the code</label>
              <input
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="6-digit code"
                className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 text-center text-lg font-bold tracking-[0.4em] outline-none focus:border-primary"
              />
              <GreenButton className="mt-3" disabled={busy || code.length < 4} onClick={verify}>
                Verify &amp; continue
              </GreenButton>
              <button onClick={sendCode} className="mt-2 w-full text-xs font-semibold text-primary">
                Resend code
              </button>
            </>
          ) : (
            <GreenButton className="mt-3" disabled={busy || !email.includes("@")} onClick={sendCode}>
              Send login code
            </GreenButton>
          )}
          {msg ? <p className="mt-2 text-xs text-muted-foreground">{msg}</p> : null}
        </div>

        {googleOn ? (
          <button
            onClick={google}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-bold"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4"><path fill="#EA4335" d="M12 10.2v3.9h5.5a4.7 4.7 0 01-2 3.1l3.2 2.5c1.9-1.7 3-4.3 3-7.4 0-.7-.1-1.4-.2-2z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.3l-3.2-2.5c-.9.6-2.1 1-3.5 1a6 6 0 01-5.7-4.1l-3.3 2.5A10 10 0 0012 22z"/><path fill="#FBBC05" d="M6.3 14.1a6 6 0 010-3.8L3 7.8a10 10 0 000 8.4z"/><path fill="#4285F4" d="M12 6.1c1.5 0 2.8.5 3.9 1.5l2.9-2.9A10 10 0 003 7.8l3.3 2.5A6 6 0 0112 6.1z"/></svg>
            Continue with Google
          </button>
        ) : null}

        <p className="px-2 text-center text-[11px] text-muted-foreground">
          Need help? Call our care team on{" "}
          <a href="tel:9078492360" className="font-bold text-primary">9078492360</a>
        </p>
      </div>
    </Shell>
  );
}
