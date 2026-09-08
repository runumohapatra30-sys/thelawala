import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PortalHeader, Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import { offerToNearestPartner } from "@/lib/dispatch";
import { inr, STATUS_LABEL } from "@/lib/fees";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/vendor")({
  head: () => ({
    meta: [
      { title: "Stall partner portal — Thaleewala" },
      { name: "description", content: "Accept Thaleewala orders, mark food ready, share the pickup OTP and manage your stall menu and photos." },
      { property: "og:title", content: "Stall partner portal — Thaleewala" },
      { property: "og:description", content: "Run your street food stall on Thaleewala." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VendorPortal;
});

type Order = {
  id: string; code: string; status: string; grand_total: number; food_total: number;
  pickup_otp: string; customer_name: string; address_line: string; partner_id: string | null;
};
type Item = { id: string; name: string; price: number; mrp: number; in_stock: boolean };

function VendorPortal() {
  const { user, loading } = useSession();
  const [vendor, setVendor] = useState<{ id: string; stall_name: string; status: string; is_open: boolean } | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState({ stall_name: "", owner_name: "", mobile: "", address: "" });
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("vendors").select("id,stall_name,status,is_open").eq("owner_id", user.id).maybeSingle()
      .then(({ data }) => setVendor(data));
  }, [user?.id]);

  useEffect(() => {
    if (!vendor) return;
    const load = () => {
      supabase.from("orders")
        .select("id,code,status,grand_total,food_total,pickup_otp,customer_name,address_line,partner_id")
        .eq("vendor_id", vendor.id).order("created_at", { ascending: false }).limit(30)
        .then(({ data }) => setOrders((data ?? []) as Order[]));
    };
    load();
    supabase.from("menu_items").select("id,name,price,mrp,in_stock").eq("vendor_id", vendor.id)
      .then(({ data }) => setItems((data ?? []) as Item[]));
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [vendor?.id]);

  async function setStatus(o: Order, status: string) {
    const patch: Record<string, unknown> = { status };
    if (status === "VENDOR_ACCEPTED") patch['accepted_at'] = new Date().toISOString();
    await supabase.from("orders").update(patch).eq("id", o.id);
    if (status === "READY") await offerToNearestPartner(o.id);
    setOrders(orders.map((x) => (x.id === o.id ? { ...x, status } : x)));
  }

  if (loading) return <Shell><PortalHeader title="Stall partner" /></Shell>;

  if (!user) {
    return (
      <Shell>
        <PortalHeader title="Stall partner" />
        <div className="py-20 text-center">
          <p className="text-sm text-muted-foreground">Sign in to manage your stall.</p>
          <Link to="/auth" className="mt-3 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">Sign in</Link>
        </div>
      </Shell>
    );
  }

  if (!vendor) {
    return (
      <Shell>
        <PortalHeader title="Register your stall" subtitle="Approval usually takes a day" />
        <div className="space-y-2 p-4">
          {([["stall_name", "Stall name"], ["owner_name", "Owner name"], ["mobile", "Mobile number"], ["address", "Stall address"]] as const).map(([k, label]) => (
            <label key={k} className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span>
              <input
                value={form[k]}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                className="w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </label>
          ))}
          <button
            onClick={async () => {
              const pos = await new Promise<GeolocationPosition | null>((res) =>
                navigator.geolocation
                  ? navigator.geolocation.getCurrentPosition((p) => res(p), () => res(null))
                  : res(null),
              );
              const { data, error } = await supabase.from("vendors").insert({
                stall_name: form.stall_name,
                owner_name: form.owner_name,
                mobile: form.mobile,
                address: form.address,
                owner_id: user.id,
                lat: pos?.coords.latitude ?? 20.2961,
                lng: pos?.coords.longitude ?? 85.8245,
                status: "PENDING_APPROVAL",
              }).select("id,stall_name,status,is_open").single();
              if (error) setMsg(error.message);
              else setVendor(data);
            }}
            className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground"
          >
            Send for approval
          </button>
          {msg ? <p className="text-xs text-destructive">{msg}</p> : null}
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <PortalHeader title={vendor.stall_name} subtitle={vendor.status === "APPROVED" ? "Live on Thaleewala" : "Waiting for approval"} />
      <div className="space-y-3 p-4">
        <button
          onClick={async () => {
            await supabase.from("vendors").update({ is_open: !vendor.is_open }).eq("id", vendor.id);
            setVendor({ ...vendor, is_open: !vendor.is_open });
          }}
          className={`w-full rounded-xl border px-3 py-2.5 text-sm font-bold ${vendor.is_open ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
        >
          Stall is {vendor.is_open ? "OPEN" : "CLOSED"} · tap to change
        </button>

        <section className="space-y-2">
          <p className="text-sm font-bold">Live orders</p>
          {orders.length === 0 ? <p className="text-xs text-muted-foreground">No orders yet.</p> : null}
          {orders.map((o) => (
            <div key={o.id} className="card-soft border border-border p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold">#{o.code}</p>
                  <p className="text-[11px] text-muted-foreground">{o.customer_name} · {o.address_line}</p>
                  <p className="mt-1 text-xs font-semibold text-primary">{STATUS_LABEL[o.status] ?? o.status}</p>
                </div>
                <p className="text-sm font-bold">{inr(Number(o.grand_total))}</p>
              </div>

              {["READY", "ASSIGNED"].includes(o.status) ? (
                <div className="mt-2 rounded-xl bg-muted p-2 text-center">
                  <p className="text-[11px] font-semibold text-muted-foreground">Pickup OTP for #{o.code}</p>
                  <p className="text-2xl font-extrabold tracking-[0.3em]">{o.pickup_otp}</p>
                  <p className="text-[11px] text-muted-foreground">Tell this only to the delivery partner</p>
                </div>
              ) : null}

              <div className="mt-2 flex gap-2">
                {o.status === "PLACED" ? (
                  <>
                    <button onClick={() => setStatus(o, "VENDOR_ACCEPTED")} className="flex-1 rounded-xl bg-primary py-2 text-xs font-bold text-primary-foreground">Accept</button>
                    <button onClick={() => setStatus(o, "CANCELLED")} className="flex-1 rounded-xl border border-border py-2 text-xs font-bold">Reject</button>
                  </>
                ) : null}
                {o.status === "VENDOR_ACCEPTED" ? (
                  <button onClick={() => setStatus(o, "PREPARING")} className="flex-1 rounded-xl bg-primary py-2 text-xs font-bold text-primary-foreground">Start cooking</button>
                ) : null}
                {o.status === "PREPARING" ? (
                  <button onClick={() => setStatus(o, "READY")} className="flex-1 rounded-xl bg-primary py-2 text-xs font-bold text-primary-foreground">Food is ready</button>
                ) : null}
              </div>
            </div>
          ))}
        </section>

        <section className="card-soft border border-border p-3">
          <p className="text-sm font-bold">Your menu</p>
          {items.map((i) => (
            <div key={i.id} className="mt-2 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{i.name}</p>
                <p className="text-[11px] text-muted-foreground">{inr(Number(i.price))}</p>
              </div>
              <button
                onClick={async () => {
                  await supabase.from("menu_items").update({ in_stock: !i.in_stock }).eq("id", i.id);
                  setItems(items.map((x) => (x.id === i.id ? { ...x, in_stock: !x.in_stock } : x)));
                }}
                className={`rounded-lg border px-3 py-1 text-xs font-bold ${i.in_stock ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
              >
                {i.in_stock ? "In stock" : "Out of stock"}
              </button>
            </div>
          ))}
          {items.length === 0 ? <p className="mt-1 text-xs text-muted-foreground">No dishes added yet.</p> : null}
        </section>
      </div>
    </Shell>
  );
}
