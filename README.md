# Prodigy Athletics — Rashguard Studio + Storefront

Static, zero-dependency demo for **Prodigy Athletics** (Canadian BJJ apparel):

- **`studio.html`** — upload artwork, see it on long-sleeve / short-sleeve rashguards, grappling
  shorts and spats (front + back), factory print-panel / cut sheet, PNG export (single views,
  set view).
- **`index.html`** — the landing page, modelled on albinoandpreto.com (client direction):
  two full-bleed photo panels (credited third-party event photography, docs/PHOTOS.md
  batch 2) linking to the shop and to Culture.
- **`shop.html`** — the storefront: editorial sections where **every product view is rendered
  live in the browser** and the client's own photography (docs/PHOTOS.md) is the campaign
  imagery, then a product grid on albinoandpreto.com's collection tiles (flat-lay on white,
  back view on hover, title + price). The grid's product photographs are **AI-generated
  placeholders** (docs/PHOTOS.md, "Placeholder product imagery"), captioned as such, until the
  client's own flat-lays arrive.
- **`product.html?id=<id>`** — one page per product (src/ui/product.js), modelled on an A&P
  product page: stacked gallery (placeholder front/back, renders of the cut, 360 for tops),
  buy column with native selects, plain paragraphs, "complete the set" / "more from".
- **`culture.html`** — two lookbook sections (modelled on albinoandpreto.com/blogs/lookbooks):
  "Thinkandwin." — credited third-party event photography, captioned to exactly what each
  frame shows, deliberately linking nowhere because no product is shown; and "The line,
  worn." — the client's own photography, linking into shop sections.

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
src/ui/*, src/data/*          studio + storefront UI (store.js shop, product.js product page, shared.js helpers), sample catalog, procedural patterns
assets/photos/products/       PLACEHOLDER flat-lay product frames, <id>-{front,back}.webp (docs/PHOTOS.md)
src/brand.css, assets/        proposed brand tokens, original P monogram / wordmark
docs/                         design spec, renderer notes, prototypes, test pages
```

Built 2026-08-17. Rendering technique and traps: `docs/RENDERER-SEED.md`.
