import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MessageCircle, Send, X, Plus, ReceiptText, ShoppingBag, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { openLoginModal } from "@/components/LoginModal";
import { cart } from "@/lib/cart";
import { customerPrice } from "@/lib/pricing";
import { foodImage } from "@/lib/foodImage";
import { inr } from "@/lib/fees";
import { careIntent, matchesCareProduct } from "@/lib/careChat";
import brand from "@/assets/thelawala-brand.jpeg.asset.json";

type Food = { id: string; name: string; vendor_id: string; photo_url: string | null; unit: string | null; price: number; mrp: number; stall: string };
type Ticket = { id: string; code: string; subject: string; status: string; resolution_note: string | null };
type Msg = { id: string; role: "user" | "assistant"; content: string; foods?: Food[]; tickets?: Ticket[] };

export function HomeChat({ userId, cartVisible = false }: { userId?: string | null | undefined; cartVisible?: boolean }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [ticketForm, setTicketForm] = useState(false);
  const [issue, setIssue] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([{ id: "welcome", role: "assistant", content: "ନମସ୍କାର! 👋 ThelaWala Care — local food in Bhubaneswar. Ask about our menu, orders or support tickets." }]);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const append = (message: Omit<Msg, "id" | "role">) => setMsgs((current) => [...current, { ...message, id: crypto.randomUUID(), role: "assistant" }]);

  useEffect(() => { if (open) endRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [msgs, busy, open]);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    inputRef.current?.focus();
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", escape);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", escape); };
  }, [open]);

  async function send(custom?: string) {
    const text = (custom ?? input).trim();
    if (!text || busy) return;
    setInput(""); setNote(null); setBusy(true);
    setMsgs((current) => [...current, { id: crypto.randomUUID(), role: "user", content: text }]);
    try {
      const intent = careIntent(text);
      if (intent === "tickets") {
        if (!userId) { append({ content: "Please sign in to view your ThelaWala ticket receipts and care-team updates." }); return; }
        const { data, error } = await supabase.from("support_tickets").select("id,code,subject,status,resolution_note").eq("user_id", userId).order("created_at", { ascending: false }).limit(10);
        if (error) throw error;
        append({ content: data?.length ? "Your ThelaWala tickets — open a receipt to see the care team's replies and resolution report." : "You don't have any support tickets yet.", tickets: data ?? [] });
      } else if (intent === "support") {
        setIssue(text); setTicketForm(true);
        append({ content: "Describe the issue below to send a ticket to the ThelaWala admin care team. You'll receive a ticket receipt and can track their response." });
      } else if (intent === "products") {
        const [{ data: vendors, error: vendorError }, { data: items, error: itemError }] = await Promise.all([
          supabase.from("vendors").select("id,stall_name").eq("status", "APPROVED").eq("is_open", true),
          supabase.from("menu_items").select("id,name,vendor_id,photo_url,unit,price,mrp").eq("in_stock", true),
        ]);
        if (vendorError || itemError) throw vendorError ?? itemError;
        const names = new Map((vendors ?? []).map((vendor) => [vendor.id, vendor.stall_name]));
        const foods = (items ?? []).filter((food) => names.has(food.vendor_id)).map((food) => ({ ...food, stall: names.get(food.vendor_id) ?? "ThelaWala stall" })).filter((food) => matchesCareProduct(text, food.name, food.stall)).slice(0, 6);
        append({ content: foods.length ? "Available on ThelaWala now:" : "No available ThelaWala items match that request right now. Try another food or browse the menu.", foods });
      } else if (intent === "orders") {
        append({ content: "Open Your orders below for your live delivery status, bill and tracking. For a problem, create a support ticket here; only the care team can approve a resolution." });
      } else {
        append({ content: "ThelaWala connects you with local street-food stalls in Bhubaneswar. I can help you find available food, add it to your cart, view orders, and create or track support tickets. I only provide ThelaWala information." });
      }
    } catch { append({ content: "We couldn't load this information right now. Please try again. Your existing orders and tickets are unchanged." }); }
    finally { setBusy(false); }
  }

  async function createTicket() {
    if (!userId) { openLoginModal(); return; }
    if (!issue.trim() || busy) return;
    setBusy(true); setNote(null);
    try {
      const { data, error } = await supabase.from("support_tickets").insert({ user_id: userId, category: "OTHER", subject: issue.trim().slice(0, 160), order_id: null }).select("id,code,subject,status,resolution_note").single();
      if (error || !data) throw error ?? new Error("Ticket not saved");
      append({ content: `Ticket receipt ${data.code}. Sent to the ThelaWala admin care team. Open the ticket to track replies and the resolution report.`, tickets: [data] });
      setTicketForm(false); setIssue("");
    } catch { setNote("Ticket wasn't created. Please try again."); }
    finally { setBusy(false); }
  }

  return <>
    <Button size="icon" aria-label="Open ThelaWala Care" onClick={() => setOpen(true)} className={`fixed right-4 z-40 h-12 w-12 rounded-full shadow-card ${cartVisible ? "bottom-[calc(env(safe-area-inset-bottom)+178px)]" : "bottom-[calc(env(safe-area-inset-bottom)+100px)]"}`}><MessageCircle /></Button>
    {open && <div className="fixed inset-0 z-[80] flex items-end justify-center bg-foreground/35 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setOpen(false)}>
      <section role="dialog" aria-modal="true" aria-labelledby="care-title" className="care-chat-sheet liquid-glass flex w-full max-w-[480px] flex-col overflow-hidden rounded-t-3xl sm:rounded-2xl" onClick={(event) => event.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex min-w-0 items-center gap-3"><img src={brand.url} alt="" className="h-10 w-10 rounded-full object-cover" /><div><h2 id="care-title" className="text-sm font-extrabold">ThelaWala Care</h2><p className="text-xs text-muted-foreground">Food · Orders · Support</p></div></div>
          <Button variant="ghost" size="icon" aria-label="Close ThelaWala Care" onClick={() => setOpen(false)}><X /></Button>
        </header>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4">
          {msgs.map((message) => <div key={message.id} className={message.role === "user" ? "ml-8" : "mr-3"}>
            <p className={`whitespace-pre-wrap break-words rounded-xl p-3 text-sm leading-relaxed ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-card text-card-foreground border border-border"}`}>{message.content}</p>
            {message.foods?.map((food) => <article key={food.id} className="mt-2 flex gap-3 rounded-lg border border-border bg-card p-2">
              <Link to="/item/$id" params={{ id: food.id }} onClick={() => setOpen(false)} className="shrink-0"><img src={food.photo_url ?? foodImage(food.name)} alt={food.name} className="h-20 w-20 rounded-lg object-cover" /></Link>
              <div className="min-w-0 flex-1"><p className="break-words text-sm font-bold">{food.name}</p><p className="break-words text-xs text-muted-foreground">{food.stall}</p><div className="mt-2 flex items-center justify-between gap-2"><span className="text-sm font-bold">{inr(customerPrice(food.price))}</span><Button size="sm" aria-label={`Add ${food.name}`} onClick={() => { const result = cart.add({ itemId: food.id, vendorId: food.vendor_id, vendorName: food.stall, name: food.name, photo: food.photo_url, unit: food.unit, base: Number(food.price), price: customerPrice(food.price), mrp: customerPrice(food.mrp) }); if (result.ok) setNote(`${food.name} added to cart.`); else { setOpen(false); if (!("conflict" in result)) setNote(result.error); } }}><Plus />Add</Button></div></div>
            </article>)}
            {message.tickets?.map((ticket) => <Link key={ticket.id} to="/support/$id" params={{ id: ticket.id }} onClick={() => setOpen(false)} className="mt-2 block rounded-lg border border-border bg-card p-3"><div className="flex justify-between gap-2 text-xs font-bold"><span><ReceiptText className="mr-1 inline h-4 w-4" />{ticket.code}</span><span className="text-primary">{ticket.status}</span></div><p className="mt-1 break-words text-sm">{ticket.subject}</p>{ticket.resolution_note && <p className="mt-2 break-words text-xs text-muted-foreground">Care team: {ticket.resolution_note}</p>}</Link>)}
          </div>)}
          {ticketForm && <form className="space-y-2 border-t border-border pt-3" onSubmit={(event) => { event.preventDefault(); void createTicket(); }}><label htmlFor="care-issue" className="text-sm font-bold">Describe your issue</label><textarea id="care-issue" maxLength={160} value={issue} onChange={(event) => setIssue(event.target.value)} className="min-h-24 w-full rounded-lg border border-input bg-card p-3 text-sm" /><div className="flex gap-2"><Button disabled={busy || !issue.trim()} type="submit"><ReceiptText />{userId ? "Send ticket" : "Sign in to send"}</Button><Button variant="ghost" onClick={() => setTicketForm(false)} type="button">Cancel</Button></div></form>}
          {busy && <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" />Checking ThelaWala…</p>}
          {note && <p role="status" className="text-xs font-semibold text-primary">{note}</p>}<div ref={endRef} />
        </div>
        <footer className="space-y-3 border-t border-border p-3">
          <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => void send("Show food menu")}><ShoppingBag />Menu</Button><Button size="sm" variant="outline" onClick={() => void send("Create support ticket")}><Plus />New ticket</Button><Button size="sm" variant="outline" onClick={() => void send("Track tickets")}><ReceiptText />Track tickets</Button><Button size="sm" variant="ghost" asChild><Link to="/orders" onClick={() => setOpen(false)}>Your orders</Link></Button></div>
          {!userId && <Button variant="link" onClick={() => { setOpen(false); openLoginModal(); }}>Sign in for orders and tickets</Button>}
          <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); void send(); }}><input ref={inputRef} aria-label="Message ThelaWala Care" placeholder="Ask ThelaWala…" maxLength={1000} value={input} onChange={(event) => setInput(event.target.value)} className="min-w-0 flex-1 rounded-full border border-input bg-card px-4 py-3 text-sm outline-none focus:border-primary" /><Button type="submit" size="icon" aria-label="Send message" disabled={busy || !input.trim()} className="h-11 w-11 rounded-full"><Send /></Button></form>
        </footer>
      </section>
    </div>}
  </>;
}
