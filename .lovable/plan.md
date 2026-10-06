# Home marketing conversion modules

## Goal
Add five conversion-focused marketing modules to the current home page without changing its existing structure, live catalog, or customer actions.

## Changes
- Show a once-per-day app-open deal sheet with a dimmed backdrop, food image, close control, and ₹9 offer.
- Add the four-item trust grid immediately after the current premium home content.
- Add horizontal craving cards for morning, evening, and late-night food, using existing local food imagery.
- Add a compact ThelaWala-versus-big-apps comparison and a horizontal “Street Picks from ₹9” strip.
- Use existing semantic colors, Framer Motion with reduced-motion support, and mobile-safe scrolling.

## Technical details
- Keep the existing home header, product layout, live data, search, cart, banners, and navigation unchanged.
- Isolate the new content in a focused component and store the daily popup date in localStorage after hydration.
- Use bundled food images; no backend or pricing changes.

## Verification
- Confirm the popup appears once per day and closes correctly.
- Check all five modules at mobile and desktop widths for overflow.
- Confirm the build and browser console remain clean.
