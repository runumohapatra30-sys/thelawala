import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import useEmblaCarousel from "embla-carousel-react";
import { listDynamicBanners, type DynamicBanner } from "@/lib/dynamicBanners";

export function DynamicBanners() {
  const [rows, setRows] = useState<DynamicBanner[]>([]);
  const [selected, setSelected] = useState(0);
  const navigate = useNavigate();
  const [emblaRef, embla] = useEmblaCarousel({ align: "center", loop: false, containScroll: false });

  useEffect(() => {
    listDynamicBanners(true).then(setRows);
  }, []);

  const onSelect = useCallback(() => {
    if (embla) setSelected(embla.selectedScrollSnap());
  }, [embla]);

  useEffect(() => {
    if (!embla) return;
    onSelect();
    embla.on("select", onSelect);
    embla.on("reInit", onSelect);
  }, [embla, onSelect]);

  useEffect(() => {
    if (!embla || rows.length < 2) return;
    const t = setInterval(() => {
      if (embla.canScrollNext()) embla.scrollNext();
      else embla.scrollTo(0);
    }, 4500);
    return () => clearInterval(t);
  }, [embla, rows.length]);

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
    <section className="pt-5">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-3 px-5">
          {rows.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => open(b)}
              aria-label="Offer banner"
              className="relative w-[88%] shrink-0 grow-0 basis-[88%] overflow-hidden rounded-2xl shadow-md"
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
        </div>
      </div>

      {rows.length > 1 ? (
        <div className="mt-2.5 flex items-center justify-center gap-1.5">
          {rows.map((b, i) => (
            <button
              key={b.id}
              type="button"
              aria-label={`Go to banner ${i + 1}`}
              onClick={() => embla?.scrollTo(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === selected ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
