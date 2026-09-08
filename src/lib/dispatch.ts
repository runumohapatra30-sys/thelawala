import { supabase } from "@/integrations/supabase/client";
import { haversineKm } from "@/lib/fees";

/**
 * Offers an order to the nearest available delivery partner who has not already
 * rejected it. Returns the partner id it was offered to, or null when nobody is free.
 */
export async function offerToNearestPartner(orderId: string) {
  const { data: order } = await supabase
    .from("orders")
    .select("id,vendor_id,rejected_partner_ids,partner_id")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || order.partner_id) return null;

  const { data: vendor } = await supabase
    .from("vendors")
    .select("lat,lng")
    .eq("id", order.vendor_id)
    .maybeSingle();
  if (!vendor) return null;

  const { data: partners } = await supabase
    .from("delivery_partners")
    .select("id,lat,lng")
    .eq("status", "APPROVED")
    .eq("is_online", true)
    .eq("is_busy", false);

  const rejected = order.rejected_partner_ids ?? [];
  const candidates = (partners ?? [])
    .filter((p) => !rejected.includes(p.id))
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
    await supabase.from("orders").update({ offered_to: null, offer_expires_at: null }).eq("id", orderId);
    return null;
  }

  await supabase
    .from("orders")
    .update({
      offered_to: next.id,
      offer_expires_at: new Date(Date.now() + 45_000).toISOString(),
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
