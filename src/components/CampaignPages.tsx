import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Bike, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PortalHeader, Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import { cart, useCart } from "@/lib/cart";
import { customerPrice, PRICE_MARKUP } from "@/lib/pricing";
import { foodImage } from "@/lib/foodImage";
import { inr } from "@/lib/fees";
import { loadCommerceCampaign, type CampaignCatalogEntry } from "@/lib/commerceCampaigns";
import { activeCampaign, type Campaign, toPromoCards } from "@/lib/marketing";

const filters = ["All", "Biryani", "Pizzas", "Burgers", "Rolls", "Top Snacks"];

export function NinetyNineStorePage() {
  const navigate = useNavigate();
  const lines = useCart();
  const [entries, setEntries] = useState<CampaignCatalogEntry[]>([]);
  const [title, setTitle] = useState("Meals at ₹99 + Free Delivery");
  const [selected, setSelected] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void loadCommerceCampaign("99-store")
      .then(({ campaign, entries: loaded }) => {
        if (!alive) return;
        if (campaign) setTitle(campaign.description || campaign.title);
        setEntries(campaign?.is_active ? loaded : []);
      })
      .catch((loadError: unknown) => {
        console.error("Could not load the 99 Store campaign:", loadError);
        if (alive) setError("The 99 Store could not load right now.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const shown = useMemo(() => {
    if (selected === "All") return entries;
    const term =
      selected === "Top Snacks"
        ? /chaat|snack|gupchup|bara|momo|singada|roll/i
        : new RegExp(selected.replace(/s$/, ""), "i");
    return entries.filter(({ item }) => term.test(item.name));
  }, [entries, selected]);

  function add(entry: CampaignCatalogEntry) {
    const result = cart.add({
      itemId: entry.item.id,
      vendorId: entry.vendor.id,
      vendorName: entry.vendor.stall_name,
      name: entry.item.name,
      photo: entry.item.photo_url,
      unit: entry.item.unit,
      base: Math.round((Number(entry.offer_price) / PRICE_MARKUP) * 100) / 100,
      price: Number(entry.offer_price),
      mrp: customerPrice(entry.item.mrp),
      campaignSlug: "99-store",
      freeDelivery: true,
    });
    if (!result.ok && !("conflict" in result)) toast.error(result.error);
    else if (!("conflict" in result))
      toast.success(`${entry.item.name} added at ${inr(entry.offer_price)}`);
  }

  return (
    <Shell>
      <PortalHeader title="99 Store" />
      <main className="space-y-5 px-4 pb-36 pt-3">
        <section className="relative isolate overflow-hidden rounded-[1.8rem] bg-[radial-gradient(circle_at_85%_10%,#ffd86b,transparent_33%),linear-gradient(120deg,#0b5737,#1c9754_58%,#d5ec79)] p-5 text-white shadow-[0_18px_40px_-22px_rgba(20,91,52,.6)]">
          <span className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full border-[22px] border-white/10" />
          <div className="relative z-10 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="inline-flex rounded-full bg-white/15 px-2.5 py-1 text-[9px] font-black uppercase tracking-[.18em]">
                Limited-time local deals
              </span>
              <h1 className="mt-3 font-display text-4xl font-black leading-none">99 store</h1>
              <p className="mt-2 max-w-[250px] text-sm font-semibold text-white/90">{title}</p>
              <p className="mt-3 flex items-center gap-1.5 text-[11px] font-bold">
                <Bike className="h-4 w-4" /> Free delivery on campaign orders
              </p>
            </div>
            <span className="grid h-20 w-20 shrink-0 rotate-[-8deg] place-items-center rounded-2xl border-4 border-[#fff2a2] bg-[linear-gradient(145deg,#fff36e,#ff9a25_62%,#ec4931)] text-center text-xl font-black leading-none text-[#7a2817] shadow-[0_8px_0_#a63428,0_14px_20px_#123d2b66]">
              ₹<br />
              99
            </span>
          </div>
        </section>

        <div
          className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Filter deals by category"
        >
          {filters.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setSelected(filter)}
              className={`shrink-0 snap-start rounded-full border px-4 py-2 text-xs font-black transition-colors ${selected === filter ? "border-[#16804a] bg-[#16804a] text-white" : "border-border bg-white text-foreground"}`}
            >
              {filter}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((key) => (
              <div key={key} className="animate-pulse rounded-2xl bg-muted p-2">
                <div className="aspect-square rounded-xl bg-white" />
              </div>
            ))}
          </div>
        ) : null}
        {error ? (
          <div
            role="alert"
            className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm font-semibold text-destructive"
          >
            {error}
          </div>
        ) : null}
        {!loading && !error && shown.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <Sparkles className="mx-auto h-7 w-7 text-primary" />
            <p className="mt-2 text-sm font-bold">
              {entries.length ? "No deals in this category yet" : "New deals are on the way"}
            </p>
            <Link to="/" className="mt-3 inline-block text-xs font-black text-primary">
              Browse all street food
            </Link>
          </div>
        ) : null}

        {shown.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {shown.map((entry) => {
              const line = lines.find((current) => current.itemId === entry.item.id);
              const image = entry.item.photo_url || foodImage(entry.item.name);
              return (
                <article
                  key={entry.item.id}
                  className="overflow-hidden rounded-2xl border border-[#e3e8e2] bg-white shadow-[0_8px_22px_-18px_rgba(0,0,0,.55)]"
                >
                  <button
                    type="button"
                    onClick={() =>
                      void navigate({ to: "/item/$id", params: { id: entry.item.id } })
                    }
                    className="relative block aspect-square w-full overflow-hidden bg-muted text-left"
                  >
                    <img
                      src={image}
                      alt={entry.item.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute left-2 top-2 rounded-full bg-[#e9ffed] px-2 py-1 text-[9px] font-black text-[#176437] shadow">
                      ₹{entry.offer_price} DEAL
                    </span>
                    <span
                      className={`absolute right-2 top-2 grid h-5 w-5 place-items-center border ${entry.item.food_type === "NONVEG" ? "border-red-600" : "border-green-700"} bg-white`}
                      aria-label={
                        entry.item.food_type === "NONVEG" ? "Non-vegetarian" : "Vegetarian"
                      }
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${entry.item.food_type === "NONVEG" ? "bg-red-600" : "bg-green-700"}`}
                      />
                    </span>
                    {entry.vendor.is_open ? null : (
                      <span className="absolute inset-x-0 bottom-0 bg-black/65 px-2 py-1 text-center text-[9px] font-black text-white">
                        STALL CLOSED
                      </span>
                    )}
                  </button>
                  <div className="p-2.5">
                    <p className="line-clamp-2 min-h-8 text-[11px] font-black leading-tight">
                      {entry.item.name}
                    </p>
                    <p className="mt-1 truncate text-[9px] font-medium text-muted-foreground">
                      {entry.vendor.stall_name}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-1">
                      <span className="text-xs font-black text-[#176437]">
                        {inr(Number(entry.offer_price))}{" "}
                        <span className="text-[9px] font-medium text-muted-foreground line-through">
                          {inr(customerPrice(entry.item.mrp))}
                        </span>
                      </span>
                      <button
                        type="button"
                        disabled={!entry.vendor.is_open}
                        onClick={() => add(entry)}
                        aria-label={`Add ${entry.item.name} to cart`}
                        className="relative grid h-8 min-w-12 place-items-center rounded-full bg-[#178146] px-2 text-[10px] font-black text-white shadow disabled:opacity-45"
                      >
                        {line ? `${line.qty} · ` : ""}
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </main>
    </Shell>
  );
}

const archetypes = [
  "Make-up & beauty",
  "Festive gifting",
  "Feasting & sweets",
  "Puja essentials",
  "Celebration favourites",
];

export function DurgaPujaPage() {
  const reduced = useReducedMotion();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [catalog, setCatalog] = useState<
    Array<{ id: string; name: string; photo_url: string | null; category_id: string | null }>
  >([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [palette, setPalette] = useState("#a33c48");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void Promise.all([
      activeCampaign(),
      supabase
        .from("menu_items")
        .select("id,name,photo_url,category_id")
        .eq("in_stock", true)
        .order("created_at")
        .limit(40),
      supabase.from("categories").select("id,name").order("sort_order"),
    ])
      .then(([loadedCampaign, itemsResult, categoryResult]) => {
        if (!alive) return;
        if (itemsResult.error || categoryResult.error) {
          const loadError = itemsResult.error ?? categoryResult.error;
          console.error("Could not load festive catalog:", loadError);
          setError("Festive favourites could not load right now.");
          return;
        }
        setCampaign(
          loadedCampaign && /durga\s*puja/i.test(loadedCampaign.title) ? loadedCampaign : null,
        );
        setCatalog(itemsResult.data ?? []);
        setCategories(categoryResult.data ?? []);
      })
      .catch((loadError: unknown) => {
        console.error("Could not load the Durga Puja campaign:", loadError);
        if (alive) setError("The festive hub could not load right now.");
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const source = campaign?.theme_bg_image_url;
    if (!source) return;
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 24;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error("Canvas is unavailable.");
        context.drawImage(image, 0, 0, 24, 24);
        const pixels = context.getImageData(0, 0, 24, 24).data;
        let red = 0;
        let green = 0;
        let blue = 0;
        let count = 0;
        for (let index = 0; index < pixels.length; index += 16) {
          red += pixels[index] ?? 0;
          green += pixels[index + 1] ?? 0;
          blue += pixels[index + 2] ?? 0;
          count++;
        }
        setPalette(
          `rgb(${Math.round(red / count)},${Math.round(green / count)},${Math.round(blue / count)})`,
        );
      } catch (loadError) {
        console.error("Could not analyze the festive cover palette:", loadError);
      }
    };
    image.onerror = () =>
      console.error("Could not read the festive cover image for palette extraction.");
    image.src = source;
  }, [campaign?.theme_bg_image_url]);

  const cards = campaign ? toPromoCards(campaign.promo_cards) : [];
  const menu = useMemo(() => catalog, [catalog]);

  return (
    <Shell>
      <PortalHeader title="Durga Puja" />
      <main className="space-y-5 px-4 pb-36 pt-3">
        <section className="relative isolate overflow-hidden rounded-[1.8rem] bg-[linear-gradient(135deg,#70213b,#d14b4a,#f6b95d)] shadow-[0_18px_40px_-22px_rgba(90,28,54,.7)]">
          {campaign?.theme_bg_image_url ? (
            <img
              src={campaign.theme_bg_image_url}
              alt=""
              className="block h-auto max-h-[55vh] min-h-[230px] w-full object-contain"
            />
          ) : null}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#391624]/75 via-[#5b1c38]/35 to-transparent" />
          <div
            className={`${campaign?.theme_bg_image_url ? "absolute inset-0" : "relative"} z-10 flex min-h-[230px] flex-col justify-center px-5 py-7 text-white`}
          >
            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[.2em] text-[#ffe2a4]">
              <Sparkles className="h-4 w-4" /> The city is dressed for Puja
            </span>
            <h1 className="mt-4 max-w-[260px] font-display text-4xl font-black leading-[.98]">
              {campaign?.title ?? "Durga Puja Celebration"}
            </h1>
            <p className="mt-3 max-w-[250px] text-xs font-semibold text-white/85">
              Gather, celebrate and savour the flavours of the season.
            </p>
          </div>
        </section>
        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-destructive/30 p-3 text-xs font-semibold text-destructive"
          >
            {error}
          </p>
        ) : null}
        <section>
          <div className="mb-3">
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-primary">
              Curated for the festivities
            </p>
            <h2 className="mt-1 text-xl font-black">Celebrate your way</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {archetypes.map((title, index) => {
              const card =
                cards.find((entry) => entry.title.toLowerCase() === title.toLowerCase()) ??
                cards[index];
              const fallback = menu.length ? menu[index % menu.length] : null;
              const image =
                card?.image_url ||
                (fallback ? fallback.photo_url || foodImage(fallback.name) : null);
              const searchTerm = card?.redirect_category_or_filter || fallback?.name || title;
              return (
                <motion.button
                  key={title}
                  type="button"
                  {...(reduced ? {} : { whileHover: { y: -3 } })}
                  onClick={() => {
                    const category = categories.find((candidate) =>
                      candidate.name.toLowerCase().includes(searchTerm.toLowerCase()),
                    );
                    if (fallback) void navigate({ to: "/item/$id", params: { id: fallback.id } });
                    else if (category) void navigate({ to: "/categories" });
                  }}
                  style={{ borderColor: palette }}
                  className="overflow-hidden rounded-2xl border-2 bg-white text-left shadow-[0_12px_24px_-20px_rgba(0,0,0,.65)]"
                >
                  <div className="relative aspect-[1.1/1] bg-[linear-gradient(145deg,#fff6e8,#f6dcd2)]">
                    {image ? (
                      <img
                        src={image}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-5xl">
                        {["💄", "🎁", "🍮", "🪔", "✨"][index]}
                      </div>
                    )}
                    <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <span className="absolute inset-x-2 bottom-2 text-xs font-black text-white">
                      {title}
                    </span>
                  </div>
                  <p className="line-clamp-2 min-h-9 px-2.5 py-2 text-[10px] font-semibold text-muted-foreground">
                    {card?.subtitle || fallback?.name || "Explore festive picks"}
                  </p>
                </motion.button>
              );
            })}
          </div>
        </section>
        <section
          className="rounded-2xl p-4 text-white shadow-sm"
          style={{ background: `linear-gradient(130deg,${palette},#7d263f)` }}
        >
          <p className="text-[10px] font-black uppercase tracking-[.16em] text-white/75">
            Puja table favourites
          </p>
          <h2 className="mt-1 text-lg font-black">Street food for every gathering</h2>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {menu.slice(0, 8).map((item) => (
              <Link
                key={item.id}
                to="/item/$id"
                params={{ id: item.id }}
                className="w-[105px] shrink-0 overflow-hidden rounded-xl bg-white text-foreground"
              >
                <img
                  src={item.photo_url ?? foodImage(item.name)}
                  alt={item.name}
                  className="aspect-square w-full object-cover"
                />
                <span className="line-clamp-2 block p-2 text-[10px] font-bold">{item.name}</span>
              </Link>
            ))}
          </div>
        </section>
        <Link to="/" className="inline-flex items-center gap-2 text-xs font-black text-primary">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
      </main>
    </Shell>
  );
}
