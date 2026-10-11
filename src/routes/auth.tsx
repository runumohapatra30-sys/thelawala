import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GoogleButton } from "@/components/LoginModal";
import { ThelaLogo } from "@/components/Shell";
import { useAuthBranding } from "@/lib/authBranding";
import { ArrowDown } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — ThelaWala" },
      { name: "description", content: "Continue to ThelaWala with one-tap Google sign-in." },
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
  const branding = useAuthBranding();

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

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col px-5 pb-8 pt-4">
        <div className="relative flex min-h-[45vh] flex-col justify-between overflow-hidden rounded-[2rem] bg-[#31352F] p-5 text-white shadow-sm">
          <img
            src={branding.loginHeroImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/10 to-black/70" />
          <div className="relative z-10 flex justify-end">
            <Link
              to="/"
              className="press rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-[#242424]"
            >
              Skip login ›
            </Link>
          </div>
          <div className="relative z-10">
            <div className="mb-3 grid h-14 w-14 place-items-center overflow-hidden rounded-2xl bg-white p-2 shadow-sm">
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt="" className="h-full w-full object-contain" />
              ) : (
                <ThelaLogo className="h-10 w-10" />
              )}
            </div>
            <h1 className="text-3xl font-black tracking-tight">{branding.brandTitle}</h1>
            <p className="mt-1 text-sm font-medium text-white/85">
              Local favourites, delivered with care.
            </p>
            <button
              type="button"
              onClick={() =>
                document
                  .getElementById("auth-options")
                  ?.scrollIntoView({ behavior: "smooth", block: "center" })
              }
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#FF5A1F] px-5 py-3 text-sm font-extrabold text-white shadow-lg"
            >
              Get Started <ArrowDown className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div id="auth-options" className="mt-5 w-full rounded-3xl bg-white p-5 shadow-sm">
          <p className="text-sm font-black">Welcome to {branding.brandTitle}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Continue with your Google account — no OTP needed.
          </p>
          <div className="mt-4">
            <GoogleButton />
          </div>

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
          <div className="mt-2 text-center">
            <Link
              to="/admin"
              className="text-[11px] font-bold text-muted-foreground underline-offset-2 hover:underline"
            >
              Admin portal
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
  );
}
