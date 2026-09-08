import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PortalHeader, Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import { offerToNearestPartner } from "@/lib/dispatch";
import { inr, STATUS_LABEL } from "@/lib/fees";
import { useSession } from "@/lib/session";
import { fssaiError, normalizeFssai } from "@/lib/validation";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/vendor")({
  head: () => ({
    meta: [
      { title: "Stall partner portal — ThelaWala" },
      { name: "description", content: "Accept ThelaWala orders, mark food ready, share the pickup OTP and manage your stall menu and photos." },
      { property: "og:title", content: "Stall partner portal — ThelaWala" },
      { property: "og:description", content: "Run your street food stall on ThelaWala." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VendorPortal,
});

type Order = {
  id: string; code: string; status: string; grand_total: number; food_total: number;
  pickup_otp: string; customer_name: string; address_line: string; partner_id: string | null;
};
type Item = {
  id: string; name: string; price: number; mrp: number; in_stock: boolean;
  photo_url: string | null; food_type: string; category_id: string | null;
};
type Category = { id: string; name: string; emoji: string | null };

const EMPTY_DISH = {
  name: "",
  price: "",
  mrp: "",
  category_id: "",
  food_type: "VEG",
  details: "",
  unit: "1 plate",
};

function useOrderBell(count: number) {
  const ctxRef = useRef<AudioContext | null>(null);
  useEffect(() => {
    if (count <= 0) return;
    let stopped = false;
    const beep = () => {
      if (stopped) return;
      try {
        const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = (ctxRef.current ??= new Ctx());
        if (ctx.state === "suspended") void ctx.resume();
        [0, 0.22].forEach((offset) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = 880;
          gain.gain.setValueAtTime(0.0001, ctx.currentTime + offset);
          gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + offset + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.18);
          osc.connect(gain).connect(ctx.destination);
          osc.start(ctx.currentTime + offset);
          osc.stop(ctx.currentTime + offset + 0.2);
        });
      } catch {
        /* audio unavailable */
      }
    };
    beep();
    const t = setInterval(beep, 2500);
    return () => {
      stopped = true;
      clearInterval(t);
    };
  }, [count]);
}

function VendorPortal() {
  const { user, loading } = useSession();
  const [vendor, setVendor] = useState<{ id: string; stall_name: string; status: string; is_open: boolean; fssai_number: string | null } | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [form, setForm] = useState({ stall_name: "", owner_name: "", mobile: "", address: "", fssai_number: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const [fssaiDraft, setFssaiDraft] = useState("");
  const [fssaiMsg, setFssaiMsg] = useState<string | null>(null);
  const [fssaiSaving, setFssaiSaving] = useState(false);
  const [dish, setDish] = useState({ ...EMPTY_DISH });
  const [dishFile, setDishFile] = useState<File | null>(null);
  const [dishSaving, setDishSaving] = useState(false);
  const [dishOpen, setDishOpen] = useState(false);

  const pending = orders.filter((o) => o.status === "PLACED").length;
  useOrderBell(pending);

  useEffect(() => {
    if (!user) return;
    supabase.from("vendors").select("id,stall_name,status,is_open,fssai_number").eq("owner_id", user.id).maybeSingle()
      .then(({ data }) => setVendor(data));
    supabase.from("categories").select("id,name,emoji").order("sort_order").then(({ data }) => setCats(data ?? []));
  }, [user?.id]);

  const loadItems = (vendorId: string) =>
    supabase.from("menu_items").select("id,name,price,mrp,in_stock,photo_url,food_type,category_id").eq("vendor_id", vendorId)
      .then(({ data }) => setItems((data ?? []) as Item[]));

  useEffect(() => {
    if (!vendor) return;
    const load = () => {
      supabase.from("orders")
        .select("id,code,status,grand_total,food_total,pickup_otp,customer_name,address_line,partner_id")
        .eq("vendor_id", vendor.id).order("created_at", { ascending: false }).limit(30)
        .then(({ data }) => setOrders((data ?? []) as Order[]));
    };
    load();
    loadItems(vendor.id);
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [vendor?.id]);

  async function setStatus(o: Order, status: string) {
    await supabase
      .from("orders")
      .update(
        status === "VENDOR_ACCEPTED"
          ? { status, accepted_at: new Date().toISOString() }
          : { status },
      )
      .eq("id", o.id);
    if (status === "READY") await offerToNearestPartner(o.id);
    setOrders(orders.map((x) => (x.id === o.id ? { ...x, status } : x)));
  }

  async function addDish(): Promise<void> {
    if (!vendor) return;
    const price = Number(dish.price);
    if (!dish.name.trim() || !price) {
      toast.error("Add a dish name and price.");
      return;
    }
    setDishSaving(true);
    try {
      let photoUrl: string | null = null;
      if (dishFile) {
        const ext = dishFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const path = `${vendor.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("dish-photos").upload(path, dishFile, {
          contentType: dishFile.type || "image/jpeg",
          upsert: false,
        });
        if (upErr) throw upErr;
        const { data: signed } = await supabase.storage.from("dish-photos").createSignedUrl(path, 60 * 60 * 24 * 3650);
        photoUrl = signed?.signedUrl ?? null;
      }
      const { error } = await supabase.from("menu_items").insert({
        vendor_id: vendor.id,
        name: dish.name.trim(),
        price,
        mrp: Number(dish.mrp) || price,
        category_id: dish.category_id || null,
        food_type: dish.food_type,
        details: dish.details.trim() || null,
        unit: dish.unit.trim() || null,
        photo_url: photoUrl,
        in_stock: true,
      });
      if (error) throw error;
      setDish({ ...EMPTY_DISH });
      setDishFile(null);
      setDishOpen(false);
      await loadItems(vendor.id);
      toast.success("Dish added to your menu!");
    } catch {
      toast.error("Could not add the dish. Please try again.");
    } finally {
      setDishSaving(false);
    }
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
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">FSSAI licence number</span>
            <input
              value={form.fssai_number}
              inputMode="numeric"
              placeholder="14 digits, e.g. 12345678901234"
              onChange={(e) => setForm({ ...form, fssai_number: normalizeFssai(e.target.value) })}
              className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${
                form.fssai_number && fssaiError(form.fssai_number) ? "border-destructive" : "border-border focus:border-primary"
              }`}
            />
            {form.fssai_number && fssaiError(form.fssai_number) ? (
              <span className="mt-1 block text-[11px] font-semibold text-destructive">{fssaiError(form.fssai_number)}</span>
            ) : (
              <span className="mt-1 block text-[11px] text-muted-foreground">Exactly 14 digits, starting with 1 or 2.</span>
            )}
          </label>
          <button
            disabled={Boolean(fssaiError(form.fssai_number))}
            onClick={async () => {
              const badFssai = fssaiError(form.fssai_number);
              if (badFssai) return setMsg(badFssai);
              setMsg("");
              const pos = await new Promise<GeolocationPosition | null>((res) =>
                navigator.geolocation
                  ? navigator.geolocation.getCurrentPosition((p) => res(p), () => res(null))
                  : res(null),
              );
              try {
                const { data, error } = await supabase.from("vendors").insert({
                  stall_name: form.stall_name,
                  owner_name: form.owner_name,
                  mobile: form.mobile,
                  address: form.address,
                  owner_id: user.id,
                  lat: pos?.coords.latitude ?? 20.2961,
                  lng: pos?.coords.longitude ?? 85.8245,
                  fssai_number: form.fssai_number.trim(),
                  status: "PENDING",
                }).select("id,stall_name,status,is_open,fssai_number").single();
                if (error) throw error;
                setVendor(data);
                toast.success("Stall details submitted for review!");
              } catch (e: any) {
                const m = String(e?.message ?? "");
                toast.error(
                  m.includes("fssai_format") ? "FSSAI number must be 14 digits starting with 1 or 2."
                  : m.includes("duplicate") ? "You have already registered a stall."
                  : m.includes("_check") ? "Some details are not accepted. Please check and try again."
                  : "Could not submit right now. Please try again.",
                );
              }
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
      <PortalHeader title={vendor.stall_name} subtitle={vendor.status === "APPROVED" ? "Live on ThelaWala" : "Waiting for approval"} />
      <div className="space-y-3 p-4">
        {pending > 0 ? (
          <div className="animate-pulse rounded-2xl bg-destructive px-3 py-2.5 text-center text-sm font-black text-destructive-foreground">
            🔔 {pending} new order{pending > 1 ? "s" : ""} waiting — accept or reject below
          </div>
        ) : null}

        <button
          onClick={async () => {
            await supabase.from("vendors").update({ is_open: !vendor.is_open }).eq("id", vendor.id);
            setVendor({ ...vendor, is_open: !vendor.is_open });
          }}
          className={`w-full rounded-xl border px-3 py-2.5 text-sm font-bold ${vendor.is_open ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
        >
          Stall is {vendor.is_open ? "OPEN" : "CLOSED"} · tap to change
        </button>

        <div className="card-soft border border-border p-3">
          <p className="text-sm font-bold">FSSAI licence</p>
          <p className="text-[11px] text-muted-foreground">Current: {vendor.fssai_number ?? "not added yet"}</p>
          <input
            value={fssaiDraft || vendor.fssai_number || ""}
            inputMode="numeric"
            placeholder="14 digits, e.g. 12345678901234"
            onChange={(e) => {
              setFssaiDraft(normalizeFssai(e.target.value));
              setFssaiMsg(null);
            }}
            className={`mt-2 w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${
              fssaiDraft && fssaiError(fssaiDraft) ? "border-destructive" : "border-border focus:border-primary"
            }`}
          />
          {fssaiDraft && fssaiError(fssaiDraft) ? (
            <p className="mt-1 text-[11px] font-semibold text-destructive">{fssaiError(fssaiDraft)}</p>
          ) : null}
          <button
            disabled={fssaiSaving || !fssaiDraft || Boolean(fssaiError(fssaiDraft)) || fssaiDraft === vendor.fssai_number}
            onClick={async () => {
              const bad = fssaiError(fssaiDraft);
              if (bad) {
                setFssaiDraft("");
                return setFssaiMsg(bad);
              }
              setFssaiSaving(true);
              const { data, error } = await supabase
                .from("vendors")
                .update({ fssai_number: fssaiDraft.trim() })
                .eq("id", vendor.id)
                .select("id,stall_name,status,is_open,fssai_number")
                .single();
              setFssaiSaving(false);
              if (error || !data) {
                setFssaiDraft("");
                return setFssaiMsg("Could not save. Your earlier FSSAI number is unchanged and your stall stays online.");
              }
              setVendor(data);
              setFssaiDraft("");
              setFssaiMsg("FSSAI number updated.");
            }}
            className="mt-2 w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {fssaiSaving ? "Saving…" : "Update FSSAI number"}
          </button>
          {fssaiMsg ? <p className="mt-2 text-xs font-semibold text-primary">{fssaiMsg}</p> : null}
        </div>


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

              {["READY", "ASSIGNED", "ARRIVED_AT_VENDOR"].includes(o.status) ? (
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
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">Your menu</p>
            <button
              onClick={() => setDishOpen(!dishOpen)}
              className="press rounded-full bg-primary px-3 py-1.5 text-[11px] font-black text-primary-foreground"
            >
              {dishOpen ? "Close" : "+ Add new dish"}
            </button>
          </div>

          {dishOpen ? (
            <div className="mt-3 space-y-2 rounded-2xl bg-muted p-3">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Item name</span>
                <input
                  value={dish.name}
                  onChange={(e) => setDish({ ...dish, name: e.target.value })}
                  placeholder="Dahi bara aloo dum"
                  className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Price (₹)</span>
                  <input
                    inputMode="numeric"
                    value={dish.price}
                    onChange={(e) => setDish({ ...dish, price: e.target.value.replace(/\D/g, "").slice(0, 5) })}
                    className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Cut price (₹, optional)</span>
                  <input
                    inputMode="numeric"
                    value={dish.mrp}
                    onChange={(e) => setDish({ ...dish, mrp: e.target.value.replace(/\D/g, "").slice(0, 5) })}
                    className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
                  />
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Category</span>
                <select
                  value={dish.category_id}
                  onChange={(e) => setDish({ ...dish, category_id: e.target.value })}
                  className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
                >
                  <option value="">Choose a category</option>
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>{c.emoji ? `${c.emoji} ` : ""}{c.name}</option>
                  ))}
                </select>
              </label>
              <div>
                <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Food type</span>
                <div className="flex gap-2">
                  {(["VEG", "NONVEG"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setDish({ ...dish, food_type: t })}
                      className={`flex-1 rounded-xl border py-2 text-xs font-black ${
                        dish.food_type === t ? "border-primary text-primary" : "border-border text-muted-foreground"
                      }`}
                    >
                      {t === "VEG" ? "🟢 Veg" : "🔴 Non-veg"}
                    </button>
                  ))}
                </div>
              </div>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Serving size</span>
                <input
                  value={dish.unit}
                  onChange={(e) => setDish({ ...dish, unit: e.target.value })}
                  className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Description</span>
                <textarea
                  value={dish.details}
                  onChange={(e) => setDish({ ...dish, details: e.target.value })}
                  rows={2}
                  className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Dish photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setDishFile(e.target.files?.[0] ?? null)}
                  className="w-full text-xs"
                />
              </label>
              <button
                disabled={dishSaving}
                onClick={addDish}
                className="press w-full rounded-xl bg-primary py-3 text-sm font-black text-primary-foreground disabled:opacity-50"
              >
                {dishSaving ? "Saving…" : "Add dish to menu"}
              </button>
            </div>
          ) : null}

          {items.map((i) => (
            <div key={i.id} className="mt-2 flex items-center gap-3">
              <img
                src={i.photo_url ?? "/food/food-tiffin.jpg"}
                alt={i.name}
                className="h-12 w-12 shrink-0 rounded-xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  <span className={i.food_type === "NONVEG" ? "text-destructive" : "text-primary"}>■</span> {i.name}
                </p>
                <p className="text-[11px] text-muted-foreground">{inr(Number(i.price))}</p>
              </div>
              <button
                onClick={async () => {
                  const next = !i.in_stock;
                  setItems(items.map((x) => (x.id === i.id ? { ...x, in_stock: next } : x)));
                  const { error } = await supabase.from("menu_items").update({ in_stock: next }).eq("id", i.id);
                  if (error) {
                    setItems(items);
                    toast.error("Could not change stock right now.");
                  }
                }}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-black ${
                  i.in_stock ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"
                }`}
              >
                {i.in_stock ? "In stock" : "Out of stock"}
              </button>
            </div>
          ))}
          {items.length === 0 ? <p className="mt-2 text-xs text-muted-foreground">No dishes added yet.</p> : null}
        </section>
      </div>
    </Shell>
  );
}
