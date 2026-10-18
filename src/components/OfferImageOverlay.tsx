export function OfferImageOverlay({
  stallName,
  offerPercent,
  offerLabel,
  offerPrice,
  mrp,
}: {
  stallName: string;
  offerPercent: number;
  offerLabel?: string | null | undefined;
  offerPrice?: number | undefined;
  mrp?: number | undefined;
}) {
  const salePrice = Number(offerPrice ?? 0);
  const originalPrice = Number(mrp ?? 0);
  const offer =
    offerLabel?.trim() ||
    (offerPercent > 0
      ? `${offerPercent}% OFF`
      : originalPrice > salePrice
        ? `SAVE ₹${Math.round(originalPrice - salePrice)}`
        : "");
  if (!offer) return null;
  return (
    <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-1 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-2 pb-2 pt-7">
      <span className="max-w-[62%] truncate rounded-full bg-primary px-2 py-1 text-[8px] font-black uppercase tracking-wide text-primary-foreground shadow">
        {offer}
      </span>
      <span className="max-w-[48%] truncate rounded-full border border-white/40 bg-black/35 px-2 py-1 text-[8px] font-bold text-white">
        {stallName}
      </span>
    </span>
  );
}
