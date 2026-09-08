import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PortalHeader, Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import { inr, STATUS_LABEL } from "@/lib/fees";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/orders/")({
  head: () => ({
    meta: [
      { title: "Your orders — Thaleewala" },
      { name: "description", content: "Track every Thaleewala street food order, its status and bill in one place." },
      { property: "og:title", content: "Your orders — Thaleewala" },
      { property: "og:description", content: "All your street food orders and live tracking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Orders,
});

type Row = { id: string; code: string; status: string; grand_total: number; created_at: string };

function Orders() {
  const { user, loading } = useSession();
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("orders")
      .select("id,code,status,grand_total,created_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => setRows((data ?? []) as Row[]));
  }, [user?.id]);

  return (
    <Shell>
      <PortalHeader title="Your orders" />
      <div className="space-y-3 p-4">
        {loading ? null : !user ? (
          <div className="py-16 text-center">
            <p className="text-sm text-muted-foreground">Sign in to see your orders.</p>
            <Link to="/auth" className="mt-3 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">
              Sign in
            </Link>
          </div>
        ) : rows.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          rows.map((o) => (
            <Link
              key={o.id}
              to="/orders/$id"
              params={{ id: o.id }}
              className="card-soft flex items-center justify-between border border-border p-3"
            >
              <div>
                <p className="text-sm font-bold">#{o.code}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(o.created_at).toLocaleString("en-IN")}
                </p>
                <p className="mt-1 text-xs font-semibold text-primary">{STATUS_LABEL[o.status] ?? o.status}</p>
              </div>
              <p className="text-sm font-bold">{inr(Number(o.grand_total))}</p>
            </Link>
          ))
        )}
      </div>
    </Shell>
  );
}
