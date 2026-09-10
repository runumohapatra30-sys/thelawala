# Home Layout and Banner Format Fix

## Goal
Keep every home-screen area in normal vertical flow, prevent mobile overlap, and let admins publish banners in three exact formats.

## Changes
- Separate the delivery header from admin-uploaded festive artwork so the header, search, banners, festive grid, and quick bites stack cleanly.
- Replace the fixed-height header composition with bounded content and safe mobile wrapping.
- Render uploaded festive artwork in its own full-width card, capped at 180px high with cover cropping and rounded corners.
- Extend dynamic banners with `HERO`, `SLIM`, and `4_GRID` formats.
- Add format selection and three live previews in Banner Studio.
- For `4_GRID`, accept and store four image URLs/files, then render them as a responsive 2×2 tile group.
- Keep image/video banners sharp with fixed aspect ratios and `object-cover`; remove free-resize behavior that can stretch content.
- Make newly published banners the active selection for their display position while preserving enable/disable and redirect controls.
- Keep compatibility with existing banners by treating records without a format as `HERO`.

## Backend
- Add `banner_format` with allowed values `HERO`, `SLIM`, or `4_GRID`.
- Add `grid_image_urls` for the four tile images.
- Preserve existing access policies and realtime behavior.

## Verification
- Confirm admin upload, preview, publish, activation, and redirect behavior.
- Check customer home at mobile and desktop widths for overlap, wrapping, aspect ratio, and 2×2 grid alignment.
- Confirm the application build and browser console are clean.
