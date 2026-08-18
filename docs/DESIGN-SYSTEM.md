# Design system (extracted 2026-08-18; gold standard = on.com)

## Summary
Built a nine-site reference library by direct fetch, and measured two of them in the browser for real computed values (on.com homepage, shoyoroll.com collection + PDP). Three URLs in the brief were wrong and are corrected below: represent.com now 301s to cameo.com (real site = representclo.com), progressjj.com 301s to progressjj.co.uk, scramblebrand.com is NXDOMAIN (real = scramblestuff.com), and "kithbjj" does not exist as a site — I substituted Scramble and Apple instead.

GOLD STANDARD = On (on.com). It is the only reference that is simultaneously premium, restrained, athletic, product-led, and solves our exact problem: explaining engineered garment detail through type discipline rather than hype. Its signature and directly transplantable move is a three-register type system — a large negative-tracked display sans (52.99px/700/-0.01em), a plain 16/400/1.5 body, and a MONOSPACE micro-label at 12px/500/+0.12em uppercase — where the mono label is what makes it read "technical sportswear" instead of "fight merch". DESIGN.md §7 names that exact positioning goal ("closer to technical sportswear than fight merch"), so the gold standard is chosen to serve a requirement already in the spec, not a taste preference. Shoyoroll is the closest peer and I measured it (4-up grid, 449px squares, 40px gutter, 15px/500 uppercase titles, Helvetica, no accent colour at all), but its system is deliberately anti-design and works only because of fifteen years of drop scarcity. Copying it would leave a relaunching brand with a dead storefront and nothing to say. Apple's "Take a Closer Look" hotspot viewer is the pattern for our sleeve-name detail crops.

KEY DECISIONS. (1) Palette split by function, not taste: Bone #F5F3EE is the default page ground (~70%) because both black AND white ranked rashguards must read, and IBJJF Art. 8.1.14 forces both to exist in the catalog; Ink Navy #0B1220 (~25%) is reserved for hero, ranked panel, detail section and footer; Prodigy Gold is capped at 2% of any viewport with exactly five permitted uses. I ran the contrast maths: Gold on Ink Navy is 8.7:1 (excellent), Gold on Bone is 1.94:1 (fails), so gold is banned as text on light and may appear there only as a rule, a fill or a dot. (2) Keep Barlow + Barlow Condensed (DESIGN.md §7 records Barlow as the single OBSERVED typographic fact) but ADD IBM Plex Mono for the label/spec register — that third face is the load-bearing move and Barlow has no mono. (3) Ship the 360 hero as a 72-frame WebP sprite driven by the existing renderer FIRST, with three.js as a later upgrade behind identical drag code, because we have SVG pattern files and no 3D mesh. (4) Added a GIS section the brief did not ask for, because DESIGN.md OBSERVED says they are a kimono company first and rashguards are the line extension.

All honesty rules are wired into the system as design tokens rather than left as guidance: every price renders "$— sample", unconfirmed specs render as visible slot tokens, there is no IBJJF legality badge anywhere, and the rubric's ship gate cannot be passed unless the honesty and category-credibility criteria both score 5.

## References
- https://www.on.com/en-us/ — GOLD STANDARD. Measured live at 1905px. TAKE THE THREE-REGISTER TYPE SYSTEM: display sans 52.992px/700/lh 1.10/tracking -0.52992px (= -0.01em); secondary display 32.96px/700/lh 1.20/-0.01em; body 16px/400/lh 1.50; and critically a MONOSPACE micro-label at 12px/500/lh 1.50/letter-spacing 1.44px (= +0.12em)/UPPERCASE used for eyebrows and badges ('Bestseller'), plus a mono h3 at 20px/tracking 1.2px/uppercase. Negative tracking on display, strongly positive tracking on mono labels — that opposition is the whole trick. TAKE THE BUTTON SPEC: 14px/700/letter-spacing 0.84px (+0.06em)/UPPERCASE. TAKE THE SPACING RHYTHM: section padding values in use are 64px and 96px only. TAKE THE COLOUR DISCIPLINE: measured backgrounds are white, black, one near-black #151522, and greys #e5e5e5/#999 — no accent colour is spent on chrome at all. TAKE THE PATTERN of a technology/feature explainer block that uses a mono label + a number rather than an adjective. DO NOT take their light-only ground; our palette needs the navy.
- https://shoyoroll.com/collections/kimonos — The closest premium BJJ peer, measured live at 1920px. TAKE THE GRID GEOMETRY: 4-up, image 449x449 (1:1), x-positions 40 / 499 / 958 / 1416 → column pitch 459px, so gutter = 10px and page gutter = 40px; row pitch 514px (449 image + 65px text block). TAKE THE CARD CONTENT RULE: product title 15px/500/UPPERCASE/lh 15.75 (0.97 — sub-1 line-height is the drop-culture signal), price 14px/400, a 11px/400 uppercase 'From' qualifier, and absolutely nothing else — no badge, no rating, no colour dots, no quick-add. TAKE THE NAV LABEL SPEC: 12px/500/letter-spacing 0.6px/UPPERCASE. Note they DO run two images per card for a hover swap. Price anchor pulled from their products.json for context only: kimonos $300–$410 USD. DO NOT take Helvetica-as-system or the total absence of an accent — that is fifteen years of scarcity doing the work, and a relaunching brand cannot borrow it.
- https://shoyoroll.com/products/26-2-competitor-kimono — PDP measured live. TAKE THE H1 TREATMENT: 28px/400/UPPERCASE/lh 27.2px (0.97)/colour rgb(35,35,35) — never pure black. TAKE THE GALLERY GEOMETRY: horizontal strip of 895x895 squares, 1:1, no chevrons needed. TAKE THE SPEC-BLOCK HABIT: 'Kimono Specs: Top: 375 Pearl Weave Cotton / Pant: 10 oz Ripstop Cotton' — a bare key/value list with real numbers is what practitioner credibility actually looks like. TAKE the no-accordion discipline: description is plain 15px paragraphs. USE AS A COPY COUNTER-EXAMPLE: their own text says 'Crafted with a 375 GSM pearl weave jacket' and 'a no-compromise approach on the mat' — both are on our banned list. Their one genuinely good line is 'Designed for performance without excess.'
- https://www.apple.com/airpods-pro/ — The motion/product-viewer reference. TAKE THE 'TAKE A CLOSER LOOK' PATTERN VERBATIM AS A STRUCTURE: one large product visual with six numbered focus areas, where selecting a focus area swaps the main image to a detail crop and reveals a short caption. That is exactly our sleeve-name detail-crop section, and because our crops are only a viewBox change on the same SVG the renderer already produces, it costs us nothing to build. TAKE the hero convention of a scroll-scrubbed / autoplayed product animation with start-frame and end-frame states rather than a looping video. TAKE the restraint of one headline plus one supporting line at the hero and nothing else. DO NOT take the 14-section page length or the 50–150 words per section — we do not have that much verified product truth and inventing it would break DESIGN.md §7.
- https://scramblestuff.com/ — The best copy voice in the BJJ category, and the closest model for our 'practitioner-craft' register. TAKE THE SENTENCE SHAPE from these verbatim lines: 'Designed and produced to the highest specification.' / 'Offers stretch, compression, and breathability in equal measure.' / 'Hand painted (original) kanji on the back that reads Tanren.' / 'A solid option for beginners or anyone looking to add a reliable, affordable Gi to their rotation.' Note what they do: lead with the noun or the process, name a specific physical detail, and decline to flatter the reader. TAKE their willingness to describe construction plainly ('made of a single layer, that is carefully printed on both sides'). DO NOT take 'The Ranked rashguards are designed for no-nonsense grappling' — 'no-nonsense' is theirs and is a category cliché; it goes on our banned list precisely because a competitor already owns it. Also relevant as competitive intel: Scramble already ships a line literally called 'Ranked'.
- https://representclo.com/ — CORRECTED URL — represent.com now 301s to cameo.com and is not the brand. TAKE the dark-ground premium proof: jet black page with white text, greyscale neutral naming (graphite, flat white, dust blue, midnight navy), uppercase used selectively for nav and section labels only, and minimal per-card text with a hover-revealed alternate view. This is the evidence that a dark ground can read premium rather than 'fight merch', which is what our Ink Navy hero and ranked panel depend on. DO NOT take their reliance on lifestyle photography — every hero is a person in context, and we have no photography and are not going to fake it.
- https://satisfyrunning.com/ — TAKE the editorial section-header move: very large display section labels ('FINAL HEAT', 'FOUNDATIONS') carrying a full-bleed campaign band, with the product grid kept separate and quiet underneath. That is the template for our five full-bleed release panels (Ranked, Core, Sets, Detail, Design Your Own). TAKE the colour discipline: no accent colour on shop pages at all; the product supplies the only colour. TAKE the campaign-name-as-section-label habit, which lets a small catalogue read as a range. DO NOT take the 11-section homepage or the carousel-heavy merchandising.
- https://progressjj.co.uk/ — CORRECTED URL (progressjj.com 301s here). Mostly a NEGATIVE reference and a useful warning. Their homepage opens with trust-signal counters ('5000+ 5* Reviews', '150,000 Gis Shipped Worldwide') and the hero line 'Trusted by world champions!' — every one of those is a claim Prodigy cannot make and an exclamation mark we have banned. TAKE ONE THING ONLY: their nav has a 'Bundles' entry, confirming that set/kit merchandising is a real category convention and not an invention of ours, which supports DESIGN.md's 'kits are the unit of design'. Note they show no belt-coloured or ranked line on the homepage at all — that is the gap our ranked panel occupies.
- https://www.hyperfly.com/ — Pure counter-example, and the single most useful one for the copy system. Their verbatim lines are the traps we are banning: 'Introducing the Starlyte III, the lightest Gi ever created.' (unverifiable superlative), 'Your endless hours of training have led you to this moment, ready to claim victory.' (second-person aspiration), and the motto 'YOU CAN'T TEACH HEART.' TAKE EXACTLY ONE LINE as a positive model: 'The Icon VI is the result of subtraction. Fewer labels. Fewer embroideries. Less weight.' — that is a real design decision stated plainly, and it is the register we want. Their cards carry image + name + regular/sale price + colour options + 'Choose Options' + Quick View + 'New' badge; strip all of that.
- https://www.gymshark.com/ — Scale counter-example. TAKE the mega-menu grouping logic (Trending / Products / Last Chance / Explore) only as proof that a shop dropdown can replace a filter rail. DO NOT take the promotional banner carousel, the 'POPULAR RIGHT NOW' urgency framing, the 'WAIT THERE'S MORE…' scroll bait, or the dual-image card carousel. Gymshark's system is tuned for volume and discounting; Prodigy's problem is credibility from zero, which is the opposite job.
- https://albinoandpreto.com/ — What we are moving AWAY from, already measured in docs/AP-RESTYLE.md. Keep exactly three things from that work: (1) the no-card-chrome product tile — no borders, backgrounds, badges or ratings; (2) the plain-paragraph PDP with no accordions; (3) the tiny quiet honesty strip rather than loud SAMPLE badges. Discard the rest: the 50px non-sticky header with logo-right is a move earned by recognition Prodigy does not have; the 6-up 197.5px grid is too small for renders that need to show a sleeve wordmark; 11px nav and 12px body are below our accessibility floor; and a pure white page with zero accent gives a relaunching brand no way to signal a palette at all.

## Design system
PRODIGY ATHLETICS — DESIGN SYSTEM v1
Everything here is PROPOSED unless it cites DESIGN.md §7 OBSERVED. Numbers are buildable as-is.

================================================================
1. PALETTE
================================================================
Ground
  --ink-navy    #0B1220   dark ground: hero, ranked panel, detail section, footer   (OBSERVED-adjacent: from §7 PROPOSED table)
  --ink-raise   #131B2C   elevated surface on navy: cards on dark, inputs, toggles
  --ink-line    #1E2739   hairlines and dividers on navy
  --bone        #F5F3EE   DEFAULT page ground                                        (§7)
  --bone-deep   #EAE6DC   product stage / card tile on light
  --bone-line   #DBD6C9   hairlines and dividers on light

Text
  --ink         #101623   primary text on light (near-navy, never pure black)
  --ink-70      #4A5464   secondary text on light
  --ink-45      #7C8492   captions, mono labels on light
  --on-dark     #F5F3EE   primary text on navy
  --on-dark-70  #ADB3BD   secondary text on navy
  --on-dark-45  #737C8A   captions, mono labels on navy

Accent (one, and only one)
  --gold        #E8A33D   Prodigy Gold                                               (§7)
  --gold-deep   #C9862A   hover / pressed state of gold
  --gold-ink    #8A5A12   the ONLY gold permitted as text on Bone (5.34:1, passes AA)
  --gold-wash   rgba(232,163,61,0.12)  the only tint allowed anywhere

Belt colours — locked semantic system (§7: "must never be spent on marketing chrome").
Hexes are PROPOSED; client to confirm.
  --belt-white  #F2F0EA  (requires a 1px #D8D3C6 ring to render at all)
  --belt-blue   #1B4FA8
  --belt-purple #59307E
  --belt-brown  #5C3A24
  --belt-black  #14161A

CONTRAST, computed — do not re-derive:
  ink on bone            ~16:1   PASS
  bone on ink-navy       ~17:1   PASS
  gold on ink-navy        8.7:1  PASS  → gold text is allowed ONLY on navy
  gold on bone            1.94:1 FAIL
  gold-deep on bone       2.75:1 FAIL
  gold-ink on bone        5.34:1 PASS
  ⇒ HARD RULE: on Bone, gold may appear only as a 2–3px rule, a solid fill behind ink text,
    or a dot. Never as text. If gold-toned text is unavoidable on light, use --gold-ink.

COLOUR BUDGET (enforceable, and criterion 1 of the rubric):
  • Bone family ≈ 70% of total pixel area sitewide
  • Ink Navy family ≈ 25%
  • Gold ≤ 2% of any single viewport AND at most 3 gold instances visible at once
  • Gold is permitted in exactly five places, nowhere else:
      1. the wordmark's accent, if the client's logo uses one
      2. the 2px rule under the active nav item
      3. the 360 viewer's drag affordance (ring + "DRAG TO SPIN" label)
      4. primary button fill, on Ink Navy grounds ONLY
      5. the leader lines in the sleeve-detail hotspot section
    Not headings. Not prices. Not badges. Not links. Not icons. Not borders.
  • Focus rings are the one exemption: 2px --gold outline, 2px offset, everywhere, and they
    do not count toward the budget.
  • Belt colours appear ONLY inside product renders, the belt swatch control, and the ranked
    section. Never in nav, buttons, footer, links or section chrome.

WHY BONE IS THE DEFAULT GROUND (the reasoning matters for future edits): IBJJF Art. 8.1.14
forces ranked rashguards to be black or white bodied, so the catalogue permanently contains
both extremes. A dark default kills white garments; a pure-white default kills them too.
Bone page + Bone Deep stage gives white garments a visible edge and black garments a clean
silhouette, from one token pair.

================================================================
2. TYPE
================================================================
RECOMMENDATION: keep Barlow + Barlow Condensed, and ADD a mono.

Barlow stays because DESIGN.md §7 records it as the one typographic fact actually OBSERVED,
shared with SAU's global kit, so co-branded collateral composes at zero cost. It is OFL and
already being installed.

Barlow has no monospace, and the mono register is the load-bearing move — it is the single
thing separating "technical sportswear" from "fight merch" (§7 names that exact goal), and it
is the natural face for spec data (gsm, cm, %, sizes). Add IBM Plex Mono (OFL). Three families,
six files, ~160KB subset. That is the cost and it is worth it.

THE ONE SUBSTITUTION I WOULD CONSIDER, and why I am not making it: Archivo Variable (OFL,
Omnibus-Type) carries a width axis wdth 62–125 plus wght 100–900 in a single ~90KB file,
which would give condensed display AND body from one download with guaranteed shared
skeletons. It is technically the better engineering answer. It loses to Barlow only because
of the SAU-adjacency fact in §7. Revisit Archivo if that adjacency is dropped or if the
client's logo turns out to be drawn in something else.

TYPE TOKENS (desktop @1440; all display tokens are UPPERCASE)
  token          size    family              wt   line-height  tracking   case
  display-xl     clamp(52px, 7.6vw, 112px)  Barlow Condensed 700  0.90  -0.015em  UPPER
  display-l      clamp(38px, 4.6vw, 72px)   Barlow Condensed 700  0.94  -0.010em  UPPER
  display-m      40px    Barlow Condensed    700  0.98         -0.005em   UPPER
  h1             34px    Barlow Condensed    600  1.00          0         UPPER
  h2             26px    Barlow Condensed    600  1.06          0         UPPER
  h3             19px    Barlow              600  1.32          0         sentence
  lead           18px    Barlow              400  1.55          0         sentence
  body           16px    Barlow              400  1.60         +0.01em    sentence
  body-s         14px    Barlow              400  1.50         +0.01em    sentence
  price          14px    Barlow              500  1.50         +0.01em    —
  card-title     14px    Barlow              600  1.20         +0.045em   UPPER
  caption        13px    Barlow              400  1.45          0         sentence
  label          12px    IBM Plex Mono       500  1.50         +0.12em    UPPER
  micro          10px    IBM Plex Mono       500  1.40         +0.14em    UPPER
  button         13px    Barlow              600  1.00         +0.08em    UPPER
  nav            13px    Barlow              500  1.00         +0.06em    UPPER

The tracking opposition is the system: display goes NEGATIVE (-0.015em to -0.005em), mono
labels go strongly POSITIVE (+0.12em to +0.14em). Body sits near zero. Taken directly from
On's measured -0.52992px on 52.992px display against 1.44px on 12px mono.

USAGE LAW
  • display-xl appears exactly once per page, in the hero. Never twice.
  • Barlow Condensed is ALWAYS uppercase. If you need condensed sentence case, you have
    chosen the wrong token.
  • Mono is ONLY for: section eyebrows, spec-table keys, belt names, the sample-data strip,
    breadcrumbs, the 360 affordance, and footer column headers. Never for a sentence.
  • Nothing below 12px carries meaning a user must read; micro (10px) is for the honesty
    strip and legal only.
  • Measure cap: 62ch, hard max 640px, for every body paragraph.

MOBILE RAMP (<768px)
  display-xl → clamps to 52px, line-height 0.94
  display-l  → 38px      h1 → 28px      h2 → 22px
  body stays 16px. label stays 12px. micro stays 10px. Never scale the mono down.

FONT LOADING
  Self-host woff2, subset to latin: U+0000-00FF, U+2013-2014, U+2018-201D, U+2026, U+00D7.
  Six files: BarlowCondensed 600, BarlowCondensed 700, Barlow 400, Barlow 500, Barlow 600,
  IBMPlexMono 500. ~22–30KB each.
  Preload only the two above the fold: BarlowCondensed-Bold, Barlow-Regular.
  font-display: block (100ms cap) on Barlow Condensed — a display headline flashing in a
  wildly wider fallback is worse than 100ms of nothing.
  font-display: swap on Barlow and IBM Plex Mono.
  Fallbacks:
    --f-display: 'Barlow Condensed', 'Oswald', 'Arial Narrow', system-ui, sans-serif;
    --f-body:    'Barlow', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    --f-mono:    'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace;

================================================================
3. SPACING, GRID, CONTAINERS
================================================================
Base 4px. Scale: 4 8 12 16 20 24 32 40 48 64 80 96 128 160 200.
No spacing value outside this scale may appear in the build.

Section padding-block
  major   desktop 128  / tablet 96 / mobile 72
  standard desktop 96  / tablet 72 / mobile 56
  tight   desktop 64   / tablet 48 / mobile 40
(On's measured section values are 64px and 96px — this scale contains both.)

Page gutter: 40px desktop (Shoyoroll measured 40px) / 24px tablet / 20px mobile.
Container: max-width 1440px. Full-bleed panels break out to 100vw.
Grid: 12 columns, gutter 32px desktop / 24px tablet / 20px mobile.

PRODUCT GRID
  ≥1280px  4-up, column gap 32, card width (1440−80−96)/4 = 316px
  1000–1279 3-up, column gap 28
  640–999   2-up, column gap 24
  <640      2-up, column gap 12
  Row gap: 72px desktop / 56 tablet / 48 mobile.
  (Shoyoroll runs 4-up at 449px with only a 10px gutter. That extreme tightness reads as
  drop-culture scarcity; at 316px with a 32px gutter our renders get breathing room and the
  sleeve wordmark stays legible, which is the thing our product actually has to show.)

================================================================
4. IMAGERY RULES — RENDERS ONLY
================================================================
  • Every product image is output from render/garment.js. Never a photograph, never stock,
    never an AI-generated photo. If it cannot be rendered, it is not shown.
  • Two canonical framings and no others:
      FLAT — orthographic front or back, 1:1, garment occupies 80% of stage height,
             optically centred, baseline at 88%.
      CROP — detail crop, 3:2, 2.2× zoom on a named region. This is a viewBox change on the
             same SVG, so it costs nothing to produce.
  • Stage: --bone-deep #EAE6DC, with a single contact shadow rendered as
      radial-gradient(ellipse 46% 6% at 50% 96%, rgba(16,22,35,0.16), transparent 70%)
    Never a box-shadow. Never a drop-shadow filter.
  • object-fit: contain, always. Never cover — cover crops a render, which is a lie about
    the garment.
  • Never rotate, skew, or mirror a render to fake a second colourway or a second angle.
    A colourway is a different artwork file (§2), so render it properly or omit it.
  • Full-bleed panels: minimum 3, maximum 5 garments, all baseline-aligned on a shared
    horizon at 68% of panel height.
  • Hero render assets: 2× DPR, 1200px long edge, WebP q82. Grid cards: 632px, WebP q80.
  • No people, no gyms, no mats, no lifestyle context. The absence of photography is a
    position for a relaunching brand, and the page should look deliberate about it rather
    than apologetic.

================================================================
5. MOTION
================================================================
  --dur-micro  160ms   --dur-state 240ms   --dur-panel 320ms   --dur-reveal 560ms
  --ease-out   cubic-bezier(0.22, 1, 0.36, 1)     entrances
  --ease-inout cubic-bezier(0.40, 0, 0.20, 1)     state changes

  Entrance: opacity 0→1 plus translateY 16px→0, 560ms ease-out, fires once via
  IntersectionObserver at 15% threshold. MAXIMUM ONE entrance animation per viewport height.
  Stagger no more than 3 items, 60ms step.

  FORBIDDEN: scroll-jacking, parallax, pinned sections, count-up numbers, marquees,
  auto-playing carousels, cursor followers, full-page transitions, hover lifts, scale-on-hover.

  360 VIEWER
    Frames: 72 frames at 5° (hero); 36 frames at 10° (PDP toggle); 36 frames below 768px.
    Drag: 1 CSS px = 0.32° (mouse), 0.45° (touch).
    Momentum: velocity × 0.93 per frame, cut below 0.2°/frame, snap to nearest frame.
    Idle autorotate: 14°/s, begins 900ms after load, STOPS on first interaction or after
      1.5 revolutions, whichever comes first. It never loops forever.
    Affordance: 12px mono "DRAG TO SPIN" in --gold at 60% opacity, 24px below the garment
      baseline. Fades out over 240ms on first drag and does not return that session.
    Keyboard: ←/→ step one frame; Shift+←/→ step six. Focus ring required. Announce as a
      slider with aria-valuenow in degrees.
    prefers-reduced-motion: reduce → no autorotate, no momentum, discrete stepping only,
      label reads "DRAG TO ROTATE".
    Loading: paint frame 0 as the LCP element. Then fetch every 6th frame (12 images) for a
      coarse spin, then backfill. Never block paint on the full sequence.

  IMPLEMENTATION, with fallbacks in the house style of DESIGN.md §5:
  | Risk | Fallback |
  |---|---|
  | A true WebGL spin needs a 3D mesh we do not have; we have SVG pattern files | SHIP THE SPRITE PATH FIRST. Pre-render 72 frames from render/garment.js at 5° yaw. The same drag/momentum/keyboard module drives sprite and WebGL identically, so the upgrade never touches the UI layer. |
  | 72 frames × 1200px is too heavy | 800px frames at WebP q78 ≈ 9KB each ≈ 650KB total; serve the 36-frame set below 768px ≈ 320KB |
  | WebGL unavailable or GPU-blocked | Feature-detect and fall through: WebGL → sprite → single static front render. Three tiers, all honest, no error state. |

  If the WebGL tier is later built: three.js, one low-poly torso GLB, Draco-compressed,
  budget <400KB; artwork as a 2048² texture on MeshStandardMaterial (roughness 0.88,
  metalness 0); two lights only (key DirectionalLight 1.1 at 35°/40°, rim 0.5 behind);
  NO shadow maps — the contact shadow stays a baked plane; PerspectiveCamera fov 26 so the
  chest wordmark does not barrel; DPR capped at 2; renderer paused when out of viewport.

================================================================
6. COMPONENTS
================================================================
HEADER / NAV
  Height 72px desktop / 56px mobile. position: sticky; top: 0; z-index 100.
  Over the navy hero on the homepage: transparent, --on-dark text, no border.
    After 80px scroll: --ink-navy solid, 1px --ink-line bottom border, 200ms ease-inout.
  Everywhere else: --bone ground, --ink text, 1px --bone-line bottom.
  Layout: wordmark LEFT, nav items from 32px after it at 32px gaps, utilities right.
    (Wordmark left, not right. A&P earns logo-right through recognition; a brand whose
     storefront currently 301s to an unrelated company must lead with its name.)
  Items, in order: GIS · RASHGUARDS · RANKED · SETS · DESIGN YOUR OWN
    GIS leads because §7 OBSERVED says they are a kimono company first.
  Utilities: SEARCH · ACCOUNT · CART 0. Type token: nav (13/500/+0.06em/UPPER).
  Active item: 2px --gold rule, 6px below the baseline, 100% of the label width.
  SHOP dropdown replaces a filter rail entirely (AP-RESTYLE established this and it holds).

SAMPLE STRIP (above the header, every page, non-dismissible)
  Height 28px, --ink-navy ground, --on-dark-45 text, micro token (10px mono +0.14em UPPER),
  centred: "SAMPLE STOREFRONT — PRICES AND PRODUCT COPY ARE PLACEHOLDERS"

SECTION HEADER (one reusable pattern, used by every section)
  [label]     12px mono +0.12em UPPER, --ink-45 or --on-dark-45,  e.g. "01 — RANKED"
    ↓ 16px
  [display-l] Barlow Condensed 700 UPPERCASE
    ↓ 20px
  [lead]      18px/1.55, max 52ch, --ink-70 or --on-dark-70, ONE or TWO sentences
    ↓ 48px
  [content]

HERO
  min-height: max(640px, 100svh − 72px). --ink-navy ground with a vertical vignette
  (linear-gradient 180deg, transparent 0%, rgba(11,18,32,0.55) 100%).
  360 viewer centred, 560px tall desktop / 380px mobile.
  Overlaid bottom-left at the 40px page gutter: label, then display-xl (one line, ≤5 words),
  then one primary button. No subhead. No second CTA.

PRODUCT CARD
  Stage 1:1, --bone-deep, render contain with 10% inset, contact shadow gradient.
    ↓ 12px  card-title  14/600/+0.045em UPPER --ink
    ↓ 4px   price       14/500 --ink-70, renders "$— sample"
    ↓ 8px   belt dots   8px circles, 6px apart, 1px --bone-line ring on the white dot
  No border. No shadow. No badge. No rating. No quick-add. No "New".
  Hover (@media (hover:hover) and (pointer:fine) only): crossfade the stage from the front
  render to the back render over 240ms ease-inout; card-title gains a 1px underline.
  Nothing translates, nothing scales.

BUTTONS  (border-radius: 0 everywhere on this site)
  Primary on navy:  bg --gold, text --ink-navy, height 48px, padding 0 28px,
                    button token. Hover bg --gold-deep, 160ms.
  Primary on bone:  bg --ink-navy, text --bone, same metrics. Hover bg #162034.
  Secondary:        transparent, 1px border currentColor @ 35%, same metrics.
                    Hover border 100%.
  PDP add-to-cart:  full width, height 52px.
  Text link:        1px underline, offset 3px. Hover thickness 2px.
  Disabled:         40% opacity, no colour change, cursor not-allowed.
  Focus (all):      2px --gold outline, 2px offset.

SEGMENTED CONTROL (the 360 toggle, sleeve picker)
  Height 36px, 1px --bone-line border, 0 radius, cells share borders.
  Labels in the label token (12px mono +0.12em UPPER).
  Selected: --ink-navy fill, --bone text. Unselected: transparent, --ink-70.

SIZE GRID
  8 cells: XS S M L XL 2XL 3XL 4XL. 44×44px, 1px --bone-line, 8px gap.
  Selected: 2px --ink border, --bone-deep fill.
  NEVER A1/A2/A3 on a rashguard (§2 — it is gi sizing and would mark the tool as built by
  someone outside the sport). Gi PDPs use A0–A6 and say so.

SPEC TABLE
  Two columns. Key in the label token (mono, --ink-45). Value in body-s (Barlow, --ink).
  Row height 44px, 1px --bone-line between rows, no outer border.
  Any value the client has not supplied renders as "— TO CONFIRM" in --ink-45 mono.
  That token is a visible design element, not a bug. It is how §7's honesty rule is enforced
  at the component level rather than left to a writer's discretion.

FOOTER
  --ink-navy, padding-block 96px.
  Four columns ≥1000px: SHOP / STUDIO / SUPPORT / PRODIGY. Column headers in the label token,
  --on-dark-45. Links body-s 14/400 --on-dark-70, 12px apart.
  Then a 1px --ink-line rule, 40px above and below.
  Bottom row: small wordmark left; © line and the honesty line right, both micro token:
    "SAMPLE STOREFRONT. PRICES, PRODUCT COPY AND SPECIFICATIONS ARE PLACEHOLDERS."
  No SAU crest, no SAU name, no "official partner" language anywhere (§7 hard rules 1 and 2).

## Page blueprint
HOMEPAGE — section by section
Every price token below renders "$— sample". Every unconfirmed spec renders "— TO CONFIRM".

--- 0. SAMPLE STRIP ---
Purpose: the honesty rule, made quiet and permanent.
28px, ink-navy, micro mono.
COPY: "SAMPLE STOREFRONT — PRICES AND PRODUCT COPY ARE PLACEHOLDERS"

--- 1. HEADER ---
72px sticky, transparent over the hero, solidifies to ink-navy after 80px.
Wordmark left. GIS · RASHGUARDS · RANKED · SETS · DESIGN YOUR OWN. SEARCH · ACCOUNT · CART 0.

--- 2. HERO — 360 VIEWER + ONE LINE ---
Purpose: prove in three seconds that this brand can show you a garment from every angle
before it exists in a photograph. This is the whole positioning argument, made as a gesture
rather than a claim.
Ground ink-navy, min-height max(640px, 100svh − 72px). Viewer centred, 560px tall,
72 frames at 5°. Gold "DRAG TO SPIN" label 24px under the garment baseline.
Text block bottom-left at the 40px gutter:
  LABEL (mono 12px):  "RASHGUARDS — RELAUNCHING"
  DISPLAY-XL, one line, ≤5 words. Three candidates, pick one:
     a) "EVERY ANGLE. BEFORE YOU BUY."
     b) "TURN IT AROUND."
     c) "SEE THE WHOLE GARMENT."
  BUTTON (primary, gold on navy): "SEE THE RANKED LINE"
No subhead. No second CTA. If the hero needs explaining, the viewer is not working.

--- 3. SECTION 01 — THE RANKED LINE ---
Purpose: lead with the product they announced and never shipped (§7 OBSERVED, verbatim reel
caption confirms a ranked SHORT-SLEEVE line in five colours). It is also the strongest image
we can make: five garments, one row, one idea.
Full-bleed, ink-navy. Five short-sleeve renders on a shared horizon at 68% panel height:
white, blue, purple, brown, black. Belt name under each in the label token.
  LABEL:     "01 — RANKED"
  DISPLAY-L: "FIVE BELTS. ONE CUT."
  LEAD (≤2 sentences): "Ranked short sleeve, in white, blue, purple, brown and black. Rank
    colour sits in the sleeve panels and the collar binding, not in a stripe across the chest."
  CAPTION (13px, on-dark-45), under the row:
    "IBJJF Art. 8.1.14 requires the rashguard to be 'colored black, white, or black and white,
    and with at least 10% of the rank color(belt) to which the athlete belongs.' The federation
    publishes no measuring method, so we build well clear of the line."  + link to the rules PDF.
  NO green legality badge. Anywhere. Ever. (DESIGN.md §3 — a false pass could cost someone
  their tournament.)

--- 4. SECTION 02 — CORE: BLACK AND WHITE ---
Purpose: the plain line. Shows the brand has a default, not only a gimmick.
Bone ground. Two stages side by side, 1:1, 620px each, 32px gap: black long-sleeve, white
long-sleeve.
  LABEL:     "02 — CORE"
  DISPLAY-L: "BLACK. WHITE. NOTHING ELSE."
  LEAD: "Long sleeve, chest wordmark, sleeve print, back print. The version you wear when
    you are not thinking about what you are wearing."
  Under each stage: card-title + "$— sample".

--- 5. SECTION 03 — SETS ---
Purpose: DESIGN.md §2 — "Kits are the unit of design. Same art across styles is not a
comparison feature, it is the actual product."
Full-bleed, bone-deep. Three renders baseline-aligned: rashguard, shorts, spats, all carrying
one artwork.
  LABEL:     "03 — SETS"
  DISPLAY-L: "ONE ARTWORK, THREE CUTS."
  LEAD: "Dye sublimation prints flat on the roll, then the pieces are cut and sewn. The same
    file becomes the rashguard, the shorts and the spats."
  BUTTON (secondary): "SHOP SETS"

--- 6. SECTION 04 — THE DETAIL (sleeve-name crops) ---
Purpose: the sleeve wordmark is the signature and it is invisible at grid scale. This is
Apple's "Take a Closer Look" pattern, and because a crop is only a viewBox change on the same
SVG, it costs nothing to build.
Ink-navy. One large render, left 55%. Four numbered hotspots with gold leader lines:
  01 CHEST WORDMARK   02 LEFT SLEEVE   03 RIGHT SLEEVE   04 BACK PRINT
Selecting a hotspot swaps the main stage to a 3:2 crop at 2.2× and reveals a two-line caption
on the right. Default state is 02.
  LABEL:     "04 — DETAIL"
  DISPLAY-L: "SHOULDER TO CUFF."
  CAPTION SLOTS (2 lines each, ≤22 words total):
    01 "Chest wordmark, centred, {{chest_print_height}} tall. — TO CONFIRM"
    02 "PRODIGY runs shoulder to cuff on both sleeves. It reads from inside your own guard."
    03 "Mirrored, so the name runs the same direction on either arm."
    04 "Back print sits between the shoulder blades, clear of the collar seam."

--- 7. SECTION 05 — GIS ---
Purpose: NOT in the brief, added deliberately. §7 OBSERVED: "A Canadian kimono company first;
rashguards are a line extension." A homepage that never mentions gis misrepresents the
business. Client can promote this to position 3 if gis lead the relaunch.
Bone. Three gi renders, 3-up, plus a spec table beside them.
  LABEL:     "05 — GIS"
  DISPLAY-L: "THE GI CAME FIRST."
  LEAD: "Prodigy started as a kimono company. The rashguards are the newer line."
  SPEC TABLE (all values slot-tokenised until supplied):
    JACKET WEAVE — TO CONFIRM · JACKET GSM — TO CONFIRM · PANT — TO CONFIRM ·
    SIZES A0–A6 · SHRINKAGE — TO CONFIRM

--- 8. SECTION 06 — DESIGN YOUR OWN ---
Purpose: the real differentiator. DESIGN.md §4.8 — the competitor's custom product is
upload-only with no preview; ours previews live, and ships the cut sheet no consumer tool
ships.
Ink-navy, two panes. Left: a garment render. Right: the flat cut-sheet render with cut line,
bleed and seams visible.
  LABEL:     "06 — STUDIO"
  DISPLAY-L: "UPLOAD IT. SEE IT. SEND IT."
  LEAD: "Drop in artwork and see it on the real pattern, front and back. Export the mockup
    and the factory cut sheet in the same click."
  BUTTON (primary, gold on navy): "OPEN THE STUDIO"

--- 9. SHOP ALL PREVIEW ---
Purpose: prove the range is stocked without a filter rail.
Bone, 4-up, 8 cards, no chrome. Then a single text link: "SHOP ALL →"
  LABEL: "07 — ALL"

--- 10. FOOTER ---
Ink-navy, 96px padding, four columns, rule, bottom row with the honesty line.
No SAU crest, no SAU name, no partnership language.


================================================================
PDP — with the 360 toggle
================================================================
--- BREADCRUMB ---  12px mono, --ink-45:  "RASHGUARDS / RANKED / SHORT SLEEVE"

--- MAIN, two columns, 64px gap, 96px top padding ---
LEFT 58% — GALLERY
  Above the stage: SEGMENTED CONTROL, 36px, two cells, mono labels:  [ FLAT | 360 ]
    Selecting 360 replaces the stage in place with the 36-frame viewer at IDENTICAL
    dimensions. Zero layout shift. State persists in sessionStorage so it survives a
    variant change.
  Stage: 1:1, --bone-deep, contact shadow.
  Thumbnail rail below, five 72px squares, 8px gap, mono captions:
    FRONT · BACK · L SLEEVE · R SLEEVE · CUT SHEET
    (The cut sheet in the gallery is a deliberate flex — no consumer store shows one.)

RIGHT 42% — BUY BOX, sticky at top 96px
  EYEBROW (mono 12px):  "RANKED — SHORT SLEEVE"
  H1 (34px BC 600 UPPER):  product name
  PRICE (16px/400):  "$— sample"
  SLEEVE:  segmented control, [ SHORT | LONG ]
  COLOUR:  belt swatch row, 32px squares, 2px --ink ring on selected, white swatch gets a
           1px --bone-line ring so it renders at all. Selected name echoed in 12px mono.
  SIZE:    8-cell grid XS–4XL, 44×44. Text link "SIZE CHART" beneath.
           A1/A2/A3 never appears on a rashguard PDP.
  BUTTON:  full width, 52px, primary-on-bone (ink-navy fill).
  Then three plain sections, NO accordions (A&P discipline, and it survives the restyle):
    DETAILS          mono label + 2 short paragraphs
    FIT & SIZING     mono label + 1 paragraph + the spec table
    SHIPPING & RETURNS   mono label + 1 paragraph, marked sample
  SPEC TABLE: 8 rows, mono keys / Barlow values, hairline separators.
    CUT · SLEEVE · BODY COLOUR · RANK COLOUR PLACEMENT · FABRIC — TO CONFIRM ·
    GSM — TO CONFIRM · PRINT METHOD (dye sublimation, all-over) · SIZES XS–4XL
  IBJJF NOTE: a plain paragraph, not a badge, not a callout box, quoting Art. 8.1.14 verbatim
    with a link to the official PDF, and stating plainly that no measuring method is published.

--- BELOW: THE DETAIL ---
Three 3:2 crops at 2.2×, 3-up, mono captions. Same hotspot content as homepage section 04.
  LABEL: "THE DETAIL"

--- BELOW: COMPLETE THE SET ---
3-up: the matching shorts and spats plus one more. Bone-deep ground.
  LABEL: "COMPLETE THE SET"
  LEAD: "One artwork, cut for each style."

--- BELOW: YOU MAY ALSO LIKE ---
4-up standard grid, no chrome.
  LABEL: "MORE FROM RANKED"

--- FOOTER ---
As homepage.

## Copy rules
PRODIGY ATHLETICS — COPY SYSTEM

================================================================
VOICE
================================================================
Practitioner-craft. Write as the person who cut the pattern, not the person who bought the ad.

The register is a training partner explaining a decision they made, to someone who will
notice if it is wrong. Not a coach shouting. Not a brand inspiring you. Plain, specific,
declarative. Confidence comes from precision, never from volume.

The audience argues about IBJJF rule text for fun. They will catch a wrong sizing convention
faster than a typo. Getting the category facts right is cheaper credibility than any adjective.

================================================================
ELEVEN RULES
================================================================
1.  Lead with the noun or the process. "Dye sublimation prints flat on the roll." Not
    "Experience the quality of…"
2.  One idea per sentence. Average 11 words. Hard ceiling 22.
3.  Numbers beat adjectives. If you cannot put a number on it, cut the sentence or write it
    as a {{slot}}. "Light" is not a claim. "{{gsm}} gsm" is.
4.  Say what a thing IS before you say what it is FOR.
5.  Never address the reader's identity. No "for the athlete who…", no "whether you're…",
    no "you've trained for this moment".
6.  Em-dash budget: one per 300 words. A period is almost always the right fix. Never use a
    pair of em-dashes as rhythm.
7.  No exclamation marks. Not one, anywhere, including the newsletter form.
8.  Maximum two adjectives per sentence. Never three in a row, in any position.
9.  Headlines are uppercase, six words or fewer, no colons, no -ing verbs, no gerund stacks.
10. THE SWAP TEST: if a sentence still reads true after you find-and-replace "Prodigy" with
    any competitor's name, it is not our sentence. Rewrite it or delete it.
11. THE HONESTY GATE: any number, material, origin, price, partnership, endorsement, athlete
    or event not listed as OBSERVED in DESIGN.md §7 renders as a visible slot token, not a
    guess. Prices render "$— sample". Specs render "— TO CONFIRM". This is enforced by the
    component, so a writer cannot quietly invent one.

================================================================
BANNED — WORDS AND PHRASES
================================================================
elevate · elevate your game · unleash · crafted · crafted for · expertly crafted ·
meticulously · seamlessly · "whether you're … or …" · game-changing · revolutionize ·
redefine · take it to the next level · designed to empower · "not just a X, it's a Y" ·
in today's world · at the end of the day · we believe that · passion for · world-class ·
premium quality · cutting-edge · state-of-the-art · curated · journey · unlock · built
different · no compromise · no-nonsense · engineered to perfection · the perfect blend of ·
delve · tapestry · testament to · boasts · ensures (as filler) · robust · leverage ·
holistic · synergy · ultimate · must-have · effortlessly

Two of those are on the list for a specific reason. "No compromise" is Shoyoroll's own PDP
language and "no-nonsense" is Scramble's — both are already owned by competitors and both are
adjectives pretending to be facts. If a peer brand's line would drop into our page unchanged,
rule 10 has already failed.

================================================================
BANNED — PATTERNS
================================================================
· The rule-of-three adjective stack: "light, durable and breathable"
· The fragment hype stack: "Lighter. Stronger. Yours."
· "It's not X. It's Y."
· Em-dash sandwiches used for cadence — like this one — anywhere
· Rhetorical questions as openers
· Second-person aspiration ("Your endless hours of training have led you to this moment")
· Superlatives without a citation ("the lightest gi ever created")
· Any claim about SAU, Submission Arts United, Invincible Fighting Championships,
  sanctioning, sponsorship, teams or athletes (DESIGN.md §7 hard rules 1 and 2)
· Any legality certification. Quote IBJJF Art. 8.1.14; never certify against it.
· Emoji, in any surface, including alt text
· Repeating the product name three times in one paragraph for SEO

================================================================
RHYTHM
================================================================
· Paragraphs run 1 to 3 sentences, 55 words maximum.
· Alternate one long sentence (14–20 words) with one short (4–8). Never three long in a row.
· Section leads are exactly one or two sentences. Never three. If it needs three, the render
  is not doing its job.
· PDP descriptions are three paragraphs, in this fixed order:
    P1 — what it is, plus the ONE decision that defines it
    P2 — materials and construction, numbers only, slots where unconfirmed
    P3 — fit, sizing and care
· Headline plus one line of body is the site default. Everything else is an exception that
  has to be argued for.
· Read every paragraph aloud. If you take a breath mid-sentence, split it.

================================================================
EIGHT LINES THAT PASS
================================================================
1.  "Ranked short sleeve. White, blue, purple, brown, black."
    → Nouns only. Matches §7 OBSERVED exactly, including that the ranked line is short-sleeve.

2.  "PRODIGY runs shoulder to cuff on both sleeves. It reads from inside your own guard."
    → Specific physical fact plus a practitioner observation nobody outside the sport writes.
      Fails the swap test for every competitor, which is the point.

3.  "Rank colour sits in the sleeve panels and the collar binding, not in a stripe across
    the chest."
    → States a design decision and what it is instead of. No adjective does any work.

4.  "IBJJF Art. 8.1.14 requires at least 10% rank colour. There is no published measuring
    method, so we build well clear of the line."
    → Cites the rule, declines to certify, explains our response. Two sentences, one long,
      one short.

5.  "One artwork, cut for the rashguard, the shorts and the spats. That is a set."
    → Defines the merchandising unit in fourteen words. No "collection", no "curated".

6.  "Sizes run XS to 4XL. A1 and A2 are gi sizing and do not apply here."
    → Category credibility for the price of a sentence. §2 flags this as the fastest way to
      be spotted as an outsider.

7.  "Every image on this site is a render from our own pattern files. There is no photography
    yet."
    → Turns the constraint into the position. Also the honesty rule stated in the brand's
      own voice rather than in a disclaimer.

8.  "Dye sublimation prints flat on the roll, then the pieces are cut and sewn. Coverage costs
    nothing, so the art runs to the seam."
    → Process, then the consequence for the customer. Both facts are from §2. This is what
      practitioner-craft sounds like when it is working.

================================================================
EIGHT LINES THAT FAIL
================================================================
1.  "Elevate your game with premium, performance-driven rashguards crafted for the modern
    grappler."
    ✗ elevate · premium · crafted for · three modifiers stacked · zero information.

2.  "Whether you're drilling on a Tuesday night or stepping onto the podium, Prodigy has you
    covered."
    ✗ banned whether/or construction · addresses reader identity (rule 5) · passes the swap
      test for any brand alive (rule 10).

3.  "Unleash your inner prodigy — because you're not just training, you're becoming."
    ✗ unleash · em-dash cadence · "not just X, it's Y" · a pun on the brand name is not a
      claim about a garment.

4.  "Seamlessly blending Canadian craftsmanship with game-changing fabric technology."
    ✗ seamlessly · game-changing · "craftsmanship" and "fabric technology" are both
      unsupported by anything in §7 · no noun you could photograph.

5.  "Lighter. Stronger. Faster."
    ✗ fragment hype stack · three comparatives with no baseline stated · violates rule 3
      three times in six words.

6.  "Officially worn at SAU events by champions across Ontario!"
    ✗ violates §7 hard rule 1 outright · invents an endorsement · exclamation mark. This one
      is not a style problem, it is a legal and trust problem.

7.  "The world's most advanced ranked rashguard. IBJJF legal, competition ready."
    ✗ unverifiable superlative · certifies legality, which DESIGN.md §3 explicitly forbids
      because a false pass could cost someone their tournament.

8.  "Meticulously crafted from cutting-edge 240 GSM fabric for the athlete who refuses to
    compromise."
    ✗ meticulously · crafted · cutting-edge · "refuses to compromise" · and worst of all the
      240 GSM is invented. Rule 11 says that number is "— TO CONFIRM" until the client
      supplies it.

================================================================
THE THIRTY-SECOND CHECK, run on every line before it ships
================================================================
1. Is there a number in this paragraph? If not, should there be, and do we actually have it?
2. Swap "Prodigy" for a competitor's name. Does it still read true? Then rewrite it.
3. Count the adjectives. More than two in a sentence, or any three in a row? Cut.
4. Count em-dashes and exclamation marks. Any exclamation mark is an automatic fail.
5. Does any claim here appear in DESIGN.md §7 OBSERVED? If not, is it in a slot token?
6. Read it aloud. Did you breathe mid-sentence? Split it.

SLOT TOKEN CONVENTION
  {{gsm}} {{fabric}} {{origin}} {{price}} {{chest_print_height}} {{shrinkage}}
  Unfilled slots render as "— TO CONFIRM" in the 10px mono micro token, in --ink-45.
  Unfilled prices render as "$— sample" in the price token.
  These are visible design elements, not placeholders to be hidden before launch. They are
  how the honesty rule is enforced structurally rather than by a writer remembering it.

## Gold standard + rubric
THE GOLD STANDARD: On — on.com
Judge every screen against On's system, measured live at 1905px on 2026-08-18.

WHY ON, AND NOT THE OBVIOUS CHOICES
Shoyoroll is the closest peer and I measured it in full, but its system is deliberately
anti-design: Helvetica, no accent colour, sub-1.0 line-heights, 10px gutters, 15px/500
uppercase titles, and nothing on a card but a name and a price. That works because fifteen
years of drop scarcity does the persuading. Prodigy's storefront currently 301-redirects to
an unrelated activewear brand. Copying Shoyoroll would leave a relaunching brand with a
beautiful page and no argument.

Represent proves a dark ground can read premium, but every hero is lifestyle photography and
we have none. Satisfy has the best editorial band structure but the same photographic
dependency. Gymshark and Hyperfly are volume-and-urgency systems solving the opposite problem.
Progress opens on trust-signal counters we cannot honestly populate. Apple has the best
product-viewer pattern in existence but a fourteen-section page and 50–150 words per section,
which for us would mean inventing product truth.

On is the only reference that is simultaneously premium, restrained, athletic, product-led
without photographic dependency, and solving our actual problem: explaining engineered garment
detail through type discipline rather than hype. DESIGN.md §7 states the positioning goal
verbatim — "closer to technical sportswear than fight merch" — so this is a gold standard
chosen to serve a requirement already written into the spec.

THE TRANSPLANTABLE MOVE, in measured numbers
On runs three type registers in strict opposition:
  · Display sans, 52.992px / 700 / line-height 1.10 / letter-spacing -0.52992px (-0.01em)
  · Body, 16px / 400 / line-height 1.50 / letter-spacing normal-to-0.2px
  · MONOSPACE micro-label, 12px / 500 / line-height 1.50 / letter-spacing 1.44px (+0.12em) /
    UPPERCASE — used for eyebrows and badges; and a mono h3 at 20px / tracking 1.2px / uppercase
Buttons: 14px / 700 / letter-spacing 0.84px (+0.06em) / UPPERCASE.
Section padding: 64px and 96px, and nothing else.
Colour: white, black, one near-black #151522, greys #e5e5e5 and #999. No accent on chrome at all.

Negative tracking on display against strongly positive tracking on mono labels IS the system.
It is one CSS rule's worth of effort and it is the entire difference between technical
sportswear and fight merch. Barlow has no mono, which is exactly why IBM Plex Mono is in our
stack.

SECOND REFERENCES, each with one defined job
  · Shoyoroll — merchandising restraint. Whenever a card is about to gain a badge, a rating,
    a colour dot or a quick-add, Shoyoroll is the veto.
  · Apple AirPods Pro — the "Take a Closer Look" hotspot viewer, which is our sleeve-detail
    section, and the convention of a scroll-scrubbed product hero over a looping video.
  · Scramble — copy voice. "Designed and produced to the highest specification." is the
    sentence shape.
  · Hyperfly — the anti-model for copy. Every banned pattern in the copy system has a verbatim
    Hyperfly line behind it.

THE INSTRUCTION TO A CRITIC
Do not ask "does this look like On". Prodigy is dark-grounded, uppercase-condensed and
render-only; On is light, sentence-case and photographic. Ask instead: does this page show
the same DISCIPLINE On shows — a closed type scale, a closed spacing scale, one accent spent
almost nowhere, the product as the largest element on every screen, and motion used only to
explain something rather than to decorate it. Score the rubric below.

================================================================
TEN-POINT RUBRIC — score each 1 to 5, 50 total
================================================================
1 = absent or actively contradicted · 2 = attempted, mostly fails · 3 = present but
inconsistent across pages · 4 = holds with one or two exceptions · 5 = holds on every page
at every breakpoint

1. ACCENT RESTRAINT
   Gold ≤2% of any viewport, ≤3 visible instances, appears only in the five permitted places,
   and never as text on Bone. Belt colours never leak into nav, buttons, links or footer.
   5 = you have to hunt for the gold and it is always doing a job.

2. TYPE DISCIPLINE
   Only the 16 defined tokens appear anywhere. Barlow Condensed is always uppercase. Mono is
   used only for labels, spec keys, belt names, breadcrumbs and the honesty strip, never for
   a sentence. Display-xl appears exactly once per page.
   1 = arbitrary font-sizes in the stylesheet.

3. PRODUCT-FIRST HIERARCHY
   The render is the largest element in every section. No headline out-measures the garment
   beside it. The hero viewer is the LCP element.
   1 = a section where the type is the subject and the render is decoration.

4. COPY DENSITY
   Each homepage section carries at most one headline plus two sentences. PDP body is three
   paragraphs. No paragraph exceeds 55 words. Headlines are six words or fewer.
   1 = a wall of body copy under any section header.

5. HONESTY SURFACE  ★ MUST SCORE 5 TO SHIP
   Every price renders "$— sample". Every unconfirmed spec renders "— TO CONFIRM" as a visible
   token. The sample strip is present and non-dismissible. No SAU name, crest, or partnership
   language anywhere. No IBJJF legality badge anywhere. No invented GSM, fabric, origin, price,
   SKU, athlete or endorsement.
   Any single violation caps this criterion at 1.

6. MOTION RESTRAINT
   At most one entrance animation per viewport height. No parallax, scroll-jacking, pinned
   sections, autoplaying carousels or hover lifts. prefers-reduced-motion honoured throughout.
   The hero autorotate stops on interaction or after 1.5 revolutions and never loops forever.
   1 = anything animates on every scroll.

7. 360 VIEWER QUALITY
   72 frames at 5° in the hero, 36 at 10° on the PDP. Drag feels 1:1 with momentum that
   settles. The FLAT/360 toggle causes zero layout shift. Keyboard stepping works with a
   visible focus ring. The "DRAG TO SPIN" affordance appears, then disappears on first drag
   and does not return.
   1 = a looping GIF, or a toggle that reflows the page.

8. GRID AND RHYTHM
   Every spacing value in the build comes from the 4px scale. Section padding sits on the
   128/96/64 rhythm and its responsive ramp. Page gutter 40/24/20. Product grid 4/3/2/2 at
   the defined breakpoints. Nothing sits off-grid.
   1 = magic numbers in the CSS.

9. RENDER CRAFT
   Consistent framing (FLAT or CROP, nothing else). Panels baseline-aligned on a shared horizon
   at 68%. object-fit: contain everywhere, never cover. White garments clearly readable against
   Bone Deep. No mirrored or rotated render faking a second angle or colourway. Contact shadow
   is the gradient, never a box-shadow.
   1 = a stretched, cropped or mirrored render, or a white garment that disappears.

10. CATEGORY CREDIBILITY  ★ MUST SCORE 5 TO SHIP
    Rashguard sizing is XS–4XL and A1/A2/A3 never appears on a rashguard. IBJJF Art. 8.1.14 is
    quoted verbatim with a link and no certification. All-over print is described correctly as
    the default state, not as a logo drop. A set is defined as one artwork across styles. Gis
    are present on the homepage, because the client is a kimono company first.
    Any single factual slip caps this criterion at 2.

SHIP GATE
  Total ≥ 40 / 50, AND no criterion below 3, AND criteria 5 and 10 both at 5.
  Criteria 5 and 10 are absolute because they are the two that cost the client trust rather
  than taste. DESIGN.md §7 puts it plainly: inventing a fact about their own brand is the
  fastest way to lose them.
