# Garment renderer — proven seed (read this before touching rendering)

A working invisible-mannequin rashguard renderer already exists and is **validated by
screenshot**. It is at `docs/garment-proto-v2.html`. Do **not** reinvent it. Extend it.

## What is already proven to work

Rendering an "invisible mannequin" garment — the product-shot style XMartial uses on every
product card — entirely in inline SVG, client-side, with **no photographed assets and no
libraries**. Verified in Chrome at 1000×1000.

The layer stack, in paint order, all inside one `clip-path` of the garment silhouette:

1. **Base colour** — flat `<rect>` fill.
2. **Artwork** — `<rect>` filled with a `<pattern>` (or `<image>`), clipped again to the
   panel it belongs to (`torso`, `sleeveL`, `sleeveR`).
3. **Form shading**, `mix-blend-mode: multiply` — this is what creates the illusion of a
   body inside the garment. Side-falloff gradients, pec undershadows, sternum groove,
   abdominal segments, serratus/lat shadows, hem shadow, per-sleeve cylinder gradients
   whose axis runs perpendicular to the arm, shoulder-cap creases.
4. **Highlights**, `mix-blend-mode: screen` — chest radial, arm centre strips, shoulder
   tops, deltoid caps. This is the polyester sheen.
5. **Fabric grain**, `mix-blend-mode: overlay` — `feTurbulence` fractal noise at
   `baseFrequency 0.85`, alpha ~0.26, layer opacity ~0.5.
6. **Seams** — stroked paths: raglan (collar → armpit), cuffs, hem, collar rib.
7. **Edge** — the silhouette stroked at ~20% black, outside the clip.

Plus a blurred contact-shadow ellipse *behind* the garment.

Because shading and highlights are blend layers **above** the artwork, any uploaded design
automatically picks up the body's form. That is the whole trick — the artwork never needs
to be pre-shaded.

## Two traps that already cost time — do not repeat them

1. **Never put `clipPath` / `filter` / gradient defs in a separate `<svg>` element.**
   Cross-root `url(#id)` references silently fail: clips do not clip, blurs do not blur,
   and you get flat coloured rectangles. Every rendered SVG must carry its own `<defs>`.
2. **ID collisions between instances.** Multiple garments on one page (a catalog grid!)
   each need a unique ID namespace. The seed does this with a `UID` counter and an
   `id(name)` helper. Keep that.

Also: `navigate_page` with `type:"reload"` served a stale `file://` page even with
`ignoreCache`. Bust it with a `?v=N` query string when screenshot-verifying.

## Geometry conventions

`viewBox="0 0 1000 1000"`, garment centred on x=500, collar ~y=224, hem ~y=804,
cuffs ~y=706–726. Compression fit: defined deltoid, sleeves that taper bicep → cuff,
slight waist draw-in. Paths currently defined: `TORSO`, long-sleeve L/R, short-sleeve L/R,
and a combined `garment` silhouette per style (`STYLES.ls`, `STYLES.ss`).

A style entry is `{garment, sleeveL, sleeveR, seams}`. Add new styles by adding entries —
the shading code is style-agnostic apart from the two sleeve clips.

## What still needs building

- **Back view** — same torso, no raglan front seam, straighter hem, yoke seam.
- **Spats** and **fight shorts** silhouettes + their own shading (leg cylinders, waistband).
- **Uploaded raster artwork** instead of the demo `<pattern>`: use `<image>` inside a
  `<pattern>` with `patternTransform` for scale/rotate/offset, so pan/zoom controls are
  just transform maths. Watch canvas tainting on export.
- **Displacement / drape.** The seed has a `feTurbulence`-based wrinkle filter authored but
  not yet wired to `feDisplacementMap`. This is a nice-to-have; the multiply shading alone
  already reads as fabric. Treat displacement as polish, and cut it if it costs believability.
- **PNG export** — serialise the SVG, draw to a canvas at 2000–3000px, `toBlob`.
  Note: viewers of a published Artifact cannot download files the page generates.

## Known tuning notes from the screenshot review

- Over bright all-over prints the multiply shading reads slightly weak — consider raising
  shading opacity when the artwork's mean luminance is high.
- Torso is marginally wide at the hem versus a real rashguard.
- The chest-logo placeholder is a pentagon; replace with the real mark once supplied.

## Export path — VERIFIED, and the one rule you must not break

Tested end-to-end in Chrome (`docs/export-test.html`, screenshot-verified):

- `mix-blend-mode: multiply / screen / overlay` **survives** serialise → `Blob` →
  `<img>` → `ctx.drawImage` → canvas. Measured channel spread between the highlight and
  shadow zones was 591 (vector art) and 534 (raster art); a flat result would be <60.
  The rasterised output is visually identical to the live DOM render.
- `feGaussianBlur` and `feTurbulence` also survive.
- `getImageData` and `toDataURL('image/png')` both succeed — **canvas is not tainted** —
  and produced a 417 KB PNG.

**The rule: read uploads with `FileReader.readAsDataURL()` and embed the resulting
`data:` URL directly into the SVG.** Do *not* use `URL.createObjectURL()` for artwork that
must be exported — a `blob:` URL taints the canvas and `toDataURL` will throw
`SecurityError`, silently killing export. Set both `href` and `xlink:href` on `<image>`
so the serialised SVG rasterises reliably.

Export at 2000–3000 px by giving the serialised SVG explicit `width`/`height` attributes
(not just a `viewBox`) and sizing the canvas to match.

Caveat: if this is ever published as a Claude Artifact, page-initiated downloads are
blocked for viewers. On GitHub Pages / any normal static host, downloads work fine —
build for the static host and treat the Artifact as preview-only.
