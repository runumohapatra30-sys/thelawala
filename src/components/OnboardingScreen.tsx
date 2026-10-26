import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Props = { onComplete: () => void };

// Screen 1: Easily track your package (Rider on scooter)
function TrackIllustration() {
  return (
    <svg viewBox="0 0 320 280" className="h-full w-full max-h-[300px]" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="160" cy="245" rx="120" ry="12" fill="#F1F1F1" />
      {/* Scooter body */}
      <circle cx="95" cy="225" r="28" fill="#262626" />
      <circle cx="95" cy="225" r="14" fill="#E5E5E5" />
      <circle cx="230" cy="225" r="28" fill="#262626" />
      <circle cx="230" cy="225" r="14" fill="#E5E5E5" />
      <path d="M95 210 Q140 205 180 215 L215 210 Q235 185 220 165 L190 165 Q170 175 140 175 Z" fill="#2EC4B6" />
      <path d="M190 165 L210 120 L235 125" stroke="#262626" strokeWidth="6" strokeLinecap="round" />
      <rect x="180" y="112" width="55" height="10" rx="5" fill="#2EC4B6" />
      {/* Delivery Box */}
      <rect x="90" y="145" width="45" height="48" rx="6" fill="#FFA726" />
      <line x1="90" y1="168" x2="135" y2="168" stroke="#FB8C00" strokeWidth="3" />
      {/* Rider */}
      <circle cx="155" cy="95" r="18" fill="#FFCCBC" />
      <path d="M140 92 Q155 72 172 92 Z" fill="#FF5722" />
      <rect x="142" y="113" width="36" height="52" rx="10" fill="#FF6500" />
      <path d="M165 125 L205 125" stroke="#FF6500" strokeWidth="9" strokeLinecap="round" />
      <path d="M150 165 L165 210 L195 210" stroke="#37474F" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Screen 2: Fast delivery in your area (Courier handing box)
function DeliveryIllustration() {
  return (
    <svg viewBox="0 0 320 280" className="h-full w-full max-h-[300px]" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="160" cy="245" rx="120" ry="12" fill="#F1F1F1" />
      {/* Courier */}
      <circle cx="115" cy="85" r="16" fill="#FFCCBC" />
      <path d="M102 82 Q115 65 130 82 Z" fill="#FF5722" />
      <rect x="100" y="103" width="32" height="54" rx="8" fill="#FF6500" />
      <path d="M108 157 L95 235" stroke="#37474F" strokeWidth="9" strokeLinecap="round" />
      <path d="M124 157 L140 235" stroke="#37474F" strokeWidth="9" strokeLinecap="round" />
      {/* Package */}
      <rect x="135" y="125" width="50" height="42" rx="5" fill="#FFA726" stroke="#FB8C00" strokeWidth="2" />
      <line x1="135" y1="145" x2="185" y2="145" stroke="#E65100" strokeWidth="2" />
      {/* Arms handing over */}
      <path d="M120 120 L145 138" stroke="#FF6500" strokeWidth="8" strokeLinecap="round" />
      <path d="M198 122 L175 140" stroke="#00897B" strokeWidth="8" strokeLinecap="round" />
      {/* Customer */}
      <circle cx="210" cy="90" r="16" fill="#FFCCBC" />
      <path d="M200 78 Q222 75 224 95 Q212 92 200 78 Z" fill="#212121" />
      <rect x="195" y="108" width="30" height="50" rx="8" fill="#00897B" />
      <path d="M202 158 L195 235" stroke="#5D4037" strokeWidth="9" strokeLinecap="round" />
      <path d="M218 158 L225 235" stroke="#5D4037" strokeWidth="9" strokeLinecap="round" />
    </svg>
  );
}

// Screen 3: Delivering your package carefully (Courier with canopy & cart)
function CarefulIllustration() {
  return (
    <svg viewBox="0 0 320 280" className="h-full w-full max-h-[300px]" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="160" cy="245" rx="120" ry="12" fill="#F1F1F1" />
      {/* Canopy / Stall */}
      <path d="M80 80 Q105 60 130 80 Q155 60 180 80 Q205 60 230 80 L220 110 L90 110 Z" fill="#2EC4B6" />
      <line x1="90" y1="110" x2="90" y2="230" stroke="#CFD8DC" strokeWidth="4" />
      <line x1="220" y1="110" x2="220" y2="230" stroke="#CFD8DC" strokeWidth="4" />
      {/* Courier */}
      <circle cx="150" cy="95" r="16" fill="#FFCCBC" />
      <path d="M138 92 Q150 75 165 92 Z" fill="#FF5722" />
      <rect x="136" y="113" width="30" height="50" rx="8" fill="#FF6500" />
      <path d="M142 163 L125 235" stroke="#37474F" strokeWidth="9" strokeLinecap="round" />
      <path d="M158 163 L175 235" stroke="#37474F" strokeWidth="9" strokeLinecap="round" />
      {/* Trolley with stacked boxes */}
      <line x1="165" y1="140" x2="200" y2="180" stroke="#FF6500" strokeWidth="8" strokeLinecap="round" />
      <line x1="195" y1="170" x2="215" y2="230" stroke="#455A64" strokeWidth="4" />
      <circle cx="218" cy="235" r="8" fill="#262626" />
      <rect x="175" y="165" width="32" height="26" rx="4" fill="#FFA726" />
      <rect x="180" y="140" width="28" height="23" rx="4" fill="#FFB74D" />
    </svg>
  );
}

const slides = [
  {
    component: TrackIllustration,
    title: "Easily track your package",
    detail: "Getting location updates from our couriers",
  },
  {
    component: DeliveryIllustration,
    title: "Fast delivery in your area",
    detail: "Your package will come right to your door as soon as possible",
  },
  {
    component: CarefulIllustration,
    title: "Delivering your package carefully",
    detail: "We care about your package as you do",
  },
];

export function OnboardingScreen({ onComplete }: Props) {
  const [index, setIndex] = useState(0);
  const slide = slides[index]!;
  const Illustration = slide.component;

  function next() {
    if (index < slides.length - 1) {
      setIndex((curr) => curr + 1);
      return;
    }

    window.localStorage.setItem("thelawala_onboarding_completed", "1");
    onComplete();
  }

  return (
    <main className="fixed inset-0 z-[100] flex min-h-[100svh] flex-col bg-white px-6 pt-[max(24px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))]">
      <section className="mx-auto flex w-full max-w-[430px] flex-1 flex-col">
        {/* Main Content Area */}
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, x: 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -28 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className="flex w-full flex-col items-center"
            >
              {/* Illustration Area */}
              <div className="mb-8 flex h-[38svh] max-h-[320px] min-h-[220px] w-full items-center justify-center">
                <Illustration />
              </div>

              {/* Title */}
              <h1 className="max-w-[320px] text-[24px] font-bold leading-tight text-[#222222]">
                {slide.title}
              </h1>

              {/* Subtitle */}
              <p className="mt-4 max-w-[280px] text-[13px] leading-5 text-[#9E9E9E]">
                {slide.detail}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Pagination & Button */}
        <div className="pb-3">
          {/* Dot Indicators */}
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
            className="h-[52px] w-full rounded-[10px] bg-[#FF6500] text-sm font-semibold text-white shadow-sm active:scale-[0.99] transition-transform"
          >
            {index === slides.length - 1 ? "Get started" : "Next"}
          </button>
        </div>
      </section>
    </main>
  );
}
