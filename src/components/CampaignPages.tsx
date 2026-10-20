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

export { DurgaPujaPage } from "@/components/DurgaPujaPage";
