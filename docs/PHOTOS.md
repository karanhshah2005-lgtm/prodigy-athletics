# Client photography (assets/photos)

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

Background note: a French federation seal ("SCEAU OFFICIEL / FÉDÉRATION …") appears on
gym walls in some frames. It is incidental background in the client's own photography —
it asserts nothing, and no partnership claim (SAU or otherwise) may be attached to it.
