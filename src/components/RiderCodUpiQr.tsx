import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PLATFORM_UPI, PLATFORM_UPI_NAME } from "@/components/CashSettlement";

type Props = { orderId: string; amount: number; onPaid: () => void };

/** Lets the delivery partner take a UPI payment at the door for a cash order. */
export function RiderCodUpiQr({ orderId, amount, onPaid }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const upiLink = `upi://pay?pa=${PLATFORM_UPI}&pn=${encodeURIComponent(PLATFORM_UPI_NAME)}&am=${amount}&cu=INR&tn=${encodeURIComponent(
    `Order payment`,
  )}`;
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiLink)}`;

  async function markPaid() {
    setBusy(true);
    const { error } = await supabase
      .from("orders")
      .update({ payment_status: "PAID", payment_mode: "ONLINE", updated_at: new Date().toISOString() })
      .eq("id", orderId);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Marked as paid online.");
    setOpen(false);
    onPaid();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
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
      <img src={qr} alt="UPI QR code for this order" className="mx-auto my-3 h-56 w-56 rounded-xl bg-white p-2" />
      <p className="text-xs font-semibold">{PLATFORM_UPI}</p>
      <a href={upiLink} className="press mt-3 block rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground">
        Open UPI app
      </a>
      <div className="mt-2 flex gap-2">
        <button onClick={() => setOpen(false)} className="press flex-1 rounded-xl border border-border py-2.5 text-sm font-bold">
          Close
        </button>
        <button
          onClick={markPaid}
          disabled={busy}
          className="press flex-1 rounded-xl bg-foreground py-2.5 text-sm font-bold text-background disabled:opacity-60"
        >
          {busy ? "Saving…" : "Payment received"}
        </button>
      </div>
    </div>
  );
}
