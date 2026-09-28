import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GoogleButton } from "@/components/LoginModal";
import { ThelaLogo } from "@/components/Shell";

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
            <p className="text-sm font-black">One tap sign in</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Continue with your Google account — no OTP needed.</p>
            <div className="mt-3"><GoogleButton /></div>

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
    </div>
  );
}
