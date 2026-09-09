import { supabase } from "@/integrations/supabase/client";
import { haversineKm } from "@/lib/fees";

/**
 * Offers an order to the nearest on-duty, free delivery partner in the stall's zone
 * who has not already rejected it. Returns the partner id it was offered to, or null
 * when nobody is available — in that case the order stays in SEARCHING_RIDER.
 */
export async function offerToNearestPartner(orderId: string) {
  const { data: order } = await supabase
    .from("orders")
    .select("id,vendor_id,rejected_partner_ids,partner_id,status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || order.partner_id) return null;

  const { data: vendor } = await supabase
    .from("vendors")
    .select("lat,lng,zone")
    .eq("id", order.vendor_id)
    .maybeSingle();
  if (!vendor) return null;

  const { data: partners } = await supabase
    .from("delivery_partners")
    .select("id,lat,lng,assigned_zones")
    .eq("status", "APPROVED")
    .eq("is_online", true)
    .eq("is_busy", false);

  const zone = vendor.zone ?? null;
  const rejected = order.rejected_partner_ids ?? [];
  const candidates = (partners ?? [])
    .filter((p) => !rejected.includes(p.id))
    .filter((p) => {
      const zones = p.assigned_zones ?? [];
      return !zone || zones.length === 0 || zones.includes(zone);
    })
    .map((p) => ({
      id: p.id,
      km:
        p.lat != null && p.lng != null
          ? haversineKm({ lat: Number(p.lat), lng: Number(p.lng) }, { lat: Number(vendor.lat), lng: Number(vendor.lng) })
          : 999,
    }))
    .sort((a, b) => a.km - b.km);

  const next = candidates[0];
  if (!next) {
    // Nobody on duty in this zone — keep searching until a rider comes online.
    await supabase
      .from("orders")
      .update({ offered_to: null, offer_expires_at: null, status: "SEARCHING_RIDER" })
      .eq("id", orderId);
    return null;
  }

  await supabase
    .from("orders")
    .update({
      offered_to: next.id,
      offer_expires_at: new Date(Date.now() + 45_000).toISOString(),
      status: "SEARCHING_RIDER",
    })
    .eq("id", orderId);

  return next.id;
}

export async function rejectOffer(orderId: string, partnerId: string, rejected: string[]) {
  await supabase
    .from("orders")
    .update({ rejected_partner_ids: [...rejected, partnerId], offered_to: null, offer_expires_at: null })
    .eq("id", orderId);
  await offerToNearestPartner(orderId);
}

/**
 * Run by an on-duty partner's app: picks up any order still waiting for a rider in
 * one of their zones and re-runs dispatch for it. This is what makes an order reach
 * a rider who came online after the order was placed.
 */
export async function sweepSearchingOrders(partnerId: string, zones: string[]) {
  const { data: waiting } = await supabase
    .from("orders")
    .select("id,vendor_id,rejected_partner_ids,offer_expires_at,offered_to")
    .eq("status", "SEARCHING_RIDER")
    .is("partner_id", null)
    .order("created_at")
    .limit(10);
  if (!waiting || waiting.length === 0) return;

  const vendorIds = [...new Set(waiting.map((o) => o.vendor_id))];
  const { data: vendors } = await supabase.from("vendors").select("id,zone").in("id", vendorIds);
  const zoneOf = Object.fromEntries((vendors ?? []).map((v) => [v.id, v.zone]));

  for (const o of waiting) {
    const stale = !o.offered_to || (o.offer_expires_at ? new Date(o.offer_expires_at).getTime() < Date.now() : true);
    if (!stale) continue;
    const vz = zoneOf[o.vendor_id] ?? null;
    const mine = !vz || zones.length === 0 || zones.includes(vz);
    if (!mine) continue;
    if ((o.rejected_partner_ids ?? []).includes(partnerId)) continue;
    await offerToNearestPartner(o.id);
  }
}
