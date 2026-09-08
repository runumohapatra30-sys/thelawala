import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PortalHeader, Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import { askSupportBot } from "@/lib/support.functions";
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
  const autoRef = useRef<string | null>(null);

  const loadMsgs = () =>
    supabase
      .from("support_messages")
      .select("id,sender_role,body,created_at")
      .eq("ticket_id", id)
      .order("created_at", { ascending: true })
      .then(({ data }) => setMsgs((data ?? []) as Msg[]));

  useEffect(() => {
    if (!user) return;
    supabase
      .from("support_tickets")
      .select("id,code,subject,status,order_id,resolution_note")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => setTicket(data as Ticket | null));
    loadMsgs();
  }, [id, user?.id]);

  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight });
    inputRef.current?.focus();
  }, [msgs.length, sending]);

  useEffect(() => {
    const last = msgs[msgs.length - 1];
    if (!last || last.sender_role !== "customer" || sending) return;
    if (autoRef.current === last.id) return;
    autoRef.current = last.id;
    void ask();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msgs]);


  const ask = async () => {
    const last = [...msgs].reverse().find((m) => m.sender_role === "customer");
    if (!last || sending) return;
    setSending(true);
    setError(null);
    try {
      await askSupportBot({ data: { ticketId: id, message: last.body } });
      await loadMsgs();
    } catch {
      setError("ThelaWala Care is busy right now. Please try again, or call 9078492360.");
    }
    setSending(false);
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || !user || sending) return;
    setText("");
    setSending(true);
    setError(null);
    await supabase.from("support_messages").insert({ ticket_id: id, sender_role: "customer", sender_id: user.id, body });
    await loadMsgs();
    try {
      await askSupportBot({ data: { ticketId: id, message: body } });
      await loadMsgs();
    } catch {
      setError("ThelaWala Care is busy right now. Please try again, or call 9078492360.");
    }
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
          {sending ? <p className="animate-pulse text-xs text-muted-foreground">ThelaWala Care is typing…</p> : null}
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
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            Send
          </button>
        </form>

        <a href="tel:9078492360" className="text-center text-xs font-bold text-primary">
          Still stuck? Call care · 9078492360
        </a>
      </div>
    </Shell>
  );
}
