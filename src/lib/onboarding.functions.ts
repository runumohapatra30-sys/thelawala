import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { cashfreeCreds } from "@/lib/cashfree.functions";

/** ₹99 when a valid FSSAI licence is given, otherwise ₹199 (includes registration help). */
export function onboardingFee(fssai: string | null | undefined): { amount: 99 | 199; hasFssai: boolean } {
  const clean = (fssai ?? "").replace(/\D/g, "");
  const hasFssai = /^[12]\d{13}$/.test(clean);
  return { amount: hasFssai ? 99 : 199, hasFssai };
}

export type OnboardingSession =
  | { alreadyPaid: true }
  | { alreadyPaid: false; paymentSessionId: string; cfOrderId: string; live: boolean; amount: number };

type StartInput = { fssai: string; name: string; email: string; mobile: string; origin: string };

export const startOnboardingPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: StartInput) => {
    if (!input?.origin) throw new Error("Missing origin");
    return input;
  })
  .handler(async ({ data, context }): Promise<OnboardingSession> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: paid } = await supabaseAdmin
      .from("vendor_onboarding_payments")
      .select("id")
      .eq("user_id", context.userId)
      .eq("status", "SUCCESS")
      .is("vendor_id", null)
      .maybeSingle();
    if (paid) return { alreadyPaid: true };

    const { amount, hasFssai } = onboardingFee(data.fssai);
    const { appId, secret, base, live } = await cashfreeCreds();
    const origin = data.origin.replace(/\/$/, "");
    const cfOrderId = `TWREG${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const phone = data.mobile.replace(/\D/g, "").slice(-10) || "9999999999";

    const res = await fetch(`${base}/orders`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-version": "2023-08-01",
        "x-client-id": appId,
        "x-client-secret": secret,
      },
      body: JSON.stringify({
        order_id: cfOrderId,
        order_amount: amount,
        order_currency: "INR",
        customer_details: {
          customer_id: context.userId,
          customer_phone: phone,
          customer_name: (data.name || "Stall owner").slice(0, 40),
          customer_email: data.email || undefined,
        },
        order_meta: { return_url: `${origin}/vendor?onboarding=${cfOrderId}` },
        order_tags: { user_id: context.userId, purpose: "VENDOR_ONBOARDING" },
      }),
    });

    const body = (await res.json()) as { payment_session_id?: string; message?: string };
    if (!res.ok || !body.payment_session_id) {
      if (res.status === 401 || res.status === 403)
        throw new Error("Payment keys are not valid. Please ask the team to update the gateway keys.");
      throw new Error(body.message ?? "Could not start the payment right now. Please try again.");
    }

    const { error } = await supabaseAdmin.from("vendor_onboarding_payments").insert({
      user_id: context.userId,
      gateway_order_id: cfOrderId,
      amount,
      has_fssai: hasFssai,
      status: "PENDING",
    });
    if (error) throw new Error("Could not start the payment right now. Please try again.");

    return { alreadyPaid: false, paymentSessionId: body.payment_session_id, cfOrderId, live, amount };
  });

export type OnboardingVerdict = { status: "SUCCESS" | "PENDING" | "FAILED"; amount: number };

/** Confirms with the gateway. Only a real, first-time SUCCESS unlocks stall creation. */
export const confirmOnboardingPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { cfOrderId: string }) => {
    if (!input?.cfOrderId) throw new Error("Missing payment reference");
    return input;
  })
  .handler(async ({ data, context }): Promise<OnboardingVerdict> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row } = await supabaseAdmin
      .from("vendor_onboarding_payments")
      .select("id,user_id,amount,status")
      .eq("gateway_order_id", data.cfOrderId)
      .maybeSingle();
    if (!row || row.user_id !== context.userId) return { status: "FAILED", amount: 0 };
    if (row.status === "SUCCESS") return { status: "SUCCESS", amount: Number(row.amount) };

    const { appId, secret, base } = await cashfreeCreds();
    const res = await fetch(`${base}/orders/${encodeURIComponent(data.cfOrderId)}`, {
      headers: { "x-api-version": "2023-08-01", "x-client-id": appId, "x-client-secret": secret },
    });
    const order = (await res.json()) as {
      order_status?: string;
      order_amount?: number;
      cf_order_id?: string | number;
      order_tags?: { user_id?: string; purpose?: string } | null;
    };
    if (!res.ok) return { status: "FAILED", amount: 0 };

    const paidAmount = Number(order.order_amount ?? 0);
    const tags = order.order_tags ?? {};
    const okOwner = tags.user_id === context.userId && tags.purpose === "VENDOR_ONBOARDING";

    if (order.order_status === "ACTIVE") return { status: "PENDING", amount: paidAmount };
    if (order.order_status !== "PAID" || !okOwner || paidAmount < Number(row.amount)) {
      await supabaseAdmin
        .from("vendor_onboarding_payments")
        .update({ status: "FAILED" })
        .eq("id", row.id)
        .eq("status", "PENDING");
      return { status: "FAILED", amount: paidAmount };
    }

    const { data: updated } = await supabaseAdmin
      .from("vendor_onboarding_payments")
      .update({
        status: "SUCCESS",
        gateway_reference: String(order.cf_order_id ?? data.cfOrderId),
        paid_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .eq("status", "PENDING")
      .select("id")
      .maybeSingle();

    if (!updated) return { status: "FAILED", amount: paidAmount };
    return { status: "SUCCESS", amount: paidAmount };
  });
