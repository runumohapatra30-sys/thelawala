# ThelaWala Checkout, Promotions, and Curated Bundles

## Goal
Apply the supplied premium green-and-cream checkout design to the real customer flow, while keeping live cart data, addresses, admin-controlled fees, wallet/coupons, and verified Cashfree payment intact.

## Customer checkout
- Replace the current checkout presentation with the supplied compact mobile layout: serif cart header, stall name and distance, free-delivery progress, item rows, quantity controls, quick add-ons, bill details, rider commitment, and fixed total/payment bar.
- Use the existing cart and same-stall recommendations rather than hard-coded demo products.
- Calculate delivery progress and charges from live admin settings; show the measured kilometres and any real free-delivery saving.
- Preserve address selection, coupons, wallet, tips, instructions, COD/online selection, checkout validation, and the rule that an order is created only after Cashfree reports success.
- Keep semantic project colours and accessible icon buttons; do not embed the uploaded reference screenshots.

## Promotions and curated bundles
- Add `app_promotions` and `curated_bundles` with timestamps, explicit grants, RLS, public active-read policies, and admin-only write policies.
- Add safe defaults and validation for prices and ordering; keep inactive rows hidden from customers.
- Show the active welcome promotion on Home as a dismissible branded offer panel.
- Show active curated bundle cards in checkout; adding a bundle resolves to a real in-stock menu item from the current stall so cart/order data remains valid.

## Admin controls
- Extend Marketing with controls to create, activate/deactivate, edit, reorder, and remove welcome promotions and curated bundles.
- Allow image URL, offer copy, badges, prices, and CTA text to be managed without code changes.

## Technical details
- Reuse the existing browser client and role checks; no privileged client access in customer code.
- Add a schema migration first, then update generated app-facing types through the existing integration workflow.
- Use existing design tokens and components; no raw demo pricing logic will replace `computeBill`.

## Verification
- Check the customer flow at 432×768 and desktop: quantity changes, recommendations, address picker, bill expansion, and fixed footer without overlap.
- Verify admin CRUD and customer visibility rules for active/inactive promotion content.
- Confirm typecheck/build health and browser console/network behavior.
