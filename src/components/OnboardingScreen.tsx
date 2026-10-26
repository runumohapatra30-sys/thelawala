import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Props = { onComplete: () => void };

// Slide 1: Easily track your package
function ScooterIllustration() {
  return (
    <svg viewBox="0 0 280 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full max-h-[220px]">
      <circle cx="140" cy="110" r="95" fill="#FFF3EB" />
      <path d="M40 185C80 185 200 185 240 185" stroke="#E5E7EB" strokeWidth="4" strokeLinecap="round" strokeDasharray="8 8" />
      {/* Wheels */}
      <circle cx="85" cy="165" r="24" fill="#374151" />
      <circle cx="85" cy="165" r="12" fill="#E5E7EB" />
      <circle cx="195" cy="165" r="24" fill="#374151" />
      <circle cx="195" cy="165" r="12" fill="#E5E7EB" />
      {/* Scooter Body */}
      <path d="M85 165H125L150 140H185L195 165" stroke="#FF6500" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M120 145H165V125H135L120 145Z" fill="#FF6500" />
      <path d="M175 140L165 95H150" stroke="#1F2937" strokeWidth="5" strokeLinecap="round" />
      <circle cx="170" cy="95" r="6" fill="#FBBF24" />
      {/* Delivery Box */}
      <rect x="75" y="110" width="44" height="40" rx="6" fill="#EA580C" />
      <path d="M75 125H119" stroke="#FED7AA" strokeWidth="2" />
      {/* Rider */}
      <circle cx="140" cy="70" r="14" fill="#FED7AA" />
      <path d="M125 68C125 55 133 48 145 48C155 48 160 55 160 68H125Z" fill="#FF6500" />
      <path d="M140 62H156V69H140V62Z" fill="#1F2937" />
      <path d="M126 84C126 84 135 80 145 80C155 80 162 84 162 84L165 115H125L126 84Z" fill="#1F2937" />
      <path d="M142 80V115" stroke="#FF6500" strokeWidth="3" />
      <path d="M135 90L162 96" stroke="#FED7AA" strokeWidth="6" strokeLinecap="round" />
      {/* Speed lines */}
      <path d="M35 130H60" stroke="#FF6500" strokeWidth="3" strokeLinecap="round" />
      <path d="M25 145H50" stroke="#FF6500" strokeWidth="3" strokeLinecap="round" />
      <path d="M45 160H65" stroke="#FF6500" strokeWidth="3" strokeLinecap="round" />
      {/* Location Pin */}
      <g transform="translate(205, 50)">
        <path d="M15 0C6.7 0 0 6.7 0 15C0 26 15 40 15 40C15 40 30 26 30 15C30 6.7 23.3 0 15 0Z" fill="#FF6500" />
        <circle cx="15" cy="15" r="6" fill="white" />
      </g>
    </svg>
  );
}

// Slide 2: Fast delivery in your area
function DoorstepIllustration() {
  return (
    <svg viewBox="0 0 280 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full max-h-[220px]">
      <circle cx="140" cy="110" r="95" fill="#FFF7ED" />
      <rect x="160" y="45" width="70" height="145" rx="4" fill="#E5E7EB" stroke="#D1D5DB" strokeWidth="3" />
      <rect x="170" y="55" width="50" height="135" fill="#F3F4F6" />
      <circle cx="178" cy="120" r="4" fill="#9CA3AF" />
      <path d="M30 190H250" stroke="#E5E7EB" strokeWidth="4" strokeLinecap="round" />
      {/* Courier */}
      <circle cx="105" cy="72" r="13" fill="#FED7AA" />
      <path d="M92 70C92 58 100 52 110 52C118 52 123 58 123 70H92Z" fill="#FF6500" />
      <path d="M95 85C95 85 102 82 110 82C118 82 124 85 124 85L127 135H90L95 85Z" fill="#FF6500" />
      <path d="M96 135L92 185H102L106 145" fill="#1F2937" />
      <path d="M112 135L110 185H120L122 145" fill="#1F2937" />
      {/* Parcel Box */}
      <rect x="122" y="105" width="36" height="30" rx="3" fill="#D97706" />
      <path d="M122 118H158" stroke="#FDE68A" strokeWidth="3" />
      <path d="M140 105V135" stroke="#FDE68A" strokeWidth="3" />
      {/* Customer */}
      <circle cx="185" cy="78" r="12" fill="#FDE68A" />
      <path d="M174 90C174 90 180 88 186 88C192 88 197 90 197 90L200 145H172L174 90Z" fill="#4B5563" />
      <path d="M174 112L156 116" stroke="#FDE68A" strokeWidth="5" strokeLinecap="round" />
      <path d="M115 105L128 115" stroke="#FED7AA" strokeWidth="5" strokeLinecap="round" />
      {/* Check badge */}
      <circle cx="65" cy="90" r="18" fill="#FFEDD5" />
      <path d="M58 90L63 95L72 85" stroke="#FF6500" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Slide 3: Delivering your package carefully
function CarefulIllustration() {
  return (
    <svg viewBox="0 0 280 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full max-h-[220px]">
      <circle cx="140" cy="110" r="95" fill="#FEF3C7" />
      <path d="M40 190H240" stroke="#E5E7EB" strokeWidth="4" strokeLinecap="round" />
      {/* Courier */}
      <circle cx="130" cy="65" r="14" fill="#FED7AA" />
      <path d="M116 63C116 52 124 46 135 46C144 46 150 52 150 63H116Z" fill="#FF6500" />
      <path d="M135 55H158V62H135V55Z" fill="#FF6500" />
      <path d="M118 78C118 78 126 76 134 76C142 76 148 78 148 78L152 130H112L118 78Z" fill="#FF6500" />
      <path d="M118 130L114 185H126L130 145" fill="#1F2937" />
      <path d="M136 130L134 185H146L148 145" fill="#1F2937" />
      {/* Big Package */}
      <rect x="135" y="95" width="60" height="50" rx="4" fill="#D97706" />
      <path d="M135 118H195" stroke="#FDE68A" strokeWidth="3" />
      <path d="M165 95V145" stroke="#FDE68A" strokeWidth="3" />
      <circle cx="178" cy="110" r="6" fill="#EF4444" />
      {/* Arms holding box */}
      <path d="M125 95L145 115" stroke="#FED7AA" strokeWidth="6" strokeLinecap="round" />
      <path d="M138 122H150" stroke="#FED7AA" strokeWidth="6" strokeLinecap="round" />
      {/* Sparkles */}
      <path d="M75 95L78 85L81 95L91 98L81 101L78 111L75 101L65 98L75 95Z" fill="#F59E0B" opacity="0.8" />
      <path d="M215 75L217 68L219 75L226 77L219 79L217 86L215 79L208 77L215 75Z" fill="#F59E0B" opacity="0.8" />
    </svg>
  );
}

const slides = [
  {
    Illustration: ScooterIllustration,
    title: "Easily track your package",
    detail: "Getting location updates from our couriers",
  },
  {
    Illustration: DoorstepIllustration,
    title: "Fast delivery in your area",
    detail: "Your package will come right to your door as soon as possible",
  },
  {
    Illustration: CarefulIllustration,
    title: "Delivering your package carefully",
    detail: "We care about your package as you do",
  },
];

export function OnboardingScreen({ onComplete }: Props) {
  const [index, setIndex] = useState(0);
  const slide = slides[index]!;
  const SlideComponent = slide.Illustration;

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
              <div className="mb-8 flex h-[240px] w-full items-center justify-center">
                <SlideComponent />
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
            Next
          </button>
        </div>
      </section>
    </main>
  );
}

export default OnboardingScreen;
