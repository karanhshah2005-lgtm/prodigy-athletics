# Agent context — read fully before touching anything

Repo root: `C:\Users\Jenis\prodigy-athletics` (git, branch master). Windows. Node 24, Python 3.11.

**Read these first:**
- `docs/DESIGN.md` — the full spec: what to build, what is CUT, brand rules
- `docs/RENDERER-SEED.md` — the proven rendering technique + traps that already cost time

**Working prototypes (screenshot-verified in Chrome) — build FROM them, do not reinvent:**
- `docs/garment-proto-v2.html` — LS + SS front, art on sleeves / full print
- `docs/garment-proto-v3-back-spats-shorts.html` — back view, spats, shorts
- `docs/panel-proto-v1.html` — flat pattern / cut sheet
- `docs/export-test.html` — proves blend modes survive SVG→canvas, canvas untainted

## Non-negotiable technical rules

1. Every rendered SVG carries its **own `<defs>`**. Cross-`<svg>` `url(#id)` references
   silently fail: clips stop clipping, blurs stop blurring, you get flat rectangles.
2. Every SVG instance needs a **unique id namespace** (a `uid` string). The catalog grid puts
   20+ garments on one page; colliding ids cross-wire them.
3. Uploaded artwork MUST be read with `FileReader.readAsDataURL` and embedded as a `data:`
   URL. **Never** `URL.createObjectURL` for art that gets exported — a `blob:` URL taints the
   canvas and `toDataURL` throws `SecurityError`, killing export silently. Set BOTH `href`
   and `xlink:href` on `<image>`.
4. Static site, **zero dependencies**, no build step, no backend, no CDN, no external fonts.
   Plain ES modules.
5. ES modules do not load over `file://`. Test with
   `cd C:\Users\Jenis\prodigy-athletics && python -m http.server 8000` and open
   `http://localhost:8000/...`. Check whether a server is already on :8000 before starting one.
6. Do NOT use `ctx.filter` (disabled in Safari). Do NOT use SVG `feDisplacementMap` for
   drape (its `scale` semantics diverge across browsers on non-square regions). Multiply
   shading does the heavy lifting; displacement is cut from v1.
7. Export cap: 2048 px long edge on touch devices (iOS canvas area cap), 3000 px on desktop.

## Brand rules — trust-critical, the client will read the output

- Do NOT claim any partnership between Prodigy Athletics and SAU. No source documents one.
- Do NOT use the SAU crest/name or "Invincible Fighting Championships" anywhere.
- Invent NO prices and NO SKUs presented as real. Zero real price points exist. Sample data
  must be visibly labelled as sample data.
- Invent NO achievements, athlete counts, testimonials, review counts, or "as seen in" logos.
- Palette (PROPOSED): Ink Navy `#0B1220`, Bone White `#F5F3EE`, Prodigy Gold `#E8A33D`,
  neutrals `#1A1A1A` `#5A5A5A` `#DBDBDB`. Body/UI type stack: `Barlow, 'Segoe UI', system-ui,
  sans-serif`. Belt colours (white/blue/purple/brown/black) are a SEPARATE semantic system
  encoding rank — never brand chrome.
- Sizes are XS–4XL letter sizes. NEVER A1/A2/A3 (gi sizing — marks the tool as an outsider's).
- IBJJF Art. 8.1.14 verbatim (quote exactly, never paraphrase into a rule that isn't there):
  > "Both genders must wear a shirt of elastic material (skin tight) long enough to cover the
  > torso all the way to the waistband of the shorts, colored black, white, or black and
  > white, and with at least 10% of the rank color(belt) to which the athlete belongs."
- Never emit a pass/fail "IBJJF LEGAL" badge. Only an "approx. X% rank colour" estimator.
- Two myths NOT to repeat: there is no IBJJF rule capping sponsor logos at 50% on rashguards
  (patch rules are Gi-only), and no rule text on rashguard sleeve length / sleeveless.

## Module contract — implement EXACTLY these signatures so pieces compose

```js
// src/render/garment.js
export const STYLES;   // { ls, ss, shorts, spats }
export function renderGarment({ style, view, baseColor, slots, size=1000, detail='full', uid, defs='' }) -> string
   // style: 'ls'|'ss'|'shorts'|'spats'   view: 'front'|'back'
   // slots: { [slotKey]: paintString|null }  e.g. { all:'url(#u-art)', sleeveL:'#004ABE' }
   //        slot 'all' floods the whole garment; named slots paint on top of it
   // detail: 'full' | 'lite'  (lite drops grain + heavy blurs, for grid cards)
   // defs: extra <defs> markup (e.g. art <pattern>s) injected into this SVG's own <defs>
   // RETURNS a complete self-contained <svg>...</svg> STRING
export function slotsFor(style, view) -> [{ key, label, printPx:[w,h] }]
export function renderRanked({ style, view, belt, body='black', uid, size, detail, defs, slots }) -> string
   // belt: 'white'|'blue'|'purple'|'brown'|'black'; body 'black'|'white'
export const BELT_HEX;  // { white, blue, purple, brown, black }

// src/render/art.js
export async function fileToArt(file) -> { dataUrl, w, h }
export const DEFAULT_TRANSFORM;   // { scale:1, rotate:0, x:0, y:0 }
export function artPatternDef({ uid, key, art, transform, tile }) -> string   // <pattern> markup
export function artPatternRef({ uid, key }) -> string                         // 'url(#uid-key)'

// src/render/export.js
export async function svgToPng(svgString, { width, height }) -> Blob
export function downloadBlob(blob, filename)
export async function composeGrid(svgStrings, { cols, cellSize, bg, labels }) -> Blob

// src/render/panel.js
export function renderCutSheet({ style, slots, baseColor, uid, defs='' }) -> string
```

## Verification is mandatory

Serve over http, open your work in Chrome via the `mcp__chrome-devtools__*` tools
(`new_page`, `take_screenshot`, `list_console_messages`, `evaluate_script`), **take a
screenshot and look at it**. Do not report success on code you have not seen render. If it
looks wrong, fix and re-screenshot. Report honestly what you verified vs. only wrote.

Note: `navigate_page type:"reload"` can serve a stale page — bust with `?v=N`.
