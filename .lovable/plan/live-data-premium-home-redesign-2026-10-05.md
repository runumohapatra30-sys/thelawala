# Live-data premium home redesign

## Goal
Apply the supplied compact quick-commerce home design without replacing any real ThelaWala data or existing customer actions.

## Changes
- Restyle the sticky delivery header, animated search, category pills, promotional bento area, product cards, and floating cart dock.
- Populate the new sections from live approved stalls, categories, menu items, offers, prices, cart quantities, saved address, and wallet balance.
- Keep voice search, category filtering, stall navigation, add/remove controls, banners, active-order tracking, and the existing bottom navigation working.
- Use the established ThelaWala semantic colors and real food images instead of the mock colors, emojis, or competitor-style branding in the sample.
- Keep loading, retry, no-products, and mobile-safe states intact.

## Technical details
- Recompose the existing home route rather than creating a demo-only page.
- Reuse the current live catalog subscription and cart store; animations use the already-installed motion library and respect reduced-motion settings.
- Avoid changing checkout, pricing, order creation, or backend data.

## Verification
- Check the live home page at mobile and desktop widths.
- Confirm search, category selection, add/remove, stall links, cart dock, and bottom navigation work with live data.
- Confirm the latest build and browser console are clean.
