import { createFileRoute } from "@tanstack/react-router";
import { PortalHeader, Shell } from "@/components/Shell";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms, cancellation & refunds — Thaleewala" },
      { name: "description", content: "Thaleewala cancellation window, cancellation fee, wallet refund timelines and support contact for Bhubaneswar customers." },
      { property: "og:title", content: "Terms, cancellation & refunds — Thaleewala" },
      { property: "og:description", content: "How cancellations, fees and wallet refunds work on Thaleewala." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Terms,
});

const SECTIONS = [
  {
    h: "Cancellation window",
    p: "You can cancel free of charge until the stall accepts and starts cooking. After cooking begins, a small cancellation fee set by Thaleewala may be deducted because the food is already prepared.",
  },
  {
    h: "Refunds",
    p: "Prepaid orders are refunded to your Thaleewala wallet within minutes of approval. Wallet money can be spent on any future order. Bank refunds are processed on request and usually take 3–5 working days.",
  },
  {
    h: "Delivery fee",
    p: "Delivery is charged on the real road distance between the stall and your drop point. A fixed base fee covers the first few kilometres and a per-kilometre rate applies beyond that. The exact figure is always shown in your bill before you pay.",
  },
  {
    h: "Proof of delivery",
    p: "Every handover needs the delivery OTP shown in your order screen plus a photo taken by the delivery partner. Never share the OTP before you receive your food.",
  },
  {
    h: "Support",
    p: "Our care team is available on 9078492360 for order, refund and safety issues.",
  },
];

function Terms() {
  return (
    <Shell>
      <PortalHeader title="Terms, cancellation & refunds" />
      <div className="space-y-3 p-4">
        {SECTIONS.map((s) => (
          <section key={s.h} className="card-soft border border-border p-3">
            <h2 className="text-sm font-bold">{s.h}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{s.p}</p>
          </section>
        ))}
      </div>
    </Shell>
  );
}
