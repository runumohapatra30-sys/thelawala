import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, Check, CircleX, Volume2 } from "lucide-react";
import { playOrderVoiceAlert } from "@/utils/playVoice.js";

function formatOrderTime(timestamp) {
  return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(new Date(timestamp));
}

function orderItem(order, orderItems) {
  return orderItems.find((item) => item.order_id === order.id) || { name: "ନୂଆ ଅର୍ଡର୍", price: order.grand_total };
}

export function VendorDashboard({ orders, orderItems, onStatus, onMute, muted }) {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem("thelawala.vendor.sound") !== "off";
  });
  const knownOrderIds = useRef(null);
  const pendingVoiceOrderIds = useRef(new Set());
  const alertedOrderIds = useRef(new Set());
  const incomingOrders = orders.filter((order) => order.status === "ORDER_PLACED");

  useEffect(() => {
    const currentIds = new Set(incomingOrders.map((order) => order.id));
    if (!knownOrderIds.current) {
      knownOrderIds.current = currentIds;
      return;
    }
    incomingOrders.forEach((order) => {
      if (!knownOrderIds.current.has(order.id)) pendingVoiceOrderIds.current.add(order.id);
    });
    knownOrderIds.current = currentIds;
    const newOrder = incomingOrders.find((order) => pendingVoiceOrderIds.current.has(order.id) && !alertedOrderIds.current.has(order.id));
    if (!newOrder || !soundEnabled) return;
    const item = orderItem(newOrder, orderItems);
    if (!orderItems.some((orderItemRow) => orderItemRow.order_id === newOrder.id)) return;
    pendingVoiceOrderIds.current.delete(newOrder.id);
    alertedOrderIds.current.add(newOrder.id);
    playOrderVoiceAlert(item.name, item.price ?? newOrder.grand_total);
  }, [incomingOrders, orderItems, soundEnabled]);

  function toggleSound() {
    setSoundEnabled((enabled) => {
      const next = !enabled;
      window.localStorage.setItem("thelawala.vendor.sound", next ? "on" : "off");
      return next;
    });
  }

  return (
    <section className="space-y-3" aria-labelledby="incoming-orders-heading">
      <div className="flex items-center justify-between rounded-2xl bg-destructive px-3 py-2.5 text-destructive-foreground">
        <div>
          <p id="incoming-orders-heading" className="flex items-center gap-2 text-sm font-black">
            <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" /></span>
            {incomingOrders.length} new order{incomingOrders.length === 1 ? "" : "s"} waiting
          </p>
          <p className="mt-0.5 text-[10px] opacity-80">Odia voice alerts are {soundEnabled ? "on" : "off"}</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={toggleSound} aria-pressed={soundEnabled} aria-label={soundEnabled ? "Turn voice alerts off" : "Turn voice alerts on"} className="grid h-9 w-9 place-items-center rounded-full bg-white/20">
            {soundEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          </button>
          <button type="button" onClick={() => onMute(!muted)} className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-black">{muted ? "Unmute alarm" : "Mute alarm"}</button>
        </div>
      </div>

      {incomingOrders.map((order) => {
        const item = orderItem(order, orderItems);
        return (
          <article key={order.id} className="overflow-hidden rounded-3xl border-2 border-primary bg-card shadow-[0_16px_40px_-18px_rgba(12,131,31,0.55)]">
            <div className="flex items-center justify-between bg-primary px-4 py-2 text-primary-foreground"><p className="text-xs font-black tracking-wide">NEW ORDER · #{order.code}</p><p className="text-sm font-black">₹{Number(order.grand_total).toFixed(0)}</p></div>
            <div className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-3"><div><p className="text-base font-black">{item.name}</p><p className="mt-0.5 text-sm font-bold text-primary">₹{Number(item.price ?? order.grand_total).toFixed(0)}</p></div><p className="shrink-0 text-[11px] font-semibold text-muted-foreground">{formatOrderTime(order.created_at)}</p></div>
              <p className="text-xs leading-snug text-muted-foreground">{order.customer_name} · {order.address_line}</p>
              <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold">Status: {order.status}</span>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <button type="button" onClick={() => onStatus(order, "PREPARING")} className="flex items-center justify-center gap-1 rounded-2xl bg-primary py-3 text-xs font-black text-primary-foreground"><Check className="h-4 w-4" /> Accept</button>
                <button type="button" onClick={() => onStatus(order, "CANCELLED")} className="flex items-center justify-center gap-1 rounded-2xl border-2 border-destructive py-3 text-xs font-black text-destructive"><CircleX className="h-4 w-4" /> Reject</button>
                <button type="button" onClick={() => onStatus(order, "READY_FOR_PICKUP")} className="flex items-center justify-center gap-1 rounded-2xl border border-primary py-3 text-xs font-black text-primary"><Check className="h-4 w-4" /> Prepared</button>
              </div>
            </div>
          </article>
        );
      })}

      <button type="button" onClick={() => playOrderVoiceAlert("ବରା ତରକାରୀ", 185)} className="w-full rounded-2xl border border-primary bg-card px-3 py-2.5 text-xs font-black text-primary"><Volume2 className="mr-1 inline-block h-4 w-4 align-[-3px]" /> Test Sound Alert</button>
    </section>
  );
}