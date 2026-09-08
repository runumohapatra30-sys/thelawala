import { supabase } from "@/integrations/supabase/client";

export type Coupon = {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  min_order: number;
  max_discount: number | null;
  usage_limit: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
};

export function couponDiscount(c: Coupon, foodTotal: number) {
  if (c.discount_type === "PERCENT") {
    const raw = (foodTotal * Number(c.discount_value)) / 100;
    const capped = c.max_discount ? Math.min(raw, Number(c.max_discount)) : raw;
    return Math.round(Math.min(capped, foodTotal) * 100) / 100;
  }
  return Math.round(Math.min(Number(c.discount_value), foodTotal) * 100) / 100;
}

export async function findCoupon(code: string, foodTotal: number): Promise<{ coupon?: Coupon; error?: string }> {
  const clean = code.trim().toUpperCase();
  if (!clean) return { error: "Enter a coupon code." };
  const { data } = await supabase.from("coupons").select("*").eq("code", clean).maybeSingle();
  const c = data as Coupon | null;
  if (!c || !c.is_active) return { error: "This coupon code is not valid." };
  if (c.expires_at && new Date(c.expires_at).getTime() < Date.now()) return { error: "This coupon has expired." };
  if (c.usage_limit !== null && c.used_count >= c.usage_limit) return { error: "This coupon is fully used." };
  if (foodTotal < Number(c.min_order)) return { error: `Add items worth ₹${c.min_order} to use this coupon.` };
  return { coupon: c };
}

export async function listCoupons() {
  const { data } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
  return (data ?? []) as Coupon[];
}
