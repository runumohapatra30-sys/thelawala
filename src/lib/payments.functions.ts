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
    const key = process.env["PAYU_KEY"];
    const salt = process.env["PAYU_SALT"];
    if (!key || !salt) throw new Error("Online payment is not configured yet.");

    const live = process.env["PAYU_LIVE"] === "true";
    const action = live ? "https://secure.payu.in/_payment" : "https://test.payu.in/_payment";

    const amount = data.amount.toFixed(2);
    const txnid = `TW${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const productinfo = data.purpose === "WALLET" ? "Thaleewala wallet top-up" : "Thaleewala order";
    const firstname = (data.name || "Customer").slice(0, 40);
    const email = data.email;
    const udf1 = context.userId;
    const udf2 = data.purpose;
    const udf3 = data.orderId ?? "";

    const { createHash } = await import("crypto");
    const seq = [key, txnid, amount, productinfo, firstname, email, udf1, udf2, udf3, "", "", "", "", "", "", salt];
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
