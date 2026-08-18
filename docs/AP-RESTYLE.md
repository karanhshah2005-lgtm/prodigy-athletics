# Storefront restyle — "make it look like albinoandpreto.com"

Client request 2026-08-18. Measured directly on albinoandpreto.com at 1440×900 (home,
/collections/nogi, a ranked-rashguard PDP). Numbers below are observed, not guessed.

## What A&P actually is (the look to hit)

- **Pure white page, black text, no accent colour** on the shop pages (their only colour is a
  neon-yellow rewards bar we do not need). Zero card chrome: no borders, no backgrounds, no
  badges, no ratings, no hover-swap.
- **Type**: `HelveticaNeue, "Helvetica Neue", Helvetica, Arial, sans-serif` everywhere; body
  12px. Nav links **11px / 400 / uppercase**, ~43px apart, starting 40px from the left. Product
  title **14.4px / 700 / letter-spacing 0.72px / uppercase in practice**; price **14.4px / 400**;
  "Sold out" inline after a struck price. PDP h1 **20px / 800 / letter-spacing 1px / uppercase**;
  PDP price 16px/400.
- **Header**: 50px tall, white, no border, `position: relative` (not sticky). Links left,
  **logo right** (~200×38 image, 108px from the right edge). Nav: SHOP · PROJECTS · NOT A
  MAGAZINE · A + PERSPECTIVE · ACCOUNT · CART 0. SHOP opens a list of collections (NEW
  RELEASES, BEST SELLERS, NOGI, APPAREL, …).
- **Homepage** = nav + a **stack of full-bleed editorial photos**, each linking to a release,
  with a small bold uppercase caption bottom-left ("BEST SELLERS"), then a tiny footer. No
  product grid on the homepage, no hero copy, no CTAs.
- **Collection page**: "Sort" dropdown top-right only — **no filter rail**. Grid is edge-to-edge
  (page width 1425 of 1440), **6-up**, item pitch 237.5px with a **40px left gutter per item**
  (`.grid` margin-left −40px), row pitch 318px. Image 197.5px square, garment on pure white.
  Below: title (bold, tracked), price. Nothing else.
- **PDP**: two columns; image left with prev/next chevrons; right: h1, price, "Color" and
  "Size" as **native `<select>`s** (~65×36 / 83×36), full-width **black 38px "Add to cart"**
  (11px text, no radius), then plain description paragraphs (bold lead paragraphs, bulleted
  policy notes). No accordions.
- **Footer**: single row of tiny uppercase links (FAQ · TERMS OF USE · PRIVACY POLICY ·
  ACCESSIBILITY · CONTACT · SIZE CHART · RETURNS), an email field + Sign Up, social icons,
  © line. All small, all black on white.

## Translation for Prodigy (we have renders, not photography)

- **Release panels replace editorial photos**: each full-bleed panel is an off-white
  (`#f4f4f2`) stage with 3–5 large garment renders composed like a flat-lay editorial (e.g. the
  five ranked short-sleeves in a row; the camo set; the flag set; "DESIGN YOUR OWN" panel with
  a garment + cut sheet), caption bottom-left in bold caps. Honest by construction — they are
  obviously renders — and structurally identical to A&P.
- **Grid**: exactly A&P — 6-up on ≥1200, 3-up 720–1199, 2-up below; white, no card chrome,
  title/price only. Our `renderGarment(..., detail:'lite', size:300)` already produces the
  flat-on-white product image; drop the tile background/border/badges/hover-swap/colour dots
  /quick-add.
- **Nav**: SHOP (dropdown listing our cuts/themes as "collections" — replaces the filter
  rail) · RANKED · SETS · STUDIO · CART 0. Logo right (wordmark.svg, black).
- **Sample honesty stays but goes quiet**: a one-line 11px grey strip above the header
  ("Sample storefront — prices and copy are placeholders."), price rendered "$75 sample" in
  the same 14.4/400 as A&P's price, and the existing footer line. Remove SAMPLE badges (A&P
  has no badges).
- **PDP**: A&P layout, with our honest paragraphs (fabric/shipping/returns marked sample) and
  the IBJJF note as a plain paragraph. Native selects for Sleeve / Size / Colour.
- **Colour**: storefront tokens override to white/black; Prodigy Gold retired from the
  storefront (allowed only inside the wordmark if at all). The Studio keeps its own theme.
