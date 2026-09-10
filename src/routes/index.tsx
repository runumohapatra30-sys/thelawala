import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { HomeChat } from "@/components/HomeChat";
import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import { cart, cartTotals, useCart } from "@/lib/cart";
import { inr } from "@/lib/fees";
import { customerPrice } from "@/lib/pricing";
import { foodImage } from "@/lib/foodImage";
import { InstallAppButton } from "@/components/InstallApp";
import { UpdateAppButton } from "@/components/PwaUpdater";
import { useSession } from "@/lib/session";
import { BannerCarousel } from "@/components/BannerCarousel";
import { FestiveWidget } from "@/components/FestiveWidget";
import { activeCampaign, type Campaign } from "@/lib/marketing";
import { VoiceSearch } from "@/components/VoiceSearch";
import { DynamicAssetBanner } from "@/components/DynamicAssetBanner";
import { DynamicBanners } from "@/components/DynamicBanners";
import { DynamicPageRenderer, type SectionRegistry } from "@/components/DynamicPageRenderer";
import { FestiveHero, FestiveSections } from "@/components/FestiveSections";
import { useHomeSections } from "@/lib/homeSections";
import { FestivePhotoStrip } from "@/components/FestivePhotoStrip";
import { activeThemeColor, useTopBarTheme } from "@/lib/appTheme";
import { Bike, Gift, Heart, Utensils, Wallet, X, Zap } from "lucide-react";

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
type Vendor = { id: string; stall_name: string; is_open: boolean; photo_url: string | null; offer_percent: number | null; offer_label: string | null };

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
  const [vendorFilter, setVendorFilter] = useState<string | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const topBarTheme = useTopBarTheme();
  const topBarColor = activeThemeColor(topBarTheme);
  const homeSections = useHomeSections();
  const festiveTheme = homeSections.find((s) => s.section_type === "FESTIVE_GRID_4" && s.cards.some((c) => c.title || c.image_url)) ?? null;
  const otherSections = festiveTheme ? homeSections.filter((s) => s.id !== festiveTheme.id) : homeSections;

  useEffect(() => {
    activeCampaign().then(setCampaign);
    supabase.from("categories").select("id,name,emoji").order("sort_order").then(({ data }) => setCats(data ?? []));
    supabase.from("vendors").select("id,stall_name,is_open,photo_url,offer_percent,offer_label").eq("status", "APPROVED").then(({ data }) => setVendors((data ?? []) as Vendor[]));
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
  const vendorOffer = useMemo(
    () => Object.fromEntries(vendors.map((v) => [v.id, Number(v.offer_percent ?? 0)])),
    [vendors],
  );

  const query = q.trim().toLowerCase();
  const shown = items.filter(
    (i) =>
      (!active || i.category_id === active) &&
      (!vendorFilter || i.vendor_id === vendorFilter) &&
      (!query ||
        i.name.toLowerCase().includes(query) ||
        (vendorName[i.vendor_id] ?? "").toLowerCase().includes(query)) &&
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
      base: Number(i.price),
      price: customerPrice(i.price),
      mrp: customerPrice(i.mrp),
    });
    if (!res.ok) setToast(res.error);
    else setToast(null);
  }

  const registry: SectionRegistry = {
    smart_asset: () => <DynamicAssetBanner />,
    dynamic_banner: () => <DynamicBanners />,
    banner_carousel: () => (
      <BannerCarousel
        onCategory={(id) => { setActive(id); setVendorFilter(null); }}
        onVendor={(id) => { setVendorFilter(id); setActive(null); }}
      />
    ),
    festive: () => (
      <FestiveWidget campaign={campaign} onFilter={(v) => { setQ(v); setActive(null); setVendorFilter(null); }} />
    ),
    festive_photos: () => <FestivePhotoStrip />,
    festive_sections: () => (
      <FestiveSections
        sections={otherSections}
        items={items}
        onFilter={(v) => { setQ(v); setActive(null); setVendorFilter(null); }}
        onAdd={(id) => { const it = items.find((x) => x.id === id); if (it) add(it); }}
        qtyOf={(id) => lines.find((l) => l.itemId === id)?.qty ?? 0}
      />
    ),
    quick_bites: (cfg) => (
      <section className="px-5 pt-6">
        <h2 className="text-[17px] font-extrabold">{cfg.title ?? "Quick bites"}</h2>
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
              <img src="/food/food-thali.jpg" alt="All street food" loading="lazy" className="h-full w-full object-cover" />
              <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/45 to-transparent" />
            </span>
            <span className="mt-1.5 block text-[10.5px] font-extrabold leading-tight">All</span>
          </button>
          {campaign?.top_tab_label ? (
            <button
              onClick={() => { setQ(campaign.top_tab_label ?? ""); setActive(null); setVendorFilter(null); }}
              className="press rise-in w-[74px] shrink-0 snap-start text-center"
            >
              <span className="relative block aspect-square overflow-hidden rounded-[1.5rem] shadow-[0_12px_24px_-16px_rgba(15,23,42,0.75)] ring-2 ring-primary">
                <img
                  src={campaign.top_tab_icon_url || "/food/food-sweets.jpg"}
                  alt={campaign.top_tab_label}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/45 to-transparent" />
              </span>
              <span className="mt-1.5 block truncate text-[10.5px] font-extrabold leading-tight">{campaign.top_tab_label}</span>
            </button>
          ) : null}
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
                <img src={foodImage(c.name)} alt={c.name} loading="lazy" className="h-full w-full object-cover" />
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
    ),
    trending_stalls: (cfg) => (
      <>
        <section className="flex items-center gap-2 px-5 pt-7">
          <h2 className="mr-auto text-[17px] font-extrabold">{cfg.title ?? "Trending stalls"}</h2>
          {vendorFilter ? (
            <button
              onClick={() => setVendorFilter(null)}
              className="press rounded-full border border-primary bg-[color-mix(in_oklab,var(--color-primary)_10%,white)] px-3 py-1.5 text-[11px] font-extrabold text-primary"
            >
              <span className="flex items-center gap-1">{vendorName[vendorFilter] ?? "Stall"} <X className="h-3 w-3" /></span>
            </button>
          ) : null}
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
            <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> Favourites</span>
          </button>
        </section>

        <div className="grid grid-cols-2 gap-3.5 px-5 pb-36 pt-3">
          {shown.map((i, idx) => {
            const line = lines.find((l) => l.itemId === i.id);
            const shownPrice = customerPrice(i.price);
            // Discounts only exist when the stall itself runs an offer.
            const off = vendorOffer[i.vendor_id] ?? 0;
            const offerPrice = off > 0 ? Math.round(shownPrice * (100 - off)) / 100 : shownPrice;
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
                      <Heart className="h-4 w-4" fill={favs.includes(i.id) ? "currentColor" : "none"} />
                    </button>
                  ) : null}
                </div>
                <p className="mt-2.5 truncate px-0.5 text-[13px] font-extrabold">{i.name}</p>
                <p className="truncate px-0.5 text-[11px] font-medium text-muted-foreground">
                  {vendorName[i.vendor_id] ?? "Stall"} · {i.unit}
                </p>
                <div className="mt-2.5 flex items-center justify-between px-0.5">
                  <p className="text-[15px] font-extrabold text-primary">
                    {inr(offerPrice)}{" "}
                    {off > 0 ? (
                      <span className="text-[11px] font-medium text-muted-foreground line-through">{inr(shownPrice)}</span>
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
                      className="press shine rounded-full border border-primary bg-[color-mix(in_oklab,var(--color-primary)_8%,white)] px-2.5 py-1 text-[10px] font-extrabold text-primary shadow-[0_8px_18px_-12px_var(--color-primary)]"
                    >
                      ADD
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </>
    ),
  };

  return (
    <Shell>
      <header
        style={
          festiveTheme
            ? festiveTheme.bg_image_url
              ? { backgroundImage: `url(${festiveTheme.bg_image_url})`, backgroundSize: "cover", backgroundPosition: "center" }
              : { background: festiveTheme.bg_color || topBarColor }
            : { backgroundColor: topBarColor }
        }
        className={`relative z-20 flex min-w-0 flex-col gap-4 overflow-hidden px-5 pb-4 pt-4 text-brand-foreground shadow-[0_18px_40px_-24px_rgba(15,23,42,0.45)] transition-colors duration-500 ${festiveTheme ? "rounded-b-[2.5rem] pb-6" : ""}`}
      >
        <div className="pointer-events-none absolute inset-0 brand-header" />

        <div className="relative z-10 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-2 sm:gap-3">
          <Link to="/cart" className="min-w-0 text-left">
            <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] opacity-80">
              <span className="live-dot" /> Thaleewala · Delivering in
            </p>
            <p className="text-[24px] font-extrabold leading-tight">15–20 minutes</p>
            <p className="mt-1 flex items-center gap-1 text-xs font-semibold opacity-80">
              <span className="truncate">{address ?? "Bhubaneswar · set your address"}</span>
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.6">
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </p>
          </Link>
          <div className="flex max-w-[184px] shrink-0 flex-wrap items-center justify-end gap-1.5 sm:max-w-none sm:flex-nowrap">
            <UpdateAppButton />
            <InstallAppButton className="hidden sm:flex" />
            <Link
              to="/wallet"
              className="press flex items-center gap-1 rounded-full px-2.5 py-2 text-[11px] font-extrabold festive-glass-chip"
            >
              <Wallet className="h-4 w-4" aria-hidden="true" />
              {inr(balance)}
            </Link>
            <Link
              to="/notifications"
              aria-label="Notifications"
              className="press relative grid h-10 w-10 place-items-center rounded-2xl festive-glass-chip"
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
              className="press grid h-10 w-10 place-items-center rounded-2xl festive-glass-chip"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="8" r="3.4" /><path d="M4.5 20a7.5 7.5 0 0115 0" strokeLinecap="round" />
              </svg>
            </Link>
            <button
              aria-label="More options"
              onClick={() => setMenu((m) => !m)}
              className="press grid h-10 w-10 place-items-center rounded-2xl festive-glass-chip"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <circle cx="12" cy="5" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="12" cy="19" r="1.8" />
              </svg>
            </button>
          </div>
        </div>

        <div className="relative z-10 flex min-w-0 items-center gap-2.5 rounded-2xl bg-card px-4 py-3.5 text-card-foreground shadow-[0_18px_38px_-18px_rgba(15,23,42,0.65)] ring-1 ring-border/70">
          <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="2.2">
            <circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" strokeLinecap="round" />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder='Search "dahi bara" or a stall name'
            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-foreground outline-none"
          />
          <VoiceSearch
            stalls={vendors.map((v) => v.stall_name)}
            items={items.map((i) => i.name)}
            onResult={(r) => {
              setQ(r.query);
              setActive(null);
              setOnlyFav(false);
              const v = r.stall ? vendors.find((x) => x.stall_name === r.stall) : null;
              setVendorFilter(v?.id ?? null);
            }}
          />
        </div>

        {topBarTheme?.festive_style_active && campaign?.title ? (
          <div className="relative z-10 min-w-0">
            <div className="mb-1 flex items-center gap-2 text-brand">
              <span className="h-0.5 w-6 rounded-full bg-brand" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Celebrate</span>
            </div>
            <p className="line-clamp-1 text-[clamp(1.4rem,7vw,2.1rem)] font-extrabold leading-none drop-shadow-md">
              {campaign.title}
            </p>
          </div>
        ) : null}

        <div className="relative z-10 min-w-0 overflow-hidden rounded-full festive-glass-chip py-1.5">
          <div className="marquee-track">
            {[0, 1].map((n) => (
              <span key={n} aria-hidden={n === 1} className="flex shrink-0 items-center gap-6 pr-6 text-[11px] font-extrabold">
                <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5" /> Free delivery on your first order</span>
                <span className="flex items-center gap-1"><Utensils className="h-3.5 w-3.5" /> Fresh from the thela, straight to you</span>
                <span className="flex items-center gap-1"><Gift className="h-3.5 w-3.5" /> Refer a friend · both earn ₹25</span>
                <span className="flex items-center gap-1"><Bike className="h-3.5 w-3.5" /> Live tracking on every order</span>
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

      <main className="flex min-w-0 flex-col gap-4 overflow-x-hidden">
        {topBarTheme?.header_bg_image_url ? (
          <section className="px-5 py-3">
            <div className="overflow-hidden rounded-2xl bg-muted shadow-sm">
              <img
                key={topBarTheme.header_bg_image_url}
                src={topBarTheme.header_bg_image_url}
                alt="Thaleewala festive offer"
                style={{ maxHeight: `${topBarTheme.header_height_px || 220}px` }}
                className="festive-header-photo block h-auto w-full rounded-2xl object-contain shadow-sm"
              />
            </div>
          </section>
        ) : null}
        {vendors.length > 0 ? (
          <section className="px-5 pt-2">
            <h2 className="text-[17px] font-extrabold">Your stalls</h2>
            <p className="mt-0.5 text-xs font-medium text-muted-foreground">Tap a stall to see only their food</p>
            <div className="mt-3 flex snap-x gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {vendors.map((v) => (
                <button
                  key={v.id}
                  onClick={() => { setVendorFilter(vendorFilter === v.id ? null : v.id); setActive(null); }}
                  className="press w-[70px] shrink-0 snap-start text-center"
                >
                  <span
                    className={`relative block aspect-square overflow-hidden rounded-full bg-muted shadow-[0_10px_20px_-14px_rgba(15,23,42,0.8)] ${vendorFilter === v.id ? "ring-2 ring-primary ring-offset-2" : ""}`}
                  >
                    <img
                      src={v.photo_url ?? foodImage(v.stall_name)}
                      alt={v.stall_name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </span>
                  <span className="mt-1.5 block truncate text-[10.5px] font-extrabold leading-tight">{v.stall_name}</span>
                  {Number(v.offer_percent ?? 0) > 0 ? (
                    <span className="block text-[9px] font-black text-primary">{v.offer_percent}% OFF</span>
                  ) : null}
                </button>
              ))}
            </div>
          </section>
        ) : null}
        <DynamicPageRenderer app="customer" page="home" registry={registry} />
      </main>
      <div className="pb-28" />

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
