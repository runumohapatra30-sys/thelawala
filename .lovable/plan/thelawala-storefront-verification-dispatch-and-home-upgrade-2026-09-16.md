# ThelaWala Storefront, Verification, Dispatch, and Home Upgrade

## Goal
Deliver a polished customer home and stall shopping flow, enforce partner verification, and make rider assignment time-bound and reliable.

## Customer storefront
- Add a dedicated `/stalls/:id` storefront for each approved stall.
- Show its cover photo, seller avatar, stall name, address, average rating, open/closed state, preparation time, and only that stall’s menu.
- Make stall circles, stall-linked banners, and item cards open the storefront. Keep cart additions available there with the existing single-stall cart rule and a clear replace-cart warning when switching stalls.
- Add seller/admin controls to upload or replace the public cover and avatar photos; use a dedicated stall-media area rather than private KYC documents.

## Partner verification
- Keep seller and rider applications pending by default and require the existing identity/licence/FSSAI uploads before submission.
- Replace access to operational dashboards for pending or rejected partners with dedicated status screens that show pending or rejection details.
- Enforce approval in the backend so an unapproved stall cannot open/accept orders and an unapproved rider cannot go online, receive, or accept offers.
- Add a clearly named **Verification Requests** admin tab with document previews, approve, and reject-with-reason actions.

## Rider dispatch and refund safety
- Update dispatch offers to last 45 seconds; rejection or expiry immediately advances to the next nearest eligible approved, online, free rider.
- After five minutes without acceptance, enter a broadcast phase for all eligible riders inside the service radius while preserving atomic acceptance so only one rider wins.
- After ten minutes without acceptance, cancel as `cancelled_no_rider`, notify the customer, release offer state, and create an automatic refund log for prepaid orders.
- Keep status values compatible with the existing uppercase order lifecycle while recording the cancellation reason as `cancelled_no_rider`.
- Add server-enforced guards/RPCs for rider acceptance and partner online/open state to prevent client-side bypasses.

## Active order tracking on Home
- Subscribe to the signed-in customer’s newest active order across the full existing lifecycle: placed, preparing, rider search/assigned, ready, and out for delivery.
- Show a non-dismissible tracking card above the cart bar and bottom navigation with stall image/name, animated status, status chip, and estimated arrival text.
- Open the existing full tracking page when tapped; hide immediately on delivered or cancelled updates.

## Home redesign
- Replace the legacy random banner strip with clean admin-controlled promotional slides and safe food-image fallbacks; remove QR-like or unsuitable imagery from the customer carousel.
- Use an edge-to-edge mobile carousel with concise promotional copy such as first-order savings and 15-minute street-food delivery.
- Present Rolls, Chaat, Momos, Chai & Snacks, and Biryani in a clean horizontal category rail using real food imagery.
- Refine spacing, white surfaces, warm yellow accents, and subtle shadows while preserving live festive/admin themes.
- Stack active-order tracking, cart bar, and bottom navigation using shared fixed offsets so they never overlap on mobile.

## Backend and media
- Add stall cover/avatar fields and dispatch timing/broadcast metadata required by the new flows.
- Add a public-read, owner/admin-write stall-media storage policy; keep KYC files private and admin-reviewable through signed links.
- Update generated app-facing database types only through the existing integration workflow.
- Add notification/refund records transactionally during no-rider cancellation and avoid duplicate refund logs.

## Verification
- Test seller and rider application, pending/rejected screens, admin approval, and approval bypass attempts.
- Test cover/avatar upload, stall navigation, item-only filtering, closed-stall behavior, and cross-stall cart protection.
- Test rider reject, 45-second timeout, next-nearest routing, five-minute broadcast, single-winner acceptance, ten-minute cancellation, customer notification, and prepaid refund logging.
- Test active-order card realtime appearance, navigation, status updates, and disappearance.
- Check 432px mobile and desktop views for banner quality, category layout, and fixed-card/navigation spacing; confirm clean build and browser console.
