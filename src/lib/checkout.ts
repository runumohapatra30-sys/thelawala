import { createCashfreePayment, verifyCashfreePayment } from "@/lib/cashfree.functions";
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

import { loadCashfreeSdk } from "@/lib/cashfreeSdk";
import { openCashfreePayment } from "@/lib/openCashfreePayment";
import { confirmedPayment } from "@/lib/paymentOutcome";
export { loadCashfreeSdk } from "@/lib/cashfreeSdk";

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

  const { paymentSessionId, live } = await createCashfreePayment({ data: payload });
  const factory = await loadCashfreeSdk();
  const cashfree = factory({ mode: live ? "production" : "sandbox" });
  await cashfree.checkout({ paymentSessionId, redirectTarget: "_self" });
}

export type PaymentOutcome =
  | { ok: true; reference: string }
  | { ok: false; message: string; status: "PENDING" | "FAILED" };

/**
 * Opens Cashfree's Drop checkout inside the app (UPI apps + QR in a modal),
 * then confirms the real status with Cashfree before anything is placed.
 */
export async function payInAppWithCashfree(args: Omit<PayArgs, "gateway"> & { onVerifying?: () => void }): Promise<PaymentOutcome> {
  const payload = {
    amount: args.amount,
    purpose: args.purpose,
    orderId: args.orderId ?? null,
    name: args.name,
    email: args.email,
    mobile: args.mobile,
    origin: window.location.origin,
  };

  const { paymentSessionId, cfOrderId, live } = await createCashfreePayment({ data: payload });
  const result = await openCashfreePayment({ totalAmount: args.amount, paymentSessionId, isProduction: live });
  args.onVerifying?.();

  const verdict = await verifyCashfreePayment({ data: { cfOrderId } });
  if (confirmedPayment(verdict.status, verdict.amount, args.amount)) return { ok: true, reference: verdict.reference };
  if (verdict.status === "PENDING")
    return { ok: false, status: "PENDING", message: "Payment is pending confirmation. Your order has not been placed." };
  return { ok: false, status: "FAILED", message: result?.error?.message ?? "Payment failed or was cancelled. Your order was not placed." };
}
