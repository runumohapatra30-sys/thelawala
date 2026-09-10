import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useFestivePhotos, type FestivePhoto } from "@/lib/festivePhotos";

/** Auto-rotating festive photo strip an admin arranges in the Administration panel. */
export function FestivePhotoStrip({ photos }: { photos?: FestivePhoto[] }) {
  const live = useFestivePhotos();
  const rows = photos ?? live;
  const [n, setN] = useState(0);

  useEffect(() => {
    if (rows.length < 2) return;
    const t = window.setInterval(() => setN((v) => (v + 1) % rows.length), 4000);
    return () => window.clearInterval(t);
  }, [rows.length]);

  useEffect(() => {
    if (n >= rows.length) setN(0);
  }, [rows.length, n]);

  if (rows.length === 0) return null;
  const current = rows[Math.min(n, rows.length - 1)]!;
  const ratio = current.size_mode === "COMPACT" ? "aspect-[4/1]" : "aspect-[16/9]";

  const picture = (
    <img
      key={current.id}
      src={current.image_url}
      alt="Festive offer"
      loading="lazy"
      className={`fade-swap block w-full ${ratio} rounded-2xl object-cover`}
    />
  );

  return (
    <section className="px-5">
      <div className="overflow-hidden rounded-2xl bg-muted shadow-sm">
        {current.link_url ? (
          current.link_url.startsWith("http") ? (
            <a href={current.link_url} target="_blank" rel="noreferrer" className="press block">{picture}</a>
          ) : (
            <Link to={current.link_url} className="press block">{picture}</Link>
          )
        ) : (
          picture
        )}
      </div>
      {rows.length > 1 ? (
        <div className="mt-2 flex justify-center gap-1.5">
          {rows.map((p, i) => (
            <button
              key={p.id}
              aria-label={`Show photo ${i + 1}`}
              onClick={() => setN(i)}
              className={`h-1.5 rounded-full transition-all ${i === n ? "w-5 bg-primary" : "w-1.5 bg-border"}`}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
