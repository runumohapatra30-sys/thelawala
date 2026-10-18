import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, BadgeCheck, Heart, MapPin, Minus, Plus, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/Shell";
import type { StreetFoodItem, StreetFoodVendor } from "@/components/StreetFoodExperience";
import { supabase } from "@/integrations/supabase/client";
import { cart, useCart } from "@/lib/cart";
import { foodImage } from "@/lib/foodImage";
import { inr } from "@/lib/fees";
import { customerPrice } from "@/lib/pricing";
import { useSession } from "@/lib/session";
import { OPEN_LOGIN_EVENT } from "@/components/LoginModal";
import { toast } from "sonner";

export const Route = createFileRoute("/item/$id")({
  head: () => ({
    meta: [
      { title: "Food item — ThelaWala" },
      { name: "description", content: "View item details and order street food from local stalls." },
    ],
  }),
  component: FoodItemDetail,
});

function FoodItemDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useSession();
  const lines = useCart();
  const [item, setItem] = useState<StreetFoodItem | null>(null);
  const [vendor, setVendor] = useState<StreetFoodVendor | null>(null);
  const [recommendations, setRecommendations] = useState<StreetFoodItem[]>([]);
  const [rating, setRating] = useState<{ average: number; count: number } | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setLoadError(null);
      const { data: itemData, error: itemError } = await supabase
        .from("menu_items")
        .select("id,vendor_id,category_id,name,details,photo_url,unit,price,mrp,in_stock,food_type")
        .eq("id", id)
        .maybeSingle();
      if (!alive) return;
      if (itemError) {
        console.error("Could not load food item:", itemError);
        setLoadError("We couldn't load this food item. Please try again.");
        setLoading(false);
        return;
      }
      if (!itemData) {
        setItem(null);
        setVendor(null);
        setLoading(false);
        return;
      }

      const typedItem = itemData as StreetFoodItem;
      const [vendorResult, menuResult, ratingResult] = await Promise.all([
        supabase.from("vendors").select("id,stall_name,is_open,photo_url,offer_percent,offer_label,address,zone,default_prep_minutes").eq("id", typedItem.vendor_id).maybeSingle(),
        supabase.from("menu_items").select("id,vendor_id,category_id,name,details,photo_url,unit,price,mrp,in_stock,food_type").eq("in_stock", true).neq("id", id).limit(20),
        supabase.from("order_ratings").select("food_stars").eq("vendor_id", typedItem.vendor_id),
      ]);
      if (!alive) return;
      if (vendorResult.error) console.error("Could not load food item's stall:", vendorResult.error);
      if (menuResult.error) console.error("Could not load food recommendations:", menuResult.error);
      if (ratingResult.error) console.error("Could not load food item's ratings:", ratingResult.error);
      setItem(typedItem);
      setVendor(vendorResult.data as StreetFoodVendor | null);
      setRecommendations((menuResult.data ?? []) as StreetFoodItem[]);
      const stars = (ratingResult.data ?? []).map((entry) => Number(entry.food_stars)).filter(Number.isFinite);
      setRating(stars.length ? { average: stars.reduce((total, value) => total + value, 0) / stars.length, count: stars.length } : null);
      setLoading(false);
    }
    void load();
    return () => { alive = false; };
  }, [id]);

  useEffect(() => {
    let alive = true;
    async function loadFavorite() {
      if (!user || !item) {
        setFavorite(false);
        return;
      }
      const { data, error } = await supabase.from("favorites").select("item_id").eq("user_id", user.id).eq("item_id", item.id).maybeSingle();
      if (!alive) return;
      if (error) {
        console.error("Could not load food favorite:", error);
        return;
      }
      setFavorite(Boolean(data));
    }
    void loadFavorite();
    return () => { alive = false; };
  }, [user, item]);

  const line = useMemo(() => lines.find((candidate) => candidate.itemId === item?.id), [lines, item?.id]);
  const related = useMemo(() => {
    if (!item) return [];
    return recommendations.filter((candidate) => candidate.vendor_id === item.vendor_id);
  }, [item, recommendations]);
  const otherPicks = useMemo(() => {
    if (!item) return [];
    return recommendations.filter((candidate) => candidate.vendor_id !== item.vendor_id && candidate.category_id === item.category_id).slice(0, 6);
  }, [item, recommendations]);

  async function toggleFavorite() {
    if (!user) {
      window.dispatchEvent(new Event(OPEN_LOGIN_EVENT));
      return;
    }
    const next = !favorite;
    setFavorite(next);
    const result = next
      ? await supabase.from("favorites").insert({ user_id: user.id, item_id: item!.id, vendor_id: item!.vendor_id })
      : await supabase.from("favorites").delete().eq("user_id", user.id).eq("item_id", item!.id);
    if (result.error) {
      setFavorite(!next);
      console.error("Could not update food favorite:", result.error);
      toast.error("Could not update your favourites. Please try again.");
    }
  }

  function addToCart() {
    if (!item) return;
    for (let count = 0; count < quantity; count += 1) {
      const result = cart.add({
        itemId: item.id,
        vendorId: item.vendor_id,
        name: item.name,
        photo: item.photo_url,
        unit: item.unit,
        base: Number(item.price),
        price: customerPrice(item.price),
        mrp: customerPrice(item.mrp),
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
    }
    toast.success(`${quantity} ${item.name} added to cart.`);
  }

  if (loading) return <Shell><div className="px-5 py-20 text-center text-sm text-muted-foreground" aria-live="polite">Loading food item…</div></Shell>;
  if (loadError) return <Shell><section role="alert" className="px-5 py-16 text-center"><p className="text-sm text-muted-foreground">{loadError}</p><button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">Try again</button></section></Shell>;
  if (!item) return <Shell><section className="px-5 py-16 text-center"><p className="text-sm text-muted-foreground">Food item not found.</p><Link to="/" className="mt-4 inline-block text-sm font-bold text-primary">Back to home</Link></section></Shell>;

  const price = customerPrice(item.price);
  const mrp = customerPrice(item.mrp);

  return (
    <Shell>
      <main className="pb-44">
        <header className="absolute inset-x-0 z-10 mx-auto flex w-full max-w-[520px] items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <button type="button" aria-label="Back" onClick={() => navigate({ to: "/" })} className="grid h-10 w-10 place-items-center rounded-full bg-white/95 text-foreground shadow-md"><ArrowLeft className="h-5 w-5" /></button>
          <button type="button" aria-label={favorite ? "Remove from favourites" : "Add to favourites"} aria-pressed={favorite} onClick={() => void toggleFavorite()} className="grid h-10 w-10 place-items-center rounded-full bg-white/95 text-primary shadow-md"><Heart className="h-5 w-5" fill={favorite ? "currentColor" : "none"} /></button>
        </header>
        <div className="aspect-[4/3] max-h-[420px] bg-brand-soft">
          <img src={item.photo_url ?? foodImage(item.name)} alt={item.name} className="h-full w-full object-cover" />
        </div>
        <section className="mx-4 -mt-4 rounded-2xl border border-border bg-white p-4 shadow-card">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 text-sm font-extrabold text-foreground">{vendor?.stall_name ?? "Local stall"}<BadgeCheck className="h-4 w-4 text-emerald-600" /></p>
              <p className="truncate text-[11px] text-muted-foreground">{vendor?.address || vendor?.zone || "Local street-food stall"}</p>
            </div>
            <Link to="/stalls/$id" params={{ id: item.vendor_id }} className="shrink-0 rounded-lg border border-primary px-3 py-2 text-[10px] font-black text-primary">View Stall</Link>
          </div>
        </section>
        <section className="px-5 pb-5 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-black leading-tight text-foreground">{item.name}</h1>
              <p className="mt-1 text-xs font-medium text-muted-foreground">{item.unit || "Freshly prepared street food"}</p>
            </div>
            <span className="shrink-0 rounded-xl bg-emerald-50 px-2.5 py-1.5 text-xs font-black text-emerald-800">{inr(price)}{mrp > price ? <span className="ml-1 text-[10px] font-semibold text-muted-foreground line-through">{inr(mrp)}</span> : null}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800"><Star className="h-3.5 w-3.5 fill-emerald-700" />{rating ? `${rating.average.toFixed(1)} (${rating.count})` : "New"}</span>
            <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-bold text-foreground">{vendor?.default_prep_minutes || 15} min</span>
            <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${item.in_stock ? "bg-emerald-50 text-emerald-800" : "bg-muted text-muted-foreground"}`}>{item.in_stock ? "Available now" : "Currently unavailable"}</span>
          </div>
          {item.details ? <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{item.details}</p> : null}
        </section>
        {related.length ? <RecommendationSection title="More from this stall" items={related} onItem={(itemId) => navigate({ to: "/item/$id", params: { id: itemId } })} /> : null}
        {otherPicks.length ? <RecommendationSection title="People also ordered" items={otherPicks} onItem={(itemId) => navigate({ to: "/item/$id", params: { id: itemId } })} /> : null}
      </main>
      <div className="fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-[480px] items-center gap-2 px-3">
        <div className="flex h-12 shrink-0 items-center gap-3 rounded-xl border border-primary bg-white px-2 text-primary shadow-lg">
          <button type="button" aria-label="Decrease quantity" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="grid h-8 w-8 place-items-center"><Minus className="h-4 w-4" /></button>
          <span className="min-w-4 text-center text-sm font-black">{String(quantity).padStart(2, "0")}</span>
          <button type="button" aria-label="Increase quantity" onClick={() => setQuantity((value) => Math.min(99, value + 1))} className="grid h-8 w-8 place-items-center"><Plus className="h-4 w-4" /></button>
        </div>
        <button type="button" disabled={!item.in_stock} onClick={addToCart} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-black text-primary-foreground shadow-lg disabled:cursor-not-allowed disabled:opacity-50">
          {line ? `Add to Cart · ${line.qty} in cart` : "Add to Cart"} · {inr(price * quantity)}
        </button>
      </div>
    </Shell>
  );
}

function RecommendationSection({ title, items, onItem }: { title: string; items: StreetFoodItem[]; onItem: (itemId: string) => void }) {
  return (
    <section className="px-5 pb-5">
      <h2 className="mb-3 text-base font-black text-foreground">{title}</h2>
      <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
        {items.map((suggestion) => (
          <button key={suggestion.id} type="button" onClick={() => onItem(suggestion.id)} className="w-32 shrink-0 overflow-hidden rounded-xl border border-border bg-white text-left shadow-sm">
            <img src={suggestion.photo_url ?? foodImage(suggestion.name)} alt={suggestion.name} className="aspect-square w-full object-cover" />
            <span className="block truncate px-2 pt-2 text-xs font-bold text-foreground">{suggestion.name}</span>
            <span className="block px-2 pb-2 text-xs font-black text-primary">{inr(customerPrice(suggestion.price))}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
