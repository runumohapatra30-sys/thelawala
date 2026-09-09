import { useEffect, useState } from "react";
import { refreshDynamicAsset } from "@/lib/ai.functions";

type Asset = {
  id: string;
  title: string;
  subtitle?: string | null;
  banner_image_url: string;
  lottie_url?: string | null;
  ai_reason?: string | null;
};

/** AI-picked banner for the current time of day and Bhubaneswar weather. */
export function DynamicAssetBanner() {
  const [asset, setAsset] = useState<Asset | null>(null);

  useEffect(() => {
    let alive = true;
    refreshDynamicAsset()
      .then((r) => {
        if (alive && r && "active" in r && r.active) setAsset(r.active as Asset);
      })
      .catch(() => {
        /* banner is optional */
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!asset) return null;

  return (
    <section className="px-5 pt-4">
      <div className="relative overflow-hidden rounded-[1.6rem] shadow-[0_16px_34px_-22px_rgba(15,23,42,0.6)]">
        <img src={asset.banner_image_url} alt={asset.title} loading="lazy" className="aspect-[3/1] w-full object-cover" />
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/60 to-transparent p-4 text-white">
          <p className="text-sm font-black">{asset.title}</p>
          {asset.subtitle ? <p className="text-[11px] font-semibold opacity-90">{asset.subtitle}</p> : null}
        </div>
        {asset.lottie_url ? (
          <img src={asset.lottie_url} alt="" aria-hidden className="absolute right-3 top-3 h-12 w-12 object-contain" />
        ) : null}
      </div>
    </section>
  );
}
