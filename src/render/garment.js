/**
 * garment.js — invisible-mannequin garment renderer (SVG, zero deps).
 *
 * See docs/RENDERER-SEED.md for the technique and the traps.
 * Every call returns a COMPLETE, self-contained <svg> string with its own <defs>
 * and a unique id namespace (uid). Never share defs across <svg> roots.
 *
 * Coordinate space: viewBox 0 0 1000 1000. Garment centred on x=500.
 *
 * Slot keys are PHYSICAL PIECES (a sleeve is one piece of fabric seen from front
 * and back), except the two placement zones `chest` / `upperBack`, which are
 * logo drop-zones on the front / back body pieces.
 *   rashguards (ls, ss): all, front, back, sleeveL, sleeveR, collar, chest, upperBack
 *   shorts:              all, frontL, frontR, backL, backR, waistband
 *   spats:               all, legL, legR, waistband
 * `sleeveL` / `legL` / `frontL` mean the WEARER's left. In the front view the
 * wearer's left is on the viewer's right; in the back view it is on the viewer's left.
 */

import { WORD_PRODIGY, wordSVG, lockupSVG, monoSVG } from './marks.js';

// ───────────────────────────── geometry ─────────────────────────────

const TORSO_F = `M 438 224 C 470 246 530 246 562 224
  C 600 230 626 242 648 262 C 666 308 672 360 671 414
  C 677 502 673 600 660 692 C 655 744 650 782 646 804
  C 549 822 451 822 354 804 C 350 782 345 744 340 692
  C 327 600 323 502 329 414 C 328 360 334 308 352 262
  C 374 242 400 230 438 224 Z`;

const TORSO_B = `M 436 232 C 470 220 530 220 564 232
  C 601 236 626 244 648 262 C 666 308 672 360 671 414
  C 677 502 673 600 660 692 C 655 744 650 782 646 804
  C 549 822 451 822 354 804 C 350 782 345 744 340 692
  C 327 600 323 502 329 414 C 328 360 334 308 352 262
  C 374 244 399 236 436 232 Z`;

// viewer's-left / viewer's-right sleeves
const LS_VL = `M 352 262 C 334 308 328 360 329 414
  C 284 470 236 606 202 726 C 180 722 158 716 136 706
  L 148 626 C 188 462 258 320 352 262 Z`;
const LS_VR = `M 648 262 C 666 308 672 360 671 414
  C 716 470 764 606 798 726 C 820 722 842 716 864 706
  L 852 626 C 812 462 742 320 648 262 Z`;
const SS_VL = `M 352 262 C 296 294 242 344 204 404
  L 306 470 C 312 452 318 436 330 424
  C 329 368 334 308 352 262 Z`;
const SS_VR = `M 648 262 C 704 294 758 344 796 404
  L 694 470 C 688 452 682 436 670 424
  C 671 368 666 308 648 262 Z`;

const NECK_F = `M 438 224 C 470 246 530 246 562 224`;
const NECK_B = `M 436 232 C 470 220 530 220 564 232`;

// combined silhouettes
const GAR_LS_F = `${NECK_F}
  C 600 230 626 242 648 262 C 742 320 812 462 852 626 L 864 706
  C 842 716 820 722 798 726 C 764 606 716 470 671 414
  C 677 502 673 600 660 692 C 655 744 650 782 646 804
  C 549 822 451 822 354 804 C 350 782 345 744 340 692
  C 327 600 323 502 329 414 C 284 470 236 606 202 726
  C 180 722 158 716 136 706 L 148 626 C 188 462 258 320 352 262
  C 374 242 400 230 438 224 Z`;
const GAR_LS_B = GAR_LS_F.replace(NECK_F, NECK_B).replace('C 374 242 400 230 438 224 Z', 'C 374 244 399 236 436 232 Z');

const GAR_SS_F = `${NECK_F}
  C 600 230 626 242 648 262 C 704 294 758 344 796 404
  L 694 470 C 688 452 682 436 670 424
  C 677 502 673 600 660 692 C 655 744 650 782 646 804
  C 549 822 451 822 354 804 C 350 782 345 744 340 692
  C 327 600 323 502 330 424 C 318 436 312 452 306 470
  L 204 404 C 242 344 296 294 352 262
  C 374 242 400 230 438 224 Z`;
const GAR_SS_B = GAR_SS_F.replace(NECK_F, NECK_B).replace('C 374 242 400 230 438 224 Z', 'C 374 244 399 236 436 232 Z');

// collar binding bands
const COLLAR_F = `M 438 224 C 470 246 530 246 562 224 L 567 240 C 530 263 470 263 433 240 Z`;
const COLLAR_B = `M 436 232 C 470 220 530 220 564 232 L 562 249 C 530 238 470 238 438 249 Z`;

// ── construction detail: binding / cuff / hem bands ──
// A band is a NARROW STRIP of fabric folded back on itself. It reads because it is a
// different value from the panel it sits on AND because its inner edge carries a seam
// with a topstitch. Each band has `d` (the strip), `seam` (its inner stitch line) and
// `edge` (the finished edge that catches the key light).
const COLLAR_F_SEAM = `M 433 240 C 470 263 530 263 567 240`;
const COLLAR_B_SEAM = `M 438 249 C 470 238 530 238 562 249`;

const CUFF_LS_VL = `M 202 726 C 180 722 158 716 136 706 L 141 670 C 162 679 186 686 212 691 Z`;
const CUFF_LS_VL_SEAM = `M 141 670 C 162 679 186 686 212 691`;
const CUFF_LS_VR = `M 798 726 C 820 722 842 716 864 706 L 859 670 C 838 679 814 686 788 691 Z`;
const CUFF_LS_VR_SEAM = `M 859 670 C 838 679 814 686 788 691`;
const CUFF_SS_VL = `M 204 404 L 306 470 L 324 442 L 222 376 Z`;
const CUFF_SS_VL_SEAM = `M 222 376 L 324 442`;
const CUFF_SS_VR = `M 796 404 L 694 470 L 676 442 L 778 376 Z`;
const CUFF_SS_VR_SEAM = `M 778 376 L 676 442`;

const HEM_BAND = `M 354 804 C 451 822 549 822 646 804 L 643 775 C 548 792 452 792 357 775 Z`;
const HEM_SEAM = `M 357 775 C 452 792 548 792 643 775`;
const HEM_EDGE = `M 354 804 C 451 822 549 822 646 804`;

const SHORTS_BAND_SEAM = `M 346 244 L 654 244`;
const SHORTS_BAND_EDGE = `M 344 208 L 656 208`;
const SPATS_BAND_SEAM = `M 343 248 C 448 262 552 262 657 248`;
const SPATS_BAND_EDGE = `M 352 198 L 648 198`;
const SPATS_CUFF_VL = `M 400 884 L 478 884 L 479 850 L 397 850 Z`;
const SPATS_CUFF_VL_SEAM = `M 397 850 L 479 850`;
const SPATS_CUFF_VR = `M 522 884 L 600 884 L 603 850 L 521 850 Z`;
const SPATS_CUFF_VR_SEAM = `M 521 850 L 603 850`;

// logo placement zones (rounded rects, clipped to body)
const CHEST_ZONE = { x: 392, y: 296, w: 216, h: 124 };
const UPPERBACK_ZONE = { x: 392, y: 288, w: 216, h: 124 };

// shorts (authored around y 208–566, scaled up at render time)
const SHORTS = `M 344 208 L 656 208 C 668 268 672 340 668 404
  C 662 470 652 528 646 566 L 528 566 C 522 512 512 466 500 430
  C 488 466 478 512 472 566 L 354 566 C 348 528 338 470 332 404
  C 328 340 332 268 344 208 Z`;
const SHORTS_VL = `M 344 208 C 332 268 328 340 332 404 C 338 470 348 528 354 566
  L 472 566 C 478 512 488 466 500 430 C 480 350 430 260 344 208 Z`;
const SHORTS_VR = `M 656 208 C 668 268 672 340 668 404 C 662 470 652 528 646 566
  L 528 566 C 522 512 512 466 500 430 C 520 350 570 260 656 208 Z`;
const SHORTS_BAND = `M 344 208 L 656 208 L 654 244 L 346 244 Z`;
const SHORTS_XF = 'translate(500 500) scale(1.5) translate(-500 -390)';
const SHORTS_XF_INV = 'translate(500 390) scale(0.66667) translate(-500 -500)';

// spats
const SPATS = `M 352 198 L 648 198 C 661 240 665 270 662 300
  C 656 420 640 560 620 700 C 610 790 604 850 600 884 L 522 884
  C 518 780 512 640 504 520 C 502 470 501 430 500 396
  C 499 430 498 470 496 520 C 488 640 482 780 478 884 L 400 884
  C 396 850 390 790 380 700 C 360 560 344 420 338 300
  C 335 270 339 240 352 198 Z`;
const SPATS_VL = `M 338 300 C 344 420 360 560 380 700 C 390 790 396 850 400 884
  L 478 884 C 482 780 488 640 496 520 C 498 470 499 430 500 396
  C 460 380 400 340 338 300 Z`;
const SPATS_VR = `M 662 300 C 656 420 640 560 620 700 C 610 790 604 850 600 884
  L 522 884 C 518 780 512 640 504 520 C 502 470 501 430 500 396
  C 540 380 600 340 662 300 Z`;
const SPATS_BAND = `M 352 198 L 648 198 C 652 214 655 230 657 248
  C 552 262 448 262 343 248 C 345 230 348 214 352 198 Z`;

// ── frame density ──
// The rashguard was authored at 728/1000 of the frame (73%) which left it swimming in
// whitespace on a card. Everything DRAWN is wrapped in RASH_XF (a scale about
// RASH_ORIGIN) so the long-sleeve silhouette fills ~80% of the frame; slotBBox applies
// the same map, so studio overlays and single-placement art stay pinned to the pixels
// that are actually painted. Paint layers (which may carry a userSpaceOnUse <pattern>)
// are wrapped back with RASH_XF_INV so pattern space === frame space === slotBBox space.
const RASH_K = 1.1;
const RASH_ORIGIN = [500, 520];
const xfAbout = (k, [cx, cy]) => `matrix(${k} 0 0 ${k} ${+(cx * (1 - k)).toFixed(4)} ${+(cy * (1 - k)).toFixed(4)})`;
const RASH_XF = xfAbout(RASH_K, RASH_ORIGIN);
const RASH_XF_INV = xfAbout(1 / RASH_K, RASH_ORIGIN);
const rashBox = ([x, y, w, h]) => [
  +(RASH_ORIGIN[0] + (x - RASH_ORIGIN[0]) * RASH_K).toFixed(2),
  +(RASH_ORIGIN[1] + (y - RASH_ORIGIN[1]) * RASH_K).toFixed(2),
  +(w * RASH_K).toFixed(2), +(h * RASH_K).toFixed(2),
];

// ───────────────────────────── belt colours ─────────────────────────────

export const BELT_HEX = Object.freeze({
  white: '#F2F2F0',
  blue: '#1B4DB1',
  purple: '#5B2C8F',
  brown: '#5A3A22',
  black: '#141414',
});

export const BASE_PRESETS = Object.freeze({
  black: '#14161b',
  white: '#ECECEA',
  navy: '#0B1220',
  grey: '#5A5E66',
});

// ───────────────────────────── slot metadata ─────────────────────────────

const RASH_SLOTS = {
  front: [
    { key: 'all', label: 'All-over print', printPx: [4800, 4800], piece: 'whole garment' },
    { key: 'front', label: 'Front body panel', printPx: [1800, 2400], piece: 'front body' },
    { key: 'chest', label: 'Chest logo zone', printPx: [900, 520], piece: 'front body', zone: true },
    { key: 'sleeveL', label: "Left sleeve (wearer's left)", printPx: [1300, 2200], piece: 'sleeve' },
    { key: 'sleeveR', label: "Right sleeve (wearer's right)", printPx: [1300, 2200], piece: 'sleeve' },
    { key: 'collar', label: 'Collar binding', printPx: [2000, 240], piece: 'collar' },
  ],
  back: [
    { key: 'all', label: 'All-over print', printPx: [4800, 4800], piece: 'whole garment' },
    { key: 'back', label: 'Back body panel', printPx: [1800, 2400], piece: 'back body' },
    { key: 'upperBack', label: 'Upper-back logo zone', printPx: [900, 520], piece: 'back body', zone: true },
    { key: 'sleeveL', label: "Left sleeve (wearer's left)", printPx: [1300, 2200], piece: 'sleeve' },
    { key: 'sleeveR', label: "Right sleeve (wearer's right)", printPx: [1300, 2200], piece: 'sleeve' },
    { key: 'collar', label: 'Collar binding', printPx: [2000, 240], piece: 'collar' },
  ],
};
const SS_SLOTS = {
  front: RASH_SLOTS.front.map(s => s.key.startsWith('sleeve') ? { ...s, printPx: [1300, 1000] } : s),
  back: RASH_SLOTS.back.map(s => s.key.startsWith('sleeve') ? { ...s, printPx: [1300, 1000] } : s),
};
const SHORTS_SLOTS = {
  front: [
    { key: 'all', label: 'All-over print', printPx: [3600, 2400], piece: 'whole garment' },
    { key: 'frontL', label: "Front panel (wearer's left)", printPx: [1200, 1500], piece: 'front panel' },
    { key: 'frontR', label: "Front panel (wearer's right)", printPx: [1200, 1500], piece: 'front panel' },
    { key: 'waistband', label: 'Waistband', printPx: [3000, 240], piece: 'waistband' },
  ],
  back: [
    { key: 'all', label: 'All-over print', printPx: [3600, 2400], piece: 'whole garment' },
    { key: 'backL', label: "Back panel (wearer's left)", printPx: [1200, 1500], piece: 'back panel' },
    { key: 'backR', label: "Back panel (wearer's right)", printPx: [1200, 1500], piece: 'back panel' },
    { key: 'waistband', label: 'Waistband', printPx: [3000, 240], piece: 'waistband' },
  ],
};
const SPATS_SLOTS = {
  front: [
    { key: 'all', label: 'All-over print', printPx: [3000, 4800], piece: 'whole garment' },
    { key: 'legL', label: "Left leg (wearer's left)", printPx: [1400, 4200], piece: 'leg' },
    { key: 'legR', label: "Right leg (wearer's right)", printPx: [1400, 4200], piece: 'leg' },
    { key: 'waistband', label: 'Waistband', printPx: [3000, 240], piece: 'waistband' },
  ],
};
SPATS_SLOTS.back = SPATS_SLOTS.front;

export const STYLES = Object.freeze({
  ls: { name: 'Long-sleeve rashguard', short: 'Long sleeve', slots: RASH_SLOTS, family: 'rashguard' },
  ss: { name: 'Short-sleeve rashguard', short: 'Short sleeve', slots: SS_SLOTS, family: 'rashguard' },
  shorts: { name: 'Grappling shorts', short: 'Shorts', slots: SHORTS_SLOTS, family: 'shorts' },
  spats: { name: 'Spats', short: 'Spats', slots: SPATS_SLOTS, family: 'spats' },
});

export function slotsFor(style, view = 'front') {
  const s = STYLES[style];
  if (!s) throw new Error(`Unknown style "${style}"`);
  const list = s.slots[view] || s.slots.front;
  return list.map(x => ({ ...x, bbox: slotBBox(style, view, x.key) }));
}

/** Bounding box of a slot in viewBox units — used for non-tiled (single-placement) art. */
export function slotBBox(style, view, key) {
  const fam = STYLES[style]?.family;
  if (fam === 'rashguard') {
    const ls = style === 'ls';
    switch (key) {
      case 'all': return rashBox(ls ? [136, 220, 728, 604] : [204, 220, 592, 604]);
      case 'front': case 'back': return rashBox([323, 220, 354, 604]);
      case 'chest': return rashBox([CHEST_ZONE.x, CHEST_ZONE.y, CHEST_ZONE.w, CHEST_ZONE.h]);
      case 'upperBack': return rashBox([UPPERBACK_ZONE.x, UPPERBACK_ZONE.y, UPPERBACK_ZONE.w, UPPERBACK_ZONE.h]);
      case 'sleeveL': // wearer's left → viewer's right on front
        return rashBox((view === 'front') === true ? (ls ? [648, 262, 216, 464] : [648, 262, 148, 208])
                                                   : (ls ? [136, 262, 216, 464] : [204, 262, 148, 208]));
      case 'sleeveR':
        return rashBox((view === 'front') === true ? (ls ? [136, 262, 216, 464] : [204, 262, 148, 208])
                                                   : (ls ? [648, 262, 216, 464] : [648, 262, 148, 208]));
      case 'collar': return rashBox([433, 220, 134, 44]);
    }
  }
  if (fam === 'shorts') {
    // authored space then SHORTS_XF (scale 1.5 about (500,390))
    const t = ([x, y, w, h]) => [500 + (x - 500) * 1.5, 500 + (y - 390) * 1.5, w * 1.5, h * 1.5];
    switch (key) {
      case 'all': return t([328, 208, 344, 358]);
      case 'frontL': case 'backL': return view === 'front' ? t([500, 208, 172, 358]) : t([328, 208, 172, 358]);
      case 'frontR': case 'backR': return view === 'front' ? t([328, 208, 172, 358]) : t([500, 208, 172, 358]);
      case 'waistband': return t([344, 208, 312, 36]);
    }
  }
  if (fam === 'spats') {
    switch (key) {
      case 'all': return [335, 198, 330, 686];
      case 'legL': return view === 'front' ? [500, 300, 162, 584] : [338, 300, 162, 584];
      case 'legR': return view === 'front' ? [338, 300, 162, 584] : [500, 300, 162, 584];
      case 'waistband': return [343, 198, 314, 64];
    }
  }
  return [0, 0, 1000, 1000];
}

// ───────────────────────────── helpers ─────────────────────────────

let AUTO = 0;
function ns(uid) {
  const u = uid || `g${(AUTO++).toString(36)}`;
  return { u, id: n => `${u}-${n}`, url: n => `url(#${u}-${n})` };
}

function rrect({ x, y, w, h }, r = 14) {
  return `M ${x + r} ${y} H ${x + w - r} Q ${x + w} ${y} ${x + w} ${y + r} V ${y + h - r} Q ${x + w} ${y + h} ${x + w - r} ${y + h} H ${x + r} Q ${x} ${y + h} ${x} ${y + h - r} V ${y + r} Q ${x} ${y} ${x + r} ${y} Z`;
}

function paint(p) { return p == null ? null : String(p); }

/** Common filter + grain defs. detail 'lite' halves blur radii and drops grain. */
function commonDefs({ id }, detail) {
  const k = detail === 'lite' ? 0.5 : 1;
  return `
  <filter id="${id('s1')}" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="${26 * k}"/></filter>
  <filter id="${id('s2')}" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="${11 * k}"/></filter>
  <filter id="${id('s3')}" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="${4 * k}"/></filter>
  ${detail === 'lite' ? '' : `<filter id="${id('grain')}" x="0" y="0" width="1000" height="1000" filterUnits="userSpaceOnUse">
    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="7" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 .26 0"/></filter>`}`;
}

/**
 * A fine directional knit rib. `full` gets the feTurbulence grain; `lite` (grid cards)
 * cannot afford a turbulence filter per card, so it gets this instead — one tiny
 * <pattern> of 4.5-unit stripes at ~3.5% overlay. Costs nothing and stops the fabric
 * reading as flat vector fill at thumbnail size.
 */
function knitDefs({ id }, detail) {
  return detail !== 'lite' ? '' :
    `<pattern id="${id('knit')}" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(24)">
      <rect width="9" height="4.5" fill="#fff"/><rect y="4.5" width="9" height="4.5" fill="#000"/></pattern>`;
}

function textureLayer({ url }, detail) {
  if (detail === 'lite') return `<g style="mix-blend-mode:overlay" opacity=".035"><rect width="1000" height="1000" fill="${url('knit')}"/></g>`;
  return `<g style="mix-blend-mode:overlay" opacity=".5"><rect width="1000" height="1000" filter="${url('grain')}"/></g>`;
}

// ── light + colourway tone ──
// One key light, upper-left. Everything directional in this file derives from that.

/** sRGB relative luminance of a hex colour. Non-hex paints (patterns) → treated as dark. */
function relLuminance(color) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(color || '').trim());
  if (!m) return 0.06;
  let hx = m[1];
  if (hx.length === 3) hx = hx[0] + hx[0] + hx[1] + hx[1] + hx[2] + hx[2];
  const ch = i => {
    const v = parseInt(hx.slice(i * 2, i * 2 + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * ch(0) + 0.7152 * ch(1) + 0.0722 * ch(2);
}

/**
 * How a colourway takes shading. `t` = 0 for dark colourways, 1 for light ones.
 * Multiply shading that reads as VOLUME on black reads as a STAIN on bone white, so
 * light colourways get ~42% less of it and lose the hard pec ellipses entirely.
 */
function toneOf(color) {
  const L = relLuminance(color);
  const x = Math.min(1, Math.max(0, (L - 0.14) / 0.41));
  const t = x * x * (3 - 2 * x);
  return { L, t, shade: +(1 - 0.42 * t).toFixed(3), light: t > 0.5 };
}

/**
 * Seam weights that survive a 300px card. A 2.2-unit stroke is 0.66 device px at
 * 300px — it disappears. Scale the stroke so it never falls under ~1.15 device px,
 * while staying at its authored weight once the render is 1000px. `k` is the scale of
 * the group the seams are drawn inside, so the on-screen weight is what we asked for.
 */
function seamKit(size = 1000, k = 1) {
  const w = Math.max(2.6, 1150 / Math.max(size, 1)) / k;
  return { w: +w.toFixed(2), ts: +Math.max(1.2, w * 0.52).toFixed(2), out: +(Math.max(2.6, 1250 / Math.max(size, 1)) / k).toFixed(2) };
}

/**
 * Seams as construction, not as drawing: every stitch line is a dark needle line PLUS a
 * lighter 'topstitch' companion offset a couple of units toward the light. The pair is
 * what makes a raglan read at thumbnail size without turning into an ink line at 1000px.
 * seams: [{ d, o = .34, off = [dx,dy] | null }]   hi: [{ d, o }] — lit finished edges.
 */
function seamGroup(kit, seams, hi = []) {
  const top = seams.filter(s => s.off !== null).map(s => {
    const [dx, dy] = s.off || [-3, -2.5];
    return `<path d="${s.d}" transform="translate(${dx} ${dy})" stroke-opacity="${((s.o ?? 0.34) * 0.52).toFixed(2)}"/>`;
  }).join('');
  const lit = hi.map(s => `<path d="${s.d}" stroke-opacity="${s.o ?? 0.24}"/>`).join('');
  const dark = seams.map(s => `<path d="${s.d}" stroke-opacity="${s.o ?? 0.34}"/>`).join('');
  return `
  <g fill="none" stroke="#fff" stroke-linecap="round" stroke-width="${kit.ts}">${top}</g>
  <g fill="none" stroke="#fff" stroke-linecap="round" stroke-width="${+(kit.ts * 1.15).toFixed(2)}">${lit}</g>
  <g fill="none" stroke="#000" stroke-linecap="round" stroke-width="${kit.w}">${dark}</g>`;
}

/**
 * Binding / cuff / waistband strips. A band is a separate piece of fabric, so it takes
 * the light differently from the panel around it: on dark colourways it lifts (screen),
 * on light ones it deepens (multiply). Either way it is a VALUE step, which is the cue
 * the eye reads as "garment", plus its own seam supplied by the caller.
 */
function bandLayer({ url }, tone, paths, clip) {
  if (!paths.length) return '';
  const mult = +(0.055 + 0.085 * tone.t).toFixed(3);
  const lift = +(0.1 * (1 - tone.t)).toFixed(3);
  const d = paths.map(p => `<path d="${p}"/>`).join('');
  return `<g clip-path="${url(clip)}">
    <g style="mix-blend-mode:multiply" fill="#000" opacity="${mult}">${d}</g>
    ${lift > 0.005 ? `<g style="mix-blend-mode:screen" fill="#fff" opacity="${lift}">${d}</g>` : ''}
  </g>`;
}

function svgOpen(size, uid) {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${size}" height="${size}" viewBox="0 0 1000 1000" data-garment="${uid}">`;
}

// ───────────────────────────── rashguard ─────────────────────────────

function rashguardDefs(h, { style, view, detail }) {
  const { id } = h;
  const front = view === 'front';
  return `
  <clipPath id="${id('cGar')}"><path d="${style === 'ls' ? (front ? GAR_LS_F : GAR_LS_B) : (front ? GAR_SS_F : GAR_SS_B)}"/></clipPath>
  <clipPath id="${id('cTor')}"><path d="${front ? TORSO_F : TORSO_B}"/></clipPath>
  <clipPath id="${id('cVL')}"><path d="${style === 'ls' ? LS_VL : SS_VL}"/></clipPath>
  <clipPath id="${id('cVR')}"><path d="${style === 'ls' ? LS_VR : SS_VR}"/></clipPath>
  <clipPath id="${id('cCol')}"><path d="${front ? COLLAR_F : COLLAR_B}"/></clipPath>
  <clipPath id="${id('cZone')}"><path d="${rrect(front ? CHEST_ZONE : UPPERBACK_ZONE)}"/></clipPath>
  ${commonDefs(h, detail)}
  ${knitDefs(h, detail)}
  <linearGradient id="${id('tX')}" x1="325" y1="0" x2="675" y2="0" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#000" stop-opacity=".34"/><stop offset=".14" stop-color="#000" stop-opacity=".05"/>
    <stop offset=".40" stop-color="#000" stop-opacity="0"/><stop offset=".64" stop-color="#000" stop-opacity=".09"/>
    <stop offset=".86" stop-color="#000" stop-opacity=".34"/><stop offset="1" stop-color="#000" stop-opacity=".62"/></linearGradient>
  <linearGradient id="${id('tY')}" x1="0" y1="224" x2="0" y2="822" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#000" stop-opacity=".18"/><stop offset=".16" stop-color="#000" stop-opacity="0"/>
    <stop offset=".70" stop-color="#000" stop-opacity=".05"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></linearGradient>
  <linearGradient id="${id('dg')}" x1="220" y1="200" x2="840" y2="880" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset=".52" stop-color="#000" stop-opacity=".05"/>
    <stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>
  <radialGradient id="${id('kl')}" cx="352" cy="286" r="520" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#fff" stop-opacity=".15"/><stop offset=".45" stop-color="#fff" stop-opacity=".05"/>
    <stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <radialGradient id="${id('lt')}" cx="${front ? 448 : 458}" cy="${front ? 368 : 384}" r="234" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#fff" stop-opacity="${front ? '.26' : '.20'}"/><stop offset=".55" stop-color="#fff" stop-opacity=".06"/>
    <stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <linearGradient id="${id('aL')}" x1="140" y1="560" x2="332" y2="372" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#000" stop-opacity=".44"/><stop offset=".30" stop-color="#000" stop-opacity=".03"/>
    <stop offset=".56" stop-color="#000" stop-opacity="0"/><stop offset=".82" stop-color="#000" stop-opacity=".26"/>
    <stop offset="1" stop-color="#000" stop-opacity=".52"/></linearGradient>
  <linearGradient id="${id('aR')}" x1="860" y1="560" x2="668" y2="372" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#000" stop-opacity=".72"/><stop offset=".24" stop-color="#000" stop-opacity=".20"/>
    <stop offset=".52" stop-color="#000" stop-opacity=".03"/><stop offset=".78" stop-color="#000" stop-opacity=".30"/>
    <stop offset="1" stop-color="#000" stop-opacity=".62"/></linearGradient>`;
}

function rashguardShading(h, { view, style, tone }) {
  const { url } = h;
  const front = view === 'front';
  // Key light upper-left: the wearer's chest turns away to the viewer's right, so the
  // right side of every cylinder is the deep one. On light colourways the two hard pec
  // undershadows are replaced by one very soft chest gradient — hard ellipses on bone
  // white read as stains, not as anatomy.
  const pecs = tone.light
    ? `<ellipse cx="508" cy="496" rx="162" ry="52" fill="#000" opacity=".10" filter="${url('s1')}"/>`
    : `<ellipse cx="416" cy="482" rx="86" ry="20" fill="#000" opacity=".24" filter="${url('s1')}"/>
       <ellipse cx="586" cy="486" rx="90" ry="22" fill="#000" opacity=".36" filter="${url('s1')}"/>`;
  const torsoFront = `
    <rect width="1000" height="1000" fill="${url('tX')}"/><rect width="1000" height="1000" fill="${url('tY')}"/>
    ${pecs}
    <rect x="497" y="344" width="8" height="190" fill="#000" opacity="${tone.light ? '.10' : '.17'}" filter="${url('s2')}"/>
    <g filter="${url('s2')}" opacity="${tone.light ? '.18' : '.34'}">
      <rect x="498" y="580" width="5" height="150" fill="#000" opacity=".20"/>
      <rect x="430" y="600" width="140" height="5" fill="#000" opacity=".16"/>
      <rect x="436" y="658" width="128" height="5" fill="#000" opacity=".13"/>
    </g>
    <ellipse cx="336" cy="440" rx="30" ry="78" fill="#000" opacity=".40" filter="${url('s2')}"/>
    <ellipse cx="666" cy="440" rx="36" ry="80" fill="#000" opacity=".64" filter="${url('s2')}"/>
    <ellipse cx="500" cy="820" rx="168" ry="20" fill="#000" opacity=".32" filter="${url('s3')}"/>`;
  const torsoBack = `
    <rect width="1000" height="1000" fill="${url('tX')}"/><rect width="1000" height="1000" fill="${url('tY')}"/>
    <rect x="495" y="270" width="11" height="470" fill="#000" opacity="${tone.light ? '.18' : '.28'}" filter="${url('s3')}"/>
    <ellipse cx="424" cy="382" rx="62" ry="44" fill="#000" opacity=".18" transform="rotate(-14 424 382)" filter="${url('s2')}"/>
    <ellipse cx="576" cy="382" rx="62" ry="44" fill="#000" opacity=".30" transform="rotate(14 576 382)" filter="${url('s2')}"/>
    <path d="M 329 400 C 380 520 440 620 470 760 L 330 800 Z" fill="#000" opacity=".24" filter="${url('s1')}"/>
    <path d="M 671 400 C 620 520 560 620 530 760 L 670 800 Z" fill="#000" opacity=".40" filter="${url('s1')}"/>
    <ellipse cx="500" cy="268" rx="120" ry="30" fill="#000" opacity=".20" filter="${url('s2')}"/>
    <ellipse cx="500" cy="820" rx="168" ry="20" fill="#000" opacity=".30" filter="${url('s3')}"/>`;
  const capY = 300;
  return `
  <g style="mix-blend-mode:multiply" opacity="${tone.shade}">
    <g clip-path="${url('cTor')}">${front ? torsoFront : torsoBack}</g>
    <g clip-path="${url('cVL')}"><rect width="1000" height="1000" fill="${url('aL')}"/></g>
    <g clip-path="${url('cVR')}"><rect width="1000" height="1000" fill="${url('aR')}"/></g>
    <g clip-path="${url('cGar')}"><rect width="1000" height="1000" fill="${url('dg')}"/></g>
    <g clip-path="${url('cGar')}" filter="${url('s2')}">
      <ellipse cx="366" cy="${capY}" rx="62" ry="20" fill="#000" opacity=".14" transform="rotate(-32 366 ${capY})"/>
      <ellipse cx="634" cy="${capY}" rx="64" ry="21" fill="#000" opacity=".30" transform="rotate(32 634 ${capY})"/>
    </g>
  </g>
  <g style="mix-blend-mode:screen" clip-path="${url('cGar')}">
    <rect width="1000" height="1000" fill="${url('kl')}"/>
    <g clip-path="${url('cTor')}"><rect width="1000" height="1000" fill="${url('lt')}"/></g>
    ${style === 'ls' ? `
    <ellipse cx="264" cy="486" rx="24" ry="130" fill="#fff" opacity=".20" transform="rotate(30 264 486)" filter="${url('s2')}"/>
    <ellipse cx="736" cy="486" rx="20" ry="120" fill="#fff" opacity=".08" transform="rotate(-30 736 486)" filter="${url('s2')}"/>` : `
    <ellipse cx="260" cy="352" rx="19" ry="62" fill="#fff" opacity=".20" transform="rotate(38 260 352)" filter="${url('s2')}"/>
    <ellipse cx="740" cy="352" rx="17" ry="58" fill="#fff" opacity=".08" transform="rotate(-38 740 352)" filter="${url('s2')}"/>`}
    ${front ? `<ellipse cx="418" cy="284" rx="82" ry="20" fill="#fff" opacity=".15" filter="${url('s2')}"/>` :
              `<ellipse cx="434" cy="350" rx="54" ry="34" fill="#fff" opacity=".13" filter="${url('s2')}"/>`}
    <ellipse cx="350" cy="328" rx="36" ry="54" fill="#fff" opacity=".13" transform="rotate(-24 350 328)" filter="${url('s2')}"/>
    <ellipse cx="650" cy="332" rx="30" ry="48" fill="#fff" opacity=".05" transform="rotate(24 650 332)" filter="${url('s2')}"/>
  </g>`;
}

/** Construction detail: which strips exist on this style/view, and their stitch lines. */
function rashguardConstruction({ view, style }) {
  const front = view === 'front';
  const ls = style === 'ls';
  return {
    bands: [
      front ? COLLAR_F : COLLAR_B,
      ls ? CUFF_LS_VL : CUFF_SS_VL,
      ls ? CUFF_LS_VR : CUFF_SS_VR,
      HEM_BAND,
    ],
    collarSeam: front ? COLLAR_F_SEAM : COLLAR_B_SEAM,
    collarEdge: front ? NECK_F : NECK_B,
    cuffSeamL: ls ? CUFF_LS_VL_SEAM : CUFF_SS_VL_SEAM,
    cuffSeamR: ls ? CUFF_LS_VR_SEAM : CUFF_SS_VR_SEAM,
    cuffEdgeL: ls ? 'M 202 726 C 180 722 158 716 136 706' : 'M 204 404 L 306 470',
    cuffEdgeR: ls ? 'M 798 726 C 820 722 842 716 864 706' : 'M 796 404 L 694 470',
  };
}

function rashguardSeams(kit, { view, style }) {
  const front = view === 'front';
  const c = rashguardConstruction({ view, style });
  const raglanL = front ? 'M 438 226 C 398 300 356 362 329 414' : 'M 436 234 C 398 302 356 362 329 414';
  const raglanR = front ? 'M 562 226 C 602 300 644 362 671 414' : 'M 564 234 C 602 302 644 362 671 414';
  const seams = [
    { d: raglanL, o: 0.36, off: [-4, -1.5] },   // topstitch sits on the lit side of each seam
    { d: raglanR, o: 0.40, off: [-4, -1.5] },
    { d: c.collarSeam, o: 0.42, off: [0, -3.4] },
    { d: c.cuffSeamL, o: 0.38, off: [-2.4, -2.4] },
    { d: c.cuffSeamR, o: 0.38, off: [2.4, -2.4] },
    { d: c.cuffEdgeL, o: 0.24, off: null },
    { d: c.cuffEdgeR, o: 0.24, off: null },
    { d: HEM_SEAM, o: 0.32, off: [0, -3.2] },
    { d: HEM_EDGE, o: 0.26, off: null },
  ];
  // the bound neck edge is the one place the eye looks for a collar — light it.
  return seamGroup(kit, seams, [{ d: c.collarEdge, o: 0.3 }]);
}

/**
 * Brand marks (chest lockup / monogram, "PRODIGY" down each sleeve, back print).
 * Drawn in authored geometry space BEFORE shading so the light falls on them too.
 *   marks = {
 *     chest:   { kind:'lockup'|'mono'|'word', color:'auto'|hex, width },   // front only
 *     back:    { kind:'word'|'lockup', color, width },                       // back only
 *     sleeves: { text:'PRODIGY', color:'auto'|hex, height },                // both views
 *   }
 * color 'auto' → Bone on dark bases, Ink on light bases.
 */
const SLEEVE_AXIS = {
  // [x0,y0] near the shoulder → [x1,y1] near the cuff, in authored space (viewer-left / viewer-right)
  ls: { vl: [[318, 352], [175, 706]], vr: [[682, 352], [825, 706]] },
  ss: { vl: [[318, 318], [262, 436]], vr: [[682, 318], [738, 436]] },
};
function marksLayer(h, { view, style, marks, tone, url }) {
  if (!marks) return '';
  const front = view === 'front';
  const autoCol = tone && tone.light ? '#0B1220' : '#F5F3EE';
  const col = c => (!c || c === 'auto') ? autoCol : c;
  let out = '';
  // chest / back
  const zone = front ? marks.chest : marks.back;
  if (zone) {
    const w = zone.width || (front ? 150 : 250);
    const cy = front ? 372 : 336;
    const c = col(zone.color);
    let m = '';
    if (zone.kind === 'mono') m = monoSVG({ cx: front ? 448 : 500, cy: front ? 352 : cy, size: zone.width || 54, color: zone.color && zone.color !== 'auto' ? zone.color : '#E8A33D', bg: zone.bg || (tone && tone.light ? '#0B1220' : '#0B1220') });
    else if (zone.kind === 'word') m = wordSVG(WORD_PRODIGY, { x: 500, y: cy, height: w / WORD_PRODIGY.w * WORD_PRODIGY.h, color: c });
    else m = lockupSVG({ x: 500, y: cy, width: w, color: c });
    out += `<g clip-path="${url('cTor')}">${m}</g>`;
  }
  // sleeves — the word runs shoulder → cuff on BOTH arms, letter tops facing viewer-right
  if (marks.sleeves && marks.sleeves.text !== null) {
    const ax = SLEEVE_AXIS[style] || SLEEVE_AXIS.ls;
    const c = col(marks.sleeves.color);
    const hgt = marks.sleeves.height || (style === 'ls' ? 38 : 24);
    for (const side of ['vl', 'vr']) {
      const [[x0, y0], [x1, y1]] = ax[side];
      const dx = x1 - x0, dy = y1 - y0;
      const len = Math.hypot(dx, dy);
      const ang = Math.atan2(dy, dx) * 180 / Math.PI;
      const wordW = hgt / WORD_PRODIGY.h * WORD_PRODIGY.w;
      // centre the word on the axis, leaving a little more room at the shoulder end
      const t = 0.5 + (style === 'ls' ? 0.03 : 0.0);
      const cx = x0 + dx * t, cy2 = y0 + dy * t;
      const height = Math.min(hgt, (len * 0.86) / WORD_PRODIGY.w * WORD_PRODIGY.h);
      out += `<g clip-path="${url(side === 'vl' ? 'cVL' : 'cVR')}">${wordSVG(WORD_PRODIGY, { x: cx, y: cy2, height, color: c, rotate: ang })}</g>`;
    }
  }
  return out;
}

function renderRashguard(h, { style, view, baseColor, slots, size, detail, defs, marks }) {
  const { u, url } = h;
  const front = view === 'front';
  const S = k => paint(slots[k]);
  // wearer's left is viewer's right on the front
  const vl = front ? S('sleeveR') : S('sleeveL');
  const vr = front ? S('sleeveL') : S('sleeveR');
  const body = front ? S('front') : S('back');
  const zone = front ? S('chest') : S('upperBack');
  const collar = S('collar');
  const all = S('all');
  const outline = style === 'ls' ? (front ? GAR_LS_F : GAR_LS_B) : (front ? GAR_SS_F : GAR_SS_B);
  const flat = detail === 'flat';
  const tone = toneOf(baseColor);
  const kit = seamKit(size, RASH_K);
  const cons = rashguardConstruction({ view, style });
  // Paint layers step back into frame space so a userSpaceOnUse <pattern> lands exactly
  // where slotBBox says it will, even though the garment itself is drawn scaled up.
  const P = inner => `<g transform="${RASH_XF_INV}">${inner}</g>`;
  const fill = (clip, p) => p ? `<g clip-path="${url(clip)}">${P(`<rect width="1000" height="1000" fill="${p}"/>`)}</g>` : '';

  return `${svgOpen(size, u)}
  <defs>${rashguardDefs(h, { style, view, detail })}${defs}</defs>
  <g transform="${RASH_XF}">
  ${flat ? '' : `<ellipse cx="500" cy="838" rx="205" ry="17" fill="#000" opacity=".14" filter="${url('s2')}"/>`}
  <g clip-path="${url('cGar')}">
    ${P(`<rect width="1000" height="1000" fill="${baseColor}"/>`)}
    ${all ? P(`<rect width="1000" height="1000" fill="${all}"/>`) : ''}
    ${fill('cTor', body)}
    ${fill('cVL', vl)}
    ${fill('cVR', vr)}
    ${fill('cCol', collar)}
    ${zone ? `<g clip-path="${url('cTor')}">${fill('cZone', zone)}</g>` : ''}
    ${flat ? '' : marksLayer(h, { view, style, marks, tone, url })}
    ${flat ? '' : bandLayer(h, tone, cons.bands, 'cGar')}
    ${flat ? '' : rashguardShading(h, { view, style, tone })}
    ${flat ? '' : textureLayer(h, detail)}
    ${flat ? '' : rashguardSeams(kit, { view, style })}
  </g>
  ${flat ? '' : `<path d="${outline}" fill="none" stroke="#000" stroke-opacity=".22" stroke-width="${kit.out}"/>`}
  </g>
</svg>`;
}

// ───────────────────────────── shorts ─────────────────────────────

function renderShorts(h, { view, baseColor, slots, size, detail, defs, marks }) {
  const { u, id, url } = h;
  const flat = detail === 'flat';
  const front = view === 'front';
  const S = k => paint(slots[k]);
  const vl = front ? S('frontR') : S('backL');
  const vr = front ? S('frontL') : S('backR');
  const band = S('waistband');
  const all = S('all');
  const tone = toneOf(baseColor);
  const kit = seamKit(size, 1.5);
  const P = inner => `<g transform="${SHORTS_XF_INV}">${inner}</g>`;
  const fill = (clip, p) => p ? `<g clip-path="${url(clip)}">${P(`<rect width="1000" height="1000" fill="${p}"/>`)}</g>` : '';

  const shadeFront = tone.light
    ? `<ellipse cx="500" cy="470" rx="82" ry="112" fill="#000" opacity=".26" filter="${url('s1')}"/>
       <ellipse cx="614" cy="336" rx="42" ry="72" fill="#000" opacity=".20" filter="${url('s1')}"/>`
    : `<ellipse cx="500" cy="470" rx="70" ry="110" fill="#000" opacity=".42" filter="${url('s1')}"/>
       <ellipse cx="388" cy="330" rx="38" ry="68" fill="#000" opacity=".18" filter="${url('s1')}"/>
       <ellipse cx="612" cy="332" rx="42" ry="72" fill="#000" opacity=".32" filter="${url('s1')}"/>`;
  const shadeBack = `
    <ellipse cx="452" cy="330" rx="62" ry="58" fill="#000" opacity=".11" filter="${url('s1')}"/>
    <ellipse cx="548" cy="330" rx="62" ry="58" fill="#000" opacity=".21" filter="${url('s1')}"/>
    <rect x="497" y="244" width="6" height="200" fill="#000" opacity=".26" filter="${url('s3')}"/>
    <ellipse cx="500" cy="500" rx="60" ry="80" fill="#000" opacity=".28" filter="${url('s1')}"/>`;
  const seams = front
    ? [{ d: 'M 500 430 C 512 466 522 512 528 566', o: 0.36, off: [-3, 0] },
       { d: 'M 500 430 C 488 466 478 512 472 566', o: 0.32, off: [-3, 0] },
       { d: 'M 500 244 L 500 300', o: 0.24, off: [-2.6, 0] }]
    : [{ d: 'M 500 244 L 500 430', o: 0.32, off: [-2.6, 0] },
       { d: 'M 500 430 C 512 466 522 512 528 566', o: 0.36, off: [-3, 0] },
       { d: 'M 500 430 C 488 466 478 512 472 566', o: 0.32, off: [-3, 0] }];

  return `${svgOpen(size, u)}
  <defs>
    <clipPath id="${id('cG')}"><path d="${SHORTS}"/></clipPath>
    <clipPath id="${id('cL')}"><path d="${SHORTS_VL}"/></clipPath>
    <clipPath id="${id('cR')}"><path d="${SHORTS_VR}"/></clipPath>
    <clipPath id="${id('cB')}"><path d="${SHORTS_BAND}"/></clipPath>
    ${commonDefs(h, detail)}
    ${knitDefs(h, detail)}
    <linearGradient id="${id('x')}" x1="330" y1="0" x2="670" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#000" stop-opacity=".36"/><stop offset=".20" stop-color="#000" stop-opacity=".04"/>
      <stop offset=".44" stop-color="#000" stop-opacity="0"/><stop offset=".70" stop-color="#000" stop-opacity=".12"/>
      <stop offset=".88" stop-color="#000" stop-opacity=".34"/><stop offset="1" stop-color="#000" stop-opacity=".60"/></linearGradient>
    <linearGradient id="${id('y')}" x1="0" y1="208" x2="0" y2="566" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#000" stop-opacity=".20"/><stop offset=".2" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".26"/></linearGradient>
    <linearGradient id="${id('dg')}" x1="330" y1="200" x2="672" y2="570" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient>
    <radialGradient id="${id('kl')}" cx="382" cy="250" r="380" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#fff" stop-opacity=".14"/><stop offset=".5" stop-color="#fff" stop-opacity=".04"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    ${defs}
  </defs>
  <g transform="${SHORTS_XF}">
    ${flat ? '' : `<ellipse cx="500" cy="580" rx="180" ry="14" fill="#000" opacity=".14" filter="${url('s2')}"/>`}
    <g clip-path="${url('cG')}">
      ${P(`<rect width="1000" height="1000" fill="${baseColor}"/>`)}
      ${all ? P(`<rect width="1000" height="1000" fill="${all}"/>`) : ''}
      ${fill('cL', vl)}${fill('cR', vr)}${fill('cB', band)}
      ${(!flat && marks && marks.waist) ? `<g clip-path="${url('cB')}">${wordSVG(WORD_PRODIGY, { x: 500, y: 226, height: marks.waist.height || 18, color: (marks.waist.color && marks.waist.color !== 'auto') ? marks.waist.color : (tone.light ? '#0B1220' : '#F5F3EE') })}</g>` : ''}
      ${(!flat && marks && marks.leg && front) ? `<g clip-path="${url('cR')}">${wordSVG(WORD_PRODIGY, { x: 604, y: 470, height: marks.leg.height || 16, color: (marks.leg.color && marks.leg.color !== 'auto') ? marks.leg.color : (tone.light ? '#0B1220' : '#F5F3EE'), rotate: 82 })}</g>` : ''}
      ${flat ? '' : `${bandLayer(h, tone, [SHORTS_BAND], 'cG')}
      <g style="mix-blend-mode:multiply" opacity="${tone.shade}">
        <rect width="1000" height="1000" fill="${url('x')}"/><rect width="1000" height="1000" fill="${url('y')}"/>
        <rect width="1000" height="1000" fill="${url('dg')}"/>
        ${front ? shadeFront : shadeBack}
        <ellipse cx="500" cy="556" rx="150" ry="16" fill="#000" opacity=".22" filter="${url('s3')}"/>
      </g>
      <g style="mix-blend-mode:screen">
        <rect width="1000" height="1000" fill="${url('kl')}"/>
        <ellipse cx="426" cy="380" rx="48" ry="122" fill="#fff" opacity=".16" filter="${url('s1')}"/>
        <ellipse cx="574" cy="380" rx="44" ry="118" fill="#fff" opacity=".07" filter="${url('s1')}"/>
      </g>
      ${textureLayer(h, detail)}
      ${seamGroup(kit, [{ d: SHORTS_BAND_SEAM, o: 0.34, off: [0, -3.2] }, ...seams], [{ d: SHORTS_BAND_EDGE, o: 0.26 }])}`}
    </g>
    ${flat ? '' : `<path d="${SHORTS}" fill="none" stroke="#000" stroke-opacity=".22" stroke-width="${kit.out}"/>`}
  </g>
</svg>`;
}

// ───────────────────────────── spats ─────────────────────────────

function renderSpats(h, { view, baseColor, slots, size, detail, defs, marks }) {
  const { u, id, url } = h;
  const flat = detail === 'flat';
  const front = view === 'front';
  const S = k => paint(slots[k]);
  const vl = front ? S('legR') : S('legL');
  const vr = front ? S('legL') : S('legR');
  const band = S('waistband');
  const all = S('all');
  const tone = toneOf(baseColor);
  const kit = seamKit(size, 1);
  const fill = (clip, p) => p ? `<g clip-path="${url(clip)}"><rect width="1000" height="1000" fill="${p}"/></g>` : '';

  const shadeFront = `
    <ellipse cx="500" cy="430" rx="64" ry="90" fill="#000" opacity="${tone.light ? '.32' : '.50'}" filter="${url('s1')}"/>
    <ellipse cx="404" cy="520" rx="15" ry="118" fill="#000" opacity=".13" transform="rotate(6 404 520)" filter="${url('s2')}"/>
    <ellipse cx="598" cy="520" rx="17" ry="122" fill="#000" opacity=".26" transform="rotate(-6 598 520)" filter="${url('s2')}"/>
    <ellipse cx="430" cy="668" rx="60" ry="16" fill="#000" opacity=".18" filter="${url('s2')}"/>
    <ellipse cx="570" cy="668" rx="60" ry="16" fill="#000" opacity=".24" filter="${url('s2')}"/>`;
  const shadeBack = `
    <ellipse cx="500" cy="330" rx="40" ry="60" fill="#000" opacity=".28" filter="${url('s1')}"/>
    <rect x="497" y="250" width="6" height="150" fill="#000" opacity=".24" filter="${url('s3')}"/>
    <ellipse cx="500" cy="700" rx="60" ry="30" fill="#000" opacity=".26" filter="${url('s1')}"/>
    <ellipse cx="438" cy="690" rx="50" ry="14" fill="#000" opacity=".17" filter="${url('s2')}"/>
    <ellipse cx="562" cy="690" rx="50" ry="14" fill="#000" opacity=".25" filter="${url('s2')}"/>`;
  const seams = [
    { d: SPATS_CUFF_VL_SEAM, o: 0.34, off: [0, -3.2] },
    { d: SPATS_CUFF_VR_SEAM, o: 0.34, off: [0, -3.2] },
    { d: 'M 400 884 L 478 884', o: 0.3, off: null },
    { d: 'M 522 884 L 600 884', o: 0.3, off: null },
    ...(front ? [] : [{ d: 'M 500 262 L 500 396', o: 0.3, off: [-2.6, 0] }]),
  ];

  return `${svgOpen(size, u)}
  <defs>
    <clipPath id="${id('cG')}"><path d="${SPATS}"/></clipPath>
    <clipPath id="${id('cL')}"><path d="${SPATS_VL}"/></clipPath>
    <clipPath id="${id('cR')}"><path d="${SPATS_VR}"/></clipPath>
    <clipPath id="${id('cB')}"><path d="${SPATS_BAND}"/></clipPath>
    ${commonDefs(h, detail)}
    ${knitDefs(h, detail)}
    <linearGradient id="${id('legL')}" x1="338" y1="600" x2="500" y2="560" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#000" stop-opacity=".44"/><stop offset=".30" stop-color="#000" stop-opacity=".03"/>
      <stop offset=".56" stop-color="#000" stop-opacity="0"/><stop offset=".84" stop-color="#000" stop-opacity=".28"/>
      <stop offset="1" stop-color="#000" stop-opacity=".56"/></linearGradient>
    <linearGradient id="${id('legR')}" x1="662" y1="600" x2="500" y2="560" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#000" stop-opacity=".70"/><stop offset=".26" stop-color="#000" stop-opacity=".14"/>
      <stop offset=".54" stop-color="#000" stop-opacity=".02"/><stop offset=".82" stop-color="#000" stop-opacity=".30"/>
      <stop offset="1" stop-color="#000" stop-opacity=".62"/></linearGradient>
    <linearGradient id="${id('gY')}" x1="0" y1="198" x2="0" y2="884" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#000" stop-opacity=".22"/><stop offset=".14" stop-color="#000" stop-opacity="0"/>
      <stop offset=".72" stop-color="#000" stop-opacity=".04"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>
    <linearGradient id="${id('dg')}" x1="340" y1="220" x2="670" y2="880" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".16"/></linearGradient>
    <radialGradient id="${id('kl')}" cx="392" cy="260" r="520" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#fff" stop-opacity=".13"/><stop offset=".5" stop-color="#fff" stop-opacity=".04"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    ${defs}
  </defs>
  ${flat ? '' : `<ellipse cx="500" cy="898" rx="150" ry="14" fill="#000" opacity=".14" filter="${url('s2')}"/>`}
  <g clip-path="${url('cG')}">
    <rect width="1000" height="1000" fill="${baseColor}"/>
    ${all ? `<rect width="1000" height="1000" fill="${all}"/>` : ''}
    ${fill('cL', vl)}${fill('cR', vr)}${fill('cB', band)}
    ${(!flat && marks && marks.waist) ? `<g clip-path="${url('cB')}">${wordSVG(WORD_PRODIGY, { x: 500, y: 228, height: marks.waist.height || 22, color: (marks.waist.color && marks.waist.color !== 'auto') ? marks.waist.color : (tone.light ? '#0B1220' : '#F5F3EE') })}</g>` : ''}
    ${(!flat && marks && marks.leg) ? `<g clip-path="${url('cR')}">${wordSVG(WORD_PRODIGY, { x: 604, y: 590, height: marks.leg.height || 26, color: (marks.leg.color && marks.leg.color !== 'auto') ? marks.leg.color : (tone.light ? '#0B1220' : '#F5F3EE'), rotate: 84 })}</g>` : ''}
    ${flat ? '' : `${bandLayer(h, tone, [SPATS_BAND, SPATS_CUFF_VL, SPATS_CUFF_VR], 'cG')}
    <g style="mix-blend-mode:multiply" opacity="${tone.shade}">
      <g clip-path="${url('cL')}"><rect width="1000" height="1000" fill="${url('legL')}"/></g>
      <g clip-path="${url('cR')}"><rect width="1000" height="1000" fill="${url('legR')}"/></g>
      <rect width="1000" height="1000" fill="${url('gY')}"/>
      <rect width="1000" height="1000" fill="${url('dg')}"/>
      ${front ? shadeFront : shadeBack}
      <ellipse cx="500" cy="258" rx="170" ry="14" fill="#000" opacity=".24" filter="${url('s3')}"/>
    </g>
    <g style="mix-blend-mode:screen">
      <rect width="1000" height="1000" fill="${url('kl')}"/>
      <ellipse cx="448" cy="500" rx="27" ry="152" fill="#fff" opacity=".18" transform="rotate(3 448 500)" filter="${url('s1')}"/>
      <ellipse cx="552" cy="500" rx="24" ry="146" fill="#fff" opacity=".09" transform="rotate(-3 552 500)" filter="${url('s1')}"/>
    </g>
    ${textureLayer(h, detail)}
    ${seamGroup(kit, [{ d: SPATS_BAND_SEAM, o: 0.34, off: [0, -3.4] }, ...seams], [{ d: SPATS_BAND_EDGE, o: 0.24 }])}`}
  </g>
  ${flat ? '' : `<path d="${SPATS}" fill="none" stroke="#000" stroke-opacity=".22" stroke-width="${kit.out}"/>`}
</svg>`;
}

// ───────────────────────────── public API ─────────────────────────────

/**
 * Render a garment.
 * @returns {string} complete <svg> markup
 */
export function renderGarment({
  style = 'ls', view = 'front', baseColor = BASE_PRESETS.black,
  slots = {}, size = 1000, detail = 'full', uid, defs = '', marks = null,
} = {}) {
  if (!STYLES[style]) throw new Error(`Unknown style "${style}"`);
  if (view !== 'front' && view !== 'back') throw new Error(`Unknown view "${view}"`);
  const h = ns(uid);
  const args = { style, view, baseColor, slots: slots || {}, size, detail, defs, marks };
  switch (STYLES[style].family) {
    case 'rashguard': return renderRashguard(h, args);
    case 'shorts': return renderShorts(h, args);
    case 'spats': return renderSpats(h, args);
  }
}

/**
 * Ranked construction: black or white body, belt colour flooding sleeves + collar.
 * This mirrors how the category actually builds ranked rashguards (sleeves + collar are
 * separate pattern pieces). Black belt on black body flips the body to white, and vice
 * versa, so the rank colour is always legible.
 */
export function renderRanked({
  style = 'ss', view = 'front', belt = 'white', body = 'black',
  uid, size = 1000, detail = 'full', defs = '', slots = {}, marks = null,
} = {}) {
  const hex = BELT_HEX[belt];
  if (!hex) throw new Error(`Unknown belt "${belt}"`);
  let bodyKey = body;
  if (belt === 'black' && body === 'black') bodyKey = 'white';
  if (belt === 'white' && body === 'white') bodyKey = 'black';
  const baseColor = bodyKey === 'white' ? BASE_PRESETS.white : BASE_PRESETS.black;
  const fam = STYLES[style]?.family;
  const rankSlots = fam === 'rashguard'
    ? { sleeveL: hex, sleeveR: hex, collar: hex }
    : fam === 'shorts' ? { waistband: hex } : { waistband: hex };
  return renderGarment({ style, view, baseColor, size, detail, uid, defs, marks, slots: { ...rankSlots, ...slots } });
}

/**
 * Approximate rank-colour coverage (0–1) of the VISIBLE surface for a ranked
 * configuration. This is an area estimate from the panel geometry, not a
 * measurement of a real garment — the IBJJF publishes no measuring method.
 */
export function estimateRankCoverage({ style = 'ss', slotsPainted = ['sleeveL', 'sleeveR', 'collar'] } = {}) {
  // approximate visible-area shares (front+back averaged), from the geometry
  const AREA = {
    ls: { front: .34, back: .34, sleeveL: .14, sleeveR: .14, collar: .015, chest: .03, upperBack: .03 },
    ss: { front: .40, back: .40, sleeveL: .075, sleeveR: .075, collar: .02, chest: .035, upperBack: .035 },
    shorts: { frontL: .24, frontR: .24, backL: .24, backR: .24, waistband: .04 },
    spats: { legL: .47, legR: .47, waistband: .06 },
  }[style] || {};
  let sum = 0;
  for (const k of slotsPainted) if (k === 'all') return 1; else sum += AREA[k] || 0;
  return Math.min(1, sum);
}
