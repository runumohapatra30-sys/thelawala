export type LatLng = { lat: number; lng: number };

export type Zone = {
  id: string;
  name: string;
  center: LatLng;
  polygon: [number, number][];
};

export type Product = {
  id: string;
  name: string;
  vendorId: string;
  category: string;
  unit: string;
  mrp: number;
  price: number;
  image: string;
};

export type Vendor = {
  id: string;
  stallName: string;
  ownerName: string;
  mobile: string;
  zoneId: string;
  location: LatLng;
  status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
  fssai?: string;
  pan?: string;
  accountNo?: string;
  ifsc?: string;
};

export type Rider = {
  id: string;
  name: string;
  mobile: string;
  dl?: string;
  pan?: string;
  accountNo?: string;
  ifsc?: string;
  status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
  onDuty: boolean;
};

export type CartLine = { productId: string; qty: number };

export type OrderStatus =
  | "PLACED"
  | "PREPARING"
  | "PACKED"
  | "PICKED_UP"
  | "DELIVERED";

export type Order = {
  id: string;
  createdAt: number;
  lines: { productId: string; name: string; qty: number; price: number; mrp: number; image: string }[];
  vendorId: string;
  zoneId: string;
  drop: LatLng;
  address: string;
  status: OrderStatus;
  pickupOtp: string;
  deliveryOtp: string;
  riderId: string | null;
  proofPhoto: string | null;
  bill: Bill;
  payment: string;
};

export type Bill = {
  mrpTotal: number;
  discount: number;
  itemTotal: number;
  handling: number;
  surge: number;
  delivery: number;
  charity: number;
  grand: number;
  platformProfit: number;
};

export type Banner = { id: string; title: string; subtitle: string; code?: string; percent?: number };
