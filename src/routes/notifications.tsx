import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PortalHeader, Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — ThelaWala" },
      { name: "description", content: "Every update on your ThelaWala orders: accepted, preparing, out for delivery and delivered." },
      { property: "og:title", content: "Notifications — ThelaWala" },
      { property: "og:description", content: "Live order updates in one feed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Notifications,
});

type Note = { id: string; title: string; body: string | null; order_id: string | null; is_read: boolean; created_at: string };

function Notifications() {
  const { user, loading } = useSession();
  const [rows, setRows] = useState<Note[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id,title,body,order_id,is_read,created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      setRows((data ?? []) as Note[]);
      await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    })();
  }, [user?.id]);

  return (
    <Shell>
      <PortalHeader title="Notifications" subtitle="Your order updates" />
      <div className="space-y-2 p-4">
        {loading ? null : !user ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Sign in to see your updates.</p>
        ) : rows.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">No updates yet.</p>
        ) : (
          rows.map((n, idx) => {
            const card = (
              <div
                style={{ animationDelay: `${Math.min(idx, 10) * 50}ms` }}
                className={`rise-in card-elevated p-4 ${n.is_read ? "" : "ring-2 ring-primary/60"}`}
              >
                <p className="text-sm font-bold">{n.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {n.body} · {new Date(n.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            );
            return n.order_id ? (
              <Link key={n.id} to="/orders/$id" params={{ id: n.order_id }} className="press block">
                {card}
              </Link>
            ) : (
              <div key={n.id}>{card}</div>
            );
          })
        )}
      </div>
    </Shell>
  );
}
