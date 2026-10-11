import { useEffect, useRef, useState } from "react";
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import L, { type LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
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

const mapIcon = (kind: "stall" | "home" | "rider", heading = 0) => {
  const content =
    kind === "rider"
      ? `<span class="tw-rider-marker" style="transform:rotate(${heading}deg);display:block;width:42px;height:42px"><svg viewBox="0 0 42 42" width="42" height="42" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="12" y="2" width="18" height="11" rx="3" fill="#F9C846" stroke="#A87912" stroke-width="1.5"/><path d="M15 6h12M15 9h12" stroke="#FFF4C1" stroke-width="1.2" stroke-linecap="round"/><path d="M21 14v13" stroke="#374151" stroke-width="3.5" stroke-linecap="round"/><path d="M12 15h18M15 15l-4 4M27 15l4 4" fill="none" stroke="#374151" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="21" cy="19" r="6.2" fill="#FF784F" stroke="#9D3C25" stroke-width="1.5"/><path d="M16 18a5 5 0 0 1 10 0" fill="#D9482B"/><path d="M18.5 19.5h5" stroke="#FFE4D8" stroke-width="1.2" stroke-linecap="round"/><path d="M15 27h12l2.5 5H12.5l2.5-5Z" fill="#FF5A1F" stroke="#A83B18" stroke-width="1.5" stroke-linejoin="round"/><circle cx="15" cy="35" r="3" fill="#374151"/><circle cx="27" cy="35" r="3" fill="#374151"/><path d="M15 35h12" stroke="#E5E7EB" stroke-width="1.4"/></svg></span>`
      : kind === "stall"
        ? `<span class="tw-map-pin tw-map-pin-stall"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 10h18l-1.5-6h-15L3 10Z" fill="#FF5A1F"/><path d="M5 10v10h14V10M9 20v-6h6v6M4 10c0 2 3 2 3 0 0 2 3 2 3 0 0 2 3 2 3 0 0 2 3 2 3 0 0 2 3 2 3 0" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`
        : `<span class="tw-map-pin tw-map-pin-home"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1v-9Z" fill="#fff" stroke="#16803C" stroke-width="1.8" stroke-linejoin="round"/></svg></span>`;
  return L.divIcon({
    html: content,
    className: `tw-map-icon tw-map-icon-${kind}`,
    iconSize: kind === "rider" ? [42, 42] : [42, 50],
    iconAnchor: kind === "rider" ? [21, 21] : [21, 47],
  });
};

function bearing(from: LatLng, to: LatLng) {
  const lat = ((to.lat - from.lat) * Math.PI) / 180;
  const lng = ((to.lng - from.lng) * Math.PI) / 180;
  return (Math.atan2(lng * Math.cos((to.lat * Math.PI) / 180), lat) * 180) / Math.PI;
}

function MapRoute({
  from,
  to,
  onRoute,
  onEta,
}: {
  from: LatLng;
  to: LatLng;
  onRoute: (coords: [number, number][]) => void;
  onEta?: (min: number, km: number) => void;
}) {
  const map = useMap();
  const hasFitted = useRef(false);
  const onEtaRef = useRef(onEta);
  onEtaRef.current = onEta;
  const fromLat = from.lat;
  const fromLng = from.lng;
  const toLat = to.lat;
  const toLng = to.lng;

  useEffect(() => {
    let alive = true;
    const start = { lat: fromLat, lng: fromLng };
    void fetchRoute(start, { lat: toLat, lng: toLng }).then((route) => {
      if (!alive) return;
      onRoute(route.coords);
      onEtaRef.current?.(route.durationMin, route.distanceKm);
      if (!hasFitted.current) {
        const bounds = L.latLngBounds(
          route.coords.map(([lat, lng]) => L.latLng(lat, lng)),
        );
        map.fitBounds(bounds, { padding: [38, 38] });
        hasFitted.current = true;
      }
    });
    return () => {
      alive = false;
    };
  }, [fromLat, fromLng, toLat, toLng, map, onRoute]);

  return null;
}

export function LiveMapCanvas({
  from,
  to,
  rider = null,
  fromKind = "stall",
  onEta,
  className,
}: Props) {
  const [route, setRoute] = useState<[number, number][]>([]);
  const [animatedRider, setAnimatedRider] = useState<LatLng | null>(rider);
  const riderRef = useRef<LatLng | null>(rider);
  const riderLat = rider?.lat;
  const riderLng = rider?.lng;

  useEffect(() => {
    if (riderLat == null || riderLng == null) return;
    const target = { lat: riderLat, lng: riderLng };
    const start = riderRef.current ?? target;
    const began = performance.now();
    let frame = 0;
    const animate = (now: number) => {
      const progress = Math.min(1, (now - began) / 900);
      const position = {
        lat: start.lat + (target.lat - start.lat) * progress,
        lng: start.lng + (target.lng - start.lng) * progress,
      };
      riderRef.current = position;
      setAnimatedRider(position);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [riderLat, riderLng]);

  const riderHeading = animatedRider ? bearing(animatedRider, to) : bearing(from, to);
  const origin = fromKind === "stall" ? from : (rider ?? from);
  const routeCoordinates: LatLngExpression[] = route;

  return (
    <div className={className}>
      <MapContainer
        center={[from.lat, from.lng]}
        zoom={14}
        zoomControl={false}
        scrollWheelZoom={false}
        attributionControl
        className="h-full w-full !rounded-none"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <MapRoute
          from={from}
          to={to}
          onRoute={setRoute}
          {...(onEta ? { onEta } : {})}
        />
        {routeCoordinates.length > 1 ? (
          <>
            <Polyline
              positions={routeCoordinates}
              pathOptions={{
                color: "#FFFFFF",
                weight: 10,
                opacity: 0.9,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
            <Polyline
              positions={routeCoordinates}
              pathOptions={{
                color: "#FF8A65",
                weight: 4,
                opacity: 0.95,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          </>
        ) : null}
        <Marker position={[origin.lat, origin.lng]} icon={mapIcon(fromKind)} />
        <Marker position={[to.lat, to.lng]} icon={mapIcon("home")} />
        {animatedRider ? (
          <Marker
            position={[animatedRider.lat, animatedRider.lng]}
            icon={mapIcon("rider", riderHeading)}
            zIndexOffset={1000}
          />
        ) : null}
      </MapContainer>
    </div>
  );
}
