# Photography (assets/photos)

Three batches. **Batch 1 (2026-08-24) is the client's own product photography; batches 2
(2026-08-26) and 3 (2026-09-04) are third-party event photography that shows no Prodigy
product worn** (batch 3's cage frames show Prodigy's own cage banner). Every honesty
claim on the site must be scoped to the right batch.

## Batch 1 — client photography (2026-08-24)

Supplied by the client on 2026-08-24 (21 JPEGs, ~2048 px, chat-app compressed). Real
photographs of real Prodigy Athletics product on the client's own team — two shoots
(a moody gym studio session and a competition arena) plus one sunset lifestyle frame
the client confirmed is his own. These photographs replaced the AI-generated model
imagery that previously filled every imagery slot (see git history for docs/MODELS.md).

What the photography establishes (previously unconfirmed, see DESIGN.md §7):

- **The real logo** — a geometric/polygonal brain over a "PROD·I·GY ATHLETICS" wordmark,
  with **"THINK AND WIN"** beneath it on garments. (Vector files still owed.)
- **The GENIUS gi** — black, white and blue colourways. Embroidered brain with lightning
  bolts between the shoulder blades, GENIUS across the back skirt, brain patch on the
  front skirt, PRODIGY patch, an embroidered equation down the pant leg, a tonal sleeve
  graphic (construction — to confirm). Worn at real competitions (arena shots).
- **Black no-gi kit** — long sleeve and spats with the brain logo; **blue scale-print
  short sleeve**; a purple-panel short sleeve + shorts (the sunset frame — REMOVED from
  the site 2026-08-25 at the owner's direction and no longer shipped in assets/photos).

Derivatives are cover-cropped WebP (quality 82) sized per slot; the conversion script
lives in the session scratchpad (convert_photos.py) and can be re-run from the originals
in Downloads. Thumbnails (assets/photos/thumbs/<id>.webp, 672×900) attach only to
products the photograph genuinely shows (src/data/thumbs.js).

| file | source content | slot |
|---|---|---|
| hero-action.webp | no-gi clinch, full gym, crest wall | hero wide |
| ~~hero-blue-ss.webp~~ | blue scale-print SS, logo + THINK AND WIN | REMOVED 2026-09-04 (owner direction); file deleted from assets, in git history; hero is the wide action frame alone |
| hero-rot-skirt-patch.webp / -taping.webp / -genius-belt.webp | seated gi w/ skirt brain patch · taping fingers · GENIUS skirt + purple belt | hero wide rotation overlays |
| band-belt.webp | purple belt tied over black GENIUS gi | editorial band |
| core-ls-worn.webp | black LS, chest logo (crop) | 01 Core |
| core-ls-taping.webp | black LS, taping fingers (crop) | 01 Core |
| sets-clinch.webp | matching black LS + spats clinch | 02 Sets |
| look-gi-seated.webp | seated black GENIUS gi, purple belt, studio | lookbook tall |
| look-sleeve-sq.webp | tonal gi sleeve graphic (crop) | lookbook square |
| gis-back.webp | black GENIUS gi, arena, from behind | 04 Gis |
| gis-d-brain.webp / gis-d-skirt.webp / gis-d-pants.webp | embroidery details | 04 Gis strip |
| ~~thumbs/genius-gi-{black,white,blue}.webp~~ · ~~thumbs/core-ls-black.webp, thumbs/spats-black.webp~~ | GENIUS gi worn at competition · black LS / spats worn | REMOVED 2026-09-04 (owner direction: shop thumbnails restyled on albinoandpreto.com's flat-lay collection tiles — see "Placeholder product imagery" below); in git history. The same frames still ship as campaign imagery on shop.html |
| ~~landing-shop.webp / landing-culture.webp~~ | no-gi clinch wide · GENIUS skirt + belt | REPLACED 2026-08-26 by batch-2 fight-night panels (below); removed from assets |
| ~~culture-{studio,competition,details,nogi,taping,blue}.webp~~ | studio seated gi · white gi arena · skirt patch · clinch · taping · blue gi arena | REMOVED 2026-09-04 with the "The line, worn." culture section (owner direction: all culture imagery replaced by batch 3); in git history. Batch-1 photography still ships on shop.html |

Background note: a French federation seal ("SCEAU OFFICIEL / FÉDÉRATION …") appears on
gym walls in some frames. It is incidental background in the client's own photography —
it asserts nothing, and no partnership claim (SAU or otherwise) may be attached to it.

## Placeholder product imagery (2026-09-04) — NOT photography of the product

Owner direction 2026-09-04: restyle the shop thumbnails on albinoandpreto.com's collection
tiles (flat-lay garment on pure white, square, back view on hover, title + price) and give
every product its own page (product.html, modelled on an A&P product page), with imagery
the client can look at to imagine the site once they upload their own gi photographs.

**Every product now carries two PLACEHOLDER frames** at
`assets/photos/products/<id>-{front,back}.webp` (1024², WebP q82, ~1.4 MB for all 38).
They are **AI-generated stand-ins** (gemini-3.1-flash-image; pipeline in
`tools/placeholders/`: `gen_products.py` plain flat-lay → `gen_logo.py` adds the logo →
`gen_design.py` adds the concept art → `convert_products.py`; every prompt is in the
scripts) of the garment in the product's colour and cut, laid flat on white in the A&P
style, wearing **a CONCEPT DESIGN plus Prodigy's real chest logo**. The logo (the
geometric line-art brain over PROD·I·GY / ATHLETICS) is reproduced from a reference crop
of the client's own photograph core-ls-worn.webp (`tools/placeholders/logo_ref.png`) —
white on dark garments, black on white ones; left chest on fronts, between the shoulder
blades on backs, left thigh on bottoms.

The concept designs (third pass, owner direction 2026-09-04: "better designs, too
generic, get creative — anime, pop culture; get rid of the camo") are **original
anime-flavoured artwork written as prompts, not lifted images** — no named characters, no
Pinterest rips, no third-party marks — because the site is public and the client will
show it around. They are sketches of what a line *could* look like so the client can
imagine his own designs with his logo; the page copy, alt text and the product page's
"About the images" all say so. They are not photographs of Prodigy product and assert
nothing about it: the GENIUS embroidery, "THINK AND WIN" and the 死 idea are the
client's own marks (from batch-1 photography); everything else is invented.

| line | concept (front / back) |
|---|---|
| Genius gi ×3 | embroidered faceted brain with lightning bolts, anime "power-up" speed lines, GENIUS across the back skirt; tonal sleeve graphic; equation on the trousers (echoes the real gi) |
| Prodigy × 死 gi ×2 | sumi-e ink oni skull with 死 painted over its brow, red hanko seal; small 死 on the chest |
| Core (LS/SS black & white, shorts, spats, core set) | huge brain back print with radiating manga speed lines + halftone glow + THINK AND WIN; PRODIGY katakana-style down the sleeve / leg |
| Oni (ex-"Recon Camo", ids still recon-*: LS, SS, shorts, spats, set) | crimson-and-black all-over oni mask, cherry-blossom petals, speed lines, gold accents |
| Maple (LS, set) | retro-anime red halftone maple leaf inside a red-and-white rising-sun ray burst, thick manga ink outline |

**Replacing them:** drop the client's own flat-lay photographs in at the same paths
(square, front + back, garment on white) and remove the placeholder captions
(`photoAlt`, the "About the images" block and the `PLACEHOLDER` caption in
src/ui/product.js; the shop lead + footer line in shop.html; this section). The
placeholder frames are the ONLY AI-generated imagery on the site; the landing, Culture
and every campaign slot on shop.html remain real photography.

## Batch 4 — event posters (2026-09-04) — third-party promotional artwork

Three JPEGs supplied 2026-09-04 (Downloads `att.<id>.jpg`, 792×1224), owner direction:
"create an events page and add these pictures on it, make it look cool" → events.html
(poster wall on ink navy; nav link on every page). They are **the promoters' own
poster artwork, shown whole and as supplied** (WebP q86 at native size — no crop, the
poster IS the content). Every fact on the page (date, venue, doors, price, site) is
read off the poster; the page says Prodigy is not the organiser and claims no
sponsorship, partnership or attendance.

| file | source | poster | promotion marks IN FRAME |
|---|---|---|---|
| events-quebec-provincial.webp | att.140LEVJW… | Québec provincial jiu-jitsu championship, 3 Oct 2026, Centre Pierre-Charbonneau, Montréal | **SAU crest + "SUBMISSION ARTS UNITED" wordmark and URL**, FQJJB crest, QR code |
| events-invincible-v.webp | att.7x_AZKQ… | Invincible V (MMA), 17 Oct 2026, Oshawa Children's Arena | **"INVINCIBLE" title**, @invinciblefight, invinciblefight.com |
| events-dream-5.webp | att.BNUhny-… | Dream 5 (submission grappling), 18 Oct 2026, Oshawa Children's Arena | "DREAM 5" title, dreamsubmission.com, a sponsor mark on a rashguard |

**§7 rule 2 exposure REOPENED by this batch** (owner direction wins, as on 2026-08-26):
the SAU crest, the SAU name and the INVINCIBLE title ship legibly in these three
frames — they are the posters. Written permission from SAU / the promoters to
reproduce their posters returns to the §7 must-supply list; the posters are not
cropped, recolored or re-lettered, and nothing in our copy names SAU or claims a
relationship. To close the exposure again, delete events.html + these three files +
the nav links (index/culture/shop/product).

## Batch 2 — event photography (2026-08-26)

Seven JPEGs supplied 2026-08-26 (Downloads, UUID names, 1080–2048 px), plus an eighth
supplied 2026-09-04 by named file (INVINCIBLE145Logo.jpg, 3600×2400 — a filename, not a
logo; it is a cage-action photograph). These are NOT product photography and are NOT
the client's own shots: they are fight-night and grappling-tournament event frames.
**Placement was owner-directed** (2026-08-26: the two landing panels and the
Thinkandwin culture section, by named file; 2026-09-04: the panel-1 replacement, by
named file).

Watermarks (verified per file): three of the seven 2026-08-26 sources carry the
**@photography_bh** stamp at lower right — 5867d03f (landing-fight, replaced 2026-09-04
and removed from assets), 98044249 (landing-cage, replaced 2026-08-29 and removed from
assets), b41e9d8d (culture-tw-cage). The 2026-09-04 source carries a circular
photographer's stamp at lower right that reads **@photography_bji** (glyph reading
uncertain — possibly _bjj; whether this is the same photographer as @photography_bh is
TO CONFIRM). No watermark is ever retouched or cloned out, but the slot cover-crops do
not all preserve it: landing-banner.webp's window falls above the stamp (a faint edge
survives at the corner) and culture-tw-cage.webp's square crop drops its stamp entirely.
Because the mark does not survive everywhere, both page footers carry an explicit credit
(index.html and culture.html: event photography — @photography_bh and others). The other
four 08-26 sources carry no visible mark and their photographers are unknown. **Usage
rights are the client's to confirm with the photographer(s) — TO CONFIRM; listed in
DESIGN.md §7 "What the client must supply".**

Honesty rules for this batch (same spirit as the federation-seal rule):

- No Prodigy product is identifiably worn in these frames — so they ship only on the
  landing panels and in the Culture lookbook ("Thinkandwin.", lookbook 001, named after
  the client's confirmed THINK AND WIN garment tagline), never as product imagery, and
  their tiles deep-link nowhere (figure, not anchor).
- Third-party marks: DESIGN.md §7 rule 2 / AGENT-CONTEXT.md forbid **using** the SAU
  crest or the "Invincible Fighting Championships" name in any asset without written SAU
  permission — a rule about the asset, not just the copy. The owner directed these
  specific frames onto the landing panels 2026-08-26 knowing their content; on
  2026-08-29 the cage-banner frame was replaced (owner direction), leaving the
  promotion's floor lettering in landing panel 1 only; on 2026-09-04 that panel-1 frame
  was in turn replaced (owner direction, named file) and the new frame's 16:9 window
  was deliberately placed ABOVE the INVINCIBLE floor lettering — **as of 2026-09-04 no
  legible promotion mark ships in any authored asset** (the frame's subject is
  Prodigy's own cage banner). Keep it that way: no frame may ADD such a mark, and any
  re-crop of landing-banner.webp must stay above the floor lettering (source rows
  ~2210+) or the §7 permission question reopens. The SAU crest itself ships nowhere
  (culture-tw-armlock was re-cropped to take a referee's SAU shirt out of frame).
  Unrelated marks (shorts sponsors, other clubs' tees, an A&P patch) stay unnamed in
  all user-facing copy.
- "The team, photographed / every frame is Prodigy's own" claims were rescoped 2026-08-26
  to the batch-1 section only ("The line, worn.").

| file | source (UUID prefix) | content | slot | crop | marks in frame (never named in copy) |
|---|---|---|---|---|---|
| ~~landing-fight.webp~~ | 5867d03f | MMA ground control, fist raised | REPLACED 2026-09-04 by landing-banner.webp (owner direction); removed from assets | — | promotion floor lettering top-left; NEOMMA.COM / H2O sponsor shorts; @photography_bh stamp clipped at bottom edge |
| landing-banner.webp | INVINCIBLE145Logo.jpg (2026-09-04) | cage exchange against the fence, **Prodigy Athletics THINK AND WIN banner on the cage post** | landing panel 1 (→ shop) 1920×1080 | full-width 16:9 window, source rows 56–2081 (above the INVINCIBLE floor lettering at ~2210+) | Weyburn Dodge sponsor shorts; @photography_bji stamp below crop (faint corner edge survives) |
| ~~landing-cage.webp~~ | 98044249 | athlete in hoodie + headphones shadowboxing alone in the cage | REPLACED 2026-08-29 by landing-armlock.webp (owner direction); removed from assets | — | promotion cage banner, full right edge; full @photography_bh stamp |
| landing-armlock.webp | 03479a44 | black-gi armlock scramble, arena crowd (same source as culture-tw-armlock) | landing panel 2 (→ culture) 1920×1080 | full-width 16:9 window, rows 605–1526 (SAU-crest shirt above frame) | ONE-branded gis; arena crowd |
| ~~culture-tw-walkout.webp~~ | 296721ca | walkout, gloves up, sparks | REPLACED 2026-09-04 by batch 3; removed from assets | — | fighter-name tee + kanji; promotion name on glove cuff |
| ~~culture-tw-cage.webp~~ | b41e9d8d | clinch under the lights | REPLACED 2026-09-04 by batch 3; removed from assets | — | club patch on shorts |
| ~~culture-tw-flat.webp~~ | 061fed50 | b/w — athlete flat on the mat, another competitor reacting | REPLACED 2026-09-04 by batch 3; removed from assets | — | club tee lettering; A&P + USA patches |
| ~~culture-tw-corner.webp~~ | 729ae51a | two athletes mat-side, wave; a purple belt carried past | REPLACED 2026-09-04 by batch 3; removed from assets | — | club tee under one gi |
| ~~culture-tw-armlock.webp~~ | 03479a44 | black-gi armlock scramble, arena crowd | REPLACED 2026-09-04 by batch 3; removed from assets (the 2026-08-26 SAU-shirt re-crop is in git history) | — | ONE-branded gis |

Conversion identical to batch 1 (cover-crop → WebP q82). Of the batch-2 derivatives only
landing-armlock.webp still ships (index.html panel 2).

## Batch 3 — event photography (2026-09-04)

Fourteen files supplied 2026-09-04 by named file, owner-directed to REPLACE all culture
page imagery (both the batch-2 Thinkandwin tiles and the batch-1 "The line, worn."
grid — that section is gone from the page entirely; batch-1 photography still ships on
shop.html). Same class as batch 2: third-party fight-night and grappling-tournament
event frames, NOT the client's own, no Prodigy product worn — though the two INVINCIBLE
cage frames show **Prodigy's own THINK AND WIN cage banner** (as does landing-banner.webp).

- **Minors:** culture-tw-kids-faceoff, culture-tw-kids-pass, culture-tw-kids-throw and
  culture-tw-cartwheel show identifiable child/youth competitors. **Written
  guardian/event consent for commercial use is a §7 must-supply item (new 2026-09-04).**
- **Promotion marks:** every crop below was placed to keep promotion lettering,
  watermarks and the SAU crest OUT of frame — the dream3-2_067 crop exists specifically
  to exclude a referee whose polo carries the SAU crest, and the INVINCIBLE208 crop
  excludes an SAU mat logo. What remains in-frame and legible is at most: small
  "INVINCIBLE" text on glove cuffs/shin sleeves (tiles punch/fence/knee — same class as
  the batch-2 walkout tile, not counted as a legible promotion-mark exposure per the
  2026-08-29 standard) and partial LED glyphs that do not read as any name (stack:
  a lone "4"; cartwheel: half a letter). **The §7 rule-2 exposure stays CLOSED. Do not
  re-crop these tiles without re-checking the source coordinates below.**
- Club/sponsor marks in frame (GRACIE BARRA and gothic club lettering on gear, TRISTAR
  shorts, "#ONE"/TEAM ONE kids' gis, SWIFT RESPONSE gi back, Under Armour waistband,
  Tunisia/Quebec flags on shorts, HoOks) are incidental and stay UNNAMED in all
  user-facing copy, per the standing rule.
- Photographer: the DREAM4-* and INVINCIBLE* sources carry the circular
  **@photography_bji** stamp (reading uncertain, possibly _bjj — same open licence item
  as the 2026-09-04 landing frame); the crops below exclude it (worst case a faint
  corner sliver). The dream3-*, DSC*, NMBNMB and SAU_M_ sources carry no visible stamp
  and their photographers are unknown — licences TO CONFIRM (§7).

| file | source | content | crop (fractions of source, then centered square → 1080²) | notes |
|---|---|---|---|---|
| culture-tw-entangle.webp | DREAM4-134Logo.jpg (5336×3558) | no-gi leg-entanglement scramble | (0.250, 0.000)→(0.889, 0.958) | promotion watermark + mat URL text below/left of crop |
| culture-tw-gripfight.webp | dream3-2_079.jpg (2000×1334) | two-on-one grip fight, low angle, cameraman behind | (0.161, 0.000)→(0.828, 1.000) | no marks |
| culture-tw-punch.webp | INVINCIBLE123Logo.jpg (3600×2400) | cage exchange, straight punch landing, **Prodigy banner on post** | (0.264, 0.125)→(0.736, 0.833) | crop excludes promotion cage/mat/floor lettering + an SAU-ish mat patch; small promotion text on gloves remains |
| culture-tw-fence.webp | INVINCIBLE208Logo.jpg (3600×2400) | front headlock at the fence base | (0.217, 0.013)→(0.800, 0.888) | crop excludes SAU mat logo (bottom-left of source) + promotion watermark; small promotion text on gloves/shin sleeve remains |
| culture-tw-knee.webp | NMBNMB__DSF7526_inv-web.jpg (1080×1620) | knee up in close, cage | (0.000, 0.049)→(1.000, 0.716) | partial Prodigy banner right edge; LED lettering below crop; small promotion text on gloves |
| culture-tw-backtake.webp | DREAM4-071Logo.jpg (6000×4000) | back take mid-roll | (0.182, 0.000)→(0.848, 1.000) | watermark + stamp outside crop; club lettering on gear |
| culture-tw-stack.webp | DREAM4-091Logo.jpg (6000×4000) | stack over a bottom strangle (women's match) | (0.383, 0.138)→(0.917, 0.938) | lone LED "4" glyph in frame (no name legible); stamp sliver possible at corner |
| culture-tw-guillotine.webp | DREAM4-109Logo.jpg (6000×4000) | rolled into a front headlock | (0.158, 0.000)→(0.825, 1.000) | watermark/stamp outside crop; HoOks shorts |
| culture-tw-scramble.webp | dream3-2_067.jpg (2000×1334) | scramble over a trapped arm, judges' table behind | (0.317, 0.000)→(0.983, 1.000) | **crop exists to exclude the referee's SAU-crest polo (left of window)**; GUARA on gear |
| culture-tw-cartwheel.webp | dream3-2_055.jpg (2000×1334) | youth cartwheel over a turtled opponent | (0.383, 0.075)→(0.917, 0.875) | LED letter fragment top-left (no name legible); club shorts; minor |
| culture-tw-kids-faceoff.webp | DSC04869-Enhanced-NR.jpg (1200×1800) | two kids in white gis square off | (0.000, 0.150)→(1.000, 0.817) | minors; club gi lettering |
| culture-tw-kids-pass.webp | DSC04905-Enhanced-NR.jpg (1694×1129) | kids' gi pass over a turtle | (0.137, 0.000)→(0.803, 1.000) | minors; club patches |
| culture-tw-takedown.webp | DSC07960-Enhanced-NR.jpg (1600×2400) | low single-leg, referee watching | (0.000, 0.271)→(1.000, 0.938) | no marks |
| culture-tw-kids-throw.webp | SAU_M_-58.jpg (4000×6000) | kids' blue-gi hip throw | (0.000, 0.317)→(1.000, 0.983) | minors; "#ONE"/TEAM ONE gi branding; no SAU crest in frame despite source filename |

Conversion: convert_culture14.py (session scratchpad, re-creatable from this table) —
fractional box → centered largest square → 1080² WebP q82.
