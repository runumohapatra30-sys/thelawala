import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { HomeChat } from "@/components/HomeChat";
import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import { cart, cartTotals, useCart } from "@/lib/cart";
import { inr } from "@/lib/fees";
import { foodImage } from "@/lib/foodImage";
import { InstallAppButton } from "@/components/InstallApp";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ThelaWala — Local Thela, super fast delivery in Bhubaneswar" },
      { name: "description", content: "Order bhata dali, dahi bara, rolls, chaat, biryani, momo and chai from Bhubaneswar street stalls, delivered in 15 minutes." },
      { property: "og:title", content: "ThelaWala — Local Thela | Super Fast Delivery" },
      { property: "og:description", content: "Hot food from your nearest thela, delivered in 15 minutes across Bhubaneswar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

type Item = {
  id: string;
  vendor_id: string;
  category_id: string | null;
  name: string;
  details: string | null;
  photo_url: string | null;
  unit: string | null;
  price: number;
  mrp: number;
  in_stock: boolean;
  food_type: string;
};
type Category = { id: string; name: string; emoji: string | null };
type Vendor = { id: string; stall_name: string; is_open: boolean };

const TINTS = [
  "bg-[color-mix(in_oklab,var(--color-brand)_28%,white)]",
  "bg-[color-mix(in_oklab,var(--color-primary)_14%,white)]",
  "bg-[color-mix(in_oklab,var(--color-destructive)_12%,white)]",
  "bg-[color-mix(in_oklab,var(--color-chart-2)_16%,white)]",
  "bg-[color-mix(in_oklab,var(--color-chart-5)_18%,white)]",
  "bg-[color-mix(in_oklab,var(--color-chart-3)_12%,white)]",
];

function Home() {
  const { user } = useSession();
  const lines = useCart();
  const { count, foodTotal } = cartTotals(lines);
  const [items, setItems] = useState<Item[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [menu, setMenu] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [address, setAddress] = useState<string | null>(null);
  const [favs, setFavs] = useState<string[]>([]);
  const [onlyFav, setOnlyFav] = useState(false);
  const [onlyVeg, setOnlyVeg] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    supabase.from("categories").select("id,name,emoji").order("sort_order").then(({ data }) => setCats(data ?? []));
    supabase.from("vendors").select("id,stall_name,is_open").eq("status", "APPROVED").then(({ data }) => setVendors(data ?? []));
    supabase
      .from("menu_items")
      .select("id,vendor_id,category_id,name,details,photo_url,unit,price,mrp,in_stock,food_type")
      .order("created_at")
      .then(({ data }) => setItems((data ?? []) as Item[]));
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from("wallets").select("balance,status").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      setBalance(data?.status === "ACTIVE" ? Number(data.balance) : 0);
    });
    supabase
      .from("addresses")
      .select("line,landmark")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setAddress(data?.line ?? null));
    supabase
      .from("favorites")
      .select("item_id")
      .eq("user_id", user.id)
      .then(({ data }) => setFavs((data ?? []).map((f) => f.item_id).filter(Boolean) as string[]));
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false)
      .then(({ count }) => setUnread(count ?? 0));
  }, [user?.id]);

  async function toggleFav(itemId: string, vendorId: string) {
    if (!user) return;
    if (favs.includes(itemId)) {
      setFavs((f) => f.filter((x) => x !== itemId));
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("item_id", itemId);
    } else {
      setFavs((f) => [...f, itemId]);
      await supabase.from("favorites").insert({ user_id: user.id, item_id: itemId, vendor_id: vendorId });
    }
  }

  const vendorName = useMemo(
    () => Object.fromEntries(vendors.map((v) => [v.id, v.stall_name])),
    [vendors],
  );

  const shown = items.filter(
    (i) =>
      (!active || i.category_id === active) &&
      (!q || i.name.toLowerCase().includes(q.toLowerCase())) &&
      (!onlyVeg || i.food_type !== "NONVEG") &&
      (!onlyFav || favs.includes(i.id)),
  );

  function add(i: Item) {
    const res = cart.add({
      itemId: i.id,
      vendorId: i.vendor_id,
      name: i.name,
      photo: i.photo_url,
      unit: i.unit,
      price: Number(i.price),
      mrp: Number(i.mrp),
    });
    if (!res.ok) setToast(res.error);
    else setToast(null);
  }

  return (
    <Shell>
      <header className="brand-header sticky top-0 z-30 rounded-b-[2.75rem] px-5 pb-5 pt-5 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.45)]">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <Link to="/cart" className="min-w-0 text-left">
            <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] opacity-80">
              <span className="live-dot" /> Live · Delivery in
            </p>
            <p className="text-[22px] font-extrabold leading-tight">15–20 minutes</p>
            <p className="mt-1 flex items-center gap-1 text-xs font-semibold opacity-80">
              <span className="truncate">{address ?? "Bhubaneswar · set your address"}</span>
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.6">
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </p>
          </Link>
          <div className="flex shrink-0 items-center gap-1.5">
            <InstallAppButton />
            <Link
              to="/wallet"
              className="press flex items-center gap-1 rounded-full px-2.5 py-2 text-[11px] font-extrabold glass-chip"
            >
              <span aria-hidden="true">👛</span>
              {inr(balance)}
            </Link>
            <Link
              to="/notifications"
              aria-label="Notifications"
              className="press relative grid h-10 w-10 place-items-center rounded-2xl glass-chip"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M6 9a6 6 0 1112 0c0 4 1.5 5.5 1.5 5.5h-15S6 13 6 9zM10 19a2 2 0 004 0" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {unread > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[9px] font-black text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              ) : null}
            </Link>
            <Link
              to={user ? "/profile" : "/auth"}
              aria-label="Your account"
              className="press grid h-10 w-10 place-items-center rounded-2xl glass-chip"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="8" r="3.4" /><path d="M4.5 20a7.5 7.5 0 0115 0" strokeLinecap="round" />
              </svg>
            </Link>
            <button
              aria-label="More options"
              onClick={() => setMenu((m) => !m)}
              className="press grid h-10 w-10 place-items-center rounded-2xl glass-chip"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <circle cx="12" cy="5" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="12" cy="19" r="1.8" />
              </svg>
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2.5 rounded-3xl bg-card px-4 py-3.5 shadow-[0_14px_30px_-18px_rgba(15,23,42,0.5)]">
          <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="2.2">
            <circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" strokeLinecap="round" />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder='Search "dahi bara"'
            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-foreground outline-none"
          />
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0M12 18v3" strokeLinecap="round" />
          </svg>
        </div>

        <div className="mt-3.5 overflow-hidden rounded-full glass-chip py-1.5">
          <div className="marquee-track">
            {[0, 1].map((n) => (
              <span key={n} aria-hidden={n === 1} className="flex shrink-0 items-center gap-6 pr-6 text-[11px] font-extrabold">
                <span>⚡ Free delivery on your first order</span>
                <span>🥘 Fresh from the thela, straight to you</span>
                <span>🎁 Refer a friend · both earn ₹25</span>
                <span>🚴 Live tracking on every order</span>
              </span>
            ))}
          </div>
        </div>
      </header>

      {menu ? (
        <div className="absolute right-3 z-40 mt-1 w-52 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          {[
            { to: "/orders", label: "Your orders" },
            { to: "/profile", label: "Profile & wallet" },
            { to: "/terms", label: "Terms & conditions" },
            { to: "/vendor", label: "Stall partner portal" },
            { to: "/rider", label: "Delivery partner portal" },
            { to: "/admin", label: "Administration" },
          ].map((m) => (
            <Link key={m.to} to={m.to} onClick={() => setMenu(false)} className="block px-3 py-2.5 text-sm">
              {m.label}
            </Link>
          ))}
          <a href="tel:9078492360" className="block border-t border-border px-3 py-2.5 text-sm font-semibold text-primary">
            Call care · 9078492360
          </a>
        </div>
      ) : null}

      <section className="px-5 pt-6">
        <h2 className="text-[17px] font-extrabold">Quick bites</h2>
        <p className="mt-0.5 text-xs font-medium text-muted-foreground">Pick a craving, we do the running</p>
        <div className="mt-3 flex snap-x gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            onClick={() => setActive(null)}
            style={{ animationDelay: "0ms" }}
            className="press rise-in w-[74px] shrink-0 snap-start text-center"
          >
            <span
              className={`relative block aspect-square overflow-hidden rounded-[1.5rem] ${TINTS[0]} shadow-[0_12px_24px_-16px_rgba(15,23,42,0.75)] ring-offset-2 transition-all ${!active ? "ring-2 ring-primary" : ""}`}
            >
              <img
                src="/food/food-thali.jpg"
                alt="All street food"
                loading="lazy"
                className="h-full w-full object-cover"
              />
              <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/45 to-transparent" />
            </span>
            <span className="mt-1.5 block text-[10.5px] font-extrabold leading-tight">All</span>
          </button>
          {cats.map((c, idx) => (
            <button
              key={c.id}
              onClick={() => setActive(c.id)}
              style={{ animationDelay: `${(idx + 1) * 50}ms` }}
              className="press rise-in w-[74px] shrink-0 snap-start text-center"
            >
              <span
                className={`relative block aspect-square overflow-hidden rounded-[1.5rem] ${TINTS[(idx + 1) % TINTS.length]} shadow-[0_12px_24px_-16px_rgba(15,23,42,0.75)] transition-all ${active === c.id ? "ring-2 ring-primary" : ""}`}
              >
                <img
                  src={foodImage(c.name)}
                  alt={c.name}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/45 to-transparent" />
                {c.emoji ? (
                  <span className="absolute left-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-card/85 text-[11px] shadow-sm">
                    {c.emoji}
                  </span>
                ) : null}
              </span>
              <span className="mt-1.5 block truncate text-[10.5px] font-extrabold leading-tight">{c.name}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="flex items-center gap-2 px-5 pt-7">
        <h2 className="mr-auto text-[17px] font-extrabold">Trending stalls</h2>
        <button
          onClick={() => setOnlyVeg((v) => !v)}
          className={`press rounded-full border px-3 py-1.5 text-[11px] font-extrabold ${onlyVeg ? "border-primary bg-[color-mix(in_oklab,var(--color-primary)_10%,white)] text-primary" : "border-border text-muted-foreground"}`}
        >
          Veg only
        </button>
        <button
          onClick={() => setOnlyFav((v) => !v)}
          className={`press rounded-full border px-3 py-1.5 text-[11px] font-extrabold ${onlyFav ? "border-primary bg-[color-mix(in_oklab,var(--color-primary)_10%,white)] text-primary" : "border-border text-muted-foreground"}`}
        >
          ♥ Favourites
        </button>
      </section>

      <div className="grid grid-cols-2 gap-3.5 px-5 pb-36 pt-3">
        {shown.map((i, idx) => {
          const line = lines.find((l) => l.itemId === i.id);
          const off = Number(i.mrp) > Number(i.price)
            ? Math.round(((Number(i.mrp) - Number(i.price)) / Number(i.mrp)) * 100)
            : 0;
          return (
            <div key={i.id} style={{ animationDelay: `${Math.min(idx, 8) * 55}ms` }} className="press rise-in card-elevated p-2.5 hover:-translate-y-0.5">
              <div className="relative">
                <img
                  src={i.photo_url ?? foodImage(i.name)}
                  alt={i.name}
                  className="aspect-[4/5] w-full rounded-[1.4rem] object-cover"
                />
                {off > 0 ? (
                  <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-extrabold text-primary-foreground shadow-md">
                    {off}% OFF
                  </span>
                ) : null}
                {!i.in_stock ? (
                  <span className="absolute inset-0 grid place-items-center rounded-[1.4rem] bg-black/55 text-xs font-bold text-white">
                    Out of stock
                  </span>
                ) : null}
                {user ? (
                  <button
                    aria-label={favs.includes(i.id) ? "Remove from favourites" : "Add to favourites"}
                    onClick={() => toggleFav(i.id, i.vendor_id)}
                    className={`press absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-card/90 text-sm shadow-md ${favs.includes(i.id) ? "text-destructive" : "text-muted-foreground"}`}
                  >
                    {favs.includes(i.id) ? "♥" : "♡"}
                  </button>
                ) : null}
              </div>
              <p className="mt-2.5 truncate px-0.5 text-[13px] font-extrabold">{i.name}</p>
              <p className="truncate px-0.5 text-[11px] font-medium text-muted-foreground">
                {vendorName[i.vendor_id] ?? "Stall"} · {i.unit}
              </p>
              <div className="mt-2.5 flex items-center justify-between px-0.5">
                <p className="text-[15px] font-extrabold text-primary">
                  {inr(Number(i.price))}{" "}
                  {off > 0 ? (
                    <span className="text-[11px] font-medium text-muted-foreground line-through">{inr(Number(i.mrp))}</span>
                  ) : null}
                </p>
                {!i.in_stock ? null : line ? (
                  <div className="flex items-center gap-1.5 rounded-full bg-primary px-2 py-1 text-primary-foreground shadow-[0_8px_18px_-10px_var(--color-primary)]">
                    <button aria-label="Remove one" onClick={() => cart.remove(i.id)} className="press px-1 font-bold">−</button>
                    <span className="text-xs font-extrabold">{line.qty}</span>
                    <button aria-label="Add one" onClick={() => add(i)} className="press px-1 font-bold">+</button>
                  </div>
                ) : (
                  <button
                    onClick={() => add(i)}
                    className="press shine rounded-full border border-primary bg-[color-mix(in_oklab,var(--color-primary)_8%,white)] px-3.5 py-1.5 text-[11px] font-extrabold text-primary shadow-[0_8px_18px_-12px_var(--color-primary)]"
                  >
                    ADD
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <HomeChat userId={user?.id} />

      {toast ? (
        <div className="fixed inset-x-0 bottom-44 z-40 mx-auto w-full max-w-[440px] px-4">
          <div className="rounded-xl bg-foreground px-4 py-2.5 text-xs font-semibold text-background">{toast}</div>
        </div>
      ) : null}

      {count ? (
        <div className="fixed inset-x-0 bottom-[104px] z-40 mx-auto w-full max-w-[480px] px-3">
          <Link
            to="/cart"
            className="press pop-in shine flex items-center justify-between rounded-full bg-primary px-5 py-3.5 text-primary-foreground shadow-[0_18px_36px_-14px_var(--color-primary)]"
          >
            <span className="text-sm font-bold">{count} item{count > 1 ? "s" : ""} · {inr(foodTotal)}</span>
            <span className="text-sm font-bold">View cart ›</span>
          </Link>
        </div>
      ) : null}
    </Shell>
  );
}
