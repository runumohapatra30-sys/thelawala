<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep home-only conversion content isolated from the live catalog UI so campaigns cannot alter ordering behavior.
- Keep the local-stall slideshow in a dedicated client component fed by the unfiltered approved-stall catalog, so search filters cannot silently exclude stalls from its rotation.
- Use app_dynamic_banners as the shared source for scheduled home hero copy, media and theme; prime a public server query in the home loader and invalidate it on realtime events so admin edits never affect catalog or ordering logic.
- Store Soundbox gallery and stock in soundbox_product_settings, not system_settings metadata, so admin uploads and vendor reads share one protected source.
- Keep festive collection shape and media choices in each campaign's promo-card JSON; the dedicated festival page renders live approved catalog products without changing checkout prices.
- Keep independent home-panel visibility in protected visual settings and header artwork in app_theme_config; presentation switches must never affect catalog data.
- Load food background removal only in the browser, queue catalog cutouts, and persist admin-approved foreground uploads in campaign promo-card JSON to avoid reprocessing them.
- Rain UI uses current Bhubaneswar Open-Meteo conditions, not promotional weather tags, so an active rain campaign cannot fabricate live weather.

- Mount the launch splash once in the root so route navigation never replays it; preload images without blocking catalog rendering.
- Render custom payments with Cashfree-managed Elements and its supported bank identifiers; never collect raw card details or infer success from browser callbacks.
- Snapshot the placed order summary before clearing the cart so confirmation remains accurate after local cart cleanup.

- Route home care intents through a browser-safe classifier and use real approved catalog rows and owner-scoped support tickets; deterministic routing prevents unrelated recommendations and invented receipts.
- Refresh ticket messages separately from expansion state, and subscribe with unique channels on customer/admin support views so replies and resolution reports update without stale toggles.
