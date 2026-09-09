import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "crypto";
import { payuCreds } from "@/lib/payu.functions";

function redirect(to: string) {
  return new Response(null, { status: 303, headers: { location: to } });
}

async function handle(form: FormData): Promise<Response> {
  const g = (k: string) => String(form.get(k) ?? "");
  const status = g("status");
  const txnid = g("txnid");
  const amount = g("amount");
  const productinfo = g("productinfo");
  const firstname = g("firstname");
  const email = g("email");
  const udf1 = g("udf1");
  const udf2 = g("udf2");
  const udf3 = g("udf3");
  const posted = g("hash").toLowerCase();

  if (status !== "success") return redirect("/profile?payment=failed");

  const { key, salt } = await payuCreds();
  const reverse = `${salt}|${status}||||||${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;
  const expected = createHash("sha512").update(reverse).digest("hex");
  if (posted !== expected) return redirect("/profile?payment=failed");

  const ref = g("mihpayid") || txnid;
  const paid = Number(amount);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  if (udf2 === "WALLET" && udf1) {
    const { data: existing } = await supabaseAdmin
      .from("wallet_transactions")
      .select("id")
      .eq("gateway_reference_id", ref)
      .maybeSingle();
    if (!existing) {
      await supabaseAdmin.rpc("wallet_credit", {
        _user_id: udf1,
        _amount: paid,
        _source: "TOPUP",
        _note: "Wallet top-up",
        _ref: ref,
      });
    }
    return redirect("/wallet?added=1");
  }

  if (udf3) {
    await supabaseAdmin
      .from("orders")
      .update({ payment_status: "PAID", gateway_reference_id: ref })
      .eq("id", udf3);
    return redirect(`/orders/${udf3}?placed=1`);
  }

  return redirect("/orders?payment=done");
}

export const Route = createFileRoute("/api/public/payu/callback")({
  server: {
    handlers: {
      POST: async ({ request }) => handle(await request.formData()),
      GET: async () => redirect("/profile?payment=failed"),
    },
  },
});
