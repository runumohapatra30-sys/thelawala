import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Props = { onComplete: () => void };

// Replace slide1Img, slide2Img, slide3Img with the data URIs in the file card above
const slides = [
  {
    image: slide1Img,
    title: "Easily track your package",
    detail: "Getting location updates from our couriers",
  },
  {
    image: slide2Img,
    title: "Fast delivery in your area",
    detail: "Your package will come right to your door as soon as possible",
  },
  {
    image: slide3Img,
    title: "Delivering your package carefully",
    detail: "We care about your package as you do",
  },
];

export function OnboardingScreen({ onComplete }: Props) {
  const [index, setIndex] = useState(0);
  const slide = slides[index]!;

  function next() {
    if (index < slides.length - 1) {
      setIndex((curr) => curr + 1);
      return;
    }

    try {
      window.localStorage.setItem("thelawala_onboarding_completed", "1");
    } catch {
      // ignore
    }
    onComplete();
  }

  return (
    <main className="fixed inset-0 z-[100] flex min-h-[100svh] flex-col bg-white px-6 pt-[max(24px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))]">
      <section className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-between py-4">
        {/* Main Illustration & Text */}
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, x: 26 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -26 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="flex w-full flex-col items-center"
            >
              <div className="mb-10 flex h-[260px] w-full items-center justify-center">
                <img
                  src={slide.image}
                  alt={slide.title}
                  className="max-h-[240px] w-auto max-w-[280px] object-contain drop-shadow-sm"
                />
              </div>

              <h1 className="max-w-[320px] text-[24px] font-bold leading-tight text-[#1E1E1E]">
                {slide.title}
              </h1>

              <p className="mt-3 max-w-[280px] text-[13px] leading-5 text-[#9E9E9E]">
                {slide.detail}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Navigation */}
        <div className="w-full pb-4">
          {/* Indicators */}
          <div
            className="mb-8 flex items-center justify-center gap-1.5"
            aria-label={`Page ${index + 1} of ${slides.length}`}
          >
            {slides.map((_, dot) => (
              <span
                key={dot}
                className={`h-[6px] rounded-full transition-all duration-200 ${
                  dot === index
                    ? "w-7 bg-[#FF6500]"
                    : "w-[6px] bg-[#E0E0E0]"
                }`}
              />
            ))}
          </div>

          {/* Next Button */}
          <button
            type="button"
            onClick={next}
            className="h-[52px] w-full rounded-[14px] bg-[#FF6500] text-[15px] font-semibold text-white shadow-md active:scale-[0.98] transition-all hover:bg-[#F25C00]"
          >
            {index === slides.length - 1 ? "Next" : "Next"}
          </button>
        </div>
      </section>
    </main>
  );
}
