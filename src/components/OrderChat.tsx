import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type ChatRow = { id: string; sender_role: string; body: string; created_at: string };

/** Live chat between the customer and the delivery partner on one order. */
export function OrderChat({
  orderId,
  role,
  senderId,
  title = "Chat with delivery partner",
}: {
  orderId: string;
  role: "CUSTOMER" | "RIDER" | "SUPPORT";
  senderId: string | undefined;
  title?: string;
}) {
  const [rows, setRows] = useState<ChatRow[]>([]);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  async function load() {
    const { data } = await supabase
      .from("order_chats")
      .select("id,sender_role,body,created_at")
      .eq("order_id", orderId)
      .order("created_at");
    setRows((data ?? []) as ChatRow[]);
  }

  useEffect(() => {
    void load();
    const ch = supabase
      .channel(`order-chat-${orderId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "order_chats", filter: `order_id=eq.${orderId}` }, () => void load())
      .subscribe();
    const timer = setInterval(() => void load(), 8000);
    return () => {
      supabase.removeChannel(ch);
      clearInterval(timer);
    };
  }, [orderId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [rows.length]);

  async function send() {
    const body = text.trim();
    if (!body) return;
    setText("");
    await supabase.from("order_chats").insert({ order_id: orderId, sender_role: role, sender_id: senderId ?? null, body });
    await load();
  }

  return (
    <section className="card-elevated rise-in p-3">
      <p className="text-sm font-bold">{title}</p>
      <div className="mt-2 max-h-56 space-y-2 overflow-y-auto">
        {rows.length === 0 ? <p className="text-[11px] text-muted-foreground">No messages yet. Say hello 👋</p> : null}
        {rows.map((m) => {
          const mine = m.sender_role === role;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-[12px] font-medium ${
                  mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                }`}
              >
                {m.body}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <div className="mt-2 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void send();
          }}
          placeholder="Type a message…"
          className="min-w-0 flex-1 rounded-full bg-muted px-4 py-2.5 text-sm outline-none"
        />
        <button
          onClick={() => void send()}
          disabled={!text.trim()}
          className="press shrink-0 rounded-full bg-primary px-4 text-xs font-black text-primary-foreground disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </section>
  );
}
