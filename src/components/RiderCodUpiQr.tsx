import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createCashfreeCollectSession, verifyCashfreePayment } from "@/lib/cashfree.functions";
import { loadCashfreeSdk } from "@/lib/checkout";

type Props = { orderId: string; amount: number; onPaid: () => void };

/**
 * Collects a real UPI payment at the door using the official Cashfree checkout
 * (order created through the PG /orders API). The order is marked paid only
 * after Cashfree's order-status API confirms the money arrived.
 */
export function RiderCodUpiQr({ orderId, amount, onPaid }: Props) {
  const [busy, setBusy] = useState(false);
  const [cfOrderId, setCfOrderId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  async function markPaid(reference: string) {
    const { error } = await supabase
      .from("orders")
      .update({
        payment_status: "PAID",
        payment_mode: "ONLINE",
        gateway_reference_id: reference,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Payment received online.");
    onPaid();
  }

  async function check(id: string, silent = false): Promise<boolean> {
    try {
      const verdict = await verifyCashfreePayment({ data: { cfOrderId: id } });
      if (verdict.status === "SUCCESS") {
        if (timer.current) clearInterval(timer.current);
        setNote("");
        await markPaid(verdict.reference);
        return true;
      }
      setNote(verdict.status === "PENDING" ? "Payment pending — not received yet." : "Payment not received yet.");
      if (!silent) toast.error("Payment Pending / Not Received");
    } catch {
      if (!silent) toast.error("Could not check the payment right now.");
    }
    return false;
  }

  async function start() {
    setBusy(true);
    setNote("");
    try {
      const session = await createCashfreeCollectSession({
        data: { amount, orderId, name: "Customer", mobile: "" },
      });
      setCfOrderId(session.cfOrderId);

      try {
        const factory = await loadCashfreeSdk();
        const cashfree = factory({ mode: session.live ? "production" : "sandbox" });
        await cashfree.checkout({ paymentSessionId: session.paymentSessionId, redirectTarget: "_modal" });
      } catch {
        if (session.paymentLink) window.open(session.paymentLink, "_blank", "noopener");
      }

      const done = await check(session.cfOrderId, true);
      if (!done) {
        setNote("Payment pending — not received yet.");
        if (timer.current) clearInterval(timer.current);
        timer.current = setInterval(() => void check(session.cfOrderId, true), 5000);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start the payment.");
    }
    setBusy(false);
  }

  return (
    <div className="mt-2">
      <button
        onClick={() => void start()}
        disabled={busy}
        className="press w-full rounded-xl border-2 border-primary py-2.5 text-sm font-bold text-primary disabled:opacity-60"
      >
        {busy ? "Opening secure payment…" : "Pay Online via UPI"}
      </button>
      {note && (
        <div className="mt-2 flex items-center gap-2">
          <p className="flex-1 text-xs font-semibold text-muted-foreground">{note}</p>
          <button
            onClick={() => cfOrderId && void check(cfOrderId)}
            className="press rounded-lg border border-border px-3 py-1.5 text-xs font-bold"
          >
            Check payment
          </button>
        </div>
      )}
    </div>
  );
}
