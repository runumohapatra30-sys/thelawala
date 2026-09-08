import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/Shell";
import { CATEGORIES, PRODUCTS, SEARCH_HINTS, VENDORS } from "@/lib/data";
import { ZONES } from "@/lib/geo";
import { actions, inr, useApp } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Thaleewala — Street food in 15 minutes, Bhubaneswar" },
      {
        name: "description",
        content:
          "Order dahi bara, pakoda, rolls and kulhad chai from Bhubaneswar street stalls, delivered in 15 minutes.",
      },
      { property: "og:title", content: "Thaleewala — Street food in 15 minutes" },
      {
        property: "og:description",
        content: "Hyper-local street food delivery across DumDuma, Khandagiri, AIIMS and Patrapada.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const [hint, setHint] = useState(0);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [zonePicker, setZonePicker] = useState(false);
  const zoneId = useApp((s) => s.zoneId);
  const cart = useApp((s) => s.cart);
  const banners = useApp((s) => s.banners);
  const zone = ZONES.find((z) => z.id === zoneId)!;

  useEffect(() => {
    const t = setInterval(() => setHint((h) => (h + 1) % SEARCH_HINTS.length), 2600);
    return () => clearInterval(t);
  }, []);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PRODUCTS.filter((p) => {
      const vendor = VENDORS.find((v) => v.id === p.vendorId);
      const matchQ =
        !q || p.name.toLowerCase().includes(q) || (vendor?.stallName.toLowerCase().includes(q) ?? false);
      const matchC = !cat || p.category === cat;
      return matchQ && matchC;
    });
  }, [query, cat]);

  const count = cart.reduce((s, l) => s + l.qty, 0);
  const total = cart.reduce(
    (s, l) => s + l.qty * (PRODUCTS.find((p) => p.id === l.productId)?.price ?? 0),
    0,
  );

  return (
    <Shell>
      <header className="bg-primary px-4 pb-4 pt-5 text-primary-foreground">
        <p className="text-xs font-semibold opacity-90">Thaleewala in</p>
        <h1 className="text-3xl font-extrabold leading-tight">15 minutes</h1>
        <button
          onClick={() => setZonePicker((v) => !v)}
          className="mt-1 flex items-center gap-1 text-sm font-medium"
        >
          <span className="font-bold">HOME</span> · {zone.name}, Bhubaneswar
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
            <path d="M7 10l5 5 5-5z" />
          </svg>
        </button>
        {zonePicker ? (
          <div className="mt-2 rounded-xl bg-card p-2 text-foreground">
            {ZONES.map((z) => (
              <button
                key={z.id}
                onClick={() => {
                  actions.setZone(z.id);
                  setZonePicker(false);
                }}
                className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${
                  z.id === zoneId ? "bg-muted font-bold text-primary" : ""
                }`}
              >
                {z.name}
              </button>
            ))}
            <p className="px-3 py-2 text-[11px] text-muted-foreground">
              More Bhubaneswar zones open soon.
            </p>
          </div>
        ) : null}
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-card px-3 py-2.5">
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={SEARCH_HINTS[hint]}
            aria-label="Search street food"
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      </header>

      <section className="px-4 pt-4">
        {banners.map((b) => (
          <div key={b.id} className="mb-3 flex items-center justify-between rounded-2xl bg-accent px-4 py-3">
            <div>
              <p className="text-sm font-bold text-accent-foreground">{b.title}</p>
              <p className="text-xs text-accent-foreground/80">{b.subtitle}</p>
            </div>
            {b.code ? (
              <span className="rounded-lg bg-card px-2 py-1 text-xs font-bold text-primary">{b.code}</span>
            ) : null}
          </div>
        ))}

        <h2 className="mb-2 text-base font-bold">What's cooking nearby</h2>
        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
          {CATEGORIES.map((c) => {
            const active = cat === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setCat(active ? null : c.id)}
                className="w-[74px] shrink-0 text-center"
              >
                <span
                  className={`block overflow-hidden rounded-2xl border-2 ${
                    active ? "border-primary" : "border-transparent"
                  }`}
                  style={{ background: "var(--tile)" }}
                >
                  <img src={c.image} alt={c.label} className="h-[74px] w-full object-cover" loading="lazy" />
                </span>
                <span className="mt-1 block text-[11px] font-semibold leading-tight">{c.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 px-4 pb-6 pt-5">
        {items.map((p) => {
          const vendor = VENDORS.find((v) => v.id === p.vendorId);
          const line = cart.find((l) => l.productId === p.id);
          return (
            <article key={p.id} className="card-soft overflow-hidden border border-border">
              <img src={p.image} alt={p.name} className="h-32 w-full object-cover" loading="lazy" />
              <div className="p-2.5">
                <p className="text-sm font-semibold leading-tight">{p.name}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{vendor?.stallName}</p>
                <p className="text-[11px] text-muted-foreground">{p.unit} · 10 min prep</p>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-sm font-bold">
                    {inr(p.price)}{" "}
                    <span className="text-[11px] font-normal text-muted-foreground line-through">{inr(p.mrp)}</span>
                  </p>
                  {line ? (
                    <div className="flex items-center gap-2 rounded-lg bg-primary px-2 py-1 text-primary-foreground">
                      <button aria-label={`Remove one ${p.name}`} onClick={() => actions.removeItem(p.id)} className="px-1 font-bold">
                        −
                      </button>
                      <span className="text-xs font-bold">{line.qty}</span>
                      <button aria-label={`Add one ${p.name}`} onClick={() => actions.addItem(p.id)} className="px-1 font-bold">
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => actions.addItem(p.id)}
                      className="rounded-lg border border-primary px-3 py-1 text-xs font-bold text-primary"
                    >
                      ADD
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
        {items.length === 0 ? (
          <p className="col-span-2 py-10 text-center text-sm text-muted-foreground">
            Nothing matched. Try “pakoda” or “chai”.
          </p>
        ) : null}
      </section>

      <section className="px-4 pb-8">
        <div className="card-soft border border-border p-4">
          <h3 className="text-sm font-bold">More on Thaleewala</h3>
          <div className="mt-2 grid gap-2 text-sm">
            <Link to="/vendor" className="rounded-xl bg-muted px-3 py-2.5 font-semibold">Partner with Us</Link>
            <Link to="/rider" className="rounded-xl bg-muted px-3 py-2.5 font-semibold">Deliver with Thaleewala</Link>
            <Link to="/admin" className="rounded-xl bg-muted px-3 py-2.5 font-semibold">Administration</Link>
          </div>
        </div>
      </section>

      {count > 0 ? (
        <div className="fixed inset-x-0 bottom-[62px] z-40 mx-auto w-full max-w-[480px] px-3">
          <Link
            to="/cart"
            className="flex items-center justify-between rounded-xl bg-primary px-4 py-3 text-primary-foreground shadow-lg"
          >
            <span className="text-sm font-bold">
              {count} item{count > 1 ? "s" : ""} · {inr(total)}
            </span>
            <span className="text-sm font-bold">VIEW CART ›</span>
          </Link>
        </div>
      ) : null}
    </Shell>
  );
}
