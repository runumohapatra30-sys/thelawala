import { Link } from "@tanstack/react-router";
import { ArrowRight, MapPin, Sparkles } from "lucide-react";
import { useAuthBranding } from "@/lib/authBranding";

export function WelcomeFoodScreen() {
  const branding = useAuthBranding();

  return (
    <main className="fixed inset-0 z-[100] flex min-h-[100svh] items-center justify-center overflow-y-auto bg-[#FFF8F2] px-4 py-6">
      <div className="w-full max-w-md">
        <section className="relative flex min-h-[72svh] flex-col justify-end overflow-hidden rounded-[2rem] bg-[#32291F] p-6 text-white shadow-[0_24px_70px_-30px_rgba(111,55,22,0.55)]">
          <img
            src={branding.loginHeroImage || "/food/food-biryani.jpg"}
            alt="A delicious meal from Thelawala"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/15 to-black/80" />
          <div className="relative z-10">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-black/25 px-3 py-1.5 text-[11px] font-bold backdrop-blur-sm">
              <MapPin className="h-3.5 w-3.5" /> Your local food, delivered
            </span>
            <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight">
              Good food.
              <br />
              Right around you.
            </h1>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/85">
              Discover the flavours you love from neighbourhood stalls on {branding.brandTitle}.
            </p>
            <Link
              to="/auth"
              className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#FF5200] px-5 text-base font-black text-white shadow-lg transition hover:bg-[#e94b00]"
            >
              Get Started <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              to="/auth"
              className="mt-3 flex min-h-11 w-full items-center justify-center rounded-xl border border-white/40 bg-white/10 text-sm font-bold text-white backdrop-blur-sm"
            >
              Sign In
            </Link>
          </div>
        </section>
        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] font-semibold text-[#8B7868]">
          <Sparkles className="h-3.5 w-3.5 text-[#FF5200]" /> Fresh local favourites, delivered with
          care
        </p>
      </div>
    </main>
  );
}
