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

export type CashfreeCheckout = { linkUrl: string };

function parseLive(raw: string | undefined): boolean {
  const v = (raw ?? "").trim().toLowerCase();
  if (!v) return false;
  // Anything that is not clearly "test/sandbox/off" counts as live mode.
  return !["false", "0", "no", "off", "test", "sandbox"].includes(v);
}

export async function cashfreeCreds(): Promise<{ appId: string; secret: string; base: string }> {
  let appId = (process.env["CASHFREE_APP_ID"] ?? "").trim();
  let secret = (process.env["CASHFREE_SECRET_KEY"] ?? "").trim();
  let live = parseLive(process.env["CASHFREE_LIVE"]);

  if (!appId || !secret) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("payment_credentials")
      .select("cashfree_app_id,cashfree_secret,is_live")
      .eq("id", true)
      .maybeSingle();
    appId = (data?.cashfree_app_id ?? "").trim();
    secret = (data?.cashfree_secret ?? "").trim();
    live = Boolean(data?.is_live);
  }
  if (!appId || !secret) throw new Error("Cashfree is not set up yet. Please ask the team to add the gateway keys.");
  // Live secrets always start with cfsk_ma_prod_, test secrets with cfsk_ma_test_.
  if (secret.includes("_prod_")) live = true;
  if (secret.includes("_test_")) live = false;
  return { appId, secret, base: live ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg" };
}


export const createCashfreePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Input) => {
    if (!input || !(input.amount > 0)) throw new Error("Amount must be more than zero");
    if (input.purpose !== "WALLET" && input.purpose !== "ORDER") throw new Error("Bad purpose");
    return input;
  })
  .handler(async ({ data, context }): Promise<CashfreeCheckout> => {
    const { appId, secret, base } = await cashfreeCreds();
    const origin = data.origin.replace(/\/$/, "");
    const linkId = `TW${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const phone = data.mobile.replace(/\D/g, "").slice(-10) || "9999999999";

    const res = await fetch(`${base}/links`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-version": "2023-08-01",
        "x-client-id": appId,
        "x-client-secret": secret,
      },
      body: JSON.stringify({
        link_id: linkId,
        link_amount: Number(data.amount.toFixed(2)),
        link_currency: "INR",
        link_purpose: data.purpose === "WALLET" ? "ThelaWala wallet top-up" : "ThelaWala order",
        customer_details: {
          customer_phone: phone,
          customer_name: (data.name || "Customer").slice(0, 40),
          customer_email: data.email || undefined,
        },
        link_partial_payments: false,
        link_notify: { send_sms: false, send_email: false },
        link_meta: { return_url: `${origin}/api/public/cashfree/callback?link_id=${linkId}` },
        link_notes: {
          user_id: context.userId,
          purpose: data.purpose,
          order_id: data.orderId ?? "",
        },
      }),
    });

    const body = (await res.json()) as { link_url?: string; message?: string };
    if (!res.ok || !body.link_url) {
      if (res.status === 401 || res.status === 403) {
        throw new Error("Payment keys are not valid. Please update the Cashfree App ID and Secret Key.");
      }
      throw new Error(body.message ?? "Could not start the payment right now. Please try again.");
    }

    return { linkUrl: body.link_url };
  });
