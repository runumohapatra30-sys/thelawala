import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GoogleButton } from "@/components/LoginModal";
import { ThelaLogo } from "@/components/Shell";
import { useAuthBranding } from "@/lib/authBranding";
import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth")({
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
    <div className="min-h-screen bg-brand-soft">
      <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col bg-card">
        <div className="relative flex min-h-[56vh] flex-col justify-between overflow-hidden bg-foreground p-6 text-primary-foreground">
          <img
            src={branding.loginHeroImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-foreground/40 via-transparent to-card" />
          <div className="relative z-10 flex justify-end">
            <Link
              to="/"
              className="press rounded-full bg-card/90 px-3 py-1.5 text-xs font-bold text-card-foreground"
            >
              Back
            </Link>
          </div>
          <div className="relative z-10">
            <div className="mb-3 grid h-14 w-14 place-items-center overflow-hidden rounded-2xl bg-card p-2 shadow-sm">
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt="" className="h-full w-full object-contain" />
              ) : (
                <ThelaLogo className="h-10 w-10" />
              )}
            </div>
            <h1 className="text-3xl font-black text-foreground">{branding.brandTitle}</h1>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              Local favourites, delivered with care.
            </p>
            <Button
              type="button"
              onClick={() =>
                document
                  .getElementById("auth-options")
                  ?.scrollIntoView({ behavior: "smooth", block: "center" })
              }
              className="mt-5 h-12 w-full rounded-full text-sm font-extrabold"
            >
              Get Started <ArrowDown className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div id="auth-options" className="w-full bg-card px-6 pb-6 pt-5">
          <div className="flex items-center gap-3"><span className="h-px flex-1 bg-border" /><p className="text-xs font-semibold">Sign in with</p><span className="h-px flex-1 bg-border" /></div>
          <div className="mt-5 flex flex-col items-center gap-2">
            <GoogleButton className="h-12" />
          </div>
          <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">By continuing, you agree to our <Link to="/terms" className="text-primary">Terms & Privacy Policy</Link>.</p>

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
        <p className="mt-auto px-4 pb-6 text-center text-[11px] text-muted-foreground">
          Need help? Call our care team on{" "}
          <a href="tel:9078492360" className="font-bold text-primary">
            9078492360
          </a>
        </p>
      </div>
    </div>
  );
}
