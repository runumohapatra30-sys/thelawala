import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ThelaLogo } from "@/components/Shell";
import { isGoogleIdentityConfigured, waitForGoogleIdentity } from "@/lib/googleIdentity";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — ThelaWala" },
      { name: "description", content: "Continue to ThelaWala with Google or guest checkout." },
      { property: "og:title", content: "Sign in — ThelaWala" },
      {
        property: "og:description",
        content: "Fast guest and customer login for Bhubaneswar street food delivery.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

export function AuthPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
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
    navigate({ to: "/" });
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) goAfterLogin();
    });
  }, [navigate]);

  function signInWithGoogle() {
    setBusy(true);
    const stopWaiting = waitForGoogleIdentity(true);
    if (!isGoogleIdentityConfigured()) {
      stopWaiting();
      setBusy(false);
      setMsg("Google sign-in is not configured yet.");
      return;
    }
    setMsg("Choose your Google account to continue.");
  }

  async function continueAsGuest() {
    setBusy(true);
    setMsg(null);
    const { data, error } = await supabase.auth.signInAnonymously({
      options: { data: { full_name: name.trim(), mobile: fullPhone } },
    });
    if (error || !data.user) {
      localStorage.setItem("thelawala.guest_name", name.trim());
      localStorage.setItem("thelawala.guest_mobile", fullPhone);
      setBusy(false);
      await goAfterLogin();
      return;
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
  }

  return (
    <div className="food-grid-bg min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col px-5 pb-8 pt-4">
        <div className="flex justify-end">
          <Link
            to="/"
            className="press rounded-full bg-card/80 px-3 py-1.5 text-xs font-bold text-primary"
          >
            Skip login ›
          </Link>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="grid h-20 w-20 place-items-center rounded-3xl bg-card shadow-md">
            <ThelaLogo className="h-12 w-12" />
          </div>
          <h1 className="mt-3 text-2xl font-black tracking-tight">ThelaWala</h1>
          <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
            Local Thela · Super Fast Delivery
          </p>

          <div className="mt-6 w-full rounded-3xl bg-card p-4 shadow-lg">
            <p className="text-sm font-black">Log in or sign up</p>
            <button
              type="button"
              onClick={signInWithGoogle}
              className="press mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-black text-primary-foreground"
            >
              <span className="grid h-5 w-5 place-items-center rounded-full bg-white text-xs font-black text-[#4285F4]">
                G
              </span>
              Sign in with Google
            </button>
            <div className="my-4 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> Or continue as guest{" "}
              <span className="h-px flex-1 bg-border" />
            </div>
            <>
              <label className="mt-3 block text-[11px] font-semibold text-muted-foreground">
                Your name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="mt-1 w-full rounded-xl border border-border px-3 py-3 text-sm outline-none focus:border-primary"
              />
              <label className="mt-3 block text-[11px] font-semibold text-muted-foreground">
                Mobile number
              </label>
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

            <button
              disabled={busy}
              onClick={continueAsGuest}
              className="press mt-3 w-full rounded-xl bg-primary py-3.5 text-sm font-black text-primary-foreground disabled:opacity-50"
            >
              {busy ? "Please wait…" : "Continue as guest"}
            </button>
            {msg ? <p className="mt-2 text-xs text-muted-foreground">{msg}</p> : null}

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link
                to="/vendor"
                className="rounded-xl border border-border py-2.5 text-center text-[11px] font-black text-primary"
              >
                Stall partner portal
              </Link>
              <Link
                to="/rider"
                className="rounded-xl border border-border py-2.5 text-center text-[11px] font-black text-primary"
              >
                Delivery partner portal
              </Link>
            </div>
          </div>

          <p className="mt-4 px-4 text-center text-[11px] text-muted-foreground">
            Need help? Call our care team on{" "}
            <a href="tel:9078492360" className="font-bold text-primary">
              9078492360
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
