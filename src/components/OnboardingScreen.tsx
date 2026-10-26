import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Bike, MapPin, Store } from "lucide-react";
import foodBiryani from "@/assets/food-tiffin.jpg";
import foodDahiBara from "@/assets/food-dahibara.jpg";
import foodRoll from "@/assets/food-roll.jpg";

type Props = { onComplete: () => void };

const slides = [
  {
    eyebrow: "LOCAL FLAVOURS",
    title: "Your favourite thelas, closer than ever.",
    detail: "Discover real neighbourhood food from Bhubaneswar stalls.",
    image: foodDahiBara,
    icon: Store,
    imageAlt: "Local street-food favourite",
  },
  {
    eyebrow: "QUICK & EASY",
    title: "Order in a few simple taps.",
    detail: "Browse the live menu, add your favourites, and place your order.",
    image: foodBiryani,
    icon: MapPin,
    imageAlt: "A prepared local meal",
  },
  {
    eyebrow: "FOLLOW EVERY STEP",
    title: "Track your order to your door.",
    detail: "See preparation and delivery updates in your ThelaWala account.",
    image: foodRoll,
    icon: Bike,
    imageAlt: "A street-food meal ready for delivery",
  },
];

export function OnboardingScreen({ onComplete }: Props) {
  const [index, setIndex] = useState(0);
  const slide = slides[index]!;
  const Icon = slide.icon;
  const finish = () => {
    window.localStorage.setItem("thelawala_onboarding_completed", "1");
    onComplete();
  };

  return (
    <main className="fixed inset-0 z-[100] flex min-h-[100svh] items-center justify-center bg-[#F4F4F4] px-4 py-5">
      <section className="relative flex h-[min(850px,calc(100svh-40px))] w-full max-w-[390px] flex-col overflow-hidden rounded-[2.25rem] bg-white shadow-[0_24px_70px_-30px_rgba(61,44,30,.35)]">
        <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-6 pt-[max(18px,env(safe-area-inset-top))]">
          <span className="text-xs font-black tracking-[.18em] text-[#F45A0A]">THELAWALA</span>
          <button onClick={finish} className="rounded-full px-3 py-2 text-xs font-bold text-neutral-500">Skip</button>
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-6 pt-16 text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, x: 26 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -26 }}
              transition={{ duration: 0.22 }}
              className="flex w-full flex-col items-center"
            >
              <div className="relative mb-8 grid h-[min(36svh,300px)] w-full place-items-center overflow-hidden rounded-[2rem] bg-[#FFF1E8]">
                <img src={slide.image} alt={slide.imageAlt} className="h-full w-full object-cover" />
                <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-white/95 px-3 py-2 text-xs font-bold text-[#34271F] shadow-md">
                  <Icon className="h-4 w-4 text-[#F45A0A]" /> Bhubaneswar, Odisha
                </div>
              </div>
              <p className="text-[11px] font-black tracking-[.2em] text-[#F45A0A]">{slide.eyebrow}</p>
              <h1 className="mt-3 max-w-[310px] text-[29px] font-black leading-[1.12] tracking-tight text-[#202020]">{slide.title}</h1>
              <p className="mt-3 max-w-[290px] text-sm leading-6 text-neutral-500">{slide.detail}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="px-6 pb-[max(24px,env(safe-area-inset-bottom))]">
          <div className="mb-5 flex items-center justify-center gap-2" aria-label={`Page ${index + 1} of ${slides.length}`}>
            {slides.map((_, dot) => (
              <span key={dot} className={`h-2 rounded-full transition-all ${dot === index ? "w-7 bg-[#F45A0A]" : "w-2 bg-neutral-300"}`} />
            ))}
          </div>
          <div className="flex gap-3">
            {index > 0 && (
              <button onClick={() => setIndex((value) => value - 1)} aria-label="Previous page" className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-neutral-200 text-neutral-700">
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={() => index < slides.length - 1 ? setIndex((value) => value + 1) : finish()}
              className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#FF5A00] text-sm font-black text-white shadow-lg shadow-orange-500/20"
            >
              {index === slides.length - 1 ? "Get started" : "Next"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
