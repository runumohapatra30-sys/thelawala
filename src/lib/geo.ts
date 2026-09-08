import type { LatLng, Zone } from "./types";

/** Square-ish polygon around a centre point (approx. `r` degrees). */
function boxAround(c: LatLng, r = 0.012): [number, number][] {
  return [
    [c.lat + r, c.lng - r],
    [c.lat + r, c.lng + r],
    [c.lat - r, c.lng + r],
    [c.lat - r, c.lng - r],
  ];
}

export const ZONES: Zone[] = [
  { id: "dumduma", name: "DumDuma", center: { lat: 20.2458, lng: 85.7892 }, polygon: boxAround({ lat: 20.2458, lng: 85.7892 }) },
  { id: "khandagiri", name: "Khandagiri", center: { lat: 20.2602, lng: 85.7884 }, polygon: boxAround({ lat: 20.2602, lng: 85.7884 }) },
  { id: "aiims", name: "AIIMS Bhubaneswar", center: { lat: 20.2312, lng: 85.7766 }, polygon: boxAround({ lat: 20.2312, lng: 85.7766 }) },
  { id: "patrapada", name: "Patrapada", center: { lat: 20.2497, lng: 85.7661 }, polygon: boxAround({ lat: 20.2497, lng: 85.7661 }) },
];

/** Ray-casting point-in-polygon test. */
export function pointInPolygon(p: LatLng, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [yi, xi] = polygon[i]!;
    const [yj, xj] = polygon[j]!;
    const intersect =
      yi > p.lat !== yj > p.lat && p.lng < ((xj - xi) * (p.lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function zoneForPoint(p: LatLng): Zone | null {
  return ZONES.find((z) => pointInPolygon(p, z.polygon)) ?? null;
}

export type RouteResult = { coords: [number, number][]; durationMin: number; distanceKm: number };

const routeCache = new Map<string, RouteResult>();

/** Free OSRM driving route. Falls back to a straight line when offline / rate-limited. */
export async function fetchRoute(from: LatLng, to: LatLng): Promise<RouteResult> {
  const key = `${from.lat},${from.lng}-${to.lat},${to.lng}`;
  const cached = routeCache.get(key);
  if (cached) return cached;

  const fallback: RouteResult = {
    coords: [
      [from.lat, from.lng],
      [to.lat, to.lng],
    ],
    durationMin: Math.max(6, Math.round(haversineKm(from, to) * 4)) + 5,
    distanceKm: Number(haversineKm(from, to).toFixed(2)),
  };

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OSRM ${res.status}`);
    const json = (await res.json()) as {
      routes?: { duration: number; distance: number; geometry: { coordinates: [number, number][] } }[];
    };
    const route = json.routes?.[0];
    if (!route) throw new Error("no route");
    const result: RouteResult = {
      coords: route.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]),
      durationMin: Math.ceil(route.duration / 60) + 5,
      distanceKm: Number((route.distance / 1000).toFixed(2)),
    };
    routeCache.set(key, result);
    return result;
  } catch {
    routeCache.set(key, fallback);
    return fallback;
  }
}

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Free reverse geocoding via OpenStreetMap Nominatim. */
export async function reverseGeocode(p: LatLng): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${p.lat}&lon=${p.lng}`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { display_name?: string };
    return json.display_name ?? null;
  } catch {
    return null;
  }
}
