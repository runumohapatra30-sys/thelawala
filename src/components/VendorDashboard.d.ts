import type { ComponentType } from "react";

type VendorDashboardOrder = {
  id: string;
  code: string;
  status: string;
  grand_total: number;
  food_total: number;
  base_food_total: number | null;
  pickup_otp: string;
  qr_hash: string | null;
  customer_name: string;
  address_line: string;
  partner_id: string | null;
  delivery_instructions?: string | null;
  ready_at?: string | null;
  created_at: string;
  payment_mode: string;
};

type VendorDashboardItem = {
  order_id: string;
  name: string;
  price: number;
};

declare const VendorDashboard: ComponentType<{
  orders: VendorDashboardOrder[];
  orderItems: VendorDashboardItem[];
  onStatus: (order: VendorDashboardOrder, status: string) => void;
  onMute: (muted: boolean) => void;
  muted: boolean;
}>;

export { VendorDashboard };