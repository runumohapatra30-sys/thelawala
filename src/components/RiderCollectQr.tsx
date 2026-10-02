import { useEffect, useState } from "react";
import { Lock, Loader2, RefreshCw } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { inr } from "@/lib/fees";
import { createCashfreeCollectSession } from "@/lib/cashfree.functions";

type Props = { orderId: string; orderCode: string; amount: number };

/**
 * Cashfree-backed UPI collect QR for COD trips. On open it creates a real
 * Cashfree order and renders the payment link / UPI intent as a QR. The QR
 * stays blurred until the delivery partner taps it, so it is only shown
 * face-to-face at the door. No placeholder UPI ID is ever rendered — if
 * Cashfree cannot create the payment, the partner is told to collect cash.
 */
export function RiderCollectQr({ orderId, orderCode, amount }: Props) {
  const [revealed, setRevealed] = useState(false);
  const [payUrl, setPayUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setFailed(false);
    try {
      const session = await createCashfreeCollectSession({
        data: { amount, orderId },
      });
      const url = (session.paymentLink ?? "").trim();
      if (!url) throw new Error("No payment link returned");
      setPayUrl(url);
    } catch {
      setPayUrl(null);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, amount]);

  return (
    <div className="mt-2 rounded-2xl border-2 border-primary bg-card p-4 text-center">
      <p className="text-base font-black text-primary">Collect {inr(amount)}</p>
      <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
        Customer scans this QR with any UPI app
      </p>

      <div className="relative mx-auto mt-3 grid h-48 w-48 place-items-center overflow-hidden rounded-xl bg-muted">
        {loading ? (
          <span className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-7 w-7 animate-spin" />
            <span className="text-xs font-bold">Generating payment QR…</span>
          </span>
        ) : failed || !payUrl ? (
          <span className="flex flex-col items-center gap-2 px-4 text-muted-foreground">
            <span className="text-xs font-bold">Could not generate the QR right now. Please collect cash.</span>
            <button
              type="button"
              onClick={() => void load()}
              className="press inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[11px] font-black text-primary-foreground"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Try again
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="press relative block rounded-xl bg-white p-2"
            aria-label={revealed ? "Payment QR code" : "Tap to show payment QR code"}
          >
            <span className={`block transition-all duration-300 ${revealed ? "" : "scale-105 blur-md"}`}>
              <QRCodeCanvas value={payUrl} size={176} includeMargin={false} />
            </span>
            {!revealed ? (
              <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 rounded-xl bg-primary/55 text-primary-foreground">
                <Lock className="h-6 w-6" />
                <span className="text-xs font-black">Tap to show QR</span>
              </span>
            ) : null}
          </button>
        )}
      </div>

      <p className="mt-2 text-[11px] font-bold text-primary">Order #{orderCode}</p>
    </div>
  );
}
