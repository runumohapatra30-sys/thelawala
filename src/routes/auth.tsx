import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GoogleButton } from "@/components/LoginModal";
import brand from "@/assets/thelawala-brand.jpeg.asset.json";
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Welcome — ThelaWala" },
      {
        name: "description",
        content: "Discover local stalls and get fast delivery with ThelaWala.",
      },
      { property: "og:title", content: "Welcome — ThelaWala" },
      {
        property: "og:description",
        content: "Street food delivery from local stalls in your area.",
      },
    ],
  }),
  component: AuthPage,
});

const onboardingSlides = [
  {
    eyebrow: "LOCAL DELIVERY",
    title: "Easily track your order",
    description:
      "Know what's happening with your order and get updates as it makes its way to you.",
    Icon: Truck,
    illustration: "scooter",
  },
  {
    eyebrow: "FAST & CONVENIENT",
    title: "Fast delivery in your area",
    description:
      "Order from nearby local stalls and get your favourite items delivered to your door.",
    Icon: MapPin,
    illustration: "delivery",
  },
  {
    eyebrow: "SUPPORT LOCAL",
    title: "Your local stalls, at your fingertips",
    description:
      "Discover neighbourhood vendors and enjoy a simple, convenient ordering experience.",
    Icon: PackageCheck,
    illustration: "stall",
  },
];

function DeliveryIllustration({ type }: { type: string }) {
  const Icon =
    type === "scooter" ? Truck : type === "delivery" ? MapPin : PackageCheck;

  return (
    <div className="relative mx-auto flex h-56 w-full max-w-xs items-center justify-center">
      <div className="absolute h-44 w-44 rounded-full bg-emerald-50" />
      <div className="absolute left-8 top-8 h-12 w-12 rounded-2xl bg-orange-100" />
      <div className="absolute bottom-8 right-8 h-10 w-10 rounded-full bg-emerald-100" />

      <div className="relative flex h-36 w-36 items-center justify-center rounded-[2.5rem] border border-emerald-100 bg-white shadow-xl shadow-emerald-900/10">
        <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-[#0A4D3C] text-white">
          <Icon className="h-14 w-14" strokeWidth={1.5} />
        </div>

        <span className="absolute -right-3 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#F97316] text-white shadow-md">
          <Sparkles className="h-5 w-5" />
        </span>

        <span className="absolute -bottom-3 -left-3 flex h-10 w-10 items-center justify-center rounded-full border-4 border-white bg-emerald-100 text-[#0A4D3C]">
          <PackageCheck className="h-5 w-5" />
        </span>
      </div>

      <div className="absolute bottom-2 left-1/2 h-1 w-48 -translate-x-1/2 rounded-full bg-slate-200" />
    </div>
  );
}

export function AuthPage() {
  const navigate = useNavigate();
  const [slide, setSlide] = useState(0);
  const [showAuth, setShowAuth] = useState(false);

  async function checkExistingUser() {
    const { data } = await supabase.auth.getUser();

    if (data?.user?.id) {
      navigate({ to: "/" });
    }
  }

  useEffect(() => {
    void checkExistingUser();
  }, []);

  function nextSlide() {
    if (slide < onboardingSlides.length - 1) {
      setSlide((current) => current + 1);
    } else {
      setShowAuth(true);
    }
  }

  function skipOnboarding() {
    setShowAuth(true);
  }

  if (!showAuth) {
    const current = onboardingSlides[slide];
    const IllustrationIcon = current.Icon;

    return (
      <main className="min-h-[100svh] bg-[#F5F6F5] px-5 py-5 sm:flex sm:items-center sm:justify-center">
        <section className="mx-auto flex min-h-[calc(100svh-40px)] w-full max-w-md flex-col overflow-hidden rounded-[2rem] bg-white px-6 pb-7 pt-6 shadow-xl shadow-black/5 sm:min-h-[760px]">
          <div className="flex items-center justify-between">
            <Link
              to="/"
              aria-label="Back to home"
              className="grid h-10 w-10 place-items-center rounded-full border border-slate-100 text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            <div className="flex items-center gap-2">
              <img
                src={brand.url}
                alt="ThelaWala logo"
                className="h-8 w-8 rounded-lg object-cover"
              />
              <span className="font-extrabold tracking-tight text-[#0A4D3C]">
                Thela<span className="text-[#F97316]">Wala</span>
              </span>
            </div>

            <button
              type="button"
              onClick={skipOnboarding}
              className="text-sm font-semibold text-slate-500 hover:text-[#0A4D3C]"
            >
              Skip
            </button>
          </div>

          <div className="flex flex-1 flex-col justify-center">
            <DeliveryIllustration type={current.illustration} />

            <div className="mt-5 text-center">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#0A4D3C]">
                <IllustrationIcon className="h-4 w-4" />
                {current.eyebrow}
              </div>

              <h1 className="mx-auto max-w-xs text-3xl font-black leading-tight tracking-tight text-[#202622]">
                {current.title}
              </h1>

              <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-slate-500">
                {current.description}
              </p>
            </div>
          </div>

          <div className="mt-8">
            <div
              className="mb-6 flex items-center justify-center gap-2"
              aria-label={`Slide ${slide + 1} of ${onboardingSlides.length}`}
            >
              {onboardingSlides.map((item, index) => (
                <span
                  key={item.title}
                  className={`h-2 rounded-full transition-all ${
                    index === slide
                      ? "w-8 bg-[#F97316]"
                      : "w-2 bg-slate-200"
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={nextSlide}
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#0A4D3C] px-5 py-4 font-bold text-white shadow-lg shadow-emerald-900/15 transition hover:bg-[#0F4C3A] active:scale-[0.99]"
            >
              {slide === onboardingSlides.length - 1
                ? "Get Started"
                : "Next"}
              <ArrowRight className="h-5 w-5" />
            </button>

            <p className="mt-4 text-center text-xs text-slate-400">
              Local Thela · Super Fast Delivery
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-[100svh] flex-col justify-between overflow-hidden bg-gradient-to-b from-[#F0F7F2] via-white to-[#F8FAF8] px-6 pb-8 pt-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowAuth(false)}
          aria-label="Back to onboarding"
          className="grid h-10 w-10 place-items-center rounded-full bg-white text-[#222] shadow-sm transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <span className="text-xs font-bold uppercase tracking-wider text-[#0A4D3C]">
          Bhubaneswar
        </span>
      </div>

      <div className="mx-auto my-auto flex w-full max-w-sm flex-col items-center py-10 text-center">
        <div className="relative mb-6">
          <img
            src={brand.url}
            alt="ThelaWala"
            className="h-24 w-24 rounded-3xl border-2 border-white object-cover shadow-[0_12px_28px_rgba(10,77,60,0.18)]"
          />

          <span className="absolute -bottom-2 -right-2 grid h-8 w-8 place-items-center rounded-full bg-[#F97316] text-white shadow-md">
            <Sparkles className="h-4 w-4" />
          </span>
        </div>

        <h1 className="text-3xl font-black tracking-tight text-[#202622]">
          Welcome to <span className="text-[#0A4D3C]">ThelaWala</span>
        </h1>

        <p className="mt-3 max-w-[290px] text-sm leading-6 text-slate-500">
          Order from your favourite local stalls and enjoy fast, convenient
          delivery right to your door.
        </p>

        <div className="mt-8 flex items-center justify-center gap-4 rounded-2xl border border-emerald-100 bg-white px-5 py-4 shadow-sm">
          <div className="text-center">
            <p className="text-xs font-black text-[#0A4D3C]">LOCAL</p>
            <p className="mt-1 text-[10px] text-slate-500">Stalls</p>
          </div>

          <div className="h-7 w-px bg-slate-200" />

          <div className="text-center">
            <p className="text-xs font-black text-[#0A4D3C]">FAST</p>
            <p className="mt-1 text-[10px] text-slate-500">Delivery</p>
          </div>

          <div className="h-7 w-px bg-slate-200" />

          <div className="text-center">
            <p className="text-xs font-black text-[#0A4D3C]">EASY</p>
            <p className="mt-1 text-[10px] text-slate-500">Ordering</p>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-sm space-y-4">
        <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
          <p className="mb-3 text-center text-xs font-bold text-slate-600">
            Sign in or create an account securely
          </p>

          <GoogleButton
            className="h-13 w-full rounded-xl border border-slate-200 bg-white text-sm font-bold text-[#222] shadow-sm transition hover:bg-slate-50 active:scale-[0.99]"
            onSuccess={() => navigate({ to: "/" })}
          />
        </div>

        <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5 text-[#0A4D3C]" />
          Secure Google authentication · No password needed
        </p>
      </div>
    </main>
  );
}
