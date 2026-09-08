import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/fees";

type Ticket = {
  id: string;
  code: string;
  subject: string;
  category: string;
  status: string;
  created_at: string;
  user_id: string;
  order_id: string | null;
  resolution_note: string | null;
};
type Msg = { id: string; sender_role: string; body: string; created_at: string };

export function SupportQueue({ adminId }: { adminId: string }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [reply, setReply] = useState("");
  const [refund, setRefund] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [filter, setFilter] = useState<"OPEN" | "RESOLVED">("OPEN");

  const load = () =>
    supabase
      .from("support_tickets")
      .select("id,code,subject,category,status,created_at,user_id,order_id,resolution_note")
      .eq("status", filter)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => setTickets((data ?? []) as Ticket[]));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const open = async (t: Ticket) => {
    if (openId === t.id) {
      setOpenId(null);
      return;
    }
    setOpenId(t.id);
    setReply("");
    setRefund("");
    setNote(null);
    const { data } = await supabase
      .from("support_messages")
      .select("id,sender_role,body,created_at")
      .eq("ticket_id", t.id)
      .order("created_at", { ascending: true });
    setMsgs((data ?? []) as Msg[]);
  };

  const sendReply = async (t: Ticket) => {
    const body = reply.trim();
    if (!body) return;
    await supabase.from("support_messages").insert({ ticket_id: t.id, sender_role: "admin", sender_id: adminId, body });
    setReply("");
    await open({ ...t, id: t.id });
    setOpenId(t.id);
  };

  const resolve = async (t: Ticket) => {
    await supabase
      .from("support_tickets")
      .update({ status: "RESOLVED", resolution_note: note ?? "Resolved by the care team." })
      .eq("id", t.id);
    load();
    setOpenId(null);
  };

  const payRefund = async (t: Ticket) => {
    const amount = Number(refund);
    if (!amount || amount <= 0) return;
    const { error } = await supabase.rpc("wallet_credit", {
      _user_id: t.user_id,
      _amount: amount,
      _source: "SUPPORT_REFUND",
      ...(t.order_id ? { _order_id: t.order_id } : {}),
      _note: `Support ticket ${t.code}`,
    });
    if (error) {
      setNote(`Refund failed: ${error.message}`);
      return;
    }
    await supabase.from("support_messages").insert({
      ticket_id: t.id,
      sender_role: "admin",
      sender_id: adminId,
      body: `We have credited ${inr(amount)} to your ThelaWala wallet for ticket ${t.code}.`,
    });
    setRefund("");
    setNote(`${inr(amount)} credited to the customer wallet.`);
    await open({ ...t, id: t.id });
    setOpenId(t.id);
  };

  return (
    <section className="card-soft border border-border p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold">Support tickets</p>
        <div className="flex gap-1">
          {(["OPEN", "RESOLVED"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-2 py-1 text-[11px] font-bold ${filter === f ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {tickets.length === 0 ? <p className="mt-1 text-xs text-muted-foreground">No {filter.toLowerCase()} tickets.</p> : null}

      {tickets.map((t) => (
        <div key={t.id} className="mt-2 rounded-xl border border-border p-2.5">
          <button onClick={() => open(t)} className="flex w-full items-center justify-between text-left">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{t.subject}</p>
              <p className="text-[11px] text-muted-foreground">
                {t.code} · {t.category} · {new Date(t.created_at).toLocaleString("en-IN")}
              </p>
            </div>
            <span className="text-primary">{openId === t.id ? "▾" : "›"}</span>
          </button>

          {openId === t.id ? (
            <div className="mt-2 space-y-2">
              <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-lg bg-muted/40 p-2">
                {msgs.map((m) => (
                  <p key={m.id} className="text-xs">
                    <span className="font-bold">
                      {m.sender_role === "customer" ? "Customer" : m.sender_role === "bot" ? "Bot" : "Care"}:{" "}
                    </span>
                    {m.body}
                  </p>
                ))}
              </div>

              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Reply to the customer…"
                className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <div className="flex flex-wrap gap-2">
                <button onClick={() => sendReply(t)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
                  Send reply
                </button>
                {t.status === "OPEN" ? (
                  <button onClick={() => resolve(t)} className="rounded-lg border border-primary px-3 py-1.5 text-xs font-bold text-primary">
                    Mark resolved
                  </button>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  value={refund}
                  onChange={(e) => setRefund(e.target.value)}
                  placeholder="Refund ₹"
                  className="w-28 rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <button onClick={() => payRefund(t)} className="rounded-lg border border-primary px-3 py-2 text-xs font-bold text-primary">
                  Credit to wallet
                </button>
              </div>
              {note ? <p className="text-[11px] font-semibold text-primary">{note}</p> : null}
            </div>
          ) : null}
        </div>
      ))}
    </section>
  );
}
