import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/** Browser push-style alerts when the customer's order status changes. */
export function OrderAlerts({ userId }: { userId: string | undefined }) {
  const seen = useRef<string | null>(null);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (typeof Notification !== "undefined") setAllowed(Notification.permission === "granted");
  }, []);

  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`notif-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as { id: string; title: string; body: string | null };
          if (seen.current === row.id) return;
          seen.current = row.id;
          toast(row.title, { description: row.body ?? undefined });
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification(row.title, { body: row.body ?? "", icon: "/favicon.ico" });
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId]);

  if (!userId || allowed || typeof Notification === "undefined") return null;

  return (
    <button
      onClick={async () => {
        const res = await Notification.requestPermission();
        setAllowed(res === "granted");
      }}
      className="press w-full rounded-2xl border border-primary px-3 py-2 text-[11px] font-black text-primary"
    >
      🔔 Turn on order alerts on this phone
    </button>
  );
}
