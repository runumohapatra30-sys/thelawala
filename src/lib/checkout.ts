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

type CashfreeResult = { error?: { message?: string }; paymentDetails?: { paymentMessage?: string } };

type CashfreeSdk = {
  checkout: (opts: { paymentSessionId: string; redirectTarget?: string | "_modal" }) => Promise<CashfreeResult>;
};

declare global {
  interface Window {
    Cashfree?: (opts: { mode: "production" | "sandbox" }) => CashfreeSdk;
  }
}

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

export async function loadCashfreeSdk(): Promise<NonNullable<Window["Cashfree"]>> {
  if (window.Cashfree) return window.Cashfree;
  await new Promise<void>((resolve, reject) => {
    const el = document.createElement("script");
    el.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    el.onload = () => resolve();
    el.onerror = () => reject(new Error("Payment page could not load. Please check your internet and try again."));
    document.head.appendChild(el);
  });
  if (!window.Cashfree) throw new Error("Payment page could not load. Please try again.");
  return window.Cashfree;
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
  | { ok: false; message: string };

/**
 * Opens Cashfree's Drop checkout inside the app (UPI apps + QR in a modal),
 * then confirms the real status with Cashfree before anything is placed.
 */
export async function payInAppWithCashfree(args: Omit<PayArgs, "gateway">): Promise<PaymentOutcome> {
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
  const factory = await loadCashfreeSdk();
  const cashfree = factory({ mode: live ? "production" : "sandbox" });
  const result = await cashfree.checkout({ paymentSessionId, redirectTarget: "_modal" });

  const verdict = await verifyCashfreePayment({ data: { cfOrderId } });
  if (verdict.status === "SUCCESS") return { ok: true, reference: verdict.reference };
  if (verdict.status === "PENDING")
    return { ok: false, message: "Payment is still pending. Nothing was charged and your order was not placed." };
  return { ok: false, message: result?.error?.message ?? "Payment failed or was cancelled. Your order was not placed." };
}
