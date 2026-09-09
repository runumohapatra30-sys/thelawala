import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import { cart } from "@/lib/cart";
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
type OrderItem = { id: string; order_id: string; item_id: string | null; name: string; qty: number; price: number; mrp: number; photo_url: string | null };

const PILL: Record<string, string> = {
  DELIVERED: "bg-primary/10 text-primary",
  CANCELLED: "bg-destructive/10 text-destructive",
};

function shortStatus(s: string) {
  if (s === "PREPARING" || s === "ORDER_PLACED") return "Preparing";
  if (s === "OUT_FOR_DELIVERY") return "Out for Delivery";
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
  const [rateFor, setRateFor] = useState<Row | null>(null);
  const [rated, setRated] = useState<string[]>([]);
  const [food, setFood] = useState(5);
  const [delivery, setDelivery] = useState(5);
  const [review, setReview] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  function orderAgain(o: Row) {
    cart.clear();
    let blocked = false;
    for (const i of items.filter((x) => x.order_id === o.id)) {
      for (let n = 0; n < i.qty; n++) {
        const res = cart.add({
          itemId: i.item_id ?? i.id,
          vendorId: o.vendor_id,
          name: i.name,
          photo: i.photo_url,
          unit: null,
          price: Number(i.price),
          mrp: Number(i.mrp ?? i.price),
        });
        if (!res.ok) blocked = true;
      }
    }
    setMsg(blocked ? "Some items could not be added." : "Items added to your cart.");
  }

  async function saveRating() {
    if (!user || !rateFor) return;
    const { error } = await supabase.from("order_ratings").insert({
      order_id: rateFor.id,
      user_id: user.id,
      vendor_id: rateFor.vendor_id,
      food_stars: food,
      delivery_stars: delivery,
      review: review || null,
    });
    if (error) return setMsg("Could not save your rating.");
    setRated((r) => [...r, rateFor.id]);
    setRateFor(null);
    setReview("");
    setMsg("Thanks for rating your order!");
  }

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
      const [{ data: its }, { data: vs }, { data: rt }] = await Promise.all([
        supabase.from("order_items").select("id,order_id,item_id,name,qty,price,mrp,photo_url").in("order_id", list.map((o) => o.id)),
        supabase.from("vendors").select("id,stall_name").in("id", [...new Set(list.map((o) => o.vendor_id))]),
        supabase.from("order_ratings").select("order_id").in("order_id", list.map((o) => o.id)),
      ]);
      setItems((its ?? []) as OrderItem[]);
      setStalls(Object.fromEntries((vs ?? []).map((v) => [v.id, v.stall_name])));
      setRated((rt ?? []).map((r) => r.order_id));
    })();
  }, [user?.id]);

  return (
    <Shell>
      <header className="brand-header sticky top-0 z-30 flex items-center gap-3 rounded-b-[2rem] px-4 py-4 shadow-[0_16px_34px_-26px_rgba(15,23,42,0.55)]">
        <Link to="/" aria-label="Back to home" className="press grid h-10 w-10 shrink-0 place-items-center rounded-2xl glass-chip">
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
          rows.map((o, idx) => {
            const its = items.filter((i) => i.order_id === o.id);
            const thumb = its[0]?.photo_url ?? "/food/food-tiffin.jpg";
            return (
              <article
                key={o.id}
                style={{ animationDelay: `${Math.min(idx, 8) * 60}ms` }}
                className="rise-in card-elevated overflow-hidden"
              >
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
                <div className="grid grid-cols-2 gap-px border-t border-border bg-border">
                  <button onClick={() => orderAgain(o)} className="press bg-card py-2.5 text-center text-[11px] font-black text-primary">
                    Order again
                  </button>
                  {o.status === "DELIVERED" ? (
                    rated.includes(o.id) ? (
                      <span className="bg-card py-2.5 text-center text-[11px] font-black text-muted-foreground">Rated ★</span>
                    ) : (
                      <button
                        onClick={() => { setRateFor(o); setFood(5); setDelivery(5); }}
                        className="press bg-card py-2.5 text-center text-[11px] font-black"
                      >
                        Rate this order
                      </button>
                    )
                  ) : (
                    <span className="bg-card py-2.5 text-center text-[11px] font-black text-muted-foreground">
                      {shortStatus(o.status)}
                    </span>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>

      {billFor ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => setBillFor(null)}>
          <div className="rise-in mx-auto w-full max-w-[480px] rounded-t-[2rem] bg-card p-4" onClick={(e) => e.stopPropagation()}>
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

      {rateFor ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => setRateFor(null)}>
          <div className="rise-in mx-auto w-full max-w-[480px] rounded-t-[2rem] bg-card p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
            <p className="text-sm font-black">Rate order #{rateFor.code}</p>
            <Stars label="Food quality" value={food} onChange={setFood} />
            <Stars label="Delivery partner" value={delivery} onChange={setDelivery} />
            <textarea
              rows={2}
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Write a short review (optional)"
              className="mt-3 w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
            <button onClick={saveRating} className="press mt-3 w-full rounded-xl bg-primary py-3 text-sm font-black text-primary-foreground">
              Submit rating
            </button>
          </div>
        </div>
      ) : null}

      {msg ? (
        <div className="fixed inset-x-0 bottom-24 z-50 mx-auto w-full max-w-[440px] px-4" onClick={() => setMsg(null)}>
          <div className="rounded-xl bg-foreground px-4 py-2.5 text-xs font-semibold text-background">{msg}</div>
        </div>
      ) : null}
    </Shell>
  );
}

function Stars({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="mt-3 flex items-center justify-between">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <span className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            aria-label={`${n} star`}
            onClick={() => onChange(n)}
            className={`text-xl ${n <= value ? "text-brand" : "text-border"}`}
          >
            ★
          </button>
        ))}
      </span>
    </div>
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
