import dahibara from "@/assets/food-dahibara.jpg";
import pakoda from "@/assets/food-pakoda.jpg";
import roll from "@/assets/food-roll.jpg";
import chai from "@/assets/food-chai.jpg";
import tiffin from "@/assets/food-tiffin.jpg";
import sweets from "@/assets/food-sweets.jpg";
import chaat from "@/assets/food-chaat.jpg";
import chhenapoda from "@/assets/food-chhenapoda.jpg";
import type { Product, Vendor } from "./types";

export const CATEGORIES = [
  { id: "tiffin", label: "Tiffin", image: tiffin },
  { id: "breakfast", label: "Breakfast", image: dahibara },
  { id: "rolls", label: "Rolls", image: roll },
  { id: "chaat", label: "Chaat", image: chaat },
  { id: "chai", label: "Chai", image: chai },
  { id: "sweets", label: "Sweets", image: sweets },
  { id: "snacks", label: "Fry & Pakoda", image: pakoda },
  { id: "dessert", label: "Odia Dessert", image: chhenapoda },
];

export const VENDORS: Vendor[] = [
  {
    id: "v1",
    stallName: "Maa Tarini Tiffin Stall",
    ownerName: "Sanjay Sahoo",
    mobile: "9078492360",
    zoneId: "dumduma",
    location: { lat: 20.2471, lng: 85.7901 },
    status: "APPROVED",
    fssai: "12419001000123",
  },
  {
    id: "v2",
    stallName: "Khandagiri Chaat Corner",
    ownerName: "Rakesh Behera",
    mobile: "9437011223",
    zoneId: "khandagiri",
    location: { lat: 20.2609, lng: 85.789 },
    status: "PENDING_APPROVAL",
  },
];

export const PRODUCTS: Product[] = [
  { id: "p1", name: "Dahi Bara Aloo Dum", vendorId: "v1", category: "breakfast", unit: "2 pcs", mrp: 60, price: 39, image: dahibara },
  { id: "p2", name: "Aloo Dum Pakoda", vendorId: "v1", category: "snacks", unit: "6 pcs", mrp: 70, price: 49, image: pakoda },
  { id: "p3", name: "Egg Kathi Roll", vendorId: "v1", category: "rolls", unit: "1 pc", mrp: 90, price: 69, image: roll },
  { id: "p4", name: "Kulhad Masala Chai", vendorId: "v1", category: "chai", unit: "150 ml", mrp: 25, price: 15, image: chai },
  { id: "p5", name: "Idli Vada Tiffin", vendorId: "v1", category: "tiffin", unit: "1 plate", mrp: 80, price: 59, image: tiffin },
  { id: "p6", name: "Rasgulla", vendorId: "v1", category: "sweets", unit: "4 pcs", mrp: 60, price: 45, image: sweets },
  { id: "p7", name: "Bhel Puri Chaat", vendorId: "v2", category: "chaat", unit: "1 plate", mrp: 50, price: 35, image: chaat },
  { id: "p8", name: "Chhena Poda Slice", vendorId: "v2", category: "dessert", unit: "1 pc", mrp: 70, price: 55, image: chhenapoda },
];

export const SEARCH_HINTS = [
  'Search "aloo dum pakoda"',
  'Search "dahi bara"',
  'Search "kulhad chai"',
  'Search "chhena poda"',
  'Search "egg roll"',
];
