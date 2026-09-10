# Admin simplification, settlements, refunds and role-based login

## 1. Simpler admin portal

Replace the current long single page with a clean icon menu at the top:

| Icon | Section |
| --- | --- |
| Orders | Every order, ever |
| Settlement | Who gets paid how much |
| Refunds | Refund requests and their progress |
| Money | Sales, platform earning, reports |
| Approvals | Stalls and riders waiting |
| Marketing | Banners, festive sections, page studio |
| Settings | Fees, charges, payments |

Only one section shows at a time, so the page stays short and easy.

## 2. Orders section

- Tapping the Orders icon opens the full order list (not just the last 50).
- Time filters: Today, This week, This month, This year, Lifetime.
- Filter by status and search by order code, customer name or mobile.
- Each order opens a detail card: items, bill split, who earned what, payment mode, and — for cancelled prepaid orders — a "Refund needed" tag with a one-tap action to open the refund.

## 3. Sales and earnings rules

- Total sale counts delivered orders only. Cancelled orders are excluded from sale.
- A cancelled order that was paid online appears in the Refunds section instead.
- Platform earning per order is shown line by line: stall commission + charges − discounts − rider gift, so it is clear which order brought how much.
- Same day / month / year / lifetime toggles apply everywhere in this section.

## 4. Settlement section

- Two lists: Stalls and Riders.
- For each one: total earned, already settled, and pending amount, with commission shown separately.
- Rider payout cycle: paid on Sunday. Stall payout cycle: next day.
- Admin taps "Settle" and enters a reference; the payment is recorded and both the admin and the partner see the settlement history.
- Rider cash-in-hand from cash orders is deducted before showing the payable amount.

## 5. Refund flow (customer → admin)

- On a prepaid order, the customer gets a "Request refund" button with a reason.
- The request travels through: Requested → Under review → In progress → Approved / Rejected (with the admin's written response) → Refund completed.
- Customer sees a step tracker of that journey on the order page.
- Admin moves the request to the next step and writes the response; on completion the money is credited (wallet) or recorded with a bank reference.

## 6. Rider portal money view

- Earnings summary: delivery fee earned, tips, gift bonus, total paid out, pending.
- Per-order breakdown showing fee + tip + gift for each delivered trip.
- The gift amount is shown on the incoming order card **before** the rider swipes to accept, so they know the reward up front.
- Settlement history and a complaint/support entry.

## 7. Stall portal money view

- Earnings with commission deducted, shown per order.
- Settlement history with dates and references, pending amount, and a complaint/support entry.

## 8. Login goes straight to the right app

After sign-in the person lands on the portal that matches their account:
stall owner → stall app, delivery partner → rider app, admin → admin panel, everyone else → the food home page. They only see the interface meant for them.

## Technical notes

- New table `settlements` (party type, stall/rider id, amount, period covered, reference, paid_at) with admin-only write access and read access for the owning stall/rider.
- `refund_requests.status` extended to the full journey (`REQUESTED`, `UNDER_REVIEW`, `IN_PROGRESS`, `APPROVED`, `REJECTED`, `COMPLETED`) plus an admin response field; a new admin RPC advances the state and credits the wallet on completion.
- Gift amount is already derived in `complete_delivery`; the same formula (`src/lib/pricing.ts` `platformRetainedProfit`) will be exposed to the rider offer card.
- Admin page is split into small section components under `src/components/admin/` and rendered from `src/routes/admin.tsx` via an icon tab bar; existing panels (`AdminReports`, `RevenueSplit`, `CashRemittances`, `MarketingManager`, `PageStudio`) are reused inside the new sections.
- Login redirect reads `user_roles` + `vendors.owner_id` + `delivery_partners.user_id` right after sign-in in `src/routes/auth.tsx`.
