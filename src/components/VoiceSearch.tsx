import { useState } from "react";
import { parseVoiceSearch } from "@/lib/ai.functions";

type Props = {
  stalls: string[];
  items: string[];
  onResult: (r: { query: string; stall: string | null; qty: number; spoken: string }) => void;
};

type SpeechCtor = new () => {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

function recognizer(): SpeechCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, SpeechCtor | undefined>;
  return w["SpeechRecognition"] ?? w["webkitSpeechRecognition"] ?? null;
}

export function VoiceSearch({ stalls, items, onResult }: Props) {
  const [state, setState] = useState<"idle" | "listening" | "thinking">("idle");
  const [note, setNote] = useState<string | null>(null);

  function listen() {
    const Ctor = recognizer();
    if (!Ctor) {
      setNote("Voice search needs Chrome on Android or Safari on iPhone.");
      return;
    }
    const rec = new Ctor();
    rec.lang = "or-IN";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    setNote(null);
    setState("listening");
    rec.onresult = async (e) => {
      const transcript = String(e.results[0]?.[0]?.transcript ?? "").trim();
      if (!transcript) return setState("idle");
      setState("thinking");
      try {
        const r = await parseVoiceSearch({ data: { transcript, stalls, items } });
        onResult(r);
        setNote(`“${r.spoken}” → ${r.query}`);
      } catch {
        onResult({ query: transcript, stall: null, qty: 1, spoken: transcript });
      }
      setState("idle");
    };
    rec.onerror = () => {
      setState("idle");
      setNote("Could not hear that. Please try again.");
    };
    rec.onend = () => setState((s) => (s === "listening" ? "idle" : s));
    rec.start();
  }

  return (
    <>
      <button
        type="button"
        onClick={listen}
        aria-label="Search by voice in Odia or English"
        className={`press grid h-8 w-8 shrink-0 place-items-center rounded-full ${
          state === "idle" ? "text-muted-foreground" : "bg-primary text-primary-foreground"
        }`}
      >
        {state === "thinking" ? (
          <span className="text-[10px] font-black">AI</span>
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5 11a7 7 0 0014 0M12 18v3" strokeLinecap="round" />
          </svg>
        )}
      </button>
      {note ? (
        <p className="absolute inset-x-4 top-full mt-1 truncate text-[10px] font-semibold text-muted-foreground">{note}</p>
      ) : null}
    </>
  );
}
