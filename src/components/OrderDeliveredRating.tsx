import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import riderArt from "@/assets/rating-rider.png";

const TIPS = [10, 20, 30];

/** Bright ThelaWala-yellow thank-you and rating card shown once an order is delivered. */
export function OrderDeliveredRating({
  orderId, userId, vendorId, partnerId, riderName, stallName, deliveredAt, onDone,
}: {
  orderId: string;
  userId: string | undefined;
  vendorId: string;
  partnerId: string | null;
  riderName: string;
  stallName: string;
  deliveredAt: string | null;
  onDone: () => void;
}) {
  const [stars, setStars] = useState(0);
  const [foodStars, setFoodStars] = useState(0);
  const [tip, setTip] = useState<number | null>(null);
  const [review, setReview] = useState("");
  const [busy, setBusy] = useState(false);

  const time = deliveredAt
    ? new Date(deliveredAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : "just now";

  async function submit() {
    if (!userId || !stars) { toast.error("Please pick a star rating."); return; }
    setBusy(true);
    const { error } = await supabase.from("order_ratings").insert({
      order_id: orderId,
      user_id: userId,
      vendor_id: vendorId,
      partner_id: partnerId,
      delivery_stars: stars,
      food_stars: foodStars || stars,
      review: review.trim() || null,
    });
    if (!error && tip) {
      await supabase.from("orders").update({ tip_amount: tip }).eq("id", orderId);
    }
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Thanks for rating!");
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#FACC15]">
      <div className="mx-auto flex min-h-full w-full max-w-[480px] flex-col px-4 pb-6 pt-8 text-neutral-900">
        <div className="mx-auto rounded-full bg-white/70 px-4 py-1.5 text-xs font-black">
          ✓ Delivered at {time} · {stallName}
        </div>

        <img
          src={riderArt}
          alt="ThelaWala delivery partner"
          width={816}
          height={816}
          loading="lazy"
          className="mx-auto mt-2 h-52 w-52 object-contain drop-shadow"
        />

        <h1 className="text-center text-2xl font-black leading-tight">Order delivered!</h1>
        <p className="mt-1 text-center text-sm font-semibold opacity-80">
          Hope every bite was worth the wait.
        </p>

        <div className="mt-4 rounded-3xl bg-white p-4 shadow-lg">
          <p className="text-center text-sm font-black">
            How would you rate your delivery?
          </p>
          <p className="mt-0.5 text-center text-[11px] font-semibold text-neutral-500">
            by your hunger saviour {riderName}
          </p>

          <Stars value={stars} onChange={setStars} />

          <p className="mt-3 text-center text-xs font-black">And the food from {stallName}?</p>
          <Stars value={foodStars} onChange={setFoodStars} />

          <p className="mt-4 text-center text-xs font-black">Add a tip for {riderName}</p>
          <div className="mt-2 flex justify-center gap-2">
            {TIPS.map((t) => (
              <button
                key={t}
                onClick={() => setTip(tip === t ? null : t)}
                className={`rounded-full border-2 px-4 py-1.5 text-sm font-black ${
                  tip === t ? "border-amber-500 bg-amber-100 text-amber-700" : "border-neutral-200 text-neutral-600"
                }`}
              >
                ₹{t}
              </button>
            ))}
          </div>

          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            rows={2}
            placeholder="Tell us anything else (optional)"
            className="mt-3 w-full rounded-2xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-amber-500"
          />

          <button
            onClick={submit}
            disabled={busy}
            className="press mt-3 w-full rounded-2xl bg-amber-500 py-3 text-sm font-black text-white disabled:opacity-50"
          >
            {busy ? "Saving…" : "Submit rating"}
          </button>
          <button onClick={onDone} className="mt-2 w-full py-2 text-xs font-bold text-neutral-500">
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

function Stars({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="mt-2 flex justify-center gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} onClick={() => onChange(n)} aria-label={`${n} star`} className="press">
          <svg viewBox="0 0 24 24" className={`h-9 w-9 ${n <= value ? "fill-amber-400 stroke-amber-500" : "fill-neutral-100 stroke-neutral-300"}`} strokeWidth="1.5">
            <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5z" strokeLinejoin="round" />
          </svg>
        </button>
      ))}
    </div>
  );
}
