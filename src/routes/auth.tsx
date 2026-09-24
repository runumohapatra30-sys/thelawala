import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ThelaLogo } from "@/components/Shell";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — ThelaWala" },
      { name: "description", content: "Continue to ThelaWala with your name and mobile number or email and password." },
      { property: "og:title", content: "Sign in — ThelaWala" },
      { property: "og:description", content: "Fast guest and customer login for Bhubaneswar street food delivery." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

export function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"phone" | "email">("phone");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

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
    setMsg(null);
  }

  async function sendCode() {
    setBusy(true);
    setMsg(null);
    if (mode === "phone") {
      const { data, error } = await supabase.auth.signInAnonymously({
        options: { data: { full_name: name.trim(), mobile: fullPhone } },
      });
      if (error || !data.user) {
        setBusy(false);
        return setMsg("We could not start your session right now. Please try again.");
      }
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: data.user.id,
        full_name: name.trim(),
        mobile: fullPhone,
        email: data.user.email ?? null,
      });
      setBusy(false);
      if (profileError) return setMsg("We could not save your profile. Please try again.");
      localStorage.setItem("thelawala.guest_name", name.trim());
      localStorage.setItem("thelawala.guest_mobile", fullPhone);
      await goAfterLogin();
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) return setMsg("Email or password is incorrect. Use name and mobile for instant access.");
    await goAfterLogin();
  }

  const canSend = mode === "email" ? email.includes("@") && password.length >= 6 : name.trim().length > 1 && phone.replace(/\D/g, "").length === 10;

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
            <p className="text-[11px] text-muted-foreground">Continue instantly with your name and mobile number</p>

            <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
              {(["phone", "email"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  className={`rounded-lg py-2 text-xs font-black ${
                    mode === m ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  {m === "phone" ? "Phone / Guest" : "Email & password"}
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
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="mt-2 w-full rounded-xl border border-border px-3 py-3 text-sm outline-none focus:border-primary"
                />
              </>
            ) : (
              <>
                <label className="mt-3 block text-[11px] font-semibold text-muted-foreground">Your name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  className="mt-1 w-full rounded-xl border border-border px-3 py-3 text-sm outline-none focus:border-primary"
                />
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

            <button
              disabled={busy || !canSend}
              onClick={sendCode}
              className="press mt-3 w-full rounded-xl bg-primary py-3.5 text-sm font-black text-primary-foreground disabled:opacity-50"
            >
              {busy ? "Please wait…" : mode === "email" ? "Sign in" : "Continue"}
            </button>
            {msg ? <p className="mt-2 text-xs text-muted-foreground">{msg}</p> : null}

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
