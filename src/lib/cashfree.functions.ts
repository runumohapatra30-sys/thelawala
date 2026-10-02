import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Input = {
  amount: number;
  purpose: "WALLET" | "ORDER";
  orderId?: string | null;
  name: string;
  email: string;
  mobile: string;
  origin: string;
};

export type CashfreeCheckout = { paymentSessionId: string; cfOrderId: string; live: boolean };

function parseLive(raw: string | undefined): boolean {
  const v = (raw ?? "").trim().toLowerCase();
  if (!v) return false;
  // Anything that is not clearly "test/sandbox/off" counts as live mode.
  return !["false", "0", "no", "off", "test", "sandbox"].includes(v);
}

export async function cashfreeCreds(): Promise<{ appId: string; secret: string; base: string; live: boolean }> {
  // Admin-panel keys win; environment values are only a fallback.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("payment_credentials")
    .select("cashfree_app_id,cashfree_secret,is_live")
    .eq("id", true)
    .maybeSingle();

  let appId = (data?.cashfree_app_id ?? "").trim();
  let secret = (data?.cashfree_secret ?? "").trim();
  let live = Boolean(data?.is_live);

  // A valid Cashfree secret always looks like cfsk_ma_...; ignore anything else.
  if (!appId || !secret.startsWith("cfsk_")) {
    appId = (process.env["CASHFREE_APP_ID"] ?? "").trim();
    secret = (process.env["CASHFREE_SECRET_KEY"] ?? "").trim();
    live = parseLive(process.env["CASHFREE_LIVE"]);
  }

  if (!appId || !secret) throw new Error("Cashfree is not set up yet. Please ask the team to add the gateway keys.");
  // Live secrets always start with cfsk_ma_prod_, test secrets with cfsk_ma_test_.
  if (secret.includes("_prod_")) live = true;
  if (secret.includes("_test_")) live = false;
  return { appId, secret, base: live ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg", live };
}

export const createCashfreePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Input) => {
    if (!input || !(input.amount > 0)) throw new Error("Amount must be more than zero");
    if (input.purpose !== "WALLET" && input.purpose !== "ORDER") throw new Error("Bad purpose");
    return input;
  })
  .handler(async ({ data, context }): Promise<CashfreeCheckout> => {
    const { appId, secret, base, live } = await cashfreeCreds();
    const origin = data.origin.replace(/\/$/, "");
    const cfOrderId = `TW${Date.now()}${Math.floor(Math.random() * 1000)}`;
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
        order_amount: Number(data.amount.toFixed(2)),
        order_currency: "INR",
        customer_details: {
          customer_id: context.userId,
          customer_phone: phone,
          customer_name: (data.name || "Customer").slice(0, 40),
          customer_email: data.email || undefined,
        },
        order_meta: {
          return_url: `${origin}/api/public/cashfree/callback?cf_order_id=${cfOrderId}`,
        },
        order_tags: {
          user_id: context.userId,
          purpose: data.purpose,
          order_id: data.orderId ?? "",
        },
      }),
    });

    const body = (await res.json()) as { payment_session_id?: string; message?: string };
    if (!res.ok || !body.payment_session_id) {
      if (res.status === 401 || res.status === 403) {
        throw new Error("Payment keys are not valid. Please update the Cashfree App ID and Secret Key.");
      }
      throw new Error(body.message ?? "Could not start the payment right now. Please try again.");
    }

    return { paymentSessionId: body.payment_session_id, cfOrderId, live };
  });

export type CashfreeVerdict = { status: "SUCCESS" | "PENDING" | "FAILED"; amount: number; reference: string };

/** Asks Cashfree what really happened. Only "SUCCESS" may place an order. */
export const verifyCashfreePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { cfOrderId: string }) => {
    if (!input?.cfOrderId) throw new Error("Missing payment reference");
    return input;
  })
  .handler(async ({ data }): Promise<CashfreeVerdict> => {
    const { appId, secret, base } = await cashfreeCreds();
    const res = await fetch(`${base}/orders/${encodeURIComponent(data.cfOrderId)}`, {
      headers: { "x-api-version": "2023-08-01", "x-client-id": appId, "x-client-secret": secret },
    });
    const order = (await res.json()) as { order_status?: string; order_amount?: number; cf_order_id?: string | number };
    if (!res.ok) return { status: "FAILED", amount: 0, reference: data.cfOrderId };
    const s = order.order_status ?? "";
    const status = s === "PAID" ? "SUCCESS" : s === "ACTIVE" ? "PENDING" : "FAILED";
    return { status, amount: Number(order.order_amount ?? 0), reference: String(order.cf_order_id ?? data.cfOrderId) };
  });

export type CollectSession = { cfOrderId: string; paymentSessionId: string; paymentLink: string | null; live: boolean };

type CashfreeCollectOrderResponse = {
  payment_session_id?: string;
  payment_link?: string;
  payload?: { default?: string };
  channel_details?: { intent_url?: string };
  data?: {
    payload?: { default?: string };
    channel_details?: { intent_url?: string };
    data?: { payload?: { default?: string } };
  };
  message?: string;
};

/**
 * Creates a real Cashfree order (PG /orders only — never the restricted /orders/pay)
 * and returns the payment session for the official Cashfree checkout SDK.
 */
export const createCashfreeCollectSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { amount: number; orderId: string; name?: string; mobile?: string }) => {
    if (!input || !(input.amount > 0)) throw new Error("Amount must be more than zero");
    if (!input.orderId) throw new Error("Missing order");
    return input;
  })
  .handler(async ({ data, context }): Promise<CollectSession> => {
    const { appId, secret, base, live } = await cashfreeCreds();
    const cfOrderId = `TWQR${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const phone = (data.mobile ?? "").replace(/\D/g, "").slice(-10) || "9999999999";

    const orderRes = await fetch(`${base}/orders`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-version": "2023-08-01",
        "x-client-id": appId,
        "x-client-secret": secret,
      },
      body: JSON.stringify({
        order_id: cfOrderId,
        order_amount: Number(data.amount.toFixed(2)),
        order_currency: "INR",
        customer_details: {
          customer_id: context.userId,
          customer_phone: phone,
          customer_name: (data.name || "Customer").slice(0, 40),
        },
        order_tags: { user_id: context.userId, purpose: "ORDER", order_id: data.orderId },
      }),
    });
    const order = (await orderRes.json()) as CashfreeCollectOrderResponse;
    if (!orderRes.ok || !order.payment_session_id) {
      throw new Error(order.message ?? "Could not start the payment right now.");
    }

    const paymentLink = (
      order.data?.payload?.default ??
      order.data?.channel_details?.intent_url ??
      order.data?.data?.payload?.default ??
      order.payload?.default ??
      order.channel_details?.intent_url ??
      order.payment_link ??
      ""
    ).trim();

    return {
      cfOrderId,
      paymentSessionId: order.payment_session_id,
      paymentLink: paymentLink || null,
      live,
    };
  });

