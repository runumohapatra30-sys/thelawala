import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createCashfreeUpiQr, verifyCashfreePayment } from "@/lib/cashfree.functions";

type Props = { orderId: string; amount: number; onPaid: () => void };

/**
 * Takes a real UPI payment at the door with a dynamic Cashfree QR for the exact bill.
 * The order is marked paid only after Cashfree confirms the money arrived.
 */
export function RiderCodUpiQr({ orderId, amount, onPaid }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [cfOrderId, setCfOrderId] = useState<string | null>(null);
  const [note, setNote] = useState("Waiting for the payment…");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  async function start() {
    setOpen(true);
    setLoading(true);
    setQr(null);
    try {
      const res = await createCashfreeUpiQr({ data: { amount, orderId, name: "Customer", mobile: "" } });
      setQr(res.qrImage);
      setCfOrderId(res.cfOrderId);
      setNote("Waiting for the payment…");
      if (timer.current) clearInterval(timer.current);
      timer.current = setInterval(() => void check(res.cfOrderId, true), 5000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create the payment QR.");
      setOpen(false);
    }
    setLoading(false);
  }

  async function check(id: string, silent = false) {
    try {
      const verdict = await verifyCashfreePayment({ data: { cfOrderId: id } });
      if (verdict.status === "SUCCESS") {
        if (timer.current) clearInterval(timer.current);
        const { error } = await supabase
          .from("orders")
          .update({
            payment_status: "PAID",
            payment_mode: "ONLINE",
            gateway_reference_id: verdict.reference,
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId);
        if (error) {
          toast.error(error.message);
          return;
        }
        toast.success("Payment received online.");
        setOpen(false);
        onPaid();
        return;
      }
      setNote(verdict.status === "PENDING" ? "Payment pending — not received yet." : "Payment not received yet.");
      if (!silent) toast.error("Payment Pending / Not Received");
    } catch {
      if (!silent) toast.error("Could not check the payment right now.");
    }
  }

  function close() {
    if (timer.current) clearInterval(timer.current);
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => void start()}
        className="press mt-2 w-full rounded-xl border-2 border-primary py-2.5 text-sm font-bold text-primary"
      >
        Pay Online via UPI QR
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-2xl border border-border bg-card p-3 text-center">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Scan to pay</p>
      <p className="text-2xl font-black">₹{amount}</p>
      {loading || !qr ? (
        <p className="my-8 text-xs font-semibold text-muted-foreground">Creating a secure QR…</p>
      ) : (
        <img src={qr} alt="Secure UPI QR code for this order" className="mx-auto my-3 h-56 w-56 rounded-xl bg-white p-2" />
      )}
      <p className="text-xs font-semibold text-muted-foreground">{note}</p>
      <div className="mt-2 flex gap-2">
        <button onClick={close} className="press flex-1 rounded-xl border border-border py-2.5 text-sm font-bold">
          Close
        </button>
        <button
          onClick={() => cfOrderId && void check(cfOrderId)}
          disabled={!cfOrderId}
          className="press flex-1 rounded-xl bg-foreground py-2.5 text-sm font-bold text-background disabled:opacity-60"
        >
          Check payment
        </button>
      </div>
    </div>
  );
}
