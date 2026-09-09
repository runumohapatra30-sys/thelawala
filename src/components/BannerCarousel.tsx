import { useEffect, useState } from "react";
import { listBanners, type Banner } from "@/lib/marketing";

type Props = {
  onCategory: (categoryId: string) => void;
  onVendor: (vendorId: string) => void;
};

export function BannerCarousel({ onCategory, onVendor }: Props) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [i, setI] = useState(0);

  useEffect(() => {
    listBanners(true).then(setBanners);
  }, []);

  useEffect(() => {
    if (banners.length < 2) return;
    const t = setInterval(() => setI((n) => (n + 1) % banners.length), 4000);
    return () => clearInterval(t);
  }, [banners.length]);

  if (banners.length === 0) return null;

  function tap(b: Banner) {
    if (b.target_type === "CATEGORY" && b.category_id) onCategory(b.category_id);
    if (b.target_type === "STALL" && b.vendor_id) onVendor(b.vendor_id);
  }

  return (
    <section className="px-5 pt-5">
      <div className="relative overflow-hidden rounded-[1.6rem] shadow-[0_16px_34px_-22px_rgba(15,23,42,0.6)]">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${i * 100}%)` }}
        >
          {banners.map((b) => (
            <button
              key={b.id}
              onClick={() => tap(b)}
              className="w-full shrink-0"
              aria-label="Offer banner"
            >
              <img src={b.image_url} alt="Offer" loading="lazy" className="aspect-[3/1] w-full object-cover" />
            </button>
          ))}
        </div>
        {banners.length > 1 ? (
          <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
            {banners.map((b, n) => (
              <span
                key={b.id}
                className={`h-1.5 rounded-full transition-all ${n === i ? "w-4 bg-white" : "w-1.5 bg-white/60"}`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
