import { createFileRoute } from "@tanstack/react-router";
import { cashfreeCreds } from "@/lib/cashfree.functions";

function redirect(to: string) {
  return new Response(null, { status: 303, headers: { location: to } });
}

type OrderStatus = {
  order_status?: string;
  order_amount?: number;
  cf_order_id?: string | number;
  order_tags?: { user_id?: string; purpose?: string; order_id?: string } | null;
};

async function handle(cfOrderId: string): Promise<Response> {
  if (!cfOrderId) return redirect("/profile?payment=failed");
  const { appId, secret, base } = await cashfreeCreds();

  const res = await fetch(`${base}/orders/${encodeURIComponent(cfOrderId)}`, {
    headers: { "x-api-version": "2023-08-01", "x-client-id": appId, "x-client-secret": secret },
  });
  const order = (await res.json()) as OrderStatus;
  if (!res.ok || order.order_status !== "PAID") return redirect("/profile?payment=failed");

  const notes = order.order_tags ?? {};
  const amount = Number(order.order_amount ?? 0);
  const ref = String(order.cf_order_id ?? cfOrderId);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  if (notes.purpose === "WALLET" && notes.user_id) {
    const { data: existing } = await supabaseAdmin
      .from("wallet_transactions")
      .select("id")
      .eq("gateway_reference_id", ref)
      .maybeSingle();
    if (!existing) {
      await supabaseAdmin.rpc("wallet_credit", {
        _user_id: notes.user_id,
        _amount: amount,
        _source: "TOPUP",
        _note: "Wallet top-up",
        _ref: ref,
      });
    }
    return redirect("/wallet?added=1");
  }

  if (notes.order_id) {
    await supabaseAdmin
      .from("orders")
      .update({ payment_status: "PAID", gateway_reference_id: ref })
      .eq("id", notes.order_id);
    return redirect(`/orders/${notes.order_id}?placed=1`);
  }

  return redirect("/orders?payment=done");
}

export const Route = createFileRoute("/api/public/cashfree/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const p = new URL(request.url).searchParams;
        return handle(p.get("cf_order_id") ?? p.get("order_id") ?? p.get("link_id") ?? "");
      },
      POST: async ({ request }) => {
        const url = new URL(request.url);
        let id = url.searchParams.get("cf_order_id") ?? url.searchParams.get("order_id") ?? "";
        if (!id) {
          const form = await request.formData().catch(() => null);
          id = String(form?.get("order_id") ?? form?.get("cf_order_id") ?? "");
        }
        return handle(id);
      },
    },
  },
});
