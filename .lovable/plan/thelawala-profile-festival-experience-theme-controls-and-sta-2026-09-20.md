# ThelaWala Profile, Festival Experience, Theme Controls, and Stall Onboarding Payment

## Goal
Deliver a premium FirstClub-inspired customer account screen, an interactive festival promotion and event page, admin-controlled customer-app colours, and mandatory verified stall onboarding payment.

## Profile / Account redesign
- Rebuild `/profile` around the supplied reference: full-width deep-forest identity header, subtle botanical texture, Home back button, serif customer name, Edit Profile action, and a dark translucent Complete Profile prompt.
- Add three balanced quick actions for Orders, Wallet, and Saved stalls using polished dimensional icon treatments and real account values.
- Replace the current menu with clean divided rows for cashback, addresses, support, gift card, and founder feedback, each with subtitle, icon, and chevron.
- Rework Refer & Earn into a mint-green illustrated parcel/street-food banner while preserving the working referral code, sharing, and code-redemption flow.
- Keep the floating bottom dock and visibly highlight Profile; preserve partner portal links and sign-out in a restrained secondary area.

## Festival promotion and event page
- Add a high-impact forest-green/yellow promotional card to Home with “THELAWALA STREET FOOD FESTIVAL — STARTS SOON”.
- Build an accessible slide/tap control with glow, ripple, vibration, and a short generated Web Audio cue; reduced-motion and unavailable-audio fallbacks remain functional.
- Navigate with the app router to `/festive-deals` and preserve Home’s exact scroll position on return.
- Create `/festive-deals` with unique page metadata, a 0.4-second Framer Motion fade/scale entrance, back control, live cart badge, animated clock tower, golden particles, and live days/hours/minutes/seconds counters.
- Add offer rows for banks, wallets, and UPI apps plus sponsored deal cards and a sticky “Set Reminder & Get ₹25 Wallet Bonus” action.
- Since no launch date was supplied, make the date admin-controlled and seed a safe seven-day default; reminder rewards will be idempotent so one account cannot collect twice.

## Admin-controlled customer theme
- Extend the existing theme configuration with validated primary, accent, background, card, and text colours plus festival launch settings.
- Add colour pickers, accessible contrast preview, reset-to-ThelaWala defaults, and publish controls in Admin Marketing.
- Apply the published palette live across customer-facing pages only through semantic design tokens; vendor, rider, and admin workspaces remain stable and readable.
- Validate colour values on write and enforce admin-only updates with row-level access rules.

## Mandatory stall onboarding payment
- Implement the selected fee rule: ₹99 when a valid FSSAI licence is supplied, otherwise ₹199 including ₹100 registration help.
- Change onboarding so details and documents are validated first, Cashfree’s in-app checkout succeeds second, and only then the stall application is created.
- Record a server-verified onboarding payment reference, amount, status, payer, and timestamp in a dedicated table with owner/admin-only access and explicit grants.
- Add a protected server function that creates the Cashfree session for the calculated fee and another that verifies amount, payer, purpose, and SUCCESS status before atomically creating or authorizing the application.
- Failed, pending, or closed payments keep the form and uploads intact and never create a vendor record; replayed payment references cannot be reused.

## Security hardening for the new work
- Validate profile text, theme colours, festival date/settings, and onboarding inputs on both client and server.
- Keep gateway credentials server-only, verify payment ownership and amount, rate-limit payment-session creation, and use unique/idempotent references.
- Keep customer theme reads public but writes admin-only; keep reminder and onboarding-payment records scoped to their owners/admins.
- Re-run the security scanner after implementation and fix new findings introduced by these changes.

## Verification
- Test signed-in and signed-out Profile states at 432×768 and desktop widths, including text wrapping and dock overlap.
- Test festival slider/tap, route transition, countdown, cart badge, reminder idempotency, and exact scroll restoration.
- Test both ₹99 and ₹199 onboarding branches, plus failed, pending, successful, and repeated payment attempts.
- Check type safety, preview runtime logs, latest build status, and screenshots for Home, Profile, Festival Deals, Admin colours, and vendor onboarding.

## Technical notes
- Use existing TanStack routes and `Link` navigation, existing Cashfree `/pg/orders` + Drop Checkout integration, Framer Motion, and semantic Tailwind tokens.
- Add new route files and database migration(s) without editing generated files.
- Treat the uploaded screenshots and video as visual references only; no FirstClub assets will be copied into the product.
