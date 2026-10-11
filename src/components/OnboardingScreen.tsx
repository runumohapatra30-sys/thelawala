import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

const ONBOARDING_KEY = "thelawala_onboarding_completed";
const ORANGE = "#FF5A1F";

const slides = [
  {
    title: "Easily track your package",
    description: "Getting location updates from our couriers",
    Illustration: TrackingIllustration,
  },
  {
    title: "Fast delivery in your area",
    description: "Your package will come right to your door as soon as possible",
    Illustration: DeliveryIllustration,
  },
  {
    title: "Delivering your package carefully",
    description: "We care about your package as you do",
    Illustration: CarefulDeliveryIllustration,
  },
];

export function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const slide = slides[step]!;
  const isLast = step === slides.length - 1;

  function finish() {
    window.localStorage.setItem(ONBOARDING_KEY, "true");
    onComplete();
  }

  return (
    <main className="fixed inset-0 z-[100] flex min-h-[100svh] flex-col items-center overflow-y-auto bg-[#FAFAFA] px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] text-[#242424]">
      <div className="flex w-full max-w-md items-center justify-between">
        {step > 0 ? (
          <button
            type="button"
            aria-label="Previous onboarding step"
            onClick={() => setStep((current) => current - 1)}
            className="grid h-11 w-11 place-items-center rounded-full bg-white text-[#252525] shadow-sm"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : (
          <span className="h-11 w-11" />
        )}
        <span className="text-xs font-bold tracking-[0.16em] text-[#929292]">
          {String(step + 1).padStart(2, "0")} <span className="text-[#D2D2D2]">/</span>{" "}
          {String(slides.length).padStart(2, "0")}
        </span>
        <button
          type="button"
          onClick={finish}
          className="rounded-full px-3 py-2 text-sm font-semibold text-[#777777] hover:text-[#242424]"
        >
          Skip
        </button>
      </div>

      <section
        key={step}
        className="flex w-full max-w-md flex-1 flex-col items-center justify-center pb-5 pt-3 text-center"
        aria-live="polite"
      >
        <div className="w-full max-w-[360px]">
          <slide.Illustration />
        </div>
        <h1 className="mt-7 max-w-sm text-[29px] font-extrabold leading-[1.18] tracking-[-0.04em] text-[#242424]">
          {slide.title}
        </h1>
        <p className="mt-3 max-w-[300px] text-[15px] leading-6 text-[#858585]">
          {slide.description}
        </p>
      </section>

      <footer className="w-full max-w-md">
        <div
          className="mb-7 flex items-center justify-center gap-2.5"
          aria-label={`Step ${step + 1} of ${slides.length}`}
        >
          {slides.map((item, index) => (
            <span
              key={item.title}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                index === step ? "w-8 bg-[#FF5A1F]" : "w-2.5 bg-[#D8D8D8]"
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => (isLast ? finish() : setStep((current) => current + 1))}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#FF5A1F] px-6 text-base font-bold text-white shadow-[0_10px_22px_rgba(255,90,31,0.22)] transition-transform active:scale-[0.99]"
        >
          {isLast ? "Get Started" : "Next"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </footer>
    </main>
  );
}

function TrackingIllustration() {
  return (
    <svg
      viewBox="0 0 360 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="h-auto w-full"
    >
      <ellipse cx="179" cy="286" rx="127" ry="12" fill="#F0F0ED" />
      <path
        d="M267 75v87m0-87c0-7 5-12 12-12s12 5 12 12"
        stroke="#D8E9DD"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path d="M267 88h24" stroke="#D8E9DD" strokeWidth="3" strokeLinecap="round" />
      <circle cx="92" cy="83" r="30" fill="#FFF3EA" />
      <path d="M79 83h26m-13-13v26" stroke="#FFB994" strokeWidth="4" strokeLinecap="round" />
      <path d="M54 234h255" stroke="#DDE5DF" strokeWidth="4" strokeLinecap="round" />
      <path d="M85 246h33m21 0h18m32 0h29" stroke="#E8ECE8" strokeWidth="4" strokeLinecap="round" />
      <circle cx="115" cy="229" r="27" fill="#FFFFFF" stroke="#343A3B" strokeWidth="7" />
      <circle cx="115" cy="229" r="8" fill="#D9E5DF" />
      <circle cx="247" cy="229" r="27" fill="#FFFFFF" stroke="#343A3B" strokeWidth="7" />
      <circle cx="247" cy="229" r="8" fill="#D9E5DF" />
      <path
        d="M115 228h50l25-43h36l21 44h-57l-28-41-27 40"
        stroke="#61A875"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M185 187h-22l-11-12m76 9 13-15h18"
        stroke="#343A3B"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m218 171 11-13 13 13"
        stroke="#343A3B"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M155 128c8-13 22-20 39-18 14 1 25 10 31 22l19 45-35 14-23-35-22 39-39-14 30-53Z"
        fill="#FF762F"
      />
      <path
        d="m145 184-19 31 17 9 29-33m42-16 18 36 17-7-14-47"
        stroke="#F2B58F"
        strokeWidth="11"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="m175 171 31 7 12 24-29 17-29-19 15-29Z" fill="#FF5A1F" />
      <path d="M150 119c2-20 17-34 37-34 19 0 34 13 37 31l-8 12-57 1-9-10Z" fill="#34413B" />
      <path d="M158 114c3-15 14-24 29-24s26 9 30 24c-17 9-40 9-59 0Z" fill="#FF7A3D" />
      <path d="M166 119h44c0 16-9 27-22 27s-22-11-22-27Z" fill="#E6A77F" />
      <path d="M203 128h10" stroke="#354039" strokeWidth="3" strokeLinecap="round" />
      <path d="M235 126h57v49h-57z" fill="#FF8B50" />
      <path d="M235 138h57v7h-57z" fill="#F5B184" />
      <path d="M244 126v49m39-49v49" stroke="#F5B184" strokeWidth="3" />
      <path d="M250 150h26m-26 9h26" stroke="#FFF4E9" strokeWidth="3" strokeLinecap="round" />
      <path d="M213 121c8-4 17-2 23 5l12 16-12 10-17-17" fill="#F2B58F" />
      <circle cx="142" cy="222" r="5" fill="#FFC86C" />
      <path d="M160 219h20" stroke="#343A3B" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

function DeliveryIllustration() {
  return (
    <svg
      viewBox="0 0 360 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="h-auto w-full"
    >
      <ellipse cx="179" cy="286" rx="124" ry="12" fill="#F0F0ED" />
      <path d="M54 246h250" stroke="#DDE5DF" strokeWidth="4" strokeLinecap="round" />
      <path d="M84 259h34m22 0h20m28 0h34" stroke="#E8ECE8" strokeWidth="4" strokeLinecap="round" />
      <path
        d="M253 123c0-34 27-61 61-61"
        stroke="#D5E8DA"
        strokeWidth="4"
        strokeDasharray="6 9"
        strokeLinecap="round"
      />
      <circle cx="304" cy="60" r="27" fill="#F0F7F1" />
      <path
        d="m291 61 9 9 17-19"
        stroke="#63AA77"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M86 111h63v70H86z" fill="#FFF1E8" />
      <path
        d="M96 128h43m-43 11h34m-34 11h38"
        stroke="#F5B48F"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path d="M231 201c0-19 15-34 34-34s34 15 34 34v44h-68v-44Z" fill="#F3B98E" />
      <path d="M224 198c0-24 18-42 41-42 22 0 39 16 41 38-24 5-54 10-82 4Z" fill="#5C6D64" />
      <path d="M238 201c3-13 14-22 28-22 14 0 25 9 28 22-17 7-39 7-56 0Z" fill="#F5C7A6" />
      <path d="M235 229h60v17h-60z" fill="#F0F2EF" />
      <path d="M246 238h38" stroke="#C8D1CB" strokeWidth="4" strokeLinecap="round" />
      <path d="M230 220h-14" stroke="#E0A97F" strokeWidth="10" strokeLinecap="round" />
      <path
        d="M203 131c15-10 35-8 47 5l20 28-29 20-19-21-16 48-48-4 17-53c5-10 15-18 28-23Z"
        fill="#FF762F"
      />
      <path
        d="m208 194 22 23 13 23m-54-34-12 30"
        stroke="#E9AD85"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="m184 231-10 19m60-10 8 13" stroke="#37413B" strokeWidth="12" strokeLinecap="round" />
      <path d="M182 248h-20m89 0h17" stroke="#37413B" strokeWidth="6" strokeLinecap="round" />
      <path d="M192 120c3-19 17-31 35-31 17 0 31 12 34 30l-9 13-51 1-9-13Z" fill="#37413B" />
      <path d="M201 116c3-13 13-21 26-21 14 0 23 8 27 21-15 8-37 8-53 0Z" fill="#FF7A3D" />
      <path d="M207 121h40c0 14-8 24-20 24s-20-10-20-24Z" fill="#E9AD85" />
      <path d="M238 130h8" stroke="#37413B" strokeWidth="3" strokeLinecap="round" />
      <path d="m239 162 28-11 32 39-25 21-35-24" fill="#FF5A1F" />
      <path d="M268 154c7-9 18-10 26-3l18 16-13 15-22-13" fill="#E9AD85" />
      <path d="M283 169h45v43h-45z" fill="#F0A169" />
      <path d="M283 178h45v7h-45z" fill="#FFD5B7" />
      <path d="M291 190h28m-28 8h20" stroke="#FFF3E9" strokeWidth="3" strokeLinecap="round" />
      <path d="M164 248h-26" stroke="#FF5A1F" strokeWidth="3" strokeLinecap="round" />
      <circle cx="125" cy="249" r="3" fill="#FFB994" />
    </svg>
  );
}

function CarefulDeliveryIllustration() {
  return (
    <svg
      viewBox="0 0 360 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="h-auto w-full"
    >
      <ellipse cx="183" cy="286" rx="130" ry="12" fill="#F0F0ED" />
      <path d="M49 249h263" stroke="#DDE5DF" strokeWidth="4" strokeLinecap="round" />
      <path d="M77 262h28m26 0h22m29 0h22" stroke="#E8ECE8" strokeWidth="4" strokeLinecap="round" />
      <path d="M46 123h127v12H46z" fill="#F6C291" />
      <path d="M55 135h109v8H55z" fill="#E8A56F" />
      <path
        d="M57 123v-55h105v55"
        stroke="#596960"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M52 68h112l-10 32H62L52 68Z" fill="#FF7133" />
      <path d="M71 68 78 100h19V68H71Zm45 0v32h19l7-32h-26Z" fill="#FFF6ED" />
      <path d="M67 105h84" stroke="#596960" strokeWidth="4" strokeLinecap="round" />
      <path d="M76 145h61v38H76z" fill="#FFF1E8" />
      <path d="M85 157h43m-43 10h31" stroke="#F1B38B" strokeWidth="4" strokeLinecap="round" />
      <circle cx="258" cy="245" r="13" fill="#343A3B" />
      <circle cx="258" cy="245" r="5" fill="#E5ECE7" />
      <path
        d="M216 241h44l-35-73h-16l27 59h-40"
        stroke="#596960"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M209 168v-16h20"
        stroke="#596960"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M185 126c15-9 34-6 44 8l21 34-27 20-21-24-8 43-47-4 8-49c2-12 13-23 30-28Z"
        fill="#FF762F"
      />
      <path
        d="m182 183-19 34m62-38 18 20 17 9"
        stroke="#E9AD85"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m165 216-14 27m88-24 18 18"
        stroke="#37413B"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <path d="M151 246h-20m125 0h18" stroke="#37413B" strokeWidth="6" strokeLinecap="round" />
      <path d="M177 116c3-19 17-31 35-31 18 0 32 12 35 30l-9 14-52 1-9-14Z" fill="#37413B" />
      <path d="M186 112c3-13 13-21 26-21 14 0 24 8 27 21-15 8-37 8-53 0Z" fill="#FF7A3D" />
      <path d="M192 117h41c0 14-8 24-20 24s-21-10-21-24Z" fill="#E9AD85" />
      <path d="M222 127h8" stroke="#37413B" strokeWidth="3" strokeLinecap="round" />
      <path d="M173 188h29v28h-29z" fill="#D9905C" />
      <path d="M174 188h28v6h-28z" fill="#FFD5B7" />
      <path d="M305 113c0-9 7-16 16-16" stroke="#A8CFB1" strokeWidth="4" strokeLinecap="round" />
      <path d="M304 115h13m-6-7v13" stroke="#A8CFB1" strokeWidth="3" strokeLinecap="round" />
      <path d="M241 161h24v26h-24z" fill="#E9A16E" />
      <path d="M241 161h24v6h-24z" fill="#FFD5B7" />
      <path d="M247 175h12" stroke="#FFF3E9" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
