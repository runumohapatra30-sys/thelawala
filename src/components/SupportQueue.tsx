import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/fees";
import { Button } from "@/components/ui/button";

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

  const [working, setWorking] = useState(false);

  const load = () =>
    supabase
      .from("support_tickets")
      .select("id,code,subject,category,status,created_at,user_id,order_id,resolution_note")
      .eq("status", filter)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data, error }) => { if (error) setNote("Could not load support tickets."); else setTickets((data ?? []) as Ticket[]); });

  useEffect(() => {
    void load();
    const channel = supabase.channel(`admin-care-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () => { void load(); })
      .subscribe();
    const timer = window.setInterval(() => { void load(); }, 15000);
    return () => { window.clearInterval(timer); void supabase.removeChannel(channel); };
  }, [filter]);

  const loadMessages = async (id: string) => {
    const { data, error } = await supabase.from("support_messages").select("id,sender_role,body,created_at").eq("ticket_id", id).order("created_at", { ascending: true });
    if (error) { setNote("Could not load ticket messages."); return; }
    setMsgs((data ?? []) as Msg[]);
  };

  useEffect(() => {
    if (!openId) return;
    const channel = supabase.channel(`admin-care-messages-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "support_messages", filter: `ticket_id=eq.${openId}` }, () => { void loadMessages(openId); })
      .subscribe();
    const timer = window.setInterval(() => { void loadMessages(openId); }, 15000);
    return () => { window.clearInterval(timer); void supabase.removeChannel(channel); };
  }, [openId]);

  const open = async (t: Ticket) => {
    if (openId === t.id) { setOpenId(null); return; }
    setOpenId(t.id); setReply(""); setRefund(""); setNote(null);
    await loadMessages(t.id);
  };

  const sendReply = async (t: Ticket) => {
    const body = reply.trim();
    if (!body || working) return;
    setWorking(true);
    const { error } = await supabase.from("support_messages").insert({ ticket_id: t.id, sender_role: "admin", sender_id: adminId, body });
    if (error) setNote("Reply was not sent. Please try again.");
    else { setReply(""); await loadMessages(t.id); }
    setWorking(false);
  };

  const resolve = async (t: Ticket) => {
    if (working) return;
    const report = reply.trim() || t.resolution_note || "Resolved by the care team.";
    setWorking(true);
    const { error } = await supabase.from("support_tickets").update({ status: "RESOLVED", resolution_note: report }).eq("id", t.id);
    if (error) setNote("Could not resolve the ticket. Please try again.");
    else { await load(); setOpenId(null); setReply(""); }
    setWorking(false);
  };

  const payRefund = async (t: Ticket) => {
    const amount = Number(refund);
    if (!Number.isFinite(amount) || amount <= 0 || working) return;
    setWorking(true);
    const { error } = await supabase.rpc("wallet_credit", {
      _user_id: t.user_id, _amount: amount, _source: "SUPPORT_REFUND",
      ...(t.order_id ? { _order_id: t.order_id } : {}), _note: `Support ticket ${t.code}`,
    });
    if (error) { setNote(`Refund failed: ${error.message}`); setWorking(false); return; }
    const { error: messageError } = await supabase.from("support_messages").insert({ ticket_id: t.id, sender_role: "admin", sender_id: adminId, body: `We have credited ${inr(amount)} to your ThelaWala wallet for ticket ${t.code}.` });
    setRefund("");
    setNote(messageError ? "Wallet credited, but the ticket message could not be saved. Do not refund again." : `${inr(amount)} credited to the customer wallet.`);
    await loadMessages(t.id);
    setWorking(false);
  };

  return (
    <section className="card-soft border border-border p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold">Support tickets</p>
        <div className="flex gap-1">
          {(["OPEN", "RESOLVED"] as const).map((f) => (
            <Button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-2 py-1 text-[11px] font-bold ${filter === f ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"}`}
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      {note && !openId ? <p role="status" className="mt-2 text-xs text-muted-foreground">{note}</p> : null}
      {tickets.length === 0 ? <p className="mt-1 text-xs text-muted-foreground">No {filter.toLowerCase()} tickets.</p> : null}

      {tickets.map((t) => (
        <div key={t.id} className="mt-2 rounded-xl border border-border p-2.5">
          <Button onClick={() => open(t)} className="flex w-full items-center justify-between text-left">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{t.subject}</p>
              <p className="text-[11px] text-muted-foreground">
                {t.code} · {t.category} · {new Date(t.created_at).toLocaleString("en-IN")}
              </p>
            </div>
            <span className="text-primary">{openId === t.id ? "▾" : "›"}</span>
          </Button>

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
                placeholder="Reply or resolution report…"
                className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <div className="flex flex-wrap gap-2">
                <Button disabled={working || !reply.trim()} onClick={() => sendReply(t)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
                  Send reply
                </Button>
                {t.status === "OPEN" ? (
                  <Button disabled={working} onClick={() => resolve(t)} className="rounded-lg border border-primary px-3 py-1.5 text-xs font-bold text-primary">
                    Mark resolved
                  </Button>
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
                <Button disabled={working} onClick={() => payRefund(t)} className="rounded-lg border border-primary px-3 py-2 text-xs font-bold text-primary">
                  Credit to wallet
                </Button>
              </div>
              {note ? <p className="text-[11px] font-semibold text-primary">{note}</p> : null}
            </div>
          ) : null}
        </div>
      ))}
    </section>
  );
}
