import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PortalHeader, Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { ThaliwalaLoader } from "@/components/ThaliwalaLoader";

export const Route = createFileRoute("/support/")({
  validateSearch: (search: Record<string, unknown>) => ({
    order: typeof search['order'] === "string" ? (search['order'] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Order help & tickets — ThelaWala" },
      { name: "description", content: "Chat with ThelaWala Care about a late order, wrong items, delivery partner issues or a refund, and track your support tickets." },
      { property: "og:title", content: "Order help & tickets — ThelaWala" },
      { property: "og:description", content: "Instant order support chat and ticket tracking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SupportHome,
});

export const ISSUES = [
  { key: "DELAY", label: "Order delayed", ask: "My order is delayed. Where is it right now?" },
  { key: "WRONG_ITEMS", label: "Wrong items delivered", ask: "I received wrong items in my order." },
  { key: "PARTNER_ISSUE", label: "Delivery partner issue", ask: "I had a problem with the delivery partner." },
  { key: "REFUND", label: "Request cancellation / refund", ask: "I want to cancel my order and get a refund." },
  { key: "OTHER", label: "Something else", ask: "I need help with my order." },
] as const;

type Ticket = { id: string; code: string; subject: string; status: string; created_at: string; order_id: string | null };

function SupportHome() {
  const { order } = Route.useSearch();
  const { user, loading } = useSession();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [orders, setOrders] = useState<{ id: string; code: string }[]>([]);
  const [orderId, setOrderId] = useState<string>(order ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("support_tickets")
      .select("id,code,subject,status,created_at,order_id")
      .order("created_at", { ascending: false })
      .then(({ data }) => setTickets((data ?? []) as Ticket[]));
    supabase
      .from("orders")
      .select("id,code")
      .order("created_at", { ascending: false })
      .limit(15)
      .then(({ data }) => setOrders(data ?? []));
  }, [user?.id]);

  const start = async (issue: (typeof ISSUES)[number]) => {
    if (!user || busy) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("support_tickets")
      .insert({
        user_id: user.id,
        order_id: orderId || null,
        category: issue.key,
        subject: issue.label,
      })
      .select("id,code")
      .single();
    if (error || !data) {
      setBusy(false);
      return;
    }
    await supabase.from("support_messages").insert([
      {
        ticket_id: data.id,
        sender_role: "bot",
        body: `Namaskar! Ticket ${data.code} is open for "${issue.label}". Tell me what happened and I will check your order details right away.`,
      },
      { ticket_id: data.id, sender_role: "customer", sender_id: user.id, body: issue.ask },
    ]);
    navigate({ to: "/support/$id", params: { id: data.id } });
  };

  return (
    <Shell>
      <PortalHeader title="Help & support" subtitle="Order help, refunds and tickets" />
      <div className="space-y-3 p-4">
        {loading ? <ThaliwalaLoader /> : !user ? (
          <div className="py-16 text-center">
            <p className="text-sm text-muted-foreground">Sign in to chat with ThelaWala Care.</p>
            <Link to="/auth" className="mt-3 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">
              Sign in
            </Link>
          </div>
        ) : (
          <>
            <section className="card-soft border border-border p-3">
              <p className="text-sm font-bold">What went wrong?</p>
              <label className="mt-2 block">
                <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Order (optional)</span>
                <select
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="w-full rounded-xl border border-border px-3 py-2 text-sm"
                >
                  <option value="">Not about a specific order</option>
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>#{o.code}</option>
                  ))}
                </select>
              </label>
              <div className="mt-2 grid gap-2">
                {ISSUES.map((i) => (
                  <button
                    key={i.key}
                    disabled={busy}
                    onClick={() => start(i)}
                    className="press flex items-center justify-between rounded-xl border border-border px-3 py-3 text-left text-sm font-semibold disabled:opacity-60"
                  >
                    {i.label}
                    <span className="text-primary">›</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="card-soft border border-border p-3">
              <p className="text-sm font-bold">Your tickets</p>
              {tickets.length === 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">No support tickets yet.</p>
              ) : (
                tickets.map((t) => (
                  <Link
                    key={t.id}
                    to="/support/$id"
                    params={{ id: t.id }}
                    className="mt-2 flex items-center justify-between rounded-xl border border-border px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{t.subject}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {t.code} · {new Date(t.created_at).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${t.status === "OPEN" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
                    >
                      {t.status}
                    </span>
                  </Link>
                ))
              )}
            </section>

            <a href="tel:9078492360" className="block rounded-xl border border-border py-3 text-center text-sm font-bold text-primary">
              Call care · 9078492360
            </a>
          </>
        )}
      </div>
    </Shell>
  );
}
