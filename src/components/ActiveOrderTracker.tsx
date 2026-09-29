import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Bike, ChevronRight, Timer } from "lucide-react";
import { STATUS_LABEL } from "@/lib/fees";

export function ActiveOrderTracker({ userId }: { userId?: string }) {
  const [activeOrders, setActiveOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!userId) return;
    
    const fetchOrders = async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, code, status, vendor_id, delivery_otp, vendors(stall_name)")
        .eq("user_id", userId)
        .in("status", ["ORDER_PLACED", "PREPARING", "READY_FOR_PICKUP", "RIDER_ASSIGNED", "OUT_FOR_DELIVERY"])
        .order("created_at", { ascending: false });
      setActiveOrders(data || []);
    };

    fetchOrders();
    
    const channel = supabase
      .channel("active-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${userId}` }, fetchOrders)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  if (activeOrders.length === 0) return null;

  return (
    <div className="px-5 pt-2">
      <div className="flex flex-col gap-3">
        {activeOrders.map((order) => (
          <Link
            key={order.id}
            to="/orders/$id"
            params={{ id: order.id }}
            className="press flex items-center gap-3 rounded-2xl bg-primary px-4 py-3 text-primary-foreground shadow-lg shadow-primary/20"
          >
            <div className="grid h-10 w-10 place-items-center rounded-full bg-white/20">
              <Bike className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-black uppercase tracking-wider opacity-90">
                {order.vendors?.stall_name || "Street Stall"}
              </p>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="flex items-center gap-1 text-[11px] font-bold">
                  <Timer className="h-3 w-3" /> 10-15 mins
                </span>
                <span className="h-1 w-1 rounded-full bg-white/40" />
                <span className="text-[11px] font-bold uppercase tracking-tight">
                  {STATUS_LABEL[order.status] || order.status}
                </span>
              </div>
            </div>
            {order.delivery_otp ? (
              <span className="shrink-0 rounded-lg bg-white/20 px-2 py-1 text-[11px] font-black tracking-[0.2em]">
                OTP {order.delivery_otp}
              </span>
            ) : null}
            <ChevronRight className="h-5 w-5 shrink-0 opacity-60" />
          </Link>
        ))}
      </div>
    </div>
  );
}
