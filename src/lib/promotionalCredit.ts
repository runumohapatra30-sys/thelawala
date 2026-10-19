import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PromotionalCredit = {
  is_enabled: boolean;
  credit_amount: number;
  daily_delivery_threshold: number;
  rolling_delivery_threshold: number;
  rolling_window_days: number;
};

export type PromotionalCreditResult = {
  settings: PromotionalCredit | null;
  eligible: boolean;
  loading: boolean;
  error: string | null;
};

type CustomerOrder = {
  status: string;
  created_at: string;
  delivered_at: string | null;
  cancelled_at: string | null;
};

export async function loadPromotionalCredit(userId: string): Promise<Pick<PromotionalCreditResult, "settings" | "eligible">> {
  const { data: settingsData, error: settingsError } = await supabase
    .from("promo_credit_settings")
    .select("is_enabled,credit_amount,daily_delivery_threshold,rolling_delivery_threshold,rolling_window_days")
    .eq("id", true)
    .maybeSingle();
  if (settingsError) throw settingsError;
  if (!settingsData) return { settings: null, eligible: false };

  const settings = settingsData as PromotionalCredit;
  if (!settings.is_enabled) return { settings, eligible: false };

  const now = new Date();
  const indiaNow = new Date(now.getTime() + 330 * 60 * 1000);
  const dayStart = new Date(Date.UTC(indiaNow.getUTCFullYear(), indiaNow.getUTCMonth(), indiaNow.getUTCDate()) - 330 * 60 * 1000);
  const rollingStart = new Date(now.getTime() - settings.rolling_window_days * 24 * 60 * 60 * 1000);
  const queryStart = dayStart < rollingStart ? dayStart : rollingStart;
  const { data: orderData, error: ordersError } = await supabase
    .from("orders")
    .select("status,created_at,delivered_at,cancelled_at")
    .eq("user_id", userId)
    .or(`created_at.gte.${queryStart.toISOString()},delivered_at.gte.${queryStart.toISOString()},cancelled_at.gte.${queryStart.toISOString()}`);
  if (ordersError) throw ordersError;

  const orders = (orderData ?? []) as CustomerOrder[];
  const deliveredWithin = (start: Date) => orders.filter((order) => {
    if (order.status !== "DELIVERED") return false;
    const deliveredAt = new Date(order.delivered_at ?? order.created_at);
    return deliveredAt >= start && deliveredAt <= now;
  }).length;
  const hasCancellationWithin = (start: Date) => orders.some((order) =>
    order.cancelled_at !== null && new Date(order.cancelled_at) >= start && new Date(order.cancelled_at) <= now,
  );

  const qualifiesToday =
    deliveredWithin(dayStart) >= settings.daily_delivery_threshold &&
    !hasCancellationWithin(dayStart);
  const qualifiesRolling =
    deliveredWithin(rollingStart) >= settings.rolling_delivery_threshold &&
    !hasCancellationWithin(rollingStart);

  return { settings, eligible: qualifiesToday || qualifiesRolling };
}

export function usePromotionalCredit(userId: string | undefined): PromotionalCreditResult {
  const [result, setResult] = useState<PromotionalCreditResult>({
    settings: null,
    eligible: false,
    loading: Boolean(userId),
    error: null,
  });

  useEffect(() => {
    if (!userId) {
      setResult({ settings: null, eligible: false, loading: false, error: null });
      return;
    }
    let alive = true;
    setResult((previous) => ({ ...previous, loading: true, error: null }));
    void loadPromotionalCredit(userId)
      .then((value) => {
        if (alive) setResult({ ...value, loading: false, error: null });
      })
      .catch((error: unknown) => {
        console.error("Could not check promotional cash eligibility:", error);
        if (alive) {
          setResult({
            settings: null,
            eligible: false,
            loading: false,
            error: "Could not check free-cash eligibility. Please try again.",
          });
        }
      });
    return () => { alive = false; };
  }, [userId]);

  return result;
}
