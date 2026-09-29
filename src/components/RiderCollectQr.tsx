import { useState } from "react";
import { Lock } from "lucide-react";
import { inr } from "@/lib/fees";

type Props = { orderId: string; orderCode: string; amount: number };

/**
 * Static UPI collect QR for COD trips. The QR stays blurred until the
 * delivery partner taps it, so it is only shown face-to-face at the door.
 * The customer can pay with any UPI app; the partner then confirms cash/UPI
 * received through the normal delivery flow.
 */
export function RiderCollectQr({ orderId, orderCode, amount }: Props) {
  const [revealed, setRevealed] = useState(false);
  const upi = `upi://pay?pa=thelawala@cashfree&pn=ThelaWala&am=${amount}&tr=${orderId}&cu=INR`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upi)}`;

  return (
    <div className="mt-2 rounded-2xl border-2 border-primary bg-card p-4 text-center">
      <p className="text-base font-black text-primary">Collect {inr(amount)}</p>
      <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
        Customer scans this QR with any UPI app
      </p>

      <button
        type="button"
        onClick={() => setRevealed(true)}
        className="press relative mx-auto mt-3 block overflow-hidden rounded-xl bg-muted p-2"
        aria-label={revealed ? "Payment QR code" : "Tap to show payment QR code"}
      >
        <img
          src={qrUrl}
          alt="Scan to pay"
          className={`h-44 w-44 transition-all duration-300 ${revealed ? "" : "scale-105 blur-md"}`}
          loading="lazy"
        />
        {!revealed ? (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 rounded-xl bg-primary/55 text-primary-foreground">
            <Lock className="h-6 w-6" />
            <span className="text-xs font-black">Tap to show QR</span>
          </span>
        ) : null}
      </button>

      <p className="mt-2 text-[11px] font-bold text-primary">Order #{orderCode}</p>
    </div>
  );
}
