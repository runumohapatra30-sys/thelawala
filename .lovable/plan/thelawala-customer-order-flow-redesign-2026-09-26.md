# ThelaWala customer order flow redesign

## Goal
Match the supplied Blinkit/Swiggy mobile experience across cart, address selection, order confirmation, and live tracking while keeping ThelaWala’s forest-green, cream, sage, and warm-yellow identity. The reference screenshots will guide layout only and will not be embedded or copied as assets.

## What will change
- **Cart and checkout:** Replace the oversized green cart header with a compact white app bar, a green savings strip, cleaner item rows, horizontal add-on suggestions, a clear coupon row, delivery-tip choices, separated bill details, cancellation note, and a strong sticky total/action footer.
- **Address flow:** Restyle the location picker as a polished bottom sheet with saved/current/new options, followed by a focused confirmation dialog showing recipient, phone, and address before continuing.
- **Payment confirmation:** Add a proper Cash-on-Delivery confirmation sheet and preserve the existing rule that online orders are created only after verified payment success.
- **Order success:** Present a clean full-screen ThelaWala-green success state with order destination before opening tracking.
- **Live tracking:** Make the map the dominant first view, overlay a compact ETA/status panel, surface rider call/chat controls, then show deal/item content and order details below without obstructing the route.
- **Order history:** Bring the list and bill sheet into the same compact visual system.

## Guardrails
- Preserve all current cart, distance-fee, coupons, wallet, tips, payment, order creation, realtime tracking, OTP, cancellation, and support behavior.
- Use existing semantic design tokens and shared controls; no competitor branding, screenshots, or copied assets.
- Keep every mobile control readable and reachable above fixed bars, and retain desktop centering.

## Verification
- Check cart, address sheet, order success, tracking, and order history at 432×792 and desktop width.
- Confirm the current build is clean and key buttons/sheets work without overlap.
