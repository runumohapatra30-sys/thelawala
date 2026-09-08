import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "crypto";

function redirect(to: string) {
  return new Response(null, { status: 303, headers: { location: to } });
}

export const Route = createFileRoute("/api/public/payu/callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        let salt = process.env["PAYU_SALT"] ?? "";
        if (!salt) {
          const { data: creds } = await supabaseAdmin
            .from("payment_credentials")
            .select("payu_salt")
            .eq("id", true)
            .maybeSingle();
          salt = creds?.payu_salt ?? "";
        }
        if (!salt) return new Response("Not configured", { status: 500 });

        const form = await request.formData();
        const g = (k: string) => String(form.get(k) ?? "");

        const status = g("status");
        const expected = createHash("sha512")
          .update(
            [
              salt,
              status,
              "",
              "",
              "",
              "",
              "",
              g("udf5"),
              g("udf4"),
              g("udf3"),
              g("udf2"),
              g("udf1"),
              g("email"),
              g("firstname"),
              g("productinfo"),
              g("amount"),
              g("txnid"),
              g("key"),
            ].join("|"),
          )
          .digest("hex");

        if (expected !== g("hash")) return new Response("Invalid signature", { status: 401 });
        if (status !== "success") return redirect("/profile?payment=failed");

        const userId = g("udf1");
        const purpose = g("udf2");
        const orderId = g("udf3");
        const amount = Number(g("amount"));
        const ref = g("mihpayid") || g("txnid");


        if (purpose === "WALLET") {
          await supabaseAdmin.rpc("wallet_credit", {
            _user_id: userId,
            _amount: amount,
            _source: "TOPUP",
            _note: "Wallet top-up",
            _ref: ref,
          });
          return redirect("/wallet?added=1");
        }

        if (orderId) {
          await supabaseAdmin
            .from("orders")
            .update({ payment_status: "PAID", gateway_reference_id: ref })
            .eq("id", orderId);
          return redirect(`/orders/${orderId}?placed=1`);
        }

        return redirect("/orders");
      },
    },
  },
});
