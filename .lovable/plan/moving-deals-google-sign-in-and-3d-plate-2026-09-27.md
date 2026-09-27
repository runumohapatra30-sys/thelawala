# Moving Deals, Google Sign-In, and 3D Plate

## Build
- Replace static offer strips with smooth, continuously moving item rails that pause for touch or reduced-motion preferences; use only live menu and curated-offer data.
- Upgrade “Build your plate” to an auto-rotating 3D food plate inspired by the supplied reference, with visible depth, lighting, food photos, quantity badges, and working add/remove controls.
- Keep the 3D plate lightweight and client-only so the rest of the home page remains fast and reliable on mobile.
- Expose Google account sign-in from the customer login experience and keep existing role-based redirects. Do not create or update an additional profile record from Google data.
- Preserve existing single-stall cart restrictions, real prices, offers, checkout, and admin-managed content.

## Technical details
- Use React Three Fiber with procedural plate geometry and photo textures from the live catalog; no competitor assets or hardcoded demo products.
- Use the existing Lovable Cloud Google OAuth helper and public `/auth` return path.
- Add fallback plate presentation for devices without WebGL and respect reduced motion.
- Record the new 3D/client-only structure in the project architecture notes.

## Verification
- Check the home page at mobile and desktop sizes, including rotation, item selection, cart updates, and moving rails.
- Verify Google sign-in opens correctly, app errors are clean, and the latest preview build succeeds.
