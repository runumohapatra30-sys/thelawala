import { Link } from "@tanstack/react-router";
import { ArrowRight, Facebook, MapPin, Twitter } from "lucide-react";
import { GoogleButton, SocialAuthButton } from "@/components/LoginModal";
import { useAuthBranding } from "@/lib/authBranding";

export function WelcomeFoodScreen() {
  const branding = useAuthBranding();
  const fallbackImage = "/food/food-biryani.jpg";

  return (
    <main className="fixed inset-0 z-[100] flex min-h-[100svh] items-center justify-center overflow-y-auto bg-[#FFF8F2] px-4 py-5">
      <div className="w-full max-w-[420px] rounded-[2rem] bg-white p-3 shadow-[0_24px_70px_-30px_rgba(111,55,22,0.35)]">
        <section className="relative flex min-h-[42svh] flex-col justify-end overflow-hidden rounded-[1.5rem] bg-[#32291F] p-6 text-white">
          <img
            src={branding.loginHeroImage || fallbackImage}
            alt="A delicious meal from Thelawala"
            onError={(event) => {
              if (event.currentTarget.src !== new URL(fallbackImage, window.location.href).href) {
                event.currentTarget.src = fallbackImage;
              }
            }}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/15 to-black/80" />
          <div className="relative z-10">
            <div className="mb-3 flex items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-sm font-black text-[#F4511E]">TW</span>
              <span className="font-display text-2xl font-extrabold">ThelaWala</span>
            </div>
            <h1 className="max-w-xs text-[1.75rem] font-extrabold leading-tight">Your local favourites, delivered.</h1>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-white/85">
              <MapPin className="h-4 w-4 shrink-0" /> Fresh from neighbourhood stalls
            </p>
          </div>
        </section>
        <div className="px-3 pb-3 pt-4">
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#F4511E] px-5 text-sm font-extrabold text-white transition hover:bg-[#D84315]"
          >
            Get Started <ArrowRight className="h-4 w-4" />
          </Link>
          <div className="my-4 flex items-center gap-3 text-[11px] font-semibold text-[#8B7868]">
            <span className="h-px flex-1 bg-[#E9E2DC]" />
            <span>Sign in with</span>
            <span className="h-px flex-1 bg-[#E9E2DC]" />
          </div>
          <div className="flex justify-center gap-3">
            <SocialAuthButton provider="facebook" label="Facebook">
              <Facebook className="h-5 w-5 fill-current" />
            </SocialAuthButton>
            <GoogleButton iconOnly className="!h-11 !w-11 !border-[#E9E2DC] !shadow-none" />
            <SocialAuthButton provider="twitter" label="Twitter">
              <Twitter className="h-5 w-5" />
            </SocialAuthButton>
          </div>
          <p className="mt-4 text-center text-xs text-[#75665C]">
            Don&apos;t have an account?{" "}
            <Link to="/auth" search={{ mode: "signup" }} className="font-extrabold text-[#F4511E]">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
