import { inr } from "@/lib/fees";

export type InvoiceOrder = {
  code: string;
  created_at: string;
  customer_name: string;
  customer_mobile: string;
  address_line: string;
  pincode: string;
  food_total: number;
  delivery_fee: number;
  platform_fee: number;
  handling_fee: number;
  packing_fee: number;
  surge_fee: number;
  penalty_fee: number;
  discount_amount: number;
  tip_amount: number;
  wallet_paid: number;
  grand_total: number;
  payment_mode: string;
  payment_status: string;
};

export type InvoiceItem = { name: string; qty: number; price: number };

/** Opens a printable bill the customer can save as PDF. */
export function openInvoice(order: InvoiceOrder, items: InvoiceItem[], stallName: string) {
  const line = (label: string, value: number, sign = "+") =>
    value > 0 ? `<tr><td>${label}</td><td class="r">${sign}${inr(Number(value))}</td></tr>` : "";

  const html = `<!doctype html><html><head><meta charset="utf-8"/>
<title>Bill ${order.code} — ThelaWala</title>
<style>
body{font-family:system-ui,sans-serif;margin:0;padding:24px;color:#111}
h1{font-size:20px;margin:0}
.muted{color:#666;font-size:12px}
table{width:100%;border-collapse:collapse;margin-top:12px;font-size:13px}
td,th{padding:6px 0;text-align:left}
.r{text-align:right}
.tot{border-top:2px solid #111;font-weight:800;font-size:15px}
.box{border:1px solid #ddd;border-radius:12px;padding:14px;margin-top:14px}
</style></head><body>
<h1>ThelaWala</h1>
<p class="muted">Bill for order #${order.code} · ${new Date(order.created_at).toLocaleString("en-IN")}</p>
<div class="box">
  <p class="muted">Billed to</p>
  <b>${order.customer_name}</b> · ${order.customer_mobile}<br/>
  <span class="muted">${order.address_line}, ${order.pincode}</span><br/>
  <span class="muted">Stall: ${stallName}</span>
</div>
<table>
<tr><th>Item</th><th class="r">Qty</th><th class="r">Amount</th></tr>
${items.map((i) => `<tr><td>${i.name}</td><td class="r">${i.qty}</td><td class="r">${inr(i.price * i.qty)}</td></tr>`).join("")}
</table>
<table>
<tr><td>Food total</td><td class="r">${inr(Number(order.food_total))}</td></tr>
${line("Delivery fee", order.delivery_fee)}
${line("Platform fee", order.platform_fee)}
${line("Handling fee", order.handling_fee)}
${line("Packing fee", order.packing_fee)}
${line("Surge fee", order.surge_fee)}
${line("Cancellation fee", order.penalty_fee)}
${line("Rider tip", order.tip_amount)}
${line("Discount", order.discount_amount, "-")}
${line("Paid by wallet", order.wallet_paid, "-")}
<tr class="tot"><td>Total ${order.payment_mode === "COD" ? "payable" : "paid"}</td><td class="r">${inr(Number(order.grand_total))}</td></tr>
</table>
<p class="muted">Payment: ${order.payment_mode} · ${order.payment_status}</p>
<p class="muted">Thank you for ordering with ThelaWala, Bhubaneswar.</p>
<script>window.onload=()=>window.print()</script>
</body></html>`;

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}
