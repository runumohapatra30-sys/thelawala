import { createFileRoute, Link } from "@tanstack/react-router";
import { PortalHeader, Shell } from "@/components/Shell";
import { STATUS_LABEL, inr, useApp } from "@/lib/store";

export const Route = createFileRoute("/orders/")({
  head: () => ({
    meta: [
      { title: "Your orders — Thaleewala" },
      { name: "description", content: "Track live and past Thaleewala street food orders." },
      { property: "og:title", content: "Your orders — Thaleewala" },
      { property: "og:description", content: "Live status, delivery OTP and bills for every order." },
    ],
  }),
  component: Orders,
});

function Orders() {
  const orders = useApp((s) => s.orders);
  return (
    <Shell>
      <PortalHeader title="Your orders" subtitle="Live and past orders" />
      <div className="space-y-3 p-4">
        {orders.length === 0 ? (
          <p className="py-20 text-center text-sm text-muted-foreground">No orders yet.</p>
        ) : null}
        {orders.map((o) => (
          <Link
            key={o.id}
            to="/orders/$id"
            params={{ id: o.id }}
            className="card-soft flex items-center gap-3 border border-border p-3"
          >
            <img src={o.lines[0]?.image} alt="" className="h-14 w-14 rounded-xl object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {o.lines.map((l) => l.name).join(", ")}
              </p>
              <p className="text-xs text-muted-foreground">
                #{o.id} · {new Date(o.createdAt).toLocaleString("en-IN")}
              </p>
              <p className="text-xs font-bold text-primary">{STATUS_LABEL[o.status]}</p>
            </div>
            <p className="text-sm font-bold">{inr(o.bill.grand)}</p>
          </Link>
        ))}
      </div>
    </Shell>
  );
}
