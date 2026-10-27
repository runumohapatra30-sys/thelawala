import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Store, 
  X, 
  Send, 
  Mic, 
  Plus, 
  ReceiptText, 
  MessageCircle, 
  LoaderCircle,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { openLoginModal } from "@/components/LoginModal";
import { cart } from "@/lib/cart";
import { customerPrice } from "@/lib/pricing";
import { foodImage } from "@/lib/foodImage";
import { inr } from "@/lib/fees";
import { careIntent, matchesCareProduct } from "@/lib/careChat";

type Food = { 
  id: string; 
  name: string; 
  vendor_id: string; 
  photo_url: string | null; 
  unit: string | null; 
  price: number; 
  mrp: number; 
  stall: string 
};

type Ticket = { 
  id: string; 
  code: string; 
  subject: string; 
  status: string; 
  resolution_note: string | null 
};

type Msg = { 
  id: string; 
  role: "user" | "assistant"; 
  content: string; 
  foods?: Food[]; 
  tickets?: Ticket[] 
};

const QUICK_CHIPS = [
  "🌙 Late Night Bite",
  "🍲 Hot Street Snacks",
  "🎫 Track My Tickets",
  "💬 Support Ticket"
];

export function HomeChat({ userId, cartVisible = false }: { userId?: string | null | undefined; cartVisible?: boolean }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [ticketForm, setTicketForm] = useState(false);
  const [issue, setIssue] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [listening, setListening] = useState(false);
  const [addedItemIds, setAddedItemIds] = useState<Record<string, boolean>>({});

  const [msgs, setMsgs] = useState<Msg[]>([
    { 
      id: "welcome", 
      role: "assistant", 
      content: "ନମସ୍କାର! 👋 I'm your Personal Food Concierge. What are you craving tonight?" 
    }
  ]);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const speak = (text: string) => {
    if (!soundEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const append = (message: Omit<Msg, "id" | "role">) => {
    setMsgs((current) => [...current, { ...message, id: crypto.randomUUID(), role: "assistant" }]);
    speak(message.content);
  };

  useEffect(() => { 
    if (open) endRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); 
  }, [msgs, busy, open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    inputRef.current?.focus();
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", escape);
    return () => { 
      document.body.style.overflow = previous; 
      window.removeEventListener("keydown", escape); 
    };
  }, [open]);

  // Voice speech-to-text input
  const toggleVoice = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
                              (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setNote("Voice input is not supported in this browser.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-IN";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setListening(true);
      recognition.onend = () => setListening(false);
      recognition.onerror = () => setListening(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setInput(transcript);
          void send(transcript);
        }
      };
      recognition.start();
    } catch {
      setListening(false);
    }
  };

  async function send(custom?: string) {
    const text = (custom ?? input).trim();
    if (!text || busy) return;
    setInput(""); 
    setNote(null); 
    setBusy(true);

    setMsgs((current) => [...current, { id: crypto.randomUUID(), role: "user", content: text }]);

    try {
      const intent = careIntent(text);

      if (intent === "tickets") {
        if (!userId) { 
          append({ content: "Please sign in to view your ThelaWala ticket receipts and care team updates." }); 
          return; 
        }
        const { data, error } = await supabase
          .from("support_tickets")
          .select("id,code,subject,status,resolution_note")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(10);
        if (error) throw error;
        append({ 
          content: data?.length 
            ? "Your ThelaWala tickets — tap any receipt to view replies and the resolution report:" 
            : "You don't have any support tickets yet.", 
          tickets: data ?? [] 
        });
      } else if (intent === "support") {
        setIssue(text.startsWith("💬") ? "" : text); 
        setTicketForm(true);
        append({ content: "Describe the issue below to create a support ticket for the ThelaWala admin care team:" });
      } else if (intent === "products" || text.includes("Bite") || text.includes("Snack") || text.includes("Food")) {
        const [{ data: vendors, error: vendorError }, { data: items, error: itemError }] = await Promise.all([
          supabase.from("vendors").select("id,stall_name").eq("status", "APPROVED").eq("is_open", true),
          supabase.from("menu_items").select("id,name,vendor_id,photo_url,unit,price,mrp").eq("in_stock", true),
        ]);
        if (vendorError || itemError) throw vendorError ?? itemError;

        const names = new Map((vendors ?? []).map((vendor) => [vendor.id, vendor.stall_name]));
        const foods = (items ?? [])
          .filter((food) => names.has(food.vendor_id))
          .map((food) => ({ ...food, stall: names.get(food.vendor_id) ?? "ThelaWala stall" }))
          .filter((food) => matchesCareProduct(text, food.name, food.stall))
          .slice(0, 8);

        append({ 
          content: foods.length 
            ? `Great choice! Here are top recommendations for "${text}" matching your cravings:` 
            : "Here are some of Bhubaneswar's favorite street-food specialties:", 
          foods: foods.length > 0 ? foods : (items ?? []).slice(0, 5).map(f => ({ ...f, stall: names.get(f.vendor_id) ?? "ThelaWala stall" }))
        });
      } else if (intent === "orders") {
        append({ content: "You can track your orders anytime under 'Your orders'. For issues, describe your problem to raise an instant ticket." });
      } else {
        append({ content: "ThelaWala brings Bhubaneswar's best street food directly to your doorstep in 15 mins. Ask for dishes, explore stalls, or raise support tickets!" });
      }
    } catch { 
      append({ content: "Could not load data right now. Please try again. Your orders and tickets are safe." }); 
    } finally { 
      setBusy(false); 
    }
  }

  async function createTicket() {
    if (!userId) { openLoginModal(); return; }
    if (!issue.trim() || busy) return;
    setBusy(true); 
    setNote(null);
    try {
      const { data, error } = await supabase
        .from("support_tickets")
        .insert({ user_id: userId, category: "OTHER", subject: issue.trim().slice(0, 160), order_id: null })
        .select("id,code,subject,status,resolution_note")
        .single();
      if (error || !data) throw error ?? new Error("Ticket not saved");
      append({ 
        content: `Ticket receipt ${data.code} created! Our care team has received your ticket. Tap below to track responses:`, 
        tickets: [data] 
      });
      setTicketForm(false); 
      setIssue("");
    } catch { 
      setNote("Could not submit ticket. Please try again."); 
    } finally { 
      setBusy(false); 
    }
  }

  const handleAddToCart = (food: Food) => {
    const result = cart.add({
      itemId: food.id,
      vendorId: food.vendor_id,
      vendorName: food.stall,
      name: food.name,
      photo: food.photo_url,
      unit: food.unit,
      base: Number(food.price),
      price: customerPrice(food.price),
      mrp: customerPrice(food.mrp)
    });

    if (result.ok) {
      setAddedItemIds((prev) => ({ ...prev, [food.id]: true }));
      setNote(`${food.name} added to cart!`);
      setTimeout(() => {
        setAddedItemIds((prev) => ({ ...prev, [food.id]: false }));
      }, 1500);
    } else {
      setOpen(false);
      if (!("conflict" in result)) setNote(result.error);
    }
  };

  return (
    <>
      <Button 
        size="icon" 
        aria-label="Open ThelaWala Concierge" 
        onClick={() => setOpen(true)} 
        className={`fixed right-4 z-40 h-12 w-12 rounded-full shadow-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 ${
          cartVisible ? "bottom-[calc(env(safe-area-inset-bottom)+178px)]" : "bottom-[calc(env(safe-area-inset-bottom)+100px)]"
        }`}
      >
        <MessageCircle className="h-6 w-6" />
      </Button>

      {open && (
        <div 
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 backdrop-blur-xs sm:items-center sm:p-4" 
          onClick={() => setOpen(false)}
        >
          <section 
            role="dialog" 
            aria-modal="true" 
            aria-labelledby="concierge-title" 
            className="flex w-full max-w-[480px] h-[85vh] max-h-[700px] flex-col overflow-hidden rounded-t-[28px] sm:rounded-[28px] bg-[#FFFBF5] text-stone-900 shadow-2xl border border-stone-200" 
            onClick={(event) => event.stopPropagation()}
          >
            {/* Header matching screenshot */}
            <header className="flex items-center justify-between border-b border-stone-200/80 bg-white/90 px-4 py-3.5 backdrop-blur-sm">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-amber-100 text-amber-700">
                  <Sparkles className="h-4 w-4 fill-amber-500 text-amber-600" />
                </div>
                <div>
                  <h2 id="concierge-title" className="text-sm font-black tracking-tight text-stone-900 font-serif">
                    ThelaWala Concierge
                  </h2>
                  <p className="text-[11px] font-medium text-amber-700">AI Powered Food Assistant</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Toggle voice responses"
                  onClick={() => setSoundEnabled((prev) => !prev)}
                  className={`grid h-8 w-8 place-items-center rounded-full transition-colors ${
                    soundEnabled ? "bg-amber-100 text-amber-700" : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                  }`}
                >
                  {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </button>
                <Link
                  to="/stalls"
                  onClick={() => setOpen(false)}
                  className="grid h-8 w-8 place-items-center rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200"
                  title="Browse stalls"
                >
                  <Store className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setOpen(false)}
                  className="grid h-8 w-8 place-items-center rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>

            {/* Chat Messages */}
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4">
              {msgs.map((message) => (
                <div key={message.id} className={message.role === "user" ? "ml-12" : "mr-4"}>
                  {message.role === "assistant" && (
                    <div className="mb-1.5 flex items-center gap-1 text-[11px] font-bold text-amber-900">
                      <span>🤖</span> ThelaWala Concierge
                    </div>
                  )}

                  <div 
                    className={`rounded-2xl p-3.5 text-sm leading-relaxed shadow-xs ${
                      message.role === "user" 
                        ? "bg-[#FFF9D2] text-[#2E2800] border border-[#F6EAA2] font-semibold rounded-tr-xs self-end ml-auto" 
                        : "bg-white text-stone-800 border border-stone-200/80 rounded-tl-xs"
                    }`}
                  >

                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  </div>

                  {/* Horizontal Food Recommendations Carousel */}
                  {message.foods && message.foods.length > 0 && (
                    <div className="mt-3 flex gap-3 overflow-x-auto pb-2 pt-1 scrollbar-none snap-x">
                      {message.foods.map((food) => (
                        <article 
                          key={food.id} 
                          className="w-44 shrink-0 snap-start overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-xs"
                        >
                          <Link 
                            to="/item/$id" 
                            params={{ id: food.id }} 
                            onClick={() => setOpen(false)}
                            className="block"
                          >
                            <img 
                              src={food.photo_url ?? foodImage(food.name)} 
                              alt={food.name} 
                              className="h-28 w-full object-cover" 
                              loading="lazy"
                            />
                          </Link>
                          <div className="p-2.5">
                            <p className="truncate text-xs font-bold text-stone-900" title={food.name}>
                              {food.name}
                            </p>
                            <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-stone-500">
                              <Store className="h-3 w-3 shrink-0 text-stone-400" />
                              <span className="truncate">{food.stall}</span>
                            </p>
                            <div className="mt-2.5 flex items-center justify-between border-t border-stone-100 pt-2">
                              <span className="text-xs font-black text-stone-900">
                                {inr(customerPrice(food.price))}
                              </span>
                              <Button 
                                size="sm" 
                                aria-label={`Add ${food.name}`} 
                                onClick={() => handleAddToCart(food)}
                                className={`h-7 rounded-full px-3 text-[11px] font-bold shadow-xs transition ${
                                  addedItemIds[food.id] 
                                    ? "bg-emerald-600 text-white hover:bg-emerald-700" 
                                    : "bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600"
                                }`}
                              >
                                {addedItemIds[food.id] ? <Check className="h-3 w-3" /> : "Add +"}
                              </Button>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}

                  {/* Ticket Receipts */}
                  {message.tickets && message.tickets.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {message.tickets.map((ticket) => (
                        <Link 
                          key={ticket.id} 
                          to="/support/$id" 
                          params={{ id: ticket.id }} 
                          onClick={() => setOpen(false)} 
                          className="block rounded-xl border border-amber-200/80 bg-white p-3 shadow-xs transition hover:border-amber-400"
                        >
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="flex items-center gap-1 text-amber-900">
                              <ReceiptText className="h-3.5 w-3.5 text-amber-600" /> {ticket.code}
                            </span>
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                              {ticket.status}
                            </span>
                          </div>
                          <p className="mt-1.5 text-xs text-stone-700 line-clamp-2">{ticket.subject}</p>
                          {ticket.resolution_note && (
                            <p className="mt-2 rounded-lg bg-amber-50/70 p-2 text-[11px] text-amber-900">
                              <strong>Care Note:</strong> {ticket.resolution_note}
                            </p>
                          )}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Support Ticket Creation Form */}
              {ticketForm && (
                <form 
                  className="rounded-2xl border border-amber-200 bg-white p-3.5 shadow-xs" 
                  onSubmit={(e) => { e.preventDefault(); void createTicket(); }}
                >
                  <label htmlFor="concierge-issue" className="block text-xs font-bold text-stone-800">
                    Describe your issue for the ThelaWala care team:
                  </label>
                  <textarea 
                    id="concierge-issue" 
                    maxLength={160} 
                    value={issue} 
                    onChange={(e) => setIssue(e.target.value)} 
                    placeholder="e.g. Order #1234 packaging issue..." 
                    className="mt-2 min-h-20 w-full rounded-xl border border-stone-200 bg-stone-50 p-2.5 text-xs text-stone-900 outline-none focus:border-amber-500 focus:bg-white" 
                  />
                  <div className="mt-3 flex gap-2">
                    <Button 
                      disabled={busy || !issue.trim()} 
                      type="submit" 
                      className="h-8 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-xs font-semibold text-white"
                    >
                      <ReceiptText className="mr-1 h-3.5 w-3.5" />
                      {userId ? "Submit Ticket" : "Sign in to Submit"}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setTicketForm(false)} 
                      type="button" 
                      className="h-8 rounded-full text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

              {busy && (
                <div className="flex items-center gap-2 text-xs font-medium text-amber-800">
                  <LoaderCircle className="h-4 w-4 animate-spin text-amber-600" />
                  Finding delicious options…
                </div>
              )}

              {note && (
                <p role="status" className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
                  {note}
                </p>
              )}

              <div ref={endRef} />
            </div>

            {/* Quick Chips & Input Bar matching screenshot */}
            <footer className="space-y-2.5 border-t border-stone-200/80 bg-white/95 p-3.5 backdrop-blur-sm">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {QUICK_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => void send(chip)}
                    className="shrink-0 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-3 py-1.5 text-xs font-semibold text-white shadow-xs active:scale-95 transition-transform"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              <form 
                className="flex items-center gap-2 rounded-full border border-amber-300/80 bg-[#FFFDF8] px-3 py-1.5 shadow-inner focus-within:border-amber-500" 
                onSubmit={(e) => { e.preventDefault(); void send(); }}
              >
                <input 
                  ref={inputRef} 
                  aria-label="Ask for dishes, stalls or cravings" 
                  placeholder="Ask for dishes, stalls or cravings..." 
                  maxLength={1000} 
                  value={input} 
                  onChange={(e) => setInput(e.target.value)} 
                  className="min-w-0 flex-1 bg-transparent text-xs text-stone-900 outline-none placeholder:text-stone-400" 
                />

                <button
                  type="button"
                  aria-label="Voice input"
                  onClick={toggleVoice}
                  className={`grid h-8 w-8 place-items-center rounded-full transition ${
                    listening ? "bg-red-500 text-white animate-pulse" : "text-amber-600 hover:bg-amber-100"
                  }`}
                >
                  <Mic className="h-4 w-4" />
                </button>

                <Button 
                  type="submit" 
                  size="icon" 
                  aria-label="Send message" 
                  disabled={busy || !input.trim()} 
                  className="h-8 w-8 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </form>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
