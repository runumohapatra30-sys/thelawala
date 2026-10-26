import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import trackImage from "@/assets/onboarding-track.png";
import deliveryImage from "@/assets/onboarding-delivery.png";
import carefulImage from "@/assets/onboarding-careful.png";

type Props = { onComplete: () => void };

const slides = [
  {
    image: trackImage,
    alt: "Delivery rider on a scooter",
    title: "Easily track your package",
    detail: "Getting location updates from our couriers",
  },
  {
    image: deliveryImage,
    alt: "Courier delivering a package",
    title: "Fast delivery in your area",
    detail: "Your package will come right to your door as soon as possible",
  },
  {
    image: carefulImage,
    alt: "Courier carefully delivering a package",
    title: "Delivering your package carefully",
    detail: "We care about your package as you do",
  },
];

export function OnboardingScreen({ onComplete }: Props) {
  const [index, setIndex] = useState(0);
  const slide = slides[index]!;


  function next() {
    if (index < slides.length - 1) {
      setIndex((current) => current + 1);
      return;
    }

    window.localStorage.setItem("thelawala_onboarding_completed", "1");
    onComplete();
  }

  return (
    <main className="fixed inset-0 z-[100] flex min-h-[100svh] flex-col bg-white px-6 pt-[max(24px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))]">
      <section className="mx-auto flex w-full max-w-[430px] flex-1 flex-col">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.22 }}
              className="flex w-full flex-col items-center"
            >
              <div className="mb-8 flex h-[38svh] max-h-[340px] min-h-[230px] w-full items-center justify-center">
                <img
                  src={slide.image}
                  alt={slide.alt}
                  className="h-full w-full object-contain"
                />
              </div>

              <h1 className="max-w-[330px] text-[24px] font-bold leading-tight text-[#222222]">
                {slide.title}
              </h1>

              <p className="mt-4 max-w-[280px] text-[13px] leading-5 text-[#A6A6A6]">
                {slide.detail}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="pb-2">
          <div
            className="mb-8 flex items-center justify-center gap-1.5"
            aria-label={`Page ${index + 1} of ${slides.length}`}
          >
            {slides.map((_, dot) => (
              <span
                key={dot}
                className={`h-[6px] rounded-full transition-all ${
                  dot === index
                    ? "w-7 bg-[#FF6500]"
                    : "w-[6px] bg-[#D7D7D7]"
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={next}
            className="h-[52px] w-full rounded-[10px] bg-[#FF6500] text-sm font-semibold text-white active:scale-[0.99]"
          >
            {index === slides.length - 1 ? "Get started" : "Next"}
          </button>
        </div>
      </section>
    </main>
  );
}
