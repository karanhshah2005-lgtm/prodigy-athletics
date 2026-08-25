# Prodigy Athletics — Rashguard Studio + Storefront

Design spec. Client: **Prodigy Athletics**, a BJJ/grappling apparel brand connected to
**SAU (Submission Arts United)**.

Two deliverables, one codebase:

1. **The Studio** (`studio.html`) — upload artwork, see it on real rashguard styles,
   export mockups and a factory cut sheet.
2. **The Storefront** (`index.html`) — an XMartial-style catalog showing the range.

The connective idea: **one renderer, two consumers.** The storefront's product views are
produced by the same code as the Studio's preview. Campaign photography is the client's
own (docs/PHOTOS.md, supplied 2026-08-24) and appears only where it genuinely shows the
product; everything else is a render.

---

## 1. What we verified before designing (do not re-litigate)

All three technical risks are closed, with screenshots and measurements in `docs/`:

| Risk | Status | Evidence |
|---|---|---|
| Can we render a believable garment with no photos? | **Closed** | `docs/garment-proto-v2.html` — invisible-mannequin LS/SS front |
| Do back / spats / shorts work too? | **Closed** | `docs/garment-proto-v3-back-spats-shorts.html` |
| Does export preserve the shading? | **Closed** | `docs/export-test.html` — blend spread 591/534, canvas untainted, 417 KB PNG |

Read `docs/RENDERER-SEED.md` before writing any rendering code. It documents the layer
stack, the geometry conventions, two cross-SVG reference traps that already cost time, and
the data-URL rule that keeps export from silently breaking.

## 2. Category facts that shape the product

From primary-source research (IBJJF Rules Book v6.1 2024, Art. 8.1.14, plus vendor specs).
These are not decoration — each one changes a design decision:

- **Rashguards are cut-and-sew dye-sublimated.** Artwork prints *flat on the roll*, then
  pieces are cut and sewn. So the default canvas state is a **full-bleed all-over print**,
  with named regions as masks *on top* of it. Starting from an empty garment with a
  logo drop-zone is the cotton-tee mental model and it is wrong here.
- **Coverage is free.** No per-color or per-location screen charge, so a 12-color full
  bleed costs the same as a one-color chest hit. This is why the category converges on AOP.
- **A "colorway" is a different artwork file, not a different blank.** You cannot
  sublimate a dark blank. So recoloring must recolor *artwork*, not tint a garment texture.
  Corollary worth selling: infinite colorways cost the brand nothing.
- **Seams are where designs actually fail**, and cross-seam alignment is only confirmed at
  sampling — *after* the owner has committed to a 40–100 unit MOQ. Rendering seams honestly
  is worth more to them than photoreal fabric.
- **The IBJJF 10% rank rule is an AREA constraint, not a placement one.** Verbatim: *"…
  colored black, white, or black and white, and with at least 10% of the rank color(belt)
  to which the athlete belongs."* It says nothing about sleeves, bands, or cuffs.
- **Two widely-repeated myths are false**: there is no IBJJF rule capping sponsor logos at
  50% on a rashguard (the patch rules are Gi-only), and no rule text specifying rashguard
  sleeve length or banning sleeveless. Getting these right in tooltips is cheap credibility
  with an audience that argues about this constantly.
- **Sizing is XS–4XL letter sizing, never A1/A2/A3.** A1/A2 is gi sizing; using it would
  immediately mark the tool as built by someone outside the sport.
- **Kits are the unit of design.** Brands merchandise one artwork across rashguard +
  shorts (+ spats) as a named set. "Same art across styles" is not a comparison feature,
  it is the actual product.

## 3. The Studio

### Layout — four regions

Converged from Placeit and Vexels (verified hands-on by research), avoiding the
3D-configurator anti-pattern of leaking raw transforms into the UI.

```
┌────┬──────────────┬───────────────────────────────┬──────────────┐
│icon│  contextual  │                               │   scenes     │
│rail│  panel       │        canvas                 │  (batch      │
│    │              │   [Front|Back|Cut Sheet]      │   export)    │
│Sty │ named slots  │                               │  ☑ front     │
│Art │ + controls   │                               │  ☑ back      │
│Col │              │                               │  ☐ set       │
│Rank│              │                               │  ☐ grid      │
│Exp │              │                               │              │
└────┴──────────────┴───────────────────────────────┴──────────────┘
```

- **Empty state is the spec sheet.** Every print area shows its own name and required
  pixel dimensions inside a dashed boundary — "LEFT SLEEVE / 1200×2400 px". Placeit and
  Vexels arrived at this independently; it is the highest-confidence pattern in the sweep
  and it kills the most common support question before it is asked.
- **Named panel slots, not a layers panel.** Front torso, back torso, sleeve L/R, collar,
  base colour. Slots make the tool legible in seconds and prevent bad placements
  structurally.
- **"All-over print" is a first-class top-level toggle** that restructures the slot list
  and canvas in one click.
- **Control vocabulary:** scale = slider + % field. Rotation = dial + degree field.
  Position = drag + "back to centre" reset. **Never** ship X/Y/Z steppers.
- **Crop step between upload and placement**, with a persistent live preview, so users
  never guess how a crop maps onto fabric.

### Garments — ship exactly four, plus one mode

Ranked by value; this ordering is deliberate.

1. **Long-sleeve rashguard** — flagship SKU, largest canvas, hardest to fake.
2. **Short-sleeve rashguard** — same pattern family, truncated sleeve, near-zero marginal cost.
3. **Grappling shorts** — pocketless, zipperless, hem above the knee. Turns a rashguard
   into a sellable *set*.
4. **Full-length spats** — completes the kit; the only legal standalone bottom for women
   under IBJJF.
5. **Ranked mode** — *not* a fifth garment. A toggle on 1 and 2 that sets the body to
   black or white, floods sleeve panels + collar binding with a rank colour, and reports
   estimated rank-colour coverage.

### Views — ship five

1. **Flat front** and 2. **Flat back**, orthographic, 1:1 artwork fidelity.
3. **Print panel / cut sheet** — flat pattern pieces with cut line, bleed and seams.
   *This is the differentiator.* No consumer mockup tool ships it; real factories send it
   alongside the mockup. Prototype already exists at `docs/panel-proto-v1.html`.
4. **Colorway grid** — one style, N colourways, composited into one shareable image.
5. **Set view** — one artwork across rashguard + shorts (+ spats) on one canvas.

### The rank estimator — handle with care

Display *"approx. X% rank colour — IBJJF Art. 8.1.14 requires at least 10%"*, quote the
rule verbatim in a tooltip, and link the official PDF.

**Do not emit a green "IBJJF LEGAL" badge.** The federation publishes no measuring method,
inspection is a visual judgment at weigh-in, and a false pass could cost someone their
tournament. Ship the ranked preset (black/white body + rank sleeves + rank collar) as the
safe default, because that construction comfortably clears 10%.

### Explicitly cut from v1

Free 3D orbit, cloth physics, real-photo compositing, video export, an in-app text/graphics
editor, a freeform layers panel, sleeveless cuts, sports bras, youth sizes, gi anything,
tees and hoodies, and an "ADCC mode" (ADCC imposes essentially no design constraints, so it
would be a no-op). Displacement-map drape is **polish** — the multiply shading already
reads as fabric; cut it if it costs believability.

## 4. The Storefront

Section order, following the XMartial structure verified by direct inspection:

1. **Announcement bar** — thin, one line.
2. **Nav** — centred wordmark, hamburger left, search/account/cart right. Dark bar.
3. **Hero** — full-bleed, dark, big condensed uppercase claim + two CTAs
   ("SHOP RASH GUARDS" / "SHOP SETS"), with an SAU credential line beneath.
4. **Category tiles** — Long Sleeve / Short Sleeve / Shorts / Spats / Sets.
5. **Product grid** — this is the heart. 4-up desktop / 2-up mobile, 1:1 images,
   **hover swaps front → back** (XMartial's `product-primary-image` /
   `product-secondary-image` pattern), badges, price, rating, colour dots.
6. **Filter rail** — left, accordion facets. XMartial's real STYLE facet is a *theme*
   taxonomy (Ranked, Jiu Jitsu, Anime, Camo, Flag, Minimalist, …), not a cut taxonomy.
   Mirror that, plus Gender and a product count.
7. **PDP** — thumbnail rail left, gallery right; variant pickers for sleeve and size;
   SIZE CHART / SHIPPING / GUARANTEE buttons; bundle module.
8. **Studio cross-sell** — "Design your own" pointing at the Studio. XMartial's own custom
   product is *upload-only with no preview*; ours previews live. That gap is the pitch.
9. **Footer** — columns, SAU affiliation, socials.

Catalog items are data — `{name, style, theme, baseColor, artSpec, price}` — and the grid
renders each card through the shared renderer. Seed ~16–24 designs so the store looks
stocked.

## 5. Technical architecture

Static, zero-dependency, no build step, no backend. Deploys to GitHub Pages.

```
index.html                storefront
studio.html               mockup studio
src/
  render/garment.js       geometry registry + layer stack  (from RENDERER-SEED)
  render/panel.js         flat pattern / cut sheet
  render/art.js           upload → data URL → <pattern> + patternTransform
  render/export.js        serialise → canvas → PNG
  data/catalog.js         seeded designs
  ui/studio.js
  ui/store.js
  brand.css               design tokens
assets/                   logo, favicon, og image
```

**Riskiest remaining three, with fallbacks:**

| Risk | Fallback |
|---|---|
| Rendering 24 garments in a grid is slow (each has filters + blends) | Render cards at lower detail: skip grain and displacement below a size threshold; or rasterise each card once to a data URL and cache it |
| Uploaded art with transparency or extreme aspect ratios looks wrong in a slot | The crop step is mandatory, not optional; letterbox with the base colour and warn |
| Mobile Safari canvas size caps on export | Cap export at 2000 px on touch devices; offer the shareable link path instead of a download |

## 6. Build order

Each chunk is small enough for one agent.

1. `render/garment.js` — port the proven prototypes into one module with a style registry
   (LS/SS/back/spats/shorts), unique ID namespacing, and tuned proportions.
2. `render/art.js` + upload/crop — data-URL rule, `patternTransform` maths.
3. `studio.html` shell — four-region layout, empty state as spec sheet, slot list.
4. Controls — scale/rotate/position, base colour, AOP toggle.
5. `render/panel.js` — cut sheet with corrected piece proportions (bodies wider: ~460×610;
   sleeve ~330×560).
6. Ranked mode + coverage estimator + verbatim rule text.
7. `render/export.js` — PNG at 2000–3000 px, colourway grid, set view, batch scenes.
8. `data/catalog.js` — 16–24 seeded designs.
9. `index.html` storefront — hero, tiles, grid with hover swap, filters, PDP, footer.
10. Brand pass — palette, type, logo, copy, SAU positioning.
11. Adversarial review — honesty of claims, rule citations, mobile, performance.

## 7. Brand

Everything below is tagged **OBSERVED** (sourced, with evidence) or **PROPOSED** (ours).
The distinction is not pedantry — the client will read this, and inventing a fact about
their own brand is the fastest way to lose their trust.

### OBSERVED — Prodigy Athletics

- A Canadian **gi/kimono company first**; rashguards are a line extension. Instagram
  `@prodigy_athletics_canada` ("Prodigy theChampions Canada", ~624 followers). Bio verbatim,
  typo and all: *"We are a kimono company providing world class gis. Jiu jitsu gear made by
  jiu jitsu practioners. Contact us for custom"*.
- **Their confirmed rashguard product is a belt-ranked SHORT-SLEEVE line in five colours.**
  Verbatim reel caption: *"Incoming ranked short-sleeve Prodigy Athletics rashguards- Blue,
  Purple and Brown to complete the collection. We currently have White and Black 🔥"*
- **The storefront is dead.** `prodigy-athletics.com` and the underlying Shopify store
  `23a243.myshopify.com` both 301-redirect to `yourmove.store`, an unrelated activewear
  brand. `prodigykimonos.com` and `prodigyathletix.com` are NXDOMAIN. This is a **relaunch**,
  not a refresh.
- Canada, most likely Ontario (inference from a Shopify `CAON` compliance token and a
  Montreal edge node — not stated anywhere).
- **No logo, palette, typeface, tagline, price or SKU exists online.** The only font in
  archived assets was Harmonia Sans, which is Shopify's *default* theme font and is
  therefore not evidence of anything.

### OBSERVED — SAU (Submission Arts United)

- A **tournament promotion company** — not a gym, not an affiliation, not a ruleset.
  IG bio: *"Jiu-Jitsu Tournaments, Grappling Supershows and MMA events."* Runs the open
  tournaments, the Dream Submission Series, and Invincible Fighting Championships (MMA).
- Ottawa-centred (343 area code), with events in Toronto/Vaughan, Montreal, Hawkesbury,
  Halifax, PEI and one in Chicago. Sanctioned by the Ontario Athletics Commission;
  registration runs through Smoothcomp on OGA and FQJJB subdomains.
- **Real palette, extracted from their Elementor global kit**: navy `#001133`, `#000852`,
  `#002061`, royal `#004ABE`; crest gold `#F5B444`; cyan family `#22B6FF`–`#00EEFF`;
  neutrals `#1A1A1A`, `#FFFFFF`, `#ECECEC`, `#DBDBDB`. Global secondary/text typeface is
  **Barlow**.
- Logo: gold-outlined shield crest, distressed royal-blue field, heavy italic condensed
  white "SAU" monogram with speed-lines, "SUBMISSION ARTS UNITED" letterspaced beneath.
- Taglines: *"Where Passion Meets Precision"* and *"Uniting Grapplers, Inspiring Excellence"*.

### PROPOSED — Prodigy palette and type

Built to sit *beside* SAU's observed crest without becoming SAU merch:

| Token | Hex | Role |
|---|---|---|
| Ink Navy | `#0B1220` | Ground — deeper and cooler than SAU's `#001133` so Prodigy reads as its own mark |
| Bone White | `#F5F3EE` | Primary lockup, body text on dark |
| Prodigy Gold | `#E8A33D` | Single hot accent — a half-step warmer than SAU's `#F5B444` so co-branded pieces harmonise without cloning |
| Neutrals | `#1A1A1A` `#5A5A5A` `#DBDBDB` | UI |

**Belt colours stay a separate, locked, semantic system** (white, blue, purple, brown,
black). They encode rank. They must never be spent on marketing chrome.

Type: a tight condensed athletic sans for wordmark and headlines; **Barlow** for body and
UI — the one typographic fact we actually observed, and shared with SAU, so co-branded
collateral composes at zero cost. Avoid the tribal/flames/blackletter default of budget BJJ
apparel: the confirmed positioning is a *practitioner-craft* claim, so it should read closer
to technical sportswear than fight merch.

### Hard rules for this build

1. **Do not claim an SAU partnership.** No source states one. SAU's site, rules page,
   sitemap and IG bio name no apparel partner at all; the only link is Prodigy's IG grid
   carrying SAU and InvincibleFight posts from Dec 2025. Say "competes at" or "seen at SAU
   events" only if the client confirms; otherwise say nothing.
2. **Do not use the SAU crest, name or Invincible Fighting Championships** in any asset
   without written permission from SAU.
3. **Invent no prices and no SKUs.** Zero price points exist for this brand. Use obvious
   placeholders (`$—`) or clearly-labelled sample data.
4. **Do not confuse the decoys.** `prodigyjj.com` is a US gym in Edmond OK that sells a
   "Ranked Rashguard" at $45 — the most dangerous lookalike. `officialprodigyy.com` is an
   Australian BJJ apparel brand. Neither is the client.

### What the client must supply

Vector logo files and lockups (the logo itself — a geometric brain over PROD·I·GY
ATHLETICS with "THINK AND WIN" — is now confirmed by the client's photography,
docs/PHOTOS.md, but no vector files exist) · exact brand hex/Pantone · licensed typefaces
(or permission to choose) · real SKUs and prices with currency (CAD/USD) · the full gi
range (the GENIUS gi in black/white/blue is confirmed by photography) · whether the
ranked rashguard line is short-sleeve only · **the SAU relationship in writing** · and
confirmation of whether they still control `prodigy-athletics.com` and the Shopify
tenancy, since both now point at another brand. Product photography was supplied
2026-08-24 (docs/PHOTOS.md).

### What this means for the demo

The hero demo is not a generic upload. It is: **upload one artwork → see it as a ranked
short-sleeve rashguard across all five belt colours → export the set.** That is literally
the product they announced and never got to launch, and it is exactly what the colourway
grid view was built for.
