# Photography (assets/photos)

Two batches. **Batch 1 (2026-08-24) is the client's own product photography; batch 2
(2026-08-26) is third-party event photography that shows no Prodigy product.** Every
honesty claim on the site must be scoped to the right batch.

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
| hero-blue-ss.webp | blue scale-print SS, logo + THINK AND WIN | hero portrait (static) |
| hero-rot-skirt-patch.webp / -taping.webp / -genius-belt.webp | seated gi w/ skirt brain patch · taping fingers · GENIUS skirt + purple belt | hero wide rotation overlays |
| band-belt.webp | purple belt tied over black GENIUS gi | editorial band |
| core-ls-worn.webp | black LS, chest logo (crop) | 01 Core |
| core-ls-taping.webp | black LS, taping fingers (crop) | 01 Core |
| sets-clinch.webp | matching black LS + spats clinch | 02 Sets |
| look-gi-seated.webp | seated black GENIUS gi, purple belt, studio | lookbook tall |
| look-sleeve-sq.webp | tonal gi sleeve graphic (crop) | lookbook square |
| gis-back.webp | black GENIUS gi, arena, from behind | 04 Gis |
| gis-d-brain.webp / gis-d-skirt.webp / gis-d-pants.webp | embroidery details | 04 Gis strip |
| thumbs/genius-gi-{black,white,blue}.webp | GENIUS gi worn at competition | shop thumbs |
| thumbs/core-ls-black.webp, thumbs/spats-black.webp | black LS / spats worn | shop thumbs |
| ~~landing-shop.webp / landing-culture.webp~~ | no-gi clinch wide · GENIUS skirt + belt | REPLACED 2026-08-26 by batch-2 fight-night panels (below); removed from assets |
| culture-{studio,competition,details,nogi,taping,blue}.webp | studio seated gi · white gi arena · skirt patch · clinch · taping · blue gi arena | culture.html tiles (1080²) |

Background note: a French federation seal ("SCEAU OFFICIEL / FÉDÉRATION …") appears on
gym walls in some frames. It is incidental background in the client's own photography —
it asserts nothing, and no partnership claim (SAU or otherwise) may be attached to it.

## Batch 2 — event photography (2026-08-26)

Seven JPEGs supplied 2026-08-26 (Downloads, UUID names, 1080–2048 px). These are NOT
product photography and are NOT the client's own shots: they are fight-night and
grappling-tournament event frames. **Placement was owner-directed 2026-08-26** (the two
landing panels and the Thinkandwin culture section, by named file).

Watermarks (verified per file): three of the seven sources carry the **@photography_bh**
stamp at lower right — 5867d03f (landing-fight), 98044249 (landing-cage, replaced
2026-08-29 and removed from assets), b41e9d8d (culture-tw-cage). No watermark is ever
retouched or cloned out, but the slot cover-crops do not all preserve it:
landing-fight.webp clips it at the bottom frame edge and culture-tw-cage.webp's square
crop drops it entirely. Because the mark does not survive everywhere, both page footers
carry an explicit credit (index.html and culture.html: event photography —
@photography_bh and others). The other four sources carry no visible mark and their
photographers are unknown. **Usage rights are the client's to confirm with
the photographer(s) — TO CONFIRM; listed in DESIGN.md §7 "What the client must supply".**

Honesty rules for this batch (same spirit as the federation-seal rule):

- No Prodigy product is identifiably worn in these frames — so they ship only on the
  landing panels and in the Culture lookbook ("Thinkandwin.", lookbook 001, named after
  the client's confirmed THINK AND WIN garment tagline), never as product imagery, and
  their tiles deep-link nowhere (figure, not anchor).
- Third-party marks: DESIGN.md §7 rule 2 / AGENT-CONTEXT.md forbid **using** the SAU
  crest or the "Invincible Fighting Championships" name in any asset without written SAU
  permission — a rule about the asset, not just the copy. The owner directed these
  specific frames onto the landing panels 2026-08-26 knowing their content; on
  2026-08-29 the cage-banner frame was replaced (owner direction) by a tournament
  frame, so the remaining exposure is the promotion's floor lettering in landing
  panel 1 only. **Written permission for that is still an open must-supply item
  (§7)**, and no frame may ADD such a mark beyond the owner-directed set. The SAU crest itself ships nowhere (culture-tw-armlock
  was re-cropped to take a referee's SAU shirt out of frame). Unrelated marks (shorts
  sponsors, other clubs' tees, an A&P patch) stay unnamed in all user-facing copy.
- "The team, photographed / every frame is Prodigy's own" claims were rescoped 2026-08-26
  to the batch-1 section only ("The line, worn.").

| file | source (UUID prefix) | content | slot | crop | marks in frame (never named in copy) |
|---|---|---|---|---|---|
| landing-fight.webp | 5867d03f | MMA ground control, fist raised | landing panel 1 (→ shop) 1920×1080 | focus_y 0.45 | promotion floor lettering top-left; NEOMMA.COM / H2O sponsor shorts; @photography_bh stamp clipped at bottom edge |
| ~~landing-cage.webp~~ | 98044249 | athlete in hoodie + headphones shadowboxing alone in the cage | REPLACED 2026-08-29 by landing-armlock.webp (owner direction); removed from assets | — | promotion cage banner, full right edge; full @photography_bh stamp |
| landing-armlock.webp | 03479a44 | black-gi armlock scramble, arena crowd (same source as culture-tw-armlock) | landing panel 2 (→ culture) 1920×1080 | full-width 16:9 window, rows 605–1526 (SAU-crest shirt above frame) | ONE-branded gis; arena crowd |
| culture-tw-walkout.webp | 296721ca | walkout, gloves up, sparks | Thinkandwin tile 1080² | focus_y 0.30 | fighter-name tee + kanji; promotion name on glove cuff |
| culture-tw-cage.webp | b41e9d8d | clinch under the lights | Thinkandwin tile 1080² | focus_y 0.33 | club patch on shorts; source stamp @photography_bh cropped out by the square |
| culture-tw-flat.webp | 061fed50 | b/w — athlete flat on the mat, another competitor reacting | Thinkandwin tile 1080² | focus_y 0.47 | club tee lettering; A&P + USA patches on rashguard |
| culture-tw-corner.webp | 729ae51a | two athletes mat-side, wave; a purple belt carried past | Thinkandwin tile 1080² | focus_y 0.35 | club tee under one gi |
| culture-tw-armlock.webp | 03479a44 | black-gi armlock scramble, arena crowd | Thinkandwin tile 1080² | inset (69,548)→(1569,2048), re-cropped 2026-08-26 to exclude a referee's SAU-crest shirt | ONE-branded gis; arena sponsor boards (blurred) |

Conversion identical to batch 1 (cover-crop → WebP q82); script re-creatable from the
table above (convert_batch2.py lived in the session scratchpad; the armlock tile uses
the explicit inset box above instead of a focus_y).
