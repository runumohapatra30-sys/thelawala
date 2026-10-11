import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell, PortalHeader } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import { cart, useCart } from "@/lib/cart";
import { inr } from "@/lib/fees";
import { customerPrice } from "@/lib/pricing";
import { foodImage } from "@/lib/foodImage";
import { ArrowLeft, BadgeCheck, Compass, Phone, Search, Share2, X } from "lucide-react";
import { toast } from "sonner";
import { useAuthBranding } from "@/lib/authBranding";

export const Route = createFileRoute("/stalls/$id")({
  head: () => ({
    meta: [
      { title: "Stall menu — ThelaWala" },
      {
        name: "description",
        content:
          "Browse a local ThelaWala stall, current availability, live offers and street-food menu.",
      },
      { property: "og:title", content: "Stall menu — ThelaWala" },
      {
        property: "og:description",
        content: "Fresh street food from one local stall, delivered fast.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StallDetail,
});

type Category = { id: string; name: string };

type Item = {
  id: string;
  name: string;
  details: string | null;
  photo_url: string | null;
  unit: string | null;
  price: number;
  mrp: number;
  in_stock: boolean;
  food_type: string;
  category_id: string | null;
};

type Vendor = {
  id: string;
  stall_name: string;
  is_open: boolean;
  photo_url: string | null;
  stall_photos: string[] | null;
  offer_percent: number | null;
  offer_label: string | null;
  address: string | null;
  default_prep_minutes: number | null;
  mobile: string | null;
  lat: number;
  lng: number;
  status: string;
};

function StallDetail() {
  const { id } = Route.useParams();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const lines = useCart();
  const branding = useAuthBranding();

  useEffect(() => {
    let alive = true;
    async function load() {
      const columns =
        "id,stall_name,is_open,photo_url,stall_photos,offer_percent,offer_label,address,zone,open_time,close_time,default_prep_minutes,cuisine_types,status,mobile,lat,lng";
      const exact = await supabase.from("vendors").select(columns).eq("id", id).maybeSingle();
      if (exact.error) {
        console.error("Could not load stall by id:", exact.error);
      }
      let match = exact.data;
      if (!match) {
        const { data, error } = await supabase.from("vendors").select(columns).eq("status", "APPROVED");
        if (error) {
          console.error("Could not resolve stall route fallback:", error);
        } else {
          const normalized = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
          match = (data ?? []).find((row) => normalized(row.stall_name) === normalized(decodeURIComponent(id))) ?? null;
        }
      }
      if (!alive) return;
      if (!match) {
        setVendor(null);
        setLoading(false);
        return;
      }
      const [iRes, cRes] = await Promise.all([
        supabase.from("menu_items").select("*").eq("vendor_id", match.id).order("created_at"),
        supabase.from("categories").select("id,name").order("sort_order"),
      ]);
      if (!alive) return;
      if (iRes.error) console.error("Could not load stall menu:", iRes.error);
      if (cRes.error) console.error("Could not load menu categories:", cRes.error);
      setVendor(match as unknown as Vendor);
      setItems((iRes.data ?? []) as Item[]);
      setCats((cRes.data ?? []) as Category[]);
      setLoading(false);
    }
    void load();
    return () => { alive = false; };
  }, [id]);

  if (loading)
    return (
      <Shell>
        <PortalHeader title="Stall" />
        <div className="py-20 text-center text-sm text-muted-foreground animate-pulse">
          Loading stall...
        </div>
      </Shell>
    );
  if (!vendor)
    return (
      <Shell>
        <PortalHeader title="Not found" />
        <div className="py-20 text-center text-sm text-muted-foreground">Stall not found.</div>
      </Shell>
    );

  const photos = [...(vendor.stall_photos ?? []), vendor.photo_url].filter(Boolean) as string[];
  const categoriesInUse = cats.filter((c) =>
    items.some((i) => i.category_id === c.id && i.name.toLowerCase().includes(query.toLowerCase())),
  );
  const uncategorizedItems = items.filter(
    (i) => (!i.category_id || !cats.some((c) => c.id === i.category_id)) &&
      i.name.toLowerCase().includes(query.toLowerCase()),
  );
  const shareStall = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: vendor.stall_name, text: `Explore ${vendor.stall_name} on ThelaWala`, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Stall link copied.");
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") toast.error("Could not share this stall.");
    }
  };
  const cover = photos[0] ?? foodImage(vendor.stall_name);
  const stallLogo = branding.stallLogos[vendor.id] || vendor.photo_url || foodImage(vendor.stall_name);
  const mapHref = `https://www.google.com/maps/dir/?api=1&destination=${vendor.lat},${vendor.lng}`;

  return (
    <Shell>
      <div className="relative">
        <div className="relative h-56 bg-muted">
          <img src={cover} alt={`${vendor.stall_name} stall`} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = foodImage(vendor.stall_name); }} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-black/15" />
          <Link to="/stalls" aria-label="Back to stalls" className="absolute left-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-foreground shadow-sm">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <button type="button" onClick={() => void shareStall()} aria-label="Share stall" className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-foreground shadow-sm">
            <Share2 className="h-4 w-4" />
          </button>
          <div className="absolute -bottom-9 left-5 grid h-[76px] w-[76px] place-items-center overflow-hidden rounded-full border-4 border-white bg-white shadow-md">
            <img src={stallLogo} alt={`${vendor.stall_name} logo`} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = foodImage(vendor.stall_name); }} className="h-full w-full object-cover" />
          </div>
        </div>
        <div className="px-5 pb-5 pt-12">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="truncate text-2xl font-extrabold text-foreground">{vendor.stall_name}</h1>
                {vendor.status === "APPROVED" ? <BadgeCheck className="h-5 w-5 shrink-0 text-[#25834A]" /> : null}
              </div>
              <p className="mt-1 text-sm font-medium text-muted-foreground">{vendor.address || "Local Favourite"}</p>
            </div>
            {Number(vendor.offer_percent ?? 0) > 0 ? <span className="shrink-0 rounded-full bg-[#FFF0E9] px-3 py-1.5 text-[10px] font-extrabold text-[#FF5A1F]">{vendor.offer_label || `${vendor.offer_percent}% off`}</span> : null}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${vendor.is_open ? "bg-[#E8F5EC] text-[#16803C]" : "bg-muted text-muted-foreground"}`}>{vendor.is_open ? "Open Now" : "Closed"}</span>
            {vendor.default_prep_minutes ? <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-bold text-muted-foreground">About {vendor.default_prep_minutes} min prep</span> : null}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {vendor.mobile ? <a href={`tel:${vendor.mobile}`} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-border text-xs font-bold"><Phone className="h-3.5 w-3.5" />Call</a> : <span />}
            <a href={mapHref} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-border text-xs font-bold"><Compass className="h-3.5 w-3.5" />Directions</a>
            <button type="button" onClick={() => void shareStall()} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-border text-xs font-bold"><Share2 className="h-3.5 w-3.5" />Share</button>
          </div>
        </div>

        <div className="px-4 pb-40">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-black">Menu</h2>
            <label className="flex min-w-0 items-center gap-2 rounded-full border border-border bg-white px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search menu" className="w-full min-w-0 bg-transparent text-xs outline-none" />
            </label>
          </div>

          <div className="space-y-10">
            {categoriesInUse.map((cat) => (
              <div key={cat.id} className="space-y-3">
                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em]">
                  {cat.name}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {items
                    .filter((i) => i.category_id === cat.id && i.name.toLowerCase().includes(query.toLowerCase()))
                    .map((i) => (
                      <ItemRow
                        key={i.id}
                        item={i}
                        vendorId={vendor.id}
                        stallName={vendor.stall_name}
                        stallOpen={vendor.is_open}
                        offerPercent={Number(vendor.offer_percent ?? 0)}
                      />
                    ))}
                </div>
              </div>
            ))}

            {uncategorizedItems.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em]">
                  More
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {uncategorizedItems.map((i) => (
                    <ItemRow
                      key={i.id}
                      item={i}
                      vendorId={vendor.id}
                      stallName={vendor.stall_name}
                      stallOpen={vendor.is_open}
                      offerPercent={Number(vendor.offer_percent ?? 0)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}

function ItemRow({
  item: i,
  vendorId,
  stallName,
  stallOpen,
  offerPercent,
}: {
  item: Item;
  vendorId: string;
  stallName: string;
  stallOpen: boolean;
  offerPercent: number;
}) {
  const lines = useCart();
  const navigate = useNavigate();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const line = lines.find((l) => l.itemId === i.id);
  const listPrice = customerPrice(i.price);
  const price = offerPercent > 0 ? Math.round(listPrice * (100 - offerPercent)) / 100 : listPrice;
  const available = i.in_stock && stallOpen;
  const itemForCart = {
    itemId: i.id,
    vendorId,
    name: i.name,
    photo: i.photo_url,
    unit: i.unit,
    base: Number(i.price),
    price,
    mrp: customerPrice(i.mrp),
  };
  function addItem() {
    const result = cart.add(itemForCart);
    if (!result.ok) toast.error(result.error);
    return result.ok;
  }

  return (
    <>
      <article className="overflow-hidden rounded-2xl border border-border bg-card p-2.5 shadow-sm">
        <div className="product-tile relative aspect-square w-full">
          <button
            type="button"
            onClick={() => setDetailsOpen(true)}
            aria-label={`View ${i.name} details`}
            className="h-full w-full"
          >
            <img
              src={i.photo_url || foodImage(i.name)}
              className="h-full w-full object-cover"
              alt={i.name}
              loading="lazy"
            />
          </button>
          {!available ? (
            <div className="absolute inset-0 grid place-items-center rounded-2xl bg-black/50 text-[10px] font-black text-white">
              {stallOpen ? "SOLD OUT" : "CLOSED"}
            </div>
          ) : (
            <div className="absolute bottom-2 right-2">
              {line ? (
                <div className="flex h-9 min-w-[80px] items-center justify-between rounded-full bg-card px-2 text-primary shadow-lg ring-1 ring-primary/20">
                  <button
                    type="button"
                    aria-label={`Remove one ${i.name}`}
                    onClick={() => cart.remove(i.id)}
                    className="press px-1 text-lg font-black"
                  >
                    −
                  </button>
                  <span className="text-sm font-black">{line.qty}</span>
                  <button
                    type="button"
                    aria-label={`Add one ${i.name}`}
                    onClick={addItem}
                    className="press px-1 text-lg font-black"
                  >
                    +
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={addItem}
                  className="press h-9 min-w-[72px] rounded-full bg-card text-[12px] font-black text-primary shadow-lg ring-1 ring-primary/30 uppercase"
                >
                  Add
                </button>
              )}
            </div>
          )}
        </div>
        <div className="min-w-0 pt-2">
          <span
            className={`flex h-3.5 w-3.5 items-center justify-center rounded-sm border-2 ${i.food_type === "VEG" ? "border-[#558B2F]" : "border-muted-foreground"}`}
            aria-label={i.food_type === "VEG" ? "Vegetarian" : "Non-vegetarian"}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${i.food_type === "VEG" ? "bg-[#558B2F]" : "bg-muted-foreground"}`}
            />
          </span>
          <button
            type="button"
            onClick={() => setDetailsOpen(true)}
            className="mt-1 text-left text-base font-extrabold text-foreground"
          >
            {i.name}
          </button>
          <p className="mt-0.5 text-[15px] font-black text-primary">
            {inr(price)}{" "}
            {price < listPrice ? (
              <span className="text-xs font-medium text-muted-foreground line-through">
                {inr(listPrice)}
              </span>
            ) : null}{" "}
            <span className="text-xs font-medium text-muted-foreground">{i.unit}</span>
          </p>
          {i.details && (
            <p className="mt-1 line-clamp-2 text-[10px] text-muted-foreground">{i.details}</p>
          )}
        </div>
      </article>
      {detailsOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-end bg-foreground/55 sm:items-center sm:justify-center sm:p-4"
          role="presentation"
          onClick={() => setDetailsOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`item-${i.id}-title`}
            onClick={(event) => event.stopPropagation()}
            className="relative max-h-[92dvh] w-full max-w-[460px] overflow-y-auto rounded-t-3xl bg-card shadow-2xl sm:rounded-3xl"
          >
            <div className="relative flex h-64 items-center justify-center bg-[#FAF7F2]">
              <img
                src={i.photo_url || foodImage(i.name)}
                alt={i.name}
                className="h-52 w-52 rounded-full object-cover shadow-lg ring-4 ring-white"
              />
              <button
                type="button"
                onClick={() => setDetailsOpen(false)}
                aria-label="Close item details"
                className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/95 text-foreground shadow"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="relative -mt-7 space-y-3 rounded-t-3xl bg-card px-5 pb-5 pt-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-muted-foreground">{stallName}</p>
                  <h2 id={`item-${i.id}-title`} className="mt-1 text-2xl font-black text-foreground">
                    {i.name}
                  </h2>
                </div>
                <p className="shrink-0 text-xl font-black text-primary">
                  {inr(price)}{" "}
                  {price < listPrice ? (
                    <span className="block text-xs font-medium text-muted-foreground line-through">
                      {inr(listPrice)}
                    </span>
                  ) : null}
                </p>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {i.details || "This stall has not added a description for this item."}
              </p>
              <div className="flex items-center gap-2 border-y border-border py-3">
                <span className="rounded-full bg-brand-soft px-3 py-1.5 text-xs font-extrabold text-primary">
                  {i.unit || "Portion"}
                </span>
                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${available ? "bg-brand-soft text-primary" : "bg-muted text-muted-foreground"}`}
                >
                  {available ? "Available" : stallOpen ? "Out of stock" : "Stall closed"}
                </span>
              </div>
              {available ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">Quantity</span>
                  {line ? (
                    <div className="flex items-center gap-4 rounded-full border border-border px-2 py-1">
                      <button
                        type="button"
                        aria-label={`Remove one ${i.name}`}
                        onClick={() => cart.remove(i.id)}
                        className="grid h-8 w-8 place-items-center text-lg font-black text-primary"
                      >
                        −
                      </button>
                      <span className="min-w-4 text-center text-sm font-black">{line.qty}</span>
                      <button
                        type="button"
                        aria-label={`Add one ${i.name}`}
                        onClick={addItem}
                        className="grid h-8 w-8 place-items-center text-lg font-black text-primary"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={addItem}
                      className="rounded-full border border-primary px-4 py-2 text-xs font-black text-primary"
                    >
                      Add one
                    </button>
                  )}
                </div>
              ) : null}
            </div>
            <div className="sticky bottom-0 grid grid-cols-2 gap-2 border-t border-border bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                disabled={!available}
                onClick={addItem}
                className="min-h-12 rounded-2xl border border-primary bg-white px-3 text-sm font-black text-primary disabled:opacity-50"
              >
                Add To Cart
              </button>
              <button
                type="button"
                disabled={!available}
                onClick={() => {
                  if (addItem()) {
                    setDetailsOpen(false);
                    void navigate({ to: "/cart" });
                  }
                }}
                className="min-h-12 rounded-2xl bg-primary px-3 text-sm font-black text-primary-foreground disabled:opacity-50"
              >
                Buy Now
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
