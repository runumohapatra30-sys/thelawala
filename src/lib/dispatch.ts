import { supabase } from "@/integrations/supabase/client";

/**
 * Offers an order to the nearest on-duty, free delivery partner. The matching runs on
 * the database (security definer) so it can see every partner and every waiting order,
 * which client-side row rules would otherwise hide.
 */
export async function offerToNearestPartner(orderId: string) {
  const { data, error } = await supabase.rpc("dispatch_order", { _order_id: orderId });
  if (error) {
    console.error("dispatch_order failed", error);
    return null;
  }
  return (data as string | null) ?? null;
}

export async function rejectOffer(orderId: string, partnerId: string, rejected: string[]) {
  await supabase
    .from("orders")
    .update({ rejected_partner_ids: [...rejected, partnerId], offered_to: null, offer_expires_at: null })
    .eq("id", orderId);
  await offerToNearestPartner(orderId);
}

/**
 * Re-offers every order that is still waiting for a rider, including ones whose earlier
 * offer ran out. Called from an on-duty partner's app on each poll.
 */
export async function sweepSearchingOrders(_partnerId?: string, _zones?: string[]) {
  const { error } = await supabase.rpc("sweep_dispatch");
  if (error) console.error("sweep_dispatch failed", error);
}
