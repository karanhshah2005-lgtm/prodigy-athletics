# Prodigy Athletics — Rashguard Studio + Storefront

Static, zero-dependency demo for **Prodigy Athletics** (Canadian BJJ apparel):

- **`studio.html`** — upload artwork, see it on long-sleeve / short-sleeve rashguards, grappling
  shorts and spats (front + back), ranked-belt mode with an honest IBJJF coverage estimate,
  factory print-panel / cut sheet, PNG export (single views, 5-belt colourway grid, set view).
- **`index.html`** — an XMartial-style catalog where **every product view is rendered live in
  the browser**; the client's own photography (docs/PHOTOS.md) appears as campaign imagery and
  as grid thumbnails where it genuinely shows the product.

Everything here is **sample data**: prices, SKUs, shipping/returns copy are placeholders
pending the client's real assets. See `docs/DESIGN.md §7` for what is OBSERVED vs PROPOSED and
what the client must supply.

## Run locally

```
python -m http.server 8000     # from this folder (ES modules need http, not file://)
open http://localhost:8000/index.html   and   /studio.html
```

## Layout

```
index.html / studio.html      entry points
src/render/garment.js         invisible-mannequin SVG renderer (4 styles × 2 views, ranked, lite/flat)
src/render/art.js             upload → data URL → <pattern> with transforms
src/render/export.js          SVG → PNG, colourway grid composer
src/render/panel.js           print panel / cut sheet
src/ui/*, src/data/*          studio + storefront UI, sample catalog, procedural patterns
src/brand.css, assets/        proposed brand tokens, original P monogram / wordmark
docs/                         design spec, renderer notes, prototypes, test pages
```

Built 2026-08-17. Rendering technique and traps: `docs/RENDERER-SEED.md`.
