import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createHash } from "crypto";

type Input = {
  amount: number;
  purpose: "WALLET" | "ORDER";
  orderId?: string | null;
  name: string;
  email: string;
  mobile: string;
  origin: string;
};

export type PayuCheckout = { action: string; fields: Record<string, string> };

function clean(v: string, fallback: string): string {
  const out = (v ?? "").replace(/[^a-zA-Z0-9 @._-]/g, "").trim();
  return out || fallback;
}

export async function payuCreds(): Promise<{ key: string; salt: string; base: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("payment_credentials")
    .select("payu_key,payu_salt,is_live")
    .eq("id", true)
    .maybeSingle();
  const key = (data?.payu_key ?? "").trim();
  const salt = (data?.payu_salt ?? "").trim();
  if (!key || !salt) throw new Error("PayU is not set up yet. Please add the merchant key and salt in the admin panel.");
  return { key, salt, base: data?.is_live ? "https://secure.payu.in" : "https://test.payu.in" };
}

export const createPayuPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Input) => {
    if (!input || !(input.amount > 0)) throw new Error("Amount must be more than zero");
    if (input.purpose !== "WALLET" && input.purpose !== "ORDER") throw new Error("Bad purpose");
    return input;
  })
  .handler(async ({ data, context }): Promise<PayuCheckout> => {
    const { key, salt, base } = await payuCreds();
    const origin = data.origin.replace(/\/$/, "");
    const txnid = `TW${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const amount = data.amount.toFixed(2);
    const productinfo = data.purpose === "WALLET" ? "Wallet topup" : "Food order";
    const firstname = clean(data.name, "Customer");
    const email = clean(data.email, "customer@thelawala.in");
    const phone = (data.mobile || "").replace(/\D/g, "").slice(-10) || "9999999999";
    const udf1 = context.userId;
    const udf2 = data.purpose;
    const udf3 = data.orderId ?? "";
    const udf4 = "";
    const udf5 = "";

    const hashString = `${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}||||||${salt}`;
    const hash = createHash("sha512").update(hashString).digest("hex");

    return {
      action: `${base}/_payment`,
      fields: {
        key,
        txnid,
        amount,
        productinfo,
        firstname,
        email,
        phone,
        udf1,
        udf2,
        udf3,
        udf4,
        udf5,
        surl: `${origin}/api/public/payu/callback`,
        furl: `${origin}/api/public/payu/callback`,
        hash,
      },
    };
  });
