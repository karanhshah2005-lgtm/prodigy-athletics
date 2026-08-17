/* ============================================================================
   src/render/panel.js — PRINT PANEL / CUT SHEET (flat pattern pieces)

   Rashguards, shorts and spats in this catalog are cut-and-sew dye-sublimated:
   artwork prints FLAT on the roll, pieces are then cut and sewn. This module
   draws the flat pattern pieces a factory actually needs alongside the pretty
   mockup — cut line, bleed, seams, grainline, quantities — so a brand owner
   committing to a 40-100 unit MOQ sight-unseen can see what they are buying.

   Self-contained. No imports. Every <svg> this module returns carries its own
   <defs> and every id it generates is prefixed with the caller's `uid`
   (see docs/AGENT-CONTEXT.md rules 1 and 2 — cross-<svg> url(#id) references
   and colliding ids both fail silently).

   Public API:
     renderCutSheet({ style, slots, baseColor, uid, defs })  -> svg string
     cutSheetPieces(style)                                   -> [{key,name,qty,w,h}]
     seamStraddleWarnings({ style, slots })                  -> [string]
============================================================================ */

/* ---------------------------------------------------------------------------
   Geometry helpers
--------------------------------------------------------------------------- */

/**
 * Mirrors an absolute SVG path (M / L / C / Z commands only, no relative or
 * arc commands are used anywhere in this file) horizontally within a box of
 * width `w`. Used to derive the L instance of a mirrored pattern piece (a
 * shorts leg panel, a spats leg) from a single hand-authored canonical
 * outline instead of hand-duplicating coordinates, which drifts.
 *
 * Correctness note: reflecting every (x,y) pair's x-coordinate in place,
 * without reordering the segments, is a valid mirror for Bezier curves —
 * each control point is reflected independently and the curve is still
 * walked start-to-end, so continuity between chained segments is preserved
 * automatically. Winding direction flips, which does not matter here: every
 * path in this file is a simple (non-self-intersecting) closed shape used
 * for fill-clipping and for stroking, and neither cares about winding.
 */
function mirrorPathX(d, w) {
  return d.replace(/([MLC])\s*([^MLCZ]*)/g, (_m, cmd, nums) => {
    const vals = nums.trim().split(/[\s,]+/).filter(Boolean).map(Number);
    const out = [];
    for (let i = 0; i < vals.length; i += 2) {
      out.push((w - vals[i]).toFixed(2), vals[i + 1]);
    }
    return `${cmd} ${out.join(' ')} `;
  });
}

function mirrorSeams(seams, w) {
  return seams.map((s) => ({ d: mirrorPathX(s.d, w), label: s.label }));
}

/* Sublimation bleed allowance. There is no real-world mm scale established
   elsewhere in this codebase (the garment renderer's viewBox is an abstract
   1000-unit canvas), so this is the pixel stand-in for "~8mm past the cut
   line" at the drawing scale used on this sheet. */
const BLEED_PX = 10;

const CUT_COLOR = '#111318';
const BLEED_COLOR = '#e0245e';
const SEAM_HALO = '#000';
const SEAM_COLOR = '#fff';

/* ---------------------------------------------------------------------------
   Piece geometry — piece-local coordinates, each piece's own (0,0)-(w,h) box.

   Body pieces are scaled 1.2105x in x from the screenshot-verified prototype
   at docs/panel-proto-v1.html (380->460 wide, height unchanged at 610) to
   fix the "reads as a surfboard" proportion problem while keeping the
   already-proven raglan diagonal (neckline -> underarm) and hem curves.
   Sleeve is scaled 1.2222x in x (270->330, height unchanged at 560) for the
   same reason. Shorts, spats and the short sleeve are new pieces authored
   for this module; there was no prototype to extend for those.
--------------------------------------------------------------------------- */

const FRONT_BODY = {
  w: 460, h: 610,
  outline: `M 155 26 C 188 54 272 54 305 26
    C 363 78 412 150 433 216
    C 443 330 441 460 431 584
    C 298 600 162 600 29 584
    C 19 460 17 330 27 216
    C 48 150 97 78 155 26 Z`,
  seams: [
    { d: `M 155 26 C 188 54 272 54 305 26`, label: 'neckline seam' },
    { d: `M 155 26 C 121 66 75 140 27 216`, label: 'raglan seam' },
    { d: `M 305 26 C 339 66 385 140 433 216`, label: 'raglan seam' },
    { d: `M 29 584 C 162 600 298 600 431 584`, label: 'hem' },
  ],
};

const BACK_BODY = {
  w: 460, h: 610,
  outline: `M 153 18 C 188 34 272 34 308 18
    C 366 70 412 148 433 216
    C 443 330 441 460 431 584
    C 298 600 162 600 29 584
    C 19 460 17 330 27 216
    C 48 148 94 70 153 18 Z`,
  seams: [
    { d: `M 153 18 C 188 34 272 34 308 18`, label: 'neckline seam' },
    { d: `M 153 18 C 119 62 73 140 27 216`, label: 'raglan seam' },
    { d: `M 308 18 C 341 62 387 140 433 216`, label: 'raglan seam' },
    { d: `M 29 584 C 162 600 298 600 431 584`, label: 'hem' },
  ],
};

/* Raglan sleeve, long. Cap (top) is where it meets the body: the seam
   splits into two long edges — one sews to the front raglan curve, one to
   the back raglan curve. Cuff is the open hem at the wrist. */
const SLEEVE_LS = {
  w: 330, h: 560,
  outline: `M 183 8 C 240 52 276 128 293 206
    C 301 320 293 430 279 512
    C 232 526 186 528 137 520
    C 117 430 98 320 86 206
    C 100 128 132 52 183 8 Z`,
  seams: [
    { d: `M 183 8 C 132 52 100 128 86 206`, label: 'raglan seam (to body)' },
    { d: `M 183 8 C 240 52 276 128 293 206`, label: 'raglan seam (to body)' },
    { d: `M 137 520 C 186 528 232 526 279 512`, label: 'cuff' },
  ],
};

/* Short sleeve: identical raglan cap geometry down to the underarm point
   (same armhole, same body pieces work for both styles), then a much
   shorter drop to a mid-bicep cuff instead of continuing to the wrist. */
const SLEEVE_SS = {
  w: 330, h: 260,
  outline: `M 183 8 C 240 52 276 128 293 206
    C 296 222 292 236 282 248
    C 250 258 216 260 183 260
    C 150 260 116 258 84 248
    C 74 236 70 222 73 206
    C 90 128 126 52 183 8 Z`,
  seams: [
    { d: `M 183 8 C 126 52 90 128 73 206`, label: 'raglan seam (to body)' },
    { d: `M 183 8 C 240 52 276 128 293 206`, label: 'raglan seam (to body)' },
    { d: `M 84 248 C 116 258 150 260 183 260 C 216 260 250 258 282 248`, label: 'cuff' },
  ],
};

const COLLAR = {
  w: 520, h: 70,
  outline: `M 0 8 L 520 8 L 520 62 L 0 62 Z`,
  seams: [{ d: `M 0 35 L 520 35`, label: 'fold' }],
  rect: true,
};

/* Shorts leg panels. Canonical shape is the R (right) panel: fly/inseam
   curve on the piece-local left edge, outer/hip seam on the right edge.
   L is derived with mirrorPathX so the two are true mirror images. */
const FRONT_PANEL_R = {
  w: 280, h: 400,
  outline: `M 66 8 C 150 2 214 6 268 22
    C 284 90 282 148 276 200
    C 270 270 258 330 244 380
    C 200 396 148 398 108 388
    C 100 340 96 284 96 230
    C 96 195 84 172 58 150
    C 54 100 58 40 66 8 Z`,
  seams: [
    { d: `M 66 8 C 150 2 214 6 268 22`, label: 'waistband seam' },
    { d: `M 268 22 C 284 90 282 148 276 200 C 270 270 258 330 244 380`, label: 'side seam' },
    { d: `M 108 388 C 100 340 96 284 96 230 C 96 195 84 172 58 150 C 54 100 58 40 66 8`, label: 'inseam' },
  ],
};

const BACK_PANEL_R = {
  w: 280, h: 400,
  outline: `M 62 0 C 148 2 216 2 272 18
    C 288 92 286 150 280 204
    C 274 274 262 334 248 384
    C 204 400 152 402 112 392
    C 104 344 100 288 100 236
    C 100 198 92 176 66 140
    C 58 92 56 40 62 0 Z`,
  seams: [
    { d: `M 62 0 C 148 2 216 2 272 18`, label: 'waistband seam' },
    { d: `M 272 18 C 288 92 286 150 280 204 C 274 274 262 334 248 384`, label: 'side seam' },
    { d: `M 112 392 C 104 344 100 288 100 236 C 100 198 92 176 66 140 C 58 92 56 40 62 0`, label: 'inseam' },
  ],
};

const WAISTBAND = {
  w: 740, h: 90,
  outline: `M 0 10 L 740 10 L 740 80 L 0 80 Z`,
  seams: [{ d: `M 0 45 L 740 45`, label: 'fold' }],
  rect: true,
};

/* Spats leg, full length. Canonical is the R leg; L is mirrorPathX'd. */
const LEG_R = {
  w: 260, h: 760,
  outline: `M 68 16 C 160 4 210 6 240 16
    C 250 120 246 240 232 340
    C 220 420 210 480 200 560
    C 194 630 190 690 188 740
    C 160 750 130 752 108 742
    C 112 690 116 630 122 560
    C 128 480 122 420 110 340
    C 96 260 78 220 66 190
    C 60 140 62 70 68 16 Z`,
  seams: [
    { d: `M 68 16 C 160 4 210 6 240 16`, label: 'waistband seam' },
    { d: `M 240 16 C 250 120 246 240 232 340 C 220 420 210 480 200 560 C 194 630 190 690 188 740`, label: 'side seam' },
    { d: `M 108 742 C 112 690 116 630 122 560 C 128 480 122 420 110 340 C 96 260 78 220 66 190 C 60 140 62 70 68 16`, label: 'inseam' },
  ],
};

/* Crotch gusset — a small diamond insert standard in fitted spats/leggings
   patterns for hip/knee mobility. It has no independently paintable slot
   (see the `slots` contract in docs/AGENT-CONTEXT.md — spats only names
   `legL`, `legR`, `waistband`); it still receives baseColor and `all`. */
const GUSSET = {
  w: 160, h: 200,
  outline: `M 80 6 L 154 100 L 80 194 L 6 100 Z`,
  seams: [
    { d: `M 80 6 L 6 100`, label: 'gusset seam' },
    { d: `M 80 6 L 154 100`, label: 'gusset seam' },
    { d: `M 6 100 L 80 194`, label: 'gusset seam' },
    { d: `M 154 100 L 80 194`, label: 'gusset seam' },
  ],
};

/* ---------------------------------------------------------------------------
   Per-style piece lists (draw order = layout flow order). `slotKey` maps a
   drawn piece to the paint slot named in the `slots` contract; a piece with
   `slotKey: null` (the gusset) only ever receives baseColor + the `all` flood.
--------------------------------------------------------------------------- */

function stylePieces(style) {
  switch (style) {
    case 'ls':
      return [
        { key: 'front', name: 'FRONT BODY', ...FRONT_BODY, slotKey: 'front' },
        { key: 'back', name: 'BACK BODY', ...BACK_BODY, slotKey: 'back' },
        { key: 'sleeveL', name: 'SLEEVE L', ...SLEEVE_LS, slotKey: 'sleeveL' },
        { key: 'sleeveR', name: 'SLEEVE R', ...SLEEVE_LS, slotKey: 'sleeveR' },
        { key: 'collar', name: 'COLLAR BINDING', ...COLLAR, slotKey: 'collar' },
      ];
    case 'ss':
      return [
        { key: 'front', name: 'FRONT BODY', ...FRONT_BODY, slotKey: 'front' },
        { key: 'back', name: 'BACK BODY', ...BACK_BODY, slotKey: 'back' },
        { key: 'sleeveL', name: 'SLEEVE L', ...SLEEVE_SS, slotKey: 'sleeveL' },
        { key: 'sleeveR', name: 'SLEEVE R', ...SLEEVE_SS, slotKey: 'sleeveR' },
        { key: 'collar', name: 'COLLAR BINDING', ...COLLAR, slotKey: 'collar' },
      ];
    case 'shorts':
      return [
        {
          key: 'frontL', name: 'FRONT PANEL L', w: FRONT_PANEL_R.w, h: FRONT_PANEL_R.h,
          outline: mirrorPathX(FRONT_PANEL_R.outline, FRONT_PANEL_R.w),
          seams: mirrorSeams(FRONT_PANEL_R.seams, FRONT_PANEL_R.w), slotKey: 'frontL',
        },
        { key: 'frontR', name: 'FRONT PANEL R', ...FRONT_PANEL_R, slotKey: 'frontR' },
        {
          key: 'backL', name: 'BACK PANEL L', w: BACK_PANEL_R.w, h: BACK_PANEL_R.h,
          outline: mirrorPathX(BACK_PANEL_R.outline, BACK_PANEL_R.w),
          seams: mirrorSeams(BACK_PANEL_R.seams, BACK_PANEL_R.w), slotKey: 'backL',
        },
        { key: 'backR', name: 'BACK PANEL R', ...BACK_PANEL_R, slotKey: 'backR' },
        { key: 'waistband', name: 'WAISTBAND', ...WAISTBAND, slotKey: 'waistband' },
      ];
    case 'spats':
      return [
        {
          key: 'legL', name: 'LEG L', w: LEG_R.w, h: LEG_R.h,
          outline: mirrorPathX(LEG_R.outline, LEG_R.w),
          seams: mirrorSeams(LEG_R.seams, LEG_R.w), slotKey: 'legL',
        },
        { key: 'legR', name: 'LEG R', ...LEG_R, slotKey: 'legR' },
        { key: 'waistband', name: 'WAISTBAND', ...WAISTBAND, slotKey: 'waistband' },
        { key: 'gusset', name: 'GUSSET', ...GUSSET, slotKey: null },
      ];
    default:
      return null;
  }
}

const STYLE_TITLES = {
  ls: 'LONG-SLEEVE RASHGUARD',
  ss: 'SHORT-SLEEVE RASHGUARD',
  shorts: 'GRAPPLING SHORTS',
  spats: 'FULL-LENGTH SPATS',
};

/* ---------------------------------------------------------------------------
   Seam adjacency — which pieces physically share a seam, and its name. This
   drives seamStraddleWarnings(); it is intentionally separate from the
   `seams` arrays above (those are for drawing) even though the labels echo
   each other for coherence.
--------------------------------------------------------------------------- */

const ADJACENCY = {
  ls: [
    { a: 'front', b: 'sleeveL', seam: 'raglan seam' },
    { a: 'front', b: 'sleeveR', seam: 'raglan seam' },
    { a: 'back', b: 'sleeveL', seam: 'raglan seam' },
    { a: 'back', b: 'sleeveR', seam: 'raglan seam' },
    { a: 'front', b: 'back', seam: 'side seam' },
    { a: 'front', b: 'collar', seam: 'neckline seam' },
    { a: 'back', b: 'collar', seam: 'neckline seam' },
  ],
  shorts: [
    { a: 'frontL', b: 'backL', seam: 'side seam' },
    { a: 'frontR', b: 'backR', seam: 'side seam' },
    { a: 'frontL', b: 'frontR', seam: 'center front seam' },
    { a: 'backL', b: 'backR', seam: 'center back seam' },
    { a: 'frontL', b: 'waistband', seam: 'waistband seam' },
    { a: 'frontR', b: 'waistband', seam: 'waistband seam' },
    { a: 'backL', b: 'waistband', seam: 'waistband seam' },
    { a: 'backR', b: 'waistband', seam: 'waistband seam' },
  ],
  spats: [
    { a: 'legL', b: 'legR', seam: 'inseam' },
    { a: 'legL', b: 'waistband', seam: 'waistband seam' },
    { a: 'legR', b: 'waistband', seam: 'waistband seam' },
    { a: 'legL', b: 'gusset', seam: 'gusset seam' },
    { a: 'legR', b: 'gusset', seam: 'gusset seam' },
  ],
};
ADJACENCY.ss = ADJACENCY.ls; // same piece graph as the long-sleeve

const PIECE_LABELS = {
  ls: { front: 'FRONT panel', back: 'BACK panel', sleeveL: 'SLEEVE L', sleeveR: 'SLEEVE R', collar: 'COLLAR' },
  shorts: { frontL: 'FRONT L panel', frontR: 'FRONT R panel', backL: 'BACK L panel', backR: 'BACK R panel', waistband: 'WAISTBAND' },
  spats: { legL: 'LEG L', legR: 'LEG R', waistband: 'WAISTBAND', gusset: 'GUSSET' },
};
PIECE_LABELS.ss = PIECE_LABELS.ls;

/* ---------------------------------------------------------------------------
   Drawing
--------------------------------------------------------------------------- */

/* Standard patternmaking grainline symbol: a straight double-headed arrow
   run along the piece's straight-of-grain axis. Vertical for body/leg/
   sleeve pieces; horizontal for long thin strips (collar, waistband) where
   the strip is cut along its length. */
function grainArrow(w, h) {
  const horizontal = w > h * 1.8;
  let x1, y1, x2, y2;
  if (horizontal) {
    const pad = w * 0.1;
    x1 = pad; y1 = h / 2; x2 = w - pad; y2 = h / 2;
  } else {
    const pad = h * 0.13;
    x1 = w / 2; y1 = pad; x2 = w / 2; y2 = h - pad;
  }
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len, px = -uy, py = ux;
  const head = 11, spread = head * 0.55;
  const pt = (bx, by, sx, sy) => `${(bx + sx).toFixed(1)},${(by + sy).toFixed(1)}`;
  const h1a = pt(x1, y1, ux * head + px * spread, uy * head + py * spread);
  const h1b = pt(x1, y1, ux * head - px * spread, uy * head - py * spread);
  const h2a = pt(x2, y2, -ux * head + px * spread, -uy * head + py * spread);
  const h2b = pt(x2, y2, -ux * head - px * spread, -uy * head - py * spread);
  return `<g stroke="#5a5a5a" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>
    <polyline points="${h1a} ${x1},${y1} ${h1b}"/>
    <polyline points="${h2a} ${x2},${y2} ${h2b}"/>
  </g>`;
}

function paintFills(w, h, baseColor, allPaint, piecePaint) {
  let s = `<rect width="${w}" height="${h}" fill="${baseColor}"/>`;
  if (allPaint) s += `<rect width="${w}" height="${h}" fill="${allPaint}"/>`;
  if (piecePaint) s += `<rect width="${w}" height="${h}" fill="${piecePaint}"/>`;
  return s;
}

/* Bleed line: the cut line offset outward by BLEED_PX.
   - Rectangular pieces (collar, waistband) get a PROPER outward offset:
     since the piece box is already axis-aligned at local (0,0)-(w,h), the
     bleed rectangle is exactly (-amt,-amt)-(w+amt,h+amt). Exact, not
     approximated.
   - Every other piece here is a curved silhouette (body, sleeve, leg,
     panel) or a simple polygon (gusset). A true outward offset of an
     arbitrary curve/polygon needs real path-offset math (walk the curve,
     offset each point along its normal, re-fit). That is out of scope for
     a factory-facing reference sheet, so this uses the cheaper prototype
     approximation instead: scale the whole outline about its own centre.
     The scale factor is chosen per piece so the offset is close to
     BLEED_PX at the piece's average dimension, rather than the flat 3.5%
     the prototype used regardless of piece size. This is a stand-in, not
     a true offset — it will read slightly too generous at sharp concave
     corners (e.g. the underarm curve) and slightly too tight elsewhere. */
function bleedMarkup(piece) {
  if (piece.rect) {
    const a = BLEED_PX;
    return `<rect x="${-a}" y="${-a}" width="${piece.w + 2 * a}" height="${piece.h + 2 * a}"
      fill="none" stroke="${BLEED_COLOR}" stroke-width="2" stroke-dasharray="9 7" vector-effect="non-scaling-stroke"/>`;
  }
  const avg = (piece.w + piece.h) / 2;
  const scale = 1 + (2 * BLEED_PX) / avg;
  return `<g transform="translate(${piece.w / 2} ${piece.h / 2}) scale(${scale.toFixed(4)}) translate(${-piece.w / 2} ${-piece.h / 2})">
    <path d="${piece.outline}" fill="none" stroke="${BLEED_COLOR}" stroke-width="2" stroke-dasharray="9 7" vector-effect="non-scaling-stroke"/>
  </g>`;
}

function seamMarkup(seams) {
  return seams.map((s) => `
    <path d="${s.d}" fill="none" stroke="${SEAM_HALO}" stroke-opacity=".32" stroke-width="4.8" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
    <path d="${s.d}" fill="none" stroke="${SEAM_COLOR}" stroke-opacity=".95" stroke-width="2.6" stroke-dasharray="6.5 5" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`).join('');
}

function drawPiece(piece, x, y, uid, idx, slots, baseColor) {
  const clipId = `${uid}-p${idx}-c`;
  const allPaint = slots.all || null;
  const piecePaint = piece.slotKey ? (slots[piece.slotKey] || null) : null;
  const label = `${piece.name} ×1`;
  return `<g transform="translate(${x} ${y})">
    <defs><clipPath id="${clipId}"><path d="${piece.outline}"/></clipPath></defs>
    ${bleedMarkup(piece)}
    <g clip-path="url(#${clipId})">
      ${paintFills(piece.w, piece.h, baseColor, allPaint, piecePaint)}
      ${grainArrow(piece.w, piece.h)}
    </g>
    <path d="${piece.outline}" fill="none" stroke="${CUT_COLOR}" stroke-width="2.6" vector-effect="non-scaling-stroke"/>
    ${seamMarkup(piece.seams)}
    <text x="${piece.w / 2}" y="${piece.h + 30}" text-anchor="middle"
      font-family="ui-monospace,Consolas,monospace" font-size="15" fill="#111" letter-spacing="1.2">${label}</text>
  </g>`;
}

/* ---------------------------------------------------------------------------
   Layout — a generic row-flow packer driven entirely by each piece's real
   (w,h), so position is computed from size and never hard-coded into an
   arrangement that happens to work for one style and collide for another.
--------------------------------------------------------------------------- */

const LAYOUT = { maxRowW: 1750, startX: 60, startY: 140, gapX: 40, gapY: 70, labelH: 46, footerH: 160, marginBottom: 40 };

function layout(pieces) {
  const { maxRowW, startX, startY, gapX, gapY, labelH } = LAYOUT;
  let x = startX, y = startY, rowH = 0, maxX = startX;
  const placed = [];
  pieces.forEach((piece, idx) => {
    const boxW = piece.w, boxH = piece.h + labelH;
    if (x !== startX && x + boxW > startX + maxRowW) {
      x = startX; y += rowH + gapY; rowH = 0;
    }
    placed.push({ piece, x, y, idx });
    maxX = Math.max(maxX, x + boxW);
    x += boxW + gapX;
    rowH = Math.max(rowH, boxH);
  });
  return { placed, rowsBottom: y + rowH, sheetW: maxX + 60 };
}

/* ---------------------------------------------------------------------------
   Public API
--------------------------------------------------------------------------- */

export function renderCutSheet({ style, slots = {}, baseColor = '#14161b', uid, defs = '' }) {
  const pieces = stylePieces(style);
  if (!pieces) {
    throw new Error(`panel.js renderCutSheet: unknown style "${style}" (expected ls | ss | shorts | spats)`);
  }
  const { placed, rowsBottom, sheetW } = layout(pieces);
  const sheetH = rowsBottom + LAYOUT.marginBottom + LAYOUT.footerH;

  const piecesMarkup = placed.map((p) => drawPiece(p.piece, p.x, p.y, uid, p.idx, slots, baseColor)).join('');
  const title = STYLE_TITLES[style];

  return `<svg id="${uid}" viewBox="0 0 ${sheetW} ${sheetH}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" font-family="ui-monospace,Consolas,monospace">
    <defs>${defs}</defs>
    <rect width="${sheetW}" height="${sheetH}" fill="#fff"/>

    <text x="40" y="46" font-size="19" letter-spacing="2" fill="#111">PRINT PANEL / CUT SHEET — ${title}</text>
    <text x="40" y="70" font-size="12" fill="#666">Sublimation layout. Artwork prints FLAT on the roll, then pieces are cut and sewn.
      Solid = cut line · dashed pink = bleed · dashed white = seam · arrow = grainline</text>
    <line x1="40" y1="88" x2="${sheetW - 40}" y2="88" stroke="#ddd"/>

    ${piecesMarkup}

    <g transform="translate(40 ${rowsBottom + 40})" font-size="12" fill="#444">
      <text y="0">BLEED     8 mm past every cut line</text>
      <text y="20">FABRIC    100% polyester, sublimation-ready, white base — dark blanks cannot be sublimated</text>
      <text y="40">NOTE      Cross-seam alignment is confirmed at sampling, not on this sheet.</text>
    </g>
  </svg>`;
}

/* Grouped piece metadata for UI (a size/quantity list, not a 1:1 map of what
   gets drawn on the sheet — mirrored pairs are drawn as two distinct
   instances on the sheet itself, since each can carry different artwork
   through the `slots` contract, but are reported here as one line with
   qty:2, matching the piece list in docs/DESIGN.md. */
const PIECE_METADATA = {
  ls: [
    { key: 'front', name: 'FRONT BODY', qty: 1, w: FRONT_BODY.w, h: FRONT_BODY.h },
    { key: 'back', name: 'BACK BODY', qty: 1, w: BACK_BODY.w, h: BACK_BODY.h },
    { key: 'sleeve', name: 'SLEEVE', qty: 2, w: SLEEVE_LS.w, h: SLEEVE_LS.h },
    { key: 'collar', name: 'COLLAR BINDING', qty: 1, w: COLLAR.w, h: COLLAR.h },
  ],
  ss: [
    { key: 'front', name: 'FRONT BODY', qty: 1, w: FRONT_BODY.w, h: FRONT_BODY.h },
    { key: 'back', name: 'BACK BODY', qty: 1, w: BACK_BODY.w, h: BACK_BODY.h },
    { key: 'sleeve', name: 'SLEEVE', qty: 2, w: SLEEVE_SS.w, h: SLEEVE_SS.h },
    { key: 'collar', name: 'COLLAR BINDING', qty: 1, w: COLLAR.w, h: COLLAR.h },
  ],
  shorts: [
    { key: 'front', name: 'FRONT PANEL', qty: 2, w: FRONT_PANEL_R.w, h: FRONT_PANEL_R.h },
    { key: 'back', name: 'BACK PANEL', qty: 2, w: BACK_PANEL_R.w, h: BACK_PANEL_R.h },
    { key: 'waistband', name: 'WAISTBAND', qty: 1, w: WAISTBAND.w, h: WAISTBAND.h },
  ],
  spats: [
    { key: 'leg', name: 'LEG', qty: 2, w: LEG_R.w, h: LEG_R.h },
    { key: 'waistband', name: 'WAISTBAND', qty: 1, w: WAISTBAND.w, h: WAISTBAND.h },
    { key: 'gusset', name: 'GUSSET', qty: 1, w: GUSSET.w, h: GUSSET.h },
  ],
};

export function cutSheetPieces(style) {
  const table = PIECE_METADATA[style];
  return table ? table.map((p) => ({ ...p })) : [];
}

export function seamStraddleWarnings({ style, slots = {} } = {}) {
  const pairs = ADJACENCY[style];
  if (!pairs) return [];

  const warnings = [];
  if (slots.all) {
    warnings.push('All-over print crosses every seam — alignment is only confirmed at sampling.');
  }

  const labels = PIECE_LABELS[style];
  const anyPaint = (key) => !!(slots[key] || slots.all);
  const seen = new Set();
  const add = (key, seam) => {
    const msg = `Artwork in ${labels[key]} meets the ${seam} — check alignment at sampling.`;
    if (!seen.has(msg)) { seen.add(msg); warnings.push(msg); }
  };

  for (const { a, b, seam } of pairs) {
    if (slots[a] && anyPaint(b)) add(a, seam);
    if (slots[b] && anyPaint(a)) add(b, seam);
  }
  return warnings;
}
