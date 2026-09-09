import { createServerFn } from "@tanstack/react-start";
import { streamText } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const Input = z.object({
  message: z.string().min(1).max(1000),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) }))
    .max(20)
    .default([]),
});

export const askHomeBot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => Input.parse(raw))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const userId = context.userId as string | undefined;

    let orderContext = "The customer has no recent order.";
    if (userId) {
      const { data: order } = await supabase
        .from("orders")
        .select(
          "id,code,status,payment_mode,payment_status,grand_total,food_total,delivery_fee,tip_amount,address_line,pincode,created_at,delivered_at,cancel_reason,delivery_otp",
        )
        .eq("customer_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (order) {
        const { data: items } = await supabase
          .from("order_items")
          .select("name,qty,price")
          .eq("order_id", order.id);
        orderContext = [
          `Latest order #${order.code}`,
          `Status: ${order.status}`,
          `Payment: ${order.payment_mode} / ${order.payment_status}`,
          `Bill: items ₹${order.food_total}, delivery ₹${order.delivery_fee}, tip ₹${order.tip_amount ?? 0}, total ₹${order.grand_total}`,
          `Address: ${order.address_line}, ${order.pincode}`,
          `Placed: ${order.created_at}. Delivered: ${order.delivered_at ?? "-"}. ${order.cancel_reason ?? ""}`,
          `Items: ${(items ?? []).map((i) => `${i.name} x${i.qty} ₹${i.price}`).join(", ")}`,
        ].join("\n");
      }
    }

    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Assistant is not configured");
    const gateway = createLovableAiGatewayProvider(key);

    const result = streamText({
      model: gateway("google/gemini-3.8-flash"),
      system: [
        "You are ThelaWala Care, the friendly assistant inside the ThelaWala app — a 15-minute street food delivery app in Bhubaneswar.",
        "Help with orders, delivery, bill, refunds, cancellations, wallet, and how to use the app. Be warm and very short (max 3 sentences). Reply in Odia if the customer writes Odia, else plain English.",
        "Never invent order facts: use only the order details below. Never reveal any OTP.",
        "If the customer wants money back or has a serious complaint, ask them to open a support ticket from the order's Need Help button, or give the care number 9078492360 for emergencies.",
        "LATEST ORDER DETAILS:",
        orderContext,
      ].join("\n"),
      messages: [...data.history, { role: "user" as const, content: data.message }],
    });

    const reply = await result.text;
    return { reply };
  });
