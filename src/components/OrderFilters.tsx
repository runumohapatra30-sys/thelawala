import { startOfDay, startOfMonth, startOfWeek, startOfYear } from "date-fns";

export type DateRange = "ALL" | "TODAY" | "WEEK" | "MONTH" | "YEAR";
export type PaymentMode = "ALL" | "COD" | "ONLINE";
export type StatusValue = string;

type FilterableOrder = {
  status: string;
  created_at: string;
  payment_mode: string;
};

const CUSTOMER_STATUS_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "PREPARING_GROUP", label: "Preparing" },
  { value: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;

const VENDOR_STATUS_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "ORDER_PLACED", label: "New" },
  { value: "PREPARING", label: "Preparing" },
  { value: "READY_FOR_PICKUP", label: "Ready" },
  { value: "SEARCHING_RIDER", label: "Searching" },
  { value: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;

const DATE_OPTIONS = [
  { value: "ALL", label: "All time" },
  { value: "TODAY", label: "Today" },
  { value: "WEEK", label: "This week" },
  { value: "MONTH", label: "This month" },
  { value: "YEAR", label: "This year" },
] as const;

const PAYMENT_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "COD", label: "Cash" },
  { value: "ONLINE", label: "Online" },
] as const;

const PREPARING_GROUP = ["ORDER_PLACED", "PREPARING", "READY_FOR_PICKUP", "SEARCHING_RIDER"];

export function matchesOrderFilters(
  order: FilterableOrder,
  status: StatusValue,
  date: DateRange,
  payment: PaymentMode,
) {
  if (status !== "ALL") {
    if (status === "PREPARING_GROUP") {
      if (!PREPARING_GROUP.includes(order.status)) return false;
    } else if (order.status !== status) {
      return false;
    }
  }

  if (payment !== "ALL" && order.payment_mode !== payment) return false;

  if (date !== "ALL") {
    const d = new Date(order.created_at).getTime();
    const now = new Date();
    let start: Date;
    if (date === "TODAY") start = startOfDay(now);
    else if (date === "WEEK") start = startOfWeek(now, { weekStartsOn: 1 });
    else if (date === "MONTH") start = startOfMonth(now);
    else if (date === "YEAR") start = startOfYear(now);
    else start = new Date(0);
    if (d < start.getTime()) return false;
  }

  return true;
}

export function OrderFilterBar({
  mode,
  status,
  date,
  payment,
  search,
  onStatus,
  onDate,
  onPayment,
  onSearch,
}: {
  mode: "customer" | "vendor";
  status: StatusValue;
  date: DateRange;
  payment: PaymentMode;
  search: string;
  onStatus: (v: StatusValue) => void;
  onDate: (v: DateRange) => void;
  onPayment: (v: PaymentMode) => void;
  onSearch: (v: string) => void;
}) {
  const statusOpts = mode === "customer" ? CUSTOMER_STATUS_OPTIONS : VENDOR_STATUS_OPTIONS;
  const chip = (active: boolean) =>
    `shrink-0 rounded-full border px-3 py-1 text-[11px] font-bold transition-colors ${
      active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
    }`;

  return (
    <div className="space-y-2 rounded-2xl bg-muted/60 p-3">
      <input
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder={mode === "customer" ? "Search order code, stall or item" : "Search order code, customer or item"}
        className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
      />
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {statusOpts.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onStatus(opt.value)}
            className={chip(status === opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {DATE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onDate(opt.value as DateRange)}
            className={chip(date === opt.value)}
          >
            {opt.label}
          </button>
        ))}
        <span className="mx-1 h-5 w-px shrink-0 self-center bg-border" />
        {PAYMENT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onPayment(opt.value as PaymentMode)}
            className={chip(payment === opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
