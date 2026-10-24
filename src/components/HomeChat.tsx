import { useEffect, useRef, useState } from "react";
import { 
  Sparkles, 
  Send, 
  X, 
  Mic, 
  Volume2, 
  Store 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  recommendations?: Array<{
    name: string;
    stall: string;
    price: number;
    rating: number;
    image: string;
  }>;
};

const QUICK_SUGGESTIONS = [
  "⚡ Under 20 mins",
  "🥟 Dahi Bara Aloodum",
  "🍲 Dalma & Bhata",
  "🍢 Roll & Chaat",
  "☕ Chai Break",
  "🌙 Late Night Bite",
];

const DEFAULT_RECOMMENDATIONS = [
  {
    name: "Special Dahi Bara Aloo Dum",
    stall: "Cuttack Famous Stall",
    price: 60,
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&auto=format&fit=crop&q=80",
  },
  {
    name: "Bhubaneswar Dum Biryani",
    stall: "Bapuji Nagar Biryani Point",
    price: 140,
    rating: 4.6,
    image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&auto=format&fit=crop&q=80",
  },
  {
    name: "Crispy Egg Chicken Roll",
    stall: "Master Canteen Fast Food",
    price: 80,
    rating: 4.7,
    image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=400&auto=format&fit=crop&q=80",
  },
];

export function HomeChat({ userId, cartVisible }: { userId?: string | null; cartVisible?: boolean }) {
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"concierge" | "chat" | "voice">("concierge");
  const [isListening, setIsListening] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      id: "welcome-1",
      role: "assistant",
      content: "ନମସ୍କାର! 👋 I'm your Personal Food Concierge. What are you craving tonight?",
    },
  ]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, busy, open, viewMode]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  async function handleSend(customText?: string) {
    const text = (customText || input).trim();
    if (!text || busy) return;

    setInput("");
    if (viewMode !== "chat") setViewMode("chat");

    const userMsg: Msg = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
    };
    const next = [...msgs, userMsg];
    setMsgs(next);
    setBusy(true);

    try {
      const { data: items } = await supabase
        .from("menu_items")
        .select("name, price, image_url")
        .limit(3);

      const recs = (items && items.length > 0)
        ? items.map((it: any) => ({
            name: it.name || "Special Dish",
            stall: "Local Bhubaneswar Thela",
            price: Number(it.price) || 60,
            rating: 4.8,
            image: it.image_url || DEFAULT_RECOMMENDATIONS[0].image,
          }))
        : DEFAULT_RECOMMENDATIONS;

      setTimeout(() => {
        setMsgs([
          ...next,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: `Great choice! Here are top recommendations for "${text}" matching your preferences:`,
            recommendations: recs,
          },
        ]);
        setBusy(false);
      }, 700);
    } catch {
      setTimeout(() => {
        setMsgs([
          ...next,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: "Here are some of the hottest local picks right now:",
            recommendations: DEFAULT_RECOMMENDATIONS,
          },
        ]);
        setBusy(false);
      }, 700);
    }
  }

  function toggleVoice() {
    if (viewMode !== "voice") {
      setViewMode("voice");
      setIsListening(true);
    } else {
      setIsListening(!isListening);
    }
  }

  return (
    <>
      {/* Floating Orange Glow Concierge Trigger Button */}
      <button
        onClick={() => {
          setOpen(true);
          if (msgs.length > 1) setViewMode("chat");
        }}
        aria-label="Open Food Concierge"
        className={`fixed z-40 right-4 ${
          cartVisible ? "bottom-[130px]" : "bottom-[80px]"
        } w-14 h-14 rounded-full bg-gradient-to-tr from-amber-600 via-orange-500 to-amber-400 p-[2px] shadow-xl shadow-orange-500/30 transition-all duration-300 hover:scale-105 active:scale-95 group`}
      >
        <div className="w-full h-full bg-gradient-to-tr from-amber-500 to-orange-500 rounded-full flex items-center justify-center text-white relative">
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white animate-pulse" />
          <Sparkles className="w-6 h-6 animate-pulse" />
        </div>
      </button>

      {/* Main Concierge Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full sm:max-w-md h-[90vh] sm:h-[650px] bg-gradient-to-b from-[#FFFDF8] via-[#FFF9EE] to-[#FFF4E0] rounded-t-[32px] sm:rounded-[32px] shadow-2xl flex flex-col overflow-hidden border border-amber-200/80 animate-in fade-in slide-in-from-bottom duration-300">
            
            {/* Top Navigation Bar */}
            <div className="px-5 py-4 bg-white/70 backdrop-blur-md border-b border-amber-100 flex items-center justify-between text-neutral-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-amber-950 font-serif">ThelaWala Concierge</h3>
                  <p className="text-[10px] text-amber-700/80 font-medium">AI Powered Food Assistant</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setViewMode(viewMode === "voice" ? "chat" : "voice")}
                  className={`p-2 rounded-full transition-colors ${
                    viewMode === "voice" 
                      ? "bg-amber-500 text-white" 
                      : "bg-amber-100/60 text-amber-800 hover:bg-amber-200/60"
                  }`}
                  title="Voice Mode"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode(viewMode === "concierge" ? "chat" : "concierge")}
                  className={`p-2 rounded-full transition-colors ${
                    viewMode === "concierge" 
                      ? "bg-amber-500 text-white" 
                      : "bg-amber-100/60 text-amber-800 hover:bg-amber-200/60"
                  }`}
                  title="Home View"
                >
                  <Store className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="p-2 rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* SCREEN 1: CONCIERGE HOME */}
            {viewMode === "concierge" && (
              <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col justify-between">
                <div className="space-y-6">
                  <div className="text-center space-y-1.5 pt-2">
                    <p className="text-xs uppercase tracking-wider text-amber-700 font-semibold">{getGreeting()}</p>
                    <h2 className="text-2xl font-bold font-serif text-neutral-900 tracking-tight leading-snug">
                      I'm Your Personal<br />Food Concierge.
                    </h2>
                    <p className="text-xs text-neutral-500">
                      Tell Me Your Craving, I'll Handle The Rest.
                    </p>
                  </div>

                  <div className="flex flex-col items-center justify-center py-4">
                    <button
                      onClick={toggleVoice}
                      className="relative w-36 h-36 rounded-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95 group"
                    >
                      <div className="absolute inset-0 rounded-full bg-amber-400/20 animate-ping opacity-40" />
                      <div className="absolute inset-2 rounded-full bg-gradient-to-tr from-amber-400/30 to-orange-400/30 blur-sm" />
                      <div className="relative w-28 h-28 rounded-full border-2 border-amber-400/70 bg-white/90 shadow-xl shadow-amber-500/20 flex flex-col items-center justify-center text-amber-500">
                        <Sparkles className="w-4 h-4 text-amber-500 mb-1" />
                        <div className="flex items-center gap-1">
                          <span className="w-1 h-4 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                          <span className="w-1 h-7 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                          <span className="w-1 h-10 bg-amber-600 rounded-full animate-bounce" />
                          <span className="w-1 h-6 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.2s]" />
                          <span className="w-1 h-3 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.35s]" />
                        </div>
                      </div>
                    </button>
                    <p className="text-[11px] text-amber-800 font-medium tracking-wide uppercase mt-3">
                      AI Powered Ordering
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-neutral-600 px-1">Quick Suggestions</p>
                    <div className="flex flex-wrap gap-2">
                      {QUICK_SUGGESTIONS.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSend(item)}
                          className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/90 text-neutral-700 border border-amber-200/80 shadow-sm hover:border-amber-400 hover:text-amber-800 hover:bg-amber-50/80 transition-all active:scale-95"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <div className="relative flex items-center bg-white rounded-full border border-amber-200/90 shadow-md p-1.5 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-400/20">
                    <Sparkles className="w-4 h-4 text-amber-500 ml-3 shrink-0" />
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSend()}
                      placeholder="What Do You Want?"
                      className="w-full bg-transparent px-3 py-2 text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none"
                    />
                    <button
                      onClick={() => handleSend()}
                      disabled={!input.trim()}
                      className="w-8 h-8 rounded-full bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white flex items-center justify-center transition-all shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SCREEN 2: CHAT CONVERSATION */}
            {viewMode === "chat" && (
              <div className="flex-1 flex flex-col justify-between overflow-hidden">
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                  {msgs.map((m) => (
                    <div
                      key={m.id}
                      className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
                    >
                      {m.role === "assistant" && (
                        <div className="flex items-center gap-1.5 mb-1 ml-1 text-[11px] font-medium text-amber-800">
                          <span className="w-4 h-4 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px]">🤖</span>
                          ThelaWala Concierge
                        </div>
                      )}

                      <div
                        className={`max-w-[82%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                          m.role === "user"
                            ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-br-none shadow-orange-500/20 font-medium"
                            : "bg-white/95 text-neutral-800 rounded-bl-none border border-amber-100 shadow-neutral-200/50"
                        }`}
                      >
                        {m.content}
                      </div>

                      {m.recommendations && m.recommendations.length > 0 && (
                        <div className="w-full mt-3 overflow-x-auto no-scrollbar pb-1">
                          <div className="flex gap-2.5 min-w-max">
                            {m.recommendations.map((food, fIdx) => (
                              <div
                                key={fIdx}
                                className="w-40 bg-white rounded-xl overflow-hidden border border-amber-200/80 shadow-md flex flex-col"
                              >
                                <img
                                  src={food.image}
                                  alt={food.name}
                                  className="w-full h-24 object-cover"
                                />
                                <div className="p-2.5 flex-1 flex flex-col justify-between">
                                  <div>
                                    <h4 className="font-bold text-[11px] text-neutral-800 line-clamp-1">{food.name}</h4>
                                    <p className="text-[10px] text-neutral-500 flex items-center gap-1 mt-0.5">
                                      <Store className="w-2.5 h-2.5 text-amber-600" />
                                      {food.stall}
                                    </p>
                                  </div>
                                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-amber-100">
                                    <span className="font-bold text-xs text-amber-700">₹{food.price}</span>
                                    <button
                                      onClick={() => setOpen(false)}
                                      className="px-2 py-1 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-semibold"
                                    >
                                      Add +
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {busy && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-600 py-1 px-3 bg-amber-100/60 rounded-full w-fit">
                      <Sparkles className="w-3.5 h-3.5 animate-spin" />
                      <span>Finding best street stalls...</span>
                    </div>
                  )}
                  <div ref={endRef} />
                </div>

                <div className="p-3 bg-white/80 backdrop-blur-md border-t border-amber-100 flex items-center gap-2">
                  <div className="relative flex-1 flex items-center bg-amber-50/70 border border-amber-200/90 rounded-full px-3 py-1.5 focus-within:border-amber-500 focus-within:bg-white">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSend()}
                      placeholder="Ask for dishes, stalls or cravings..."
                      className="w-full bg-transparent text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none py-1"
                    />
                    <button
                      onClick={toggleVoice}
                      className="p-1 rounded-full text-amber-600 hover:bg-amber-100 transition-colors mr-1"
                      title="Switch to Voice"
                    >
                      <Mic className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button
                    onClick={() => handleSend()}
                    disabled={busy || !input.trim()}
                    className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 disabled:opacity-40 text-white flex items-center justify-center shadow-md shadow-orange-500/20 transition-all shrink-0 active:scale-95"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* SCREEN 3: VOICE CHAT */}
            {viewMode === "voice" && (
              <div className="flex-1 flex flex-col justify-between items-center px-6 py-8">
                <div className="text-center space-y-1">
                  <h3 className="font-serif font-bold text-xl text-neutral-900">Voice Concierge</h3>
                  <p className="text-xs text-amber-700/80">AI-Powered Voice Ordering</p>
                </div>

                <div className="relative flex items-center justify-center">
                  <div className={`absolute w-52 h-52 rounded-full border border-amber-300/40 ${isListening ? "animate-ping opacity-25" : ""}`} />
                  <div className={`absolute w-44 h-44 rounded-full bg-amber-400/20 ${isListening ? "animate-pulse" : ""}`} />
                  <button
                    onClick={toggleVoice}
                    className="relative w-36 h-36 rounded-full border-2 border-amber-400 bg-white shadow-2xl shadow-amber-500/30 flex items-center justify-center group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 bg-amber-500 rounded-full transition-all ${isListening ? "h-6 animate-bounce" : "h-3"}`} />
                      <span className={`w-1.5 bg-amber-600 rounded-full transition-all ${isListening ? "h-12 animate-bounce [animation-delay:0.1s]" : "h-6"}`} />
                      <span className={`w-1.5 bg-orange-500 rounded-full transition-all ${isListening ? "h-16 animate-bounce [animation-delay:0.2s]" : "h-8"}`} />
                      <span className={`w-1.5 bg-amber-600 rounded-full transition-all ${isListening ? "h-12 animate-bounce [animation-delay:0.3s]" : "h-6"}`} />
                      <span className={`w-1.5 bg-amber-500 rounded-full transition-all ${isListening ? "h-6 animate-bounce [animation-delay:0.4s]" : "h-3"}`} />
                    </div>
                  </button>
                </div>

                <div className="text-center space-y-3 w-full">
                  <p className="text-xs font-medium text-amber-900">
                    {isListening ? "Listening... Speak now (e.g. 'Dahi Bara')" : "Tap mic to speak"}
                  </p>
                  <button
                    onClick={() => setViewMode("chat")}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs shadow-md transition-all"
                  >
                    Switch to Text Chat
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
}
