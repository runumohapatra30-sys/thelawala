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

const stallIcon = `<svg viewBox="0 0 40 40" width="40" height="40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="18" r="14" fill="#fff" stroke="#0F5132" stroke-width="2"/><path d="M11 17l2.2-5.2c.2-.5.7-.8 1.2-.8h11.2c.6 0 1.1.3 1.3.9L29 17v1.2c0 1.5-1.2 2.8-2.8 2.8H13.8c-1.5 0-2.8-1.2-2.8-2.8V17z" fill="#0F5132"/><path d="M14 22h12v6H14z" fill="#E6F0EA" stroke="#0F5132" stroke-width="1.5"/><path d="M17 25h6" stroke="#0F5132" stroke-width="1.5" stroke-linecap="round"/></svg>`;
const dropIcon = `<svg viewBox="0 0 40 40" width="40" height="40" xmlns="http://www.w3.org/2000/svg"><path d="M20 37S7 25.7 7 16.8a13 13 0 1126 0C33 25.7 20 37 20 37z" fill="#2563EB" stroke="#fff" stroke-width="2"/><circle cx="20" cy="16.5" r="4.3" fill="#fff"/></svg>`;
const riderIcon = (heading: number) => `<div style="width:40px;height:40px;transform:rotate(${heading}deg);filter:drop-shadow(0 3px 4px rgba(15,81,50,.28));transform-origin:20px 20px"><svg viewBox="0 0 40 40" width="40" height="40" xmlns="http://www.w3.org/2000/svg"><path d="M20 2.5c8.3 0 15 6.7 15 15 0 10.8-15 20-15 20S5 28.3 5 17.5c0-8.3 6.7-15 15-15z" fill="#0F5132" stroke="#fff" stroke-width="2"/><circle cx="20" cy="17" r="9.5" fill="#fff"/><circle cx="15.5" cy="25.5" r="2.4" fill="#0F5132"/><circle cx="25.5" cy="25.5" r="2.4" fill="#0F5132"/><path d="M15.5 24.7l3.1-5.8h4l3.1 5.8M20 18.9l2.2-4.2h3.4" fill="none" stroke="#0F5132" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M20.2 12.8c1.1-2.1 3.3-3.1 5.7-2.6" fill="none" stroke="#F59E0B" stroke-width="1.8" stroke-linecap="round"/></svg></div>`;

function bearing(from: LatLng, to: LatLng) {
  const lat = (Math.PI / 180) * (to.lat - from.lat);
  const lng = (Math.PI / 180) * (to.lng - from.lng);
  return (Math.atan2(lng * Math.cos((to.lat * Math.PI) / 180), lat) * 180) / Math.PI;
}

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
          subdomains: "abc",
          attribution: "© OpenStreetMap contributors",
        }).addTo(map);

        const icon = (html: string) =>
          L.divIcon({ html, className: "delivery-map-marker", iconSize: [40, 40], iconAnchor: [20, 35] });
        leafletRef.current = { L, icon };

        const initialPoint = rider ?? from;
        L.marker([from.lat, from.lng], { icon: icon(fromKind === "stall" ? stallIcon : riderIcon(bearing(initialPoint, to))) }).addTo(map);
        L.marker([to.lat, to.lng], { icon: icon(dropIcon) }).addTo(map);

        if (rider) {
          riderMarkerRef.current = L.marker([rider.lat, rider.lng], { icon: icon(riderIcon(bearing(rider, to))) }).addTo(map);
        }

        const route = await fetchRoute(rider ?? from, to);
        if (cancelled) return;
        L.polyline(route.coords, {
          color: "#BFDBFE",
          weight: 10,
          opacity: 0.8,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(map);
        const line = L.polyline(route.coords, {
          color: "#2563EB",
          weight: 5,
          opacity: 0.98,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(map);
        lineRef.current = line;
        map.fitBounds(line.getBounds(), { padding: [30, 30] });
        etaRef.current?.(route.durationMin, route.distanceKm);

        setTimeout(() => map.invalidateSize(), 200);
        setReady((n) => n + 1);
        cleanup = () => {
          mapRef.current = null;
          leafletRef.current = null;
          riderMarkerRef.current = null;
          lineRef.current = null;
          map.remove();
        };
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
      riderMarkerRef.current = kit.L.marker([rider.lat, rider.lng], { icon: kit.icon(riderIcon(bearing(rider, to))) }).addTo(map);
    } else {
      riderMarkerRef.current.setIcon(kit.icon(riderIcon(bearing(rider, to))));
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
  }, [rider?.lat, rider?.lng, to.lat, to.lng, ready]);

  if (error) {
    return (
      <div className={className}>
        <div className="flex h-full items-center justify-center rounded-2xl bg-muted p-4 text-center text-sm text-muted-foreground">
          {error}
        </div>
      </div>
    );
  }
  return (
    <div className={className}>
      <div ref={ref} className="h-full w-full" />
    </div>
  );
}
