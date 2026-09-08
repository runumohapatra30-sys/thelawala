import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PortalHeader, Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "All categories — ThelaWala" },
      { name: "description", content: "Browse every ThelaWala category: bhata dali, dahi bara, rolls, chaat, biryani, chicken pakoda, momo and chai." },
      { property: "og:title", content: "All categories — ThelaWala" },
      { property: "og:description", content: "Pick a category and order from your nearest thela in 15 minutes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Categories,
});

type Category = { id: string; name: string; emoji: string | null };

const TINTS = [
  "bg-[color-mix(in_oklab,var(--color-brand)_28%,white)]",
  "bg-[color-mix(in_oklab,var(--color-primary)_14%,white)]",
  "bg-[color-mix(in_oklab,var(--color-destructive)_12%,white)]",
  "bg-[color-mix(in_oklab,var(--color-chart-2)_16%,white)]",
  "bg-[color-mix(in_oklab,var(--color-chart-5)_18%,white)]",
  "bg-[color-mix(in_oklab,var(--color-chart-3)_12%,white)]",
];

function Categories() {
  const [cats, setCats] = useState<Category[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    supabase.from("categories").select("id,name,emoji").order("sort_order").then(({ data }) => setCats(data ?? []));
    supabase.from("menu_items").select("category_id").then(({ data }) => {
      const c: Record<string, number> = {};
      (data ?? []).forEach((r) => {
        if (r.category_id) c[r.category_id] = (c[r.category_id] ?? 0) + 1;
      });
      setCounts(c);
    });
  }, []);

  return (
    <Shell>
      <PortalHeader title="All categories" subtitle="Local Thela · Super Fast Delivery" />
      <div className="grid grid-cols-3 gap-3 p-4">
        {cats.map((c, idx) => (
          <Link
            key={c.id}
            to="/"
            className={`press rounded-2xl p-3 text-center ${TINTS[idx % TINTS.length]}`}
          >
            <span className="block text-2xl">{c.emoji ?? "🥘"}</span>
            <span className="mt-1 block text-[11px] font-bold leading-tight">{c.name}</span>
            <span className="mt-0.5 block text-[10px] text-muted-foreground">{counts[c.id] ?? 0} items</span>
          </Link>
        ))}
      </div>
    </Shell>
  );
}
