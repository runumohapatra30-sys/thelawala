# ThelaWala reference-screen update

## Opening and first visit
- Replace the opening video with the uploaded orange ThelaWala image, full-screen for 2.8 seconds with a smooth fade.
- Follow it with three delivery introduction screens matching the reference: tracking, local delivery and careful handover, with Next, Back and Skip.
- Show introductions only on the first visit; preserve catalog loading and existing checkout.
- Create original delivery illustrations rather than embedding screenshots or phone frames.

## Login
- Replace the old page and popup styling with the orange food-photo reference and ThelaWala logo.
- Retain admin-managed food photography and the existing Google sign-in; do not add unrequested password fields or unsupported social providers.
- Keep sign-in destinations and partner access working.

## ThelaWala Care
- Match the concierge reference with a warm, uncluttered conversation screen, orange actions, food cards and compact composer.
- Preserve the current single-session conversation and ThelaWala-only responses; no unrelated recommendations or invented order details.
- Show real approved, available products with working cart actions.
- Add customer-owned order selection for refund requests, support ticket receipts and tracking of admin replies.
- Keep current order, bill, cancellation and support assistance available.

## Refunds
- Automatically credit eligible paid amounts to the ThelaWala wallet for cancellations before cooking begins and cancellations caused by no available rider, as confirmed.
- Send all other refund requests to the admin for review.
- Enforce eligibility, ownership, paid-amount limits and duplicate prevention on the server, not in chat text.
- Keep an admin-visible refund record and show the actual receipt, progress and credited amount to the customer.
- Update refund wording so it does not promise payment before eligibility or review is complete.

## Order tracking and alerts
- Match the tracking reference's proportions: large real map, orange delivery-partner strip, delivery estimate and address beneath it.
- Preserve real rider photography, call/chat actions, OTP, bill, cancellation controls and order journey; never use sample rider names, ratings or addresses.
- Keep tracking usable before rider assignment and for completed or cancelled orders.
- Make customer notifications update live and open the relevant order or support record.
- Connect Firebase Messaging for background push. A connection card will request setup; device permission must be granted in the published app or its own browser tab.
- Send order-status alerts from actual order changes. Do not fabricate stall offers or automatically accept/cancel orders from a notification.
- Offer acceptance requires a defined stall-to-customer offer flow; existing rider dispatch offers are not customer offers.

## Technical approach
- Keep presentation changes separate from catalog pricing, ordering and payment logic.
- Use existing theme tokens, buttons and unique real-time subscription names.
- Use transactional database refund handling with durable deduplication and owner-scoped records.
- Implement event-driven push delivery with protected device registration and verified server delivery; no permanent polling sender.
- Remove the launch video's import and playback, without deleting unrelated uploaded media records.

## Verification
- Test both automatic-refund cases, unpaid-order rejection, duplicate prevention and admin-review fallback.
- Check launch → introductions → home, login entry, real-product cart additions, ticket creation/readback and refund tracking.
- Check tracking and chat at the supplied 432 × 792 size and desktop, including long names and missing rider data.
- Background push requires a linked Firebase connection and a permission-granted device; report any remaining setup limitations explicitly.