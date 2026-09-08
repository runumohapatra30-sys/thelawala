import { createServerFn } from "@tanstack/react-start";
import { streamText } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const Input = z.object({ ticketId: z.string(), message: z.string() });

export const askSupportBot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => Input.parse(raw))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;

    const { data: ticket, error: tErr } = await supabase
      .from("support_tickets")
      .select("id,code,category,subject,status,order_id")
      .eq("id", data.ticketId)
      .maybeSingle();
    if (tErr || !ticket) throw new Error("Ticket not found");

    let orderContext = "The customer has not linked an order to this ticket.";
    if (ticket.order_id) {
      const { data: order } = await supabase
        .from("orders")
        .select(
          "code,status,payment_mode,payment_status,grand_total,food_total,delivery_fee,platform_fee,handling_fee,packing_fee,surge_fee,penalty_fee,tip_amount,distance_km,address_line,pincode,created_at,accepted_at,picked_up_at,delivered_at,cancelled_at,cancel_reason,delivery_otp",
        )
        .eq("id", ticket.order_id)
        .maybeSingle();
      const { data: items } = await supabase
        .from("order_items")
        .select("name,qty,price")
        .eq("order_id", ticket.order_id);
      if (order) {
        orderContext = [
          `Order #${order.code}`,
          `Status: ${order.status}`,
          `Payment: ${order.payment_mode} / ${order.payment_status}`,
          `Bill: items ₹${order.food_total}, delivery ₹${order.delivery_fee}, platform ₹${order.platform_fee}, handling ₹${order.handling_fee}, packing ₹${order.packing_fee}, surge ₹${order.surge_fee}, cancellation ₹${order.penalty_fee}, tip ₹${order.tip_amount}, total ₹${order.grand_total}`,
          `Distance: ${order.distance_km} km. Address: ${order.address_line}, ${order.pincode}`,
          `Placed: ${order.created_at}. Accepted: ${order.accepted_at ?? "-"}. Picked up: ${order.picked_up_at ?? "-"}. Delivered: ${order.delivered_at ?? "-"}. Cancelled: ${order.cancelled_at ?? "-"} ${order.cancel_reason ?? ""}`,
          `Items: ${(items ?? []).map((i) => `${i.name} x${i.qty} ₹${i.price}`).join(", ")}`,
        ].join("\n");
      }
    }

    const { data: history } = await supabase
      .from("support_messages")
      .select("sender_role,body")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: true })
      .limit(30);

    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Support assistant is not configured");
    const gateway = createLovableAiGatewayProvider(key);

    const result = streamText({
      model: gateway("google/gemini-3.8-flash"),
      system: [
        "You are ThelaWala Care, the support assistant of ThelaWala, a 15-minute street food delivery app in Bhubaneswar.",
        "Answer only about this customer's order, delivery, bill, refund and cancellation. Be warm, short (max 4 sentences), plain English or Odia if the customer writes Odia.",
        "Never invent order facts: use only the order details given below. Never reveal the pickup OTP; the delivery OTP may be shared with this customer only.",
        `Ticket ${ticket.code} · category ${ticket.category}.`,
        "If the customer wants money back, explain that you have raised it with the care team on this ticket and refunds are credited to the ThelaWala wallet after admin approval. For emergencies give the number 9078492360.",
        "ORDER DETAILS:",
        orderContext,
      ].join("\n"),
      messages: [
        ...(history ?? []).map((m) => ({
          role: m.sender_role === "bot" ? ("assistant" as const) : ("user" as const),
          content: m.body,
        })),
        { role: "user" as const, content: data.message },
      ],
    });

    const reply = await result.text;

    await supabase.from("support_messages").insert({
      ticket_id: ticket.id,
      sender_role: "bot",
      body: reply,
    });

    return { reply };
  });
