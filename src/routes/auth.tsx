import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GoogleButton } from "@/components/LoginModal";
import brand from "@/assets/thelawala-brand.jpeg.asset.json";
import { ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — ThelaWala" },
      { name: "description", content: "Continue to ThelaWala with fast Google sign-in." },
      { property: "og:title", content: "Sign in — ThelaWala" },
      { property: "og:description", content: "Street food delivery in Bhubaneswar." },
    ],
  }),
  component: AuthPage,
});

export function AuthPage() {
  const navigate = useNavigate();

  async function checkExistingUser() {
    const { data } = await supabase.auth.getUser();
    if (data?.user?.id) {
      navigate({ to: "/" });
    }
  }

  useEffect(() => {
    void checkExistingUser();
  }, []);

  return (
    <main className="relative flex min-h-[100svh] flex-col justify-between bg-gradient-to-b from-[#FFF5EE] via-[#FFFFFF] to-[#FAF8F5] px-6 pb-8 pt-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="grid h-10 w-10 place-items-center rounded-full bg-white shadow-sm text-[#222] active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="text-xs font-bold uppercase tracking-wider text-[#FF5A1F]">Bhubaneswar</span>
      </div>

      {/* Center Hero Card */}
      <div className="my-auto flex flex-col items-center text-center">
        <div className="relative mb-6">
          <img
            src={brand.url}
            alt="ThelaWala"
            className="h-24 w-24 rounded-3xl object-cover shadow-[0_12px_28px_rgba(255,90,31,0.22)] border-2 border-white"
          />
          <span className="absolute -bottom-2 -right-2 grid h-8 w-8 place-items-center rounded-full bg-[#FF5A1F] text-white shadow-md">
            <Sparkles className="h-4 w-4" />
          </span>
        </div>

        <h1 className="text-3xl font-black tracking-tight text-[#1E1E1E]">
          Welcome to <span className="text-[#FF5A1F]">ThelaWala</span>
        </h1>
        <p className="mt-2.5 max-w-[280px] text-sm text-[#666666] leading-relaxed">
          15-minute hyper-local street food delivery straight from your favorite local thelas.
        </p>

        {/* Feature Highlights */}
        <div className="mt-8 flex items-center justify-center gap-4 rounded-2xl bg-white px-5 py-3 shadow-[0_4px_16px_rgba(0,0,0,0.04)] border border-[#F2E8DC]">
          <div className="text-center">
            <p className="text-xs font-black text-[#FF5A1F]">15 MIN</p>
            <p className="text-[10px] text-[#777]">Fast Delivery</p>
          </div>
          <div className="h-6 w-px bg-[#E5E5E5]" />
          <div className="text-center">
            <p className="text-xs font-black text-[#16A34A]">100% LIVE</p>
            <p className="text-[10px] text-[#777]">Local Stalls</p>
          </div>
          <div className="h-6 w-px bg-[#E5E5E5]" />
          <div className="text-center">
            <p className="text-xs font-black text-[#2563EB]">EASY</p>
            <p className="text-[10px] text-[#777]">Care Support</p>
          </div>
        </div>
      </div>

      {/* Bottom Auth Section */}
      <div className="w-full max-w-sm mx-auto space-y-4">
        <div className="rounded-2xl bg-white p-4 shadow-[0_6px_20px_rgba(0,0,0,0.05)] border border-[#F0E6DA]">
          <p className="text-center text-xs font-bold text-[#444] mb-3">
            Sign in with one tap to continue
          </p>
          <GoogleButton
            className="w-full h-13 rounded-xl bg-white border border-[#E5E5E5] text-sm font-bold text-[#222] shadow-sm hover:bg-neutral-50 active:scale-[0.99]"
            onSuccess={() => navigate({ to: "/" })}
          />
        </div>

        <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-[#888]">
          <ShieldCheck className="h-3.5 w-3.5 text-[#16A34A]" />
          Secure authentication · No passwords needed
        </p>
      </div>
    </main>
  );
}
