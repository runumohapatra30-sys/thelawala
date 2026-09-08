import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import { inr, STATUS_LABEL } from "@/lib/fees";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/orders/")({
  head: () => ({
    meta: [
      { title: "Your orders — ThelaWala" },
      { name: "description", content: "Track every ThelaWala street food order, see the bill and get help in one place." },
      { property: "og:title", content: "Your orders — ThelaWala" },
      { property: "og:description", content: "All your street food orders and live tracking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Orders,
});

type Row = {
  id: string; code: string; status: string; grand_total: number; food_total: number;
  delivery_fee: number; platform_fee: number; handling_fee: number; packing_fee: number;
  surge_fee: number; tip_amount: number; payment_mode: string; distance_km: number;
  created_at: string; vendor_id: string; address_line: string;
};
type OrderItem = { id: string; order_id: string; name: string; qty: number; price: number; photo_url: string | null };

const PILL: Record<string, string> = {
  DELIVERED: "bg-primary/10 text-primary",
  CANCELLED: "bg-destructive/10 text-destructive",
};

function shortStatus(s: string) {
  if (s === "PREPARING" || s === "VENDOR_ACCEPTED" || s === "PLACED") return "Preparing";
  if (s === "DELIVERED") return "Delivered";
  if (s === "CANCELLED") return "Cancelled";
  return STATUS_LABEL[s] ?? s;
}

function Orders() {
  const { user, loading } = useSession();
  const [rows, setRows] = useState<Row[]>([]);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [stalls, setStalls] = useState<Record<string, string>>({});
  const [billFor, setBillFor] = useState<Row | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("orders")
        .select("id,code,status,grand_total,food_total,delivery_fee,platform_fee,handling_fee,packing_fee,surge_fee,tip_amount,payment_mode,distance_km,created_at,vendor_id,address_line")
        .order("created_at", { ascending: false })
        .limit(40);
      const list = (data ?? []) as Row[];
      setRows(list);
      if (list.length === 0) return;
      const [{ data: its }, { data: vs }] = await Promise.all([
        supabase.from("order_items").select("id,order_id,name,qty,price,photo_url").in("order_id", list.map((o) => o.id)),
        supabase.from("vendors").select("id,stall_name").in("id", [...new Set(list.map((o) => o.vendor_id))]),
      ]);
      setItems((its ?? []) as OrderItem[]);
      setStalls(Object.fromEntries((vs ?? []).map((v) => [v.id, v.stall_name])));
    })();
  }, [user?.id]);

  return (
    <Shell>
      <header className="brand-header sticky top-0 z-30 flex items-center gap-3 px-4 py-3">
        <Link to="/" aria-label="Back to home" className="press grid h-9 w-9 shrink-0 place-items-center rounded-full bg-card/70">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-extrabold">Your orders</h1>
          <p className="truncate text-xs font-medium opacity-80">Track, re-check bills and get help</p>
        </div>
      </header>

      <div className="space-y-3 p-4">
        {loading ? null : !user ? (
          <div className="py-16 text-center">
            <p className="text-sm text-muted-foreground">Sign in to see your orders.</p>
            <Link to="/auth" className="mt-3 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">
              Sign in
            </Link>
          </div>
        ) : rows.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          rows.map((o) => {
            const its = items.filter((i) => i.order_id === o.id);
            const thumb = its[0]?.photo_url ?? "/food/food-tiffin.jpg";
            return (
              <article key={o.id} className="card-soft overflow-hidden border border-border">
                <div className="flex gap-3 p-3">
                  <img src={thumb} alt={its[0]?.name ?? "Order"} className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-black">{stalls[o.vendor_id] ?? "ThelaWala stall"}</p>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${PILL[o.status] ?? "bg-brand/20 text-primary"}`}>
                        {shortStatus(o.status)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      #{o.code} · {new Date(o.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-foreground">
                      {its.length ? its.map((i) => `${i.name} × ${i.qty}`).join(", ") : "Items loading…"}
                    </p>
                    <p className="mt-1 text-sm font-black">{inr(Number(o.grand_total) + Number(o.tip_amount ?? 0))}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-px border-t border-border bg-border">
                  <Link
                    to="/orders/$id"
                    params={{ id: o.id }}
                    className="press bg-card py-2.5 text-center text-[11px] font-black text-primary"
                  >
                    Track order
                  </Link>
                  <button onClick={() => setBillFor(o)} className="press bg-card py-2.5 text-center text-[11px] font-black">
                    Order details
                  </button>
                  <Link
                    to="/support"
                    search={{ order: o.id }}
                    className="press bg-card py-2.5 text-center text-[11px] font-black text-primary"
                  >
                    Need help?
                  </Link>
                </div>
              </article>
            );
          })
        )}
      </div>

      {billFor ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => setBillFor(null)}>
          <div className="mx-auto w-full max-w-[480px] rounded-t-3xl bg-card p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
            <p className="text-sm font-black">Bill for #{billFor.code}</p>
            <p className="text-[11px] text-muted-foreground">{billFor.address_line}</p>
            <div className="mt-3 space-y-2">
              {items.filter((i) => i.order_id === billFor.id).map((i) => (
                <div key={i.id} className="flex items-center gap-3">
                  <img src={i.photo_url ?? "/food/food-tiffin.jpg"} alt={i.name} className="h-9 w-9 rounded-lg object-cover" />
                  <p className="flex-1 truncate text-sm">{i.name} × {i.qty}</p>
                  <p className="text-sm font-semibold">{inr(Number(i.price) * i.qty)}</p>
                </div>
              ))}
            </div>
            <dl className="mt-3 space-y-1.5 border-t border-border pt-2 text-sm">
              <BillRow label="Item total" value={inr(Number(billFor.food_total))} />
              <BillRow label={`Delivery fee (${billFor.distance_km} km)`} value={Number(billFor.delivery_fee) ? inr(Number(billFor.delivery_fee)) : "FREE"} />
              {Number(billFor.platform_fee) ? <BillRow label="Platform fee" value={inr(Number(billFor.platform_fee))} /> : null}
              {Number(billFor.handling_fee) ? <BillRow label="Handling fee" value={inr(Number(billFor.handling_fee))} /> : null}
              {Number(billFor.packing_fee) ? <BillRow label="Packing fee" value={inr(Number(billFor.packing_fee))} /> : null}
              {Number(billFor.surge_fee) ? <BillRow label="Surge fee" value={inr(Number(billFor.surge_fee))} /> : null}
              {Number(billFor.tip_amount) ? <BillRow label="Delivery partner tip" value={inr(Number(billFor.tip_amount))} /> : null}
              <div className="flex justify-between border-t border-border pt-2 text-base font-black">
                <span>Total ({billFor.payment_mode === "COD" ? "Cash on delivery" : "Paid online"})</span>
                <span>{inr(Number(billFor.grand_total) + Number(billFor.tip_amount ?? 0))}</span>
              </div>
            </dl>
            <button onClick={() => setBillFor(null)} className="press mt-4 w-full rounded-xl bg-primary py-3 text-sm font-black text-primary-foreground">
              Close
            </button>
          </div>
        </div>
      ) : null}
    </Shell>
  );
}

function BillRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
