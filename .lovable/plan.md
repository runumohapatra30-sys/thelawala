# ThelaWala reference-screen update

## Screens to update
- **Opening:** Keep the uploaded orange ThelaWala photo full-screen, then show the three delivery introduction screens.
- **Next screens:** Match the fourth image with original scooter, handover and local-stall illustrations, ThelaWala Express heading, progress dots and Next buttons. Fix the first-visit display error and finish at login; returning customers keep direct home access.
- **Login:** Replace the old welcome/features layout with the second image’s minimal orange upper section and white lower sign-in area. Keep ThelaWala branding, admin-managed food photography and the existing Google sign-in. Do not add nonfunctional password, Facebook or Twitter options.
- **Home:** Preserve the existing home layout and live catalog. The fourth image contains introduction screens, not a separate home design.
- **Chat:** Match the third image’s compact food-chat presentation: light transcript, yellow customer bubbles and side-by-side food cards. Keep ThelaWala-only answers, actual available products, cart actions and support receipts/tracking.
- **Tracking:** Match the first image’s proportions with a large real map, scooter at the actual rider location, orange rider strip, delivery time and address. Preserve order status, OTP, bill, cancellation eligibility and support access.
- **Confirmation:** Match the final image’s white order-details screen, orange outlined check, actual order ID, food photos, quantities, itemized bill, Track Order and Continue to shop. Show it only for a successfully created order; preserve payment verification and summary snapshots.
- **Notifications:** Keep actual order-status notifications and add supported background push using the connected Firebase service. Explain permission-denied, unsupported and preview-in-a-frame states separately. Only real order events generate alerts; no invented stall offers.

## Technical approach
- Keep visual changes separate from catalog, checkout prices, payment verification and refund rules.
- Use shared theme tokens and existing buttons; isolate the new delivery illustrations and reusable confirmation presentation.
- Read first-visit storage after hydration to fix the observed opening mismatch.
- Use AI Elements for the chat transcript/composer, with existing deterministic care routing retained.
- Inspect existing push storage and event delivery before extending it; protect device registration and avoid duplicate deliveries.

## Verification
- Check opening → three Next screens → login → home at 432×792 and desktop.
- Check real product recommendations and cart additions, support ticket creation/readback, and returning-visitor behavior.
- Verify tracking using an accessible real order, long rider/address text, missing rider data and actual map rendering.
- Check confirmation with actual order items and totals without creating a paid test order unnecessarily.
- Run relevant existing tests and check preview errors. Background push delivery requires a permission-granted device; report any device verification limitation rather than claiming delivery.