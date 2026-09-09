import { createFileRoute } from "@tanstack/react-router";
import { cashfreeCreds } from "@/lib/cashfree.functions";

function redirect(to: string) {
  return new Response(null, { status: 303, headers: { location: to } });
}

type LinkStatus = {
  link_status?: string;
  link_amount_paid?: number;
  link_amount?: number;
  link_notes?: { user_id?: string; purpose?: string; order_id?: string };
  cf_link_id?: string | number;
};

async function handle(linkId: string): Promise<Response> {
  if (!linkId) return redirect("/profile?payment=failed");
  const { appId, secret, base } = await cashfreeCreds();

  const res = await fetch(`${base}/links/${encodeURIComponent(linkId)}`, {
    headers: { "x-api-version": "2023-08-01", "x-client-id": appId, "x-client-secret": secret },
  });
  const link = (await res.json()) as LinkStatus;
  if (!res.ok || link.link_status !== "PAID") return redirect("/profile?payment=failed");

  const notes = link.link_notes ?? {};
  const amount = Number(link.link_amount_paid ?? link.link_amount ?? 0);
  const ref = String(link.cf_link_id ?? linkId);
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
      GET: async ({ request }) => handle(new URL(request.url).searchParams.get("link_id") ?? ""),
      POST: async ({ request }) => {
        const url = new URL(request.url);
        let linkId = url.searchParams.get("link_id") ?? "";
        if (!linkId) {
          const form = await request.formData().catch(() => null);
          linkId = String(form?.get("link_id") ?? "");
        }
        return handle(linkId);
      },
    },
  },
});
