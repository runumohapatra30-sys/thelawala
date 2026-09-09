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

/** Opens the online payment page (Cashfree). */
export async function startOnlinePayment(args: PayArgs): Promise<void> {
  const origin = window.location.origin;
  const { linkUrl } = await createCashfreePayment({
    data: {
      amount: args.amount,
      purpose: args.purpose,
      orderId: args.orderId ?? null,
      name: args.name,
      email: args.email,
      mobile: args.mobile,
      origin,
    },
  });
  window.location.href = linkUrl;
}
