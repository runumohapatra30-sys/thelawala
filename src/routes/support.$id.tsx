import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PortalHeader, Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/support/$id")({
  head: () => ({
    meta: [
      { title: "Support chat — ThelaWala" },
      { name: "description", content: "Chat with ThelaWala Care about your order status, bill, delivery partner or refund on this support ticket." },
      { property: "og:title", content: "Support chat — ThelaWala" },
      { property: "og:description", content: "Live order support chat and ticket updates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SupportChat,
});

type Msg = { id: string; sender_role: string; body: string; created_at: string };
type Ticket = { id: string; code: string; subject: string; status: string; order_id: string | null; resolution_note: string | null };

function SupportChat() {
  const { id } = Route.useParams();
  const { user } = useSession();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);


  const loadMsgs = () =>
    supabase
      .from("support_messages")
      .select("id,sender_role,body,created_at")
      .eq("ticket_id", id)
      .order("created_at", { ascending: true })
      .then(({ data }) => setMsgs((data ?? []) as Msg[]));

  useEffect(() => {
    if (!user) return;
    let alive = true;
    const refresh = async () => {
      const [{ data, error: ticketError }, { data: messages, error: messageError }] = await Promise.all([
        supabase.from("support_tickets").select("id,code,subject,status,order_id,resolution_note").eq("id", id).eq("user_id", user.id).maybeSingle(),
        supabase.from("support_messages").select("id,sender_role,body,created_at").eq("ticket_id", id).order("created_at", { ascending: true }),
      ]);
      if (!alive) return;
      if (ticketError || messageError) { setError("Could not load ticket updates. Please try again."); return; }
      setTicket(data); setMsgs(messages ?? []);
      if (!data) setError("This ticket is not available for your account.");
    };
    void refresh();
    const channel = supabase.channel(`customer-care-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "support_messages", filter: `ticket_id=eq.${id}` }, () => { void refresh(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets", filter: `id=eq.${id}` }, () => { void refresh(); })
      .subscribe();
    const timer = window.setInterval(() => { void refresh(); }, 15000);
    return () => { alive = false; window.clearInterval(timer); void supabase.removeChannel(channel); };
  }, [id, user?.id]);

  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight });
  }, [msgs.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || !user || !ticket || sending) return;
    setSending(true); setError(null);
    const { error: insertError } = await supabase.from("support_messages").insert({ ticket_id: id, sender_role: "customer", sender_id: user.id, body });
    if (insertError) setError("Message was not sent. Please try again.");
    else { setText(""); await loadMsgs(); }
    setSending(false);
  };

  return (
    <Shell>
      <PortalHeader title="ThelaWala Care" subtitle={ticket ? `${ticket.code} · ${ticket.subject}` : "Support chat"} />
      <div className="flex flex-col gap-3 p-4">
        {ticket ? (
          <div className="card-soft flex items-center justify-between border border-border px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-bold">Ticket {ticket.code}</p>
              {ticket.order_id ? (
                <Link to="/orders/$id" params={{ id: ticket.order_id }} className="text-[11px] font-semibold text-primary">
                  View linked order
                </Link>
              ) : (
                <p className="text-[11px] text-muted-foreground">No order linked</p>
              )}
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${ticket.status === "OPEN" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
            >
              {ticket.status}
            </span>
          </div>
        ) : null}

        {!user ? <Link to="/auth" className="text-sm font-bold text-primary">Sign in to track your ticket</Link> : null}
        {ticket ? <p className="text-xs text-muted-foreground">Receipt saved · Sent to admin care team · {ticket.status === "RESOLVED" ? "Resolved" : "Awaiting care-team resolution"}</p> : null}
        {ticket?.resolution_note ? (
          <p className="rounded-xl bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
            Care team: {ticket.resolution_note}
          </p>
        ) : null}

        <div ref={boxRef} className="max-h-[52vh] space-y-2 overflow-y-auto">
          {msgs.map((m) => (
            <div key={m.id} className={m.sender_role === "customer" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={
                  m.sender_role === "customer"
                    ? "max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground"
                    : m.sender_role === "admin"
                      ? "max-w-[85%] rounded-2xl rounded-bl-sm border border-primary/40 bg-primary/5 px-3 py-2 text-sm"
                      : "max-w-[85%] rounded-2xl rounded-bl-sm border border-border px-3 py-2 text-sm"
                }
              >
                {m.sender_role === "admin" ? <p className="mb-0.5 text-[11px] font-bold text-primary">Care team</p> : null}
                <p className="whitespace-pre-wrap">{m.body}</p>
              </div>
            </div>
          ))}
          {sending ? <p className="animate-pulse text-xs text-muted-foreground">Sending your message…</p> : null}
        </div>

        {error ? <p className="text-xs font-semibold text-destructive">{error}</p> : null}

        <form onSubmit={send} className="flex gap-2">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your message…"
            className="flex-1 rounded-xl border border-border px-3 py-3 text-sm outline-none focus:border-primary"
          />
          <Button
            type="submit"
            disabled={sending || !ticket || !text.trim()}
            className="rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            Send
          </Button>
        </form>

        <a href="tel:9078492360" className="text-center text-xs font-bold text-primary">
          Still stuck? Call care · 9078492360
        </a>
      </div>
    </Shell>
  );
}
