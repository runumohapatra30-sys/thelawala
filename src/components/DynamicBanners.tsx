import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { listDynamicBanners, type DynamicBanner } from "@/lib/dynamicBanners";

export function DynamicBanners() {
  const [rows, setRows] = useState<DynamicBanner[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    listDynamicBanners(true).then(setRows);
  }, []);

  if (rows.length === 0) return null;

  function open(b: DynamicBanner) {
    const route = (b.target_route ?? "").trim();
    if (!route) return;
    if (/^https?:\/\//.test(route)) {
      window.open(route, "_blank", "noopener");
      return;
    }
    navigate({ to: route as string }).catch(() => {
      window.location.href = route;
    });
  }

  return (
    <section className="space-y-3 px-5 pt-5">
      {rows.map((b) => (
        <button
          key={b.id}
          type="button"
          onClick={() => open(b)}
          aria-label="Offer banner"
          className="block w-full overflow-hidden shadow-[0_16px_34px_-22px_rgba(15,23,42,0.6)]"
          style={{
            height: `${b.height_px}px`,
            aspectRatio: b.aspect_ratio || undefined,
            borderRadius: `${b.border_radius}px`,
          }}
        >
          {b.media_type === "video" ? (
            <video
              src={b.media_url}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              controls={false}
              disablePictureInPicture
              controlsList="nodownload noplaybackrate noremoteplayback"
              className="h-full w-full object-cover [&::-webkit-media-controls]:hidden"
            />
          ) : (
            <img
              src={b.media_url}
              alt="Offer"
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          )}
        </button>
      ))}
    </section>
  );
}
