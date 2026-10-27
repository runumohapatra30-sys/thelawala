import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Bike, ChevronRight } from "lucide-react";
import { STATUS_LABEL } from "@/lib/fees";
import { requestAndShowNotification } from "@/utils/notifications";

type ActiveOrder = {
  id: string;
  code: string;
  status: string;
  vendor_id: string;
  delivery_otp: string | null;
  vendors: { stall_name: string } | null;
};

export function ActiveOrderTracker({ userId }: { userId?: string }) {
  const [latestOrder, setLatestOrder] = useState<ActiveOrder | null>(null);
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    if (!userId) return;
    
    const fetchOrders = async () => {
      const [activeResult, totalResult] = await Promise.all([
        supabase
          .from("orders")
          .select("id, code, status, vendor_id, delivery_otp, vendors(stall_name)")
          .eq("user_id", userId)
          .in("status", ["ORDER_PLACED", "PREPARING", "READY_FOR_PICKUP", "RIDER_ASSIGNED", "OUT_FOR_DELIVERY"])
          .order("created_at", { ascending: false })
          .limit(1),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", userId),
      ]);
      if (activeResult.error || totalResult.error) {
        console.error("Could not load order summary for the home screen:", activeResult.error ?? totalResult.error);
        return;
      }
      setLatestOrder((activeResult.data?.[0] ?? null) as unknown as ActiveOrder | null);
            const order = activeResult.data?.[0];
      if (order && order.status) {
        const labels: Record<string, string> = {
          PREPARING: "Stall is preparing your food!",
          READY_FOR_PICKUP: "Your order is ready for pickup!",
          RIDER_ASSIGNED: "Delivery partner assigned to your order!",
          OUT_FOR_DELIVERY: "Order is out for delivery! Rider on the way.",
          DELIVERED: "Your order has been delivered! Enjoy your meal.",
        };
        if (labels[order.status]) {
          void requestAndShowNotification(
            `ThelaWala Order #${order.code || ""}`,
            labels[order.status]
          );
        }
      }

      setActiveCount(totalResult.count ?? 0);
    };

    void fetchOrders();
    
    const channel = supabase
      .channel(`active-orders-${userId}-${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${userId}` }, fetchOrders)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  if (!latestOrder) return null;

  return (
    <div className="px-5 pt-2">
      <Link
        to="/orders/$id"
        params={{ id: latestOrder.id }}
        className="press flex items-center gap-3 rounded-2xl border border-[#FFD3C3] bg-white px-3 py-2.5 shadow-sm"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#FFF0E9] text-primary">
          <Bike className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-extrabold text-foreground">
            {latestOrder.vendors?.stall_name || "Street Stall"}
          </span>
          <span className="mt-0.5 block truncate text-[10px] font-semibold text-muted-foreground">
            {STATUS_LABEL[latestOrder.status] || latestOrder.status}
          </span>
        </span>
        {latestOrder.delivery_otp ? (
          <span className="shrink-0 rounded-full bg-[#FFF0E9] px-2.5 py-1 text-[10px] font-black tracking-wide text-primary">
            OTP {latestOrder.delivery_otp}
          </span>
        ) : null}
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </Link>
      <Link to="/orders" className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-primary">
        View all orders ({activeCount})
        <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
