import { createPayuPayment } from "@/lib/payments.functions";
import { createCashfreePayment } from "@/lib/cashfree.functions";

export type PayArgs = {
  gateway: string | null | undefined;
  amount: number;
  purpose: "WALLET" | "ORDER";
  orderId?: string | null;
  name: string;
  email: string;
  mobile: string;
};

/** Opens the online payment page with whichever gateway the admin has switched on. */
export async function startOnlinePayment(args: PayArgs): Promise<void> {
  const origin = window.location.origin;
  const data = {
    amount: args.amount,
    purpose: args.purpose,
    orderId: args.orderId ?? null,
    name: args.name,
    email: args.email,
    mobile: args.mobile,
    origin,
  };

  if ((args.gateway ?? "PAYU").toUpperCase() === "CASHFREE") {
    try {
      const { linkUrl } = await createCashfreePayment({ data });
      window.location.href = linkUrl;
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      // If Cashfree has no keys saved, fall back to PayU instead of failing.
      if (!/not set up yet/i.test(msg)) throw err;
    }
  }

  const checkout = await createPayuPayment({ data });
  const form = document.createElement("form");
  form.method = "POST";
  form.action = checkout.action;
  Object.entries(checkout.params).forEach(([k, v]) => {
    const i = document.createElement("input");
    i.type = "hidden";
    i.name = k;
    i.value = v;
    form.appendChild(i);
  });
  document.body.appendChild(form);
  form.submit();
}
