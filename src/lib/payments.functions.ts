import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PayuCheckout = {
  action: string;
  params: Record<string, string>;
};

type Input = {
  amount: number;
  purpose: "WALLET" | "ORDER";
  orderId?: string | null;
  name: string;
  email: string;
  mobile: string;
  origin: string;
};

export const createPayuPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Input) => {
    if (!input || !(input.amount > 0)) throw new Error("Amount must be more than zero");
    if (input.purpose !== "WALLET" && input.purpose !== "ORDER") throw new Error("Bad purpose");
    return input;
  })
  .handler(async ({ data, context }): Promise<PayuCheckout> => {
    let key = process.env["PAYU_KEY"] ?? "";
    let salt = process.env["PAYU_SALT"] ?? "";
    let live = process.env["PAYU_LIVE"] === "true";

    if (!key || !salt) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: creds } = await supabaseAdmin
        .from("payment_credentials")
        .select("payu_key,payu_salt,is_live")
        .eq("id", true)
        .maybeSingle();
      key = creds?.payu_key ?? "";
      salt = creds?.payu_salt ?? "";
      live = Boolean(creds?.is_live);
    }

    key = key.trim();
    salt = salt.trim();
    if (!key || !salt) throw new Error("Online payment is not set up yet. Please ask the team to add the gateway keys.");

    const action = live ? "https://secure.payu.in/_payment" : "https://test.payu.in/_payment";

    const clean = (v: string) => v.replace(/[|^~`]/g, " ").replace(/\s+/g, " ").trim();
    const amount = data.amount.toFixed(2);
    const txnid = `TW${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const productinfo = clean(data.purpose === "WALLET" ? "ThelaWala wallet top-up" : "ThelaWala order") || "ThelaWala order";
    const firstname = clean((data.name || "Customer").slice(0, 40)) || "Customer";
    const email = clean(data.email) || "customer@thelawala.in";
    const udf1 = context.userId;
    const udf2 = data.purpose;
    const udf3 = data.orderId ?? "";

    const { createHash } = await import("crypto");
    // PayU standard: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt
    // udf4..udf10 stay empty -> exactly 7 empty fields between udf3 and salt.
    const seq = [key, txnid, amount, productinfo, firstname, email, udf1, udf2, udf3, "", "", "", "", "", "", "", salt];
    const hash = createHash("sha512").update(seq.join("|")).digest("hex");

    const origin = data.origin.replace(/\/$/, "");
    return {
      action,
      params: {
        key,
        txnid,
        amount,
        productinfo,
        firstname,
        email,
        phone: data.mobile || "",
        udf1,
        udf2,
        udf3,
        surl: `${origin}/api/public/payu/callback`,
        furl: `${origin}/api/public/payu/callback`,
        hash,
      },
    };
  });
