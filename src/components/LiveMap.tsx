import { useEffect, useRef, useState } from "react";
import type { LatLng } from "@/lib/types";
import { fetchRoute } from "@/lib/geo";

type Props = {
  from: LatLng;
  to: LatLng;
  rider?: LatLng | null;
  fromKind?: "stall" | "rider";
  onEta?: (min: number, km: number) => void;
  className?: string;
};

const stallIcon = `<svg viewBox="0 0 24 24" width="34" height="34" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="11" fill="#fff" stroke="#EBECEF"/><path d="M5 10l1.4-3.2A1 1 0 017.3 6h9.4a1 1 0 01.9.8L19 10v1a2 2 0 01-2 2H7a2 2 0 01-2-2v-1z" fill="#F97316"/><rect x="7" y="13" width="10" height="5" rx="1" fill="#FDBA74"/></svg>`;
const dropIcon = `<svg viewBox="0 0 24 24" width="34" height="34" xmlns="http://www.w3.org/2000/svg"><path d="M12 22s7-6.3 7-12A7 7 0 105 10c0 5.7 7 12 7 12z" fill="#E11D48"/><circle cx="12" cy="10" r="2.7" fill="#fff"/></svg>`;
const riderIcon = `<svg viewBox="0 0 24 24" width="34" height="34" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="11" fill="#0C831F"/><circle cx="8" cy="16" r="2.3" fill="#fff"/><circle cx="17" cy="16" r="2.3" fill="#fff"/><path d="M6 15l3-5h4l2 5" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M13 8h3l1 3" stroke="#F8CB46" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>`;

export function LiveMap({ from, to, rider, fromKind = "stall", onEta, className }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const riderMarkerRef = useRef<any>(null);
  const lineRef = useRef<any>(null);
  const animRef = useRef<number | null>(null);
  const etaRef = useRef(onEta);
  etaRef.current = onEta;
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let cleanup = () => {};

    (async () => {
      try {
        const L = (await import("leaflet")).default;
        await import("leaflet/dist/leaflet.css");
        if (cancelled || !ref.current) return;

        const map = L.map(ref.current, { zoomControl: false, attributionControl: false }).setView(
          [from.lat, from.lng],
          14,
        );
        mapRef.current = map;
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "© OpenStreetMap",
        }).addTo(map);

        const icon = (html: string) =>
          L.divIcon({ html, className: "", iconSize: [34, 34], iconAnchor: [17, 30] });
        leafletRef.current = { L, icon };

        L.marker([from.lat, from.lng], { icon: icon(fromKind === "stall" ? stallIcon : riderIcon) }).addTo(map);
        L.marker([to.lat, to.lng], { icon: icon(dropIcon) }).addTo(map);

        if (rider) {
          riderMarkerRef.current = L.marker([rider.lat, rider.lng], { icon: icon(riderIcon) }).addTo(map);
        }

        const route = await fetchRoute(rider ?? from, to);
        if (cancelled) return;
        const line = L.polyline(route.coords, { color: "#0066FF", weight: 5, opacity: 0.9 }).addTo(map);
        lineRef.current = line;
        map.fitBounds(line.getBounds(), { padding: [30, 30] });
        etaRef.current?.(route.durationMin, route.distanceKm);

        cleanup = () => map.remove();
      } catch {
        if (!cancelled) setError("Map is offline right now. Route details are still shown below.");
      }
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from.lat, from.lng, to.lat, to.lng]);

  // Live rider movement: glide the marker and redraw the remaining route.
  useEffect(() => {
    if (!rider) return;
    const map = mapRef.current;
    const kit = leafletRef.current;
    if (!map || !kit) return;

    if (!riderMarkerRef.current) {
      riderMarkerRef.current = kit.L.marker([rider.lat, rider.lng], { icon: kit.icon(riderIcon) }).addTo(map);
    } else {
      const start = riderMarkerRef.current.getLatLng();
      const t0 = performance.now();
      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / 900);
        riderMarkerRef.current.setLatLng([
          start.lat + (rider.lat - start.lat) * p,
          start.lng + (rider.lng - start.lng) * p,
        ]);
        if (p < 1) animRef.current = requestAnimationFrame(step);
      };
      if (animRef.current) cancelAnimationFrame(animRef.current);
      animRef.current = requestAnimationFrame(step);
    }

    let cancelled = false;
    (async () => {
      try {
        const route = await fetchRoute({ lat: rider.lat, lng: rider.lng }, to);
        if (cancelled || !lineRef.current) return;
        lineRef.current.setLatLngs(route.coords);
        etaRef.current?.(route.durationMin, route.distanceKm);
        map.panTo([rider.lat, rider.lng], { animate: true, duration: 0.8 });
      } catch {
        /* keep last route */
      }
    })();

    return () => {
      cancelled = true;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rider?.lat, rider?.lng, to.lat, to.lng]);

  if (error) {
    return (
      <div className={className}>
        <div className="flex h-full items-center justify-center rounded-2xl bg-muted p-4 text-center text-sm text-muted-foreground">
          {error}
        </div>
      </div>
    );
  }
  return <div ref={ref} className={className} />;
}
