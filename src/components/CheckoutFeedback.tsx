import { CircleX, Clock3 } from "lucide-react";

export function CheckoutFeedback({ message, paymentState }: { message: string | null; paymentState: "failed" | "pending" | null }) {
  if (paymentState) return <div role="status" className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${paymentState === "pending" ? "bg-brand-soft text-primary" : "bg-destructive/10 text-destructive"}`}>{paymentState === "pending" ? <Clock3 className="h-6 w-6" /> : <CircleX className="h-6 w-6" />}</span>
    <div><p className="text-sm font-extrabold">{paymentState === "pending" ? "Payment pending" : "Order not placed"}</p><p className="mt-0.5 text-xs text-muted-foreground">{paymentState === "pending" ? "Awaiting payment confirmation" : "Payment unsuccessful · try again"}</p></div>
  </div>;
  return message ? <p role="alert" className="text-xs font-semibold text-destructive">{message}</p> : null;
}