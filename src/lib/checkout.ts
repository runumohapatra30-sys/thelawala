import { createCashfreePayment } from "@/lib/cashfree.functions";
import { createPayuPayment } from "@/lib/payu.functions";

export type PayArgs = {
  gateway: string | null | undefined;
  amount: number;
  purpose: "WALLET" | "ORDER";
  orderId?: string | null;
  name: string;
  email: string;
  mobile: string;
};

function submitForm(action: string, fields: Record<string, string>) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = action;
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}

/** Opens the online payment page for whichever gateway the admin turned on. */
export async function startOnlinePayment(args: PayArgs): Promise<void> {
  const origin = window.location.origin;
  const payload = {
    amount: args.amount,
    purpose: args.purpose,
    orderId: args.orderId ?? null,
    name: args.name,
    email: args.email,
    mobile: args.mobile,
    origin,
  };

  if ((args.gateway ?? "").toUpperCase() === "PAYU") {
    const { action, fields } = await createPayuPayment({ data: payload });
    submitForm(action, fields);
    return;
  }

  const { linkUrl } = await createCashfreePayment({ data: payload });
  window.location.href = linkUrl;
}
