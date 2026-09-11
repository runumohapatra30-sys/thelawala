# Thaleewala Express

Act as a Principal Full-Stack Engineer and Mobile UI Architect. Build the complete, clean, production-ready application for "Thaleewala", a 15-minute hyper-local street-food delivery platform in Bhubaneswar, strictly adhering to Blinkit's native UI/UX design language.

Completely remove any messy debug cockpits, dark headers, multi-panel switchers, or temporary developer toolbars. The app must launch directly into a clean customer-facing storefront, with discrete bottom-navigation links to standalone Vendor, Rider, and Admin portals.

---

### 1. Global Visual Identity (Strict Blinkit Design System)
- **Palette:** Pure White (`#FFFFFF`), Soft Tint (`#F8F9FA`), Emerald Green (`#0C831F`), Accent Warm Yellow (`#F8CB46`), Text Primary (`#1C1C1C`), Subtle Borders (`#EBECEF`).
- **Typography & Layout:** Clean sans-serif, rounded cards (12px to 16px radius), micro-shadows (`box-shadow: 0 2px 8px rgba(0,0,0,0.04)`).
- **Responsive Architecture:** Pixel-perfect mobile-first container with fluid margins (16px horizontal padding).

---

### 2. Main Consumer App & Geofencing
- **Geofenced Operational Zones:** Restrict delivery pins strictly to Bhubaneswar sub-zones:
  - DumDuma
  - Khandagiri
  - AIIMS Bhubaneswar
  - Patrapada
- **Top Header:**
  - Dynamic status: "15 MINS · Home - DumDuma, Bhubaneswar" with location dropdown.
  - Action icons: Wallet balance chip and profile avatar.
- **Search Bar:** Rounded pill input with dynamic rotating typewriter placeholder ("Search 'aloo dum pakoda'"), search icon, and mic icon.
- **Category Explorer:** 4-column rounded card grid with soft background tints (`#F0F7F9`) and two-line labels (Tiffin, Breakfast, Rolls, Chaat, Chai, Sweets).
- **Vendor Product Cards:** Strict rendering of authentic vendor-uploaded photos (`VendorPhotoTile`), strike-through MRP, current price, and green outline stepper (`- 1 +`).କୌଣସି କ୍ରେଡିଟ୍ କାର୍ଡ ବା Google API ବିଲିଂ ବିନା ୧୦୦% ମାଗଣାରେ (Leaflet + OpenStreetMap + OSRM) ମ୍ୟାପ୍, ଲାଇଭ୍ ରୁଟ୍ ଏବଂ ETA ଟ୍ରାକିଂ ପାଇଁ ଏହି ପ୍ରମ୍ପ୍ଟ୍ ବ୍ୟବହାର କରନ୍ତୁ:

 

Act as a Senior Frontend & Full-Stack Engineer. Implement a 100% completely FREE real-time mapping, route calculation, and live tracking module for "Thaleewala" using Leaflet, OpenStreetMap (OSM), and Open Source Routing Machine (OSRM). Do NOT use Google Maps API.

---

### 1. Zero-Cost Geocoding & Tile Setup
- Map Engine: Use Leaflet (`react-leaflet` or `leaflet.js` / Flutter `flutter_map`).
- Map Tiles: Fetch map tiles from OpenStreetMap free servers (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`).
- Reverse Geocoding: Use OpenStreetMap Nominatim API (`https://nominatim.openstreetmap.org/reverse`) to convert coordinates into street addresses for free.

---

### 2. Geofencing Logic (Bhubaneswar Sub-zones)
- Polygon Boundaries: Hardcode latitude/longitude coordinates bounding the active delivery zones:
  * DumDuma (`lat: 20.2458, lng: 85.7892`)
  * Khandagiri (`lat: 20.2602, lng: 85.7884`)
  * AIIMS Bhubaneswar (`lat: 20.2312, lng: 85.7766`)
  * Patrapada (`lat: 20.2497, lng: 85.7661`)
- Validation: Block order checkout if customer drop coordinates fall outside these polygon bounds.

---

### 3. Free Route Polylines & Live ETA (OSRM API)
- Routing Engine: Query the public OSRM Routing API for driving routes:
  `https://router.project-osrm.org/route/v1/driving/{start_lng},{start_lat};{end_lng},{end_lat}?overview=full&geometries=geojson`
- Polyline Rendering: Parse the returned GeoJSON geometry coordinates and render a vibrant blue polyline (`#0066FF`) on the Leaflet map.
- Dynamic ETA Calculation: Extract `duration` (in seconds) and `distance` (in meters) from the OSRM payload:
  * Calculate ETA: `Math.ceil(duration / 60) + 5 mins` (adding 5 mins buffer for stall pickup/packing).
  * Display on customer header: "Arriving in [X] minutes".

---

### 4. Live Map Screens (Blinkit Style)
- Customer Tracking Screen:
  * Custom SVG Marker 1: Vendor Stall (Orange storefront icon).
  * Custom SVG Marker 2: Customer Address (Destination red pin).
  * Dynamic Marker 3: Delivery Rider (Moving scooter icon updated via Firestore real-time listener).
  * Smooth marker animation between GPS updates.
- Rider Navigation Screen:
  * Route Phase 1: Draw route from Rider's current GPS to Vendor Stall.
  * Route Phase 2: Automatically redraw route from Vendor Stall to Customer location upon OTP/QR pickup verification.

Provide clean, modular code with complete error handling for network limits and offline caching.
- **Floating Cart Pill:** Dynamic sticky bottom bar: `[ X ITEMS · ₹Amount ] ➔ [ View Cart ]`.
- **Itemized Bill Card:**
  - Base MRP, Product Discount, Item Total, Handling Charge, Surge/Distance Charge, Delivery Charge, and 2% Charity allocation.
- **Payment Selector:** Dynamic list for UPI (GPay, PhonePe, Paytm), Cards, Wallets, and Pay on Delivery.

---

### 3. Portal Navigation & Footer Architecture
Place clean, professional access links inside the main website footer and user profile drawer:
- `Partner with Us / Stall Login` ➔ Vendor Portal
- `Deliver with Thaleewala` ➔ Delivery Partner Portal
- `Portal Administration` ➔ Admin Control Center

Each portal must render as a full-screen, clean view matching the Blinkit white-and-green aesthetic (no dark cockpits).

---

### 4. Vendor Stall Portal & Kitchen Workflow
- **Vendor Registration:**
  - Stall Name, Owner Name, Mobile Number.
  - PAN Card, Bank Details (Account No, IFSC).
  - FSSAI License, Live GPS Stall Location capture, Stall Photos, Identity Proof documents.
  - Account status defaults to `PENDING_APPROVAL`.
- **Kitchen Ticket Management:**
  - Real-time incoming tickets with progression actions: "Start Preparing" (Yellow) and "Packed · Ready for Pickup" (Green).
- **Secure Pickup Handshake:**
  - Once status changes to "Packed", auto-generate a dynamic 4-digit Vendor Pickup OTP and an SVG QR Code for rider verification.

---

### 5. Delivery Partner Portal & Dispatch Flow
- **Rider Registration:**
  - Full Name, Mobile Number, Driving License (DL), PAN Card, Bank Details, Live Photo/Selfie, Identity Proof documents.
  - Account status defaults to `PENDING_APPROVAL`.
- **Sequential Navigation:**
  - Step 1: Real-time map navigation route to the Vendor stall.
  - Step 2: Stall pickup verification via scanning Vendor QR code or entering Vendor Pickup OTP.
  - Step 3: Navigation route to Customer delivery location with dynamic ETA calculation.
- **Handover Completion:**
  - Mandatorily verify the Customer Delivery OTP displayed on the customer screen.
  - Require the camera module to capture a live photo of the handed-over parcel before marking the ticket as "Delivered".
- **Rider Dashboard:** Daily earnings summary card, completed trip count, and active duty toggle (`ON DUTY` / `OFF DUTY`).

---

### 6. Superadmin Control Center
- **Strict Superadmin Authentication:** Restrict access strictly to email `runumohapatra808@gmail.com`.
- **Financial Ledger:** Track real-time incoming revenue, vendor payout balances, rider earnings, and the flat ₹7.50 platform profit per order.
- **Onboarding Approvals:** Review submitted KYC documents for vendors and riders to approve or reject accounts.
- **AI Banner & Promo Assistant:** Conversational command box where the admin can type natural-language instructions (e.g., "Create a 20% discount coupon FEST20 and banner for evening snacks") to auto-generate active banners and promo rules.

Output the complete, clean directory structure, database schemas (Firestore/Supabase), security rules, and production code.
mu degin photo dechhi bass emiti karaa

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://thaliwala.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e2a1fe36-e41c-4352-b9a6-9d47b8df7311).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
