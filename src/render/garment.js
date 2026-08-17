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
      case 'all': return ls ? [136, 220, 728, 604] : [204, 220, 592, 604];
      case 'front': case 'back': return [323, 220, 354, 604];
      case 'chest': return [CHEST_ZONE.x, CHEST_ZONE.y, CHEST_ZONE.w, CHEST_ZONE.h];
      case 'upperBack': return [UPPERBACK_ZONE.x, UPPERBACK_ZONE.y, UPPERBACK_ZONE.w, UPPERBACK_ZONE.h];
      case 'sleeveL': // wearer's left → viewer's right on front
        return (view === 'front') === true ? (ls ? [648, 262, 216, 464] : [648, 262, 148, 208])
                                           : (ls ? [136, 262, 216, 464] : [204, 262, 148, 208]);
      case 'sleeveR':
        return (view === 'front') === true ? (ls ? [136, 262, 216, 464] : [204, 262, 148, 208])
                                           : (ls ? [648, 262, 216, 464] : [648, 262, 148, 208]);
      case 'collar': return [433, 220, 134, 44];
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

function grainLayer({ url }, detail) {
  return detail === 'lite' ? '' :
    `<g style="mix-blend-mode:overlay" opacity=".5"><rect width="1000" height="1000" filter="${url('grain')}"/></g>`;
}

const SEAM_STYLE = `fill="none" stroke="#000" stroke-opacity=".27" stroke-width="2.2" stroke-linecap="round"`;

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
  <linearGradient id="${id('tX')}" x1="325" y1="0" x2="675" y2="0" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#000" stop-opacity=".54"/><stop offset=".15" stop-color="#000" stop-opacity=".14"/>
    <stop offset=".40" stop-color="#000" stop-opacity="0"/><stop offset=".66" stop-color="#000" stop-opacity=".05"/>
    <stop offset=".87" stop-color="#000" stop-opacity=".26"/><stop offset="1" stop-color="#000" stop-opacity=".60"/></linearGradient>
  <linearGradient id="${id('tY')}" x1="0" y1="224" x2="0" y2="822" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#000" stop-opacity=".20"/><stop offset=".16" stop-color="#000" stop-opacity="0"/>
    <stop offset=".70" stop-color="#000" stop-opacity=".05"/><stop offset="1" stop-color="#000" stop-opacity=".30"/></linearGradient>
  <radialGradient id="${id('lt')}" cx="${front ? 470 : 480}" cy="${front ? 386 : 400}" r="228" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#fff" stop-opacity="${front ? '.28' : '.22'}"/><stop offset=".55" stop-color="#fff" stop-opacity=".06"/>
    <stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <linearGradient id="${id('aL')}" x1="140" y1="560" x2="332" y2="372" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#000" stop-opacity=".60"/><stop offset=".26" stop-color="#000" stop-opacity=".07"/>
    <stop offset=".52" stop-color="#000" stop-opacity="0"/><stop offset=".80" stop-color="#000" stop-opacity=".27"/>
    <stop offset="1" stop-color="#000" stop-opacity=".58"/></linearGradient>
  <linearGradient id="${id('aR')}" x1="860" y1="560" x2="668" y2="372" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#000" stop-opacity=".64"/><stop offset=".26" stop-color="#000" stop-opacity=".13"/>
    <stop offset=".54" stop-color="#000" stop-opacity="0"/><stop offset=".80" stop-color="#000" stop-opacity=".23"/>
    <stop offset="1" stop-color="#000" stop-opacity=".56"/></linearGradient>`;
}

function rashguardShading(h, { view, style }) {
  const { url } = h;
  const front = view === 'front';
  const torsoFront = `
    <rect width="1000" height="1000" fill="${url('tX')}"/><rect width="1000" height="1000" fill="${url('tY')}"/>
    <ellipse cx="420" cy="470" rx="80" ry="24" fill="#000" opacity=".42" filter="${url('s2')}"/>
    <ellipse cx="580" cy="470" rx="80" ry="24" fill="#000" opacity=".42" filter="${url('s2')}"/>
    <rect x="495" y="318" width="10" height="248" fill="#000" opacity=".28" filter="${url('s3')}"/>
    <g filter="${url('s3')}" opacity=".6">
      <rect x="497" y="562" width="6" height="200" fill="#000" opacity=".30"/>
      <rect x="412" y="594" width="176" height="6" fill="#000" opacity=".22"/>
      <rect x="416" y="652" width="168" height="6" fill="#000" opacity=".19"/>
      <rect x="424" y="708" width="152" height="5" fill="#000" opacity=".13"/>
    </g>
    <ellipse cx="334" cy="440" rx="34" ry="78" fill="#000" opacity=".58" filter="${url('s2')}"/>
    <ellipse cx="666" cy="440" rx="34" ry="78" fill="#000" opacity=".58" filter="${url('s2')}"/>
    <ellipse cx="500" cy="820" rx="168" ry="20" fill="#000" opacity=".32" filter="${url('s3')}"/>`;
  const torsoBack = `
    <rect width="1000" height="1000" fill="${url('tX')}"/><rect width="1000" height="1000" fill="${url('tY')}"/>
    <rect x="494" y="270" width="12" height="470" fill="#000" opacity=".30" filter="${url('s3')}"/>
    <ellipse cx="424" cy="382" rx="62" ry="44" fill="#000" opacity=".26" transform="rotate(-14 424 382)" filter="${url('s2')}"/>
    <ellipse cx="576" cy="382" rx="62" ry="44" fill="#000" opacity=".26" transform="rotate(14 576 382)" filter="${url('s2')}"/>
    <path d="M 329 400 C 380 520 440 620 470 760 L 330 800 Z" fill="#000" opacity=".34" filter="${url('s1')}"/>
    <path d="M 671 400 C 620 520 560 620 530 760 L 670 800 Z" fill="#000" opacity=".34" filter="${url('s1')}"/>
    <ellipse cx="500" cy="268" rx="120" ry="30" fill="#000" opacity=".22" filter="${url('s2')}"/>
    <ellipse cx="500" cy="820" rx="168" ry="20" fill="#000" opacity=".30" filter="${url('s3')}"/>`;
  const capY = style === 'ls' ? 300 : 300;
  return `
  <g style="mix-blend-mode:multiply">
    <g clip-path="${url('cTor')}">${front ? torsoFront : torsoBack}</g>
    <g clip-path="${url('cVL')}"><rect width="1000" height="1000" fill="${url('aL')}"/></g>
    <g clip-path="${url('cVR')}"><rect width="1000" height="1000" fill="${url('aR')}"/></g>
    <g clip-path="${url('cGar')}" filter="${url('s2')}">
      <ellipse cx="366" cy="${capY}" rx="62" ry="20" fill="#000" opacity=".22" transform="rotate(-32 366 ${capY})"/>
      <ellipse cx="634" cy="${capY}" rx="62" ry="20" fill="#000" opacity=".22" transform="rotate(32 634 ${capY})"/>
    </g>
  </g>
  <g style="mix-blend-mode:screen" clip-path="${url('cGar')}">
    <g clip-path="${url('cTor')}"><rect width="1000" height="1000" fill="${url('lt')}"/></g>
    ${style === 'ls' ? `
    <ellipse cx="268" cy="486" rx="22" ry="126" fill="#fff" opacity=".16" transform="rotate(30 268 486)" filter="${url('s2')}"/>
    <ellipse cx="732" cy="486" rx="22" ry="126" fill="#fff" opacity=".12" transform="rotate(-30 732 486)" filter="${url('s2')}"/>` : `
    <ellipse cx="262" cy="352" rx="18" ry="60" fill="#fff" opacity=".16" transform="rotate(38 262 352)" filter="${url('s2')}"/>
    <ellipse cx="738" cy="352" rx="18" ry="60" fill="#fff" opacity=".12" transform="rotate(-38 738 352)" filter="${url('s2')}"/>`}
    ${front ? `<ellipse cx="424" cy="286" rx="80" ry="20" fill="#fff" opacity=".13" filter="${url('s2')}"/>` :
              `<ellipse cx="440" cy="352" rx="52" ry="34" fill="#fff" opacity=".12" filter="${url('s2')}"/>`}
    <ellipse cx="352" cy="330" rx="34" ry="52" fill="#fff" opacity=".10" transform="rotate(-24 352 330)" filter="${url('s2')}"/>
    <ellipse cx="648" cy="330" rx="34" ry="52" fill="#fff" opacity=".08" transform="rotate(24 648 330)" filter="${url('s2')}"/>
  </g>`;
}

function rashguardSeams({ view, style }) {
  const front = view === 'front';
  const neck = front ? NECK_F : NECK_B;
  const raglanL = front ? 'M 438 226 C 398 300 356 362 329 414' : 'M 436 234 C 398 302 356 362 329 414';
  const raglanR = front ? 'M 562 226 C 602 300 644 362 671 414' : 'M 564 234 C 602 302 644 362 671 414';
  const cuffs = style === 'ls'
    ? `<path d="M 202 726 C 180 722 158 716 136 706" stroke-opacity=".40"/>
       <path d="M 798 726 C 820 722 842 716 864 706" stroke-opacity=".40"/>`
    : `<path d="M 204 404 L 306 470" stroke-opacity=".40"/>
       <path d="M 796 404 L 694 470" stroke-opacity=".40"/>`;
  return `
  <g ${SEAM_STYLE}>
    <path d="${raglanL}"/><path d="${raglanR}"/>
    ${cuffs}
    <path d="M 354 804 C 451 822 549 822 646 804" stroke-opacity=".32"/>
    <path d="${neck}" stroke-opacity=".45" stroke-width="3"/>
    <path d="${front ? 'M 433 240 C 470 263 530 263 567 240' : 'M 438 249 C 470 238 530 238 562 249'}" stroke-opacity=".20"/>
  </g>`;
}

function renderRashguard(h, { style, view, baseColor, slots, size, detail, defs }) {
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
  const fill = (clip, p) => p ? `<g clip-path="${url(clip)}"><rect width="1000" height="1000" fill="${p}"/></g>` : '';

  return `${svgOpen(size, u)}
  <defs>${rashguardDefs(h, { style, view, detail })}${defs}</defs>
  <ellipse cx="500" cy="838" rx="205" ry="17" fill="#000" opacity=".14" filter="${url('s2')}"/>
  <g clip-path="${url('cGar')}">
    <rect width="1000" height="1000" fill="${baseColor}"/>
    ${all ? `<rect width="1000" height="1000" fill="${all}"/>` : ''}
    ${fill('cTor', body)}
    ${fill('cVL', vl)}
    ${fill('cVR', vr)}
    ${fill('cCol', collar)}
    ${zone ? `<g clip-path="${url('cTor')}">${fill('cZone', zone)}</g>` : ''}
    ${rashguardShading(h, { view, style })}
    ${grainLayer(h, detail)}
    ${rashguardSeams({ view, style })}
  </g>
  <path d="${outline}" fill="none" stroke="#000" stroke-opacity=".20" stroke-width="2.5"/>
</svg>`;
}

// ───────────────────────────── shorts ─────────────────────────────

function renderShorts(h, { view, baseColor, slots, size, detail, defs }) {
  const { u, id, url } = h;
  const front = view === 'front';
  const S = k => paint(slots[k]);
  const vl = front ? S('frontR') : S('backL');
  const vr = front ? S('frontL') : S('backR');
  const band = S('waistband');
  const all = S('all');
  const fill = (clip, p) => p ? `<g clip-path="${url(clip)}"><rect width="1000" height="1000" fill="${p}"/></g>` : '';

  const shadeFront = `
    <ellipse cx="500" cy="470" rx="70" ry="110" fill="#000" opacity=".42" filter="${url('s1')}"/>
    <ellipse cx="392" cy="330" rx="40" ry="70" fill="#000" opacity=".26" filter="${url('s1')}"/>
    <ellipse cx="608" cy="330" rx="40" ry="70" fill="#000" opacity=".26" filter="${url('s1')}"/>`;
  const shadeBack = `
    <ellipse cx="452" cy="330" rx="62" ry="58" fill="#000" opacity=".16" filter="${url('s1')}"/>
    <ellipse cx="548" cy="330" rx="62" ry="58" fill="#000" opacity=".16" filter="${url('s1')}"/>
    <rect x="497" y="244" width="6" height="200" fill="#000" opacity=".28" filter="${url('s3')}"/>
    <ellipse cx="500" cy="500" rx="60" ry="80" fill="#000" opacity=".30" filter="${url('s1')}"/>`;
  const seams = front
    ? `<path d="M 500 430 C 512 466 522 512 528 566" stroke-opacity=".34"/>
       <path d="M 500 430 C 488 466 478 512 472 566" stroke-opacity=".34"/>
       <path d="M 500 244 L 500 300" stroke-opacity=".22"/>`
    : `<path d="M 500 244 L 500 430" stroke-opacity=".30"/>
       <path d="M 500 430 C 512 466 522 512 528 566" stroke-opacity=".34"/>
       <path d="M 500 430 C 488 466 478 512 472 566" stroke-opacity=".34"/>`;

  return `${svgOpen(size, u)}
  <defs>
    <clipPath id="${id('cG')}"><path d="${SHORTS}"/></clipPath>
    <clipPath id="${id('cL')}"><path d="${SHORTS_VL}"/></clipPath>
    <clipPath id="${id('cR')}"><path d="${SHORTS_VR}"/></clipPath>
    <clipPath id="${id('cB')}"><path d="${SHORTS_BAND}"/></clipPath>
    ${commonDefs(h, detail)}
    <linearGradient id="${id('x')}" x1="330" y1="0" x2="670" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#000" stop-opacity=".54"/><stop offset=".18" stop-color="#000" stop-opacity=".10"/>
      <stop offset=".44" stop-color="#000" stop-opacity="0"/><stop offset=".70" stop-color="#000" stop-opacity=".08"/>
      <stop offset=".88" stop-color="#000" stop-opacity=".28"/><stop offset="1" stop-color="#000" stop-opacity=".58"/></linearGradient>
    <linearGradient id="${id('y')}" x1="0" y1="208" x2="0" y2="566" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#000" stop-opacity=".22"/><stop offset=".2" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".26"/></linearGradient>
    ${defs}
  </defs>
  <g transform="${SHORTS_XF}">
    <ellipse cx="500" cy="580" rx="180" ry="14" fill="#000" opacity=".14" filter="${url('s2')}"/>
    <g clip-path="${url('cG')}">
      <rect width="1000" height="1000" fill="${baseColor}"/>
      ${all ? `<rect width="1000" height="1000" fill="${all}"/>` : ''}
      ${fill('cL', vl)}${fill('cR', vr)}${fill('cB', band)}
      <g style="mix-blend-mode:multiply">
        <rect width="1000" height="1000" fill="${url('x')}"/><rect width="1000" height="1000" fill="${url('y')}"/>
        ${front ? shadeFront : shadeBack}
        <rect x="344" y="208" width="312" height="36" fill="#000" opacity=".14"/>
        <ellipse cx="500" cy="556" rx="150" ry="16" fill="#000" opacity=".22" filter="${url('s3')}"/>
      </g>
      <g style="mix-blend-mode:screen">
        <ellipse cx="430" cy="380" rx="46" ry="120" fill="#fff" opacity=".13" filter="${url('s1')}"/>
        <ellipse cx="570" cy="380" rx="46" ry="120" fill="#fff" opacity=".11" filter="${url('s1')}"/>
        <ellipse cx="500" cy="226" rx="140" ry="14" fill="#fff" opacity=".10" filter="${url('s2')}"/>
      </g>
      ${grainLayer(h, detail)}
      <g ${SEAM_STYLE}>
        <path d="M 344 244 L 656 244"/>
        ${seams}
      </g>
    </g>
    <path d="${SHORTS}" fill="none" stroke="#000" stroke-opacity=".20" stroke-width="2.5"/>
  </g>
</svg>`;
}

// ───────────────────────────── spats ─────────────────────────────

function renderSpats(h, { view, baseColor, slots, size, detail, defs }) {
  const { u, id, url } = h;
  const front = view === 'front';
  const S = k => paint(slots[k]);
  const vl = front ? S('legR') : S('legL');
  const vr = front ? S('legL') : S('legR');
  const band = S('waistband');
  const all = S('all');
  const fill = (clip, p) => p ? `<g clip-path="${url(clip)}"><rect width="1000" height="1000" fill="${p}"/></g>` : '';

  const shadeFront = `
    <ellipse cx="500" cy="430" rx="64" ry="90" fill="#000" opacity=".50" filter="${url('s1')}"/>
    <ellipse cx="404" cy="520" rx="16" ry="120" fill="#000" opacity=".20" transform="rotate(6 404 520)" filter="${url('s2')}"/>
    <ellipse cx="596" cy="520" rx="16" ry="120" fill="#000" opacity=".20" transform="rotate(-6 596 520)" filter="${url('s2')}"/>
    <ellipse cx="430" cy="668" rx="60" ry="16" fill="#000" opacity=".22" filter="${url('s2')}"/>
    <ellipse cx="570" cy="668" rx="60" ry="16" fill="#000" opacity=".22" filter="${url('s2')}"/>`;
  const shadeBack = `
    <ellipse cx="500" cy="330" rx="40" ry="60" fill="#000" opacity=".30" filter="${url('s1')}"/>
    <rect x="497" y="250" width="6" height="150" fill="#000" opacity=".26" filter="${url('s3')}"/>
    <ellipse cx="500" cy="700" rx="60" ry="30" fill="#000" opacity=".28" filter="${url('s1')}"/>
    <ellipse cx="440" cy="690" rx="50" ry="14" fill="#000" opacity=".22" filter="${url('s2')}"/>
    <ellipse cx="560" cy="690" rx="50" ry="14" fill="#000" opacity=".22" filter="${url('s2')}"/>`;
  const seams = front
    ? `<path d="M 400 884 L 478 884" stroke-opacity=".38"/><path d="M 522 884 L 600 884" stroke-opacity=".38"/>`
    : `<path d="M 500 262 L 500 396" stroke-opacity=".30"/>
       <path d="M 400 884 L 478 884" stroke-opacity=".38"/><path d="M 522 884 L 600 884" stroke-opacity=".38"/>`;

  return `${svgOpen(size, u)}
  <defs>
    <clipPath id="${id('cG')}"><path d="${SPATS}"/></clipPath>
    <clipPath id="${id('cL')}"><path d="${SPATS_VL}"/></clipPath>
    <clipPath id="${id('cR')}"><path d="${SPATS_VR}"/></clipPath>
    <clipPath id="${id('cB')}"><path d="${SPATS_BAND}"/></clipPath>
    ${commonDefs(h, detail)}
    <linearGradient id="${id('legL')}" x1="338" y1="600" x2="500" y2="560" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#000" stop-opacity=".58"/><stop offset=".28" stop-color="#000" stop-opacity=".06"/>
      <stop offset=".54" stop-color="#000" stop-opacity="0"/><stop offset=".82" stop-color="#000" stop-opacity=".30"/>
      <stop offset="1" stop-color="#000" stop-opacity=".62"/></linearGradient>
    <linearGradient id="${id('legR')}" x1="662" y1="600" x2="500" y2="560" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#000" stop-opacity=".58"/><stop offset=".28" stop-color="#000" stop-opacity=".06"/>
      <stop offset=".54" stop-color="#000" stop-opacity="0"/><stop offset=".82" stop-color="#000" stop-opacity=".30"/>
      <stop offset="1" stop-color="#000" stop-opacity=".62"/></linearGradient>
    <linearGradient id="${id('gY')}" x1="0" y1="198" x2="0" y2="884" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#000" stop-opacity=".24"/><stop offset=".14" stop-color="#000" stop-opacity="0"/>
      <stop offset=".72" stop-color="#000" stop-opacity=".04"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>
    ${defs}
  </defs>
  <ellipse cx="500" cy="898" rx="150" ry="14" fill="#000" opacity=".14" filter="${url('s2')}"/>
  <g clip-path="${url('cG')}">
    <rect width="1000" height="1000" fill="${baseColor}"/>
    ${all ? `<rect width="1000" height="1000" fill="${all}"/>` : ''}
    ${fill('cL', vl)}${fill('cR', vr)}${fill('cB', band)}
    <g style="mix-blend-mode:multiply">
      <g clip-path="${url('cL')}"><rect width="1000" height="1000" fill="${url('legL')}"/></g>
      <g clip-path="${url('cR')}"><rect width="1000" height="1000" fill="${url('legR')}"/></g>
      <rect width="1000" height="1000" fill="${url('gY')}"/>
      ${front ? shadeFront : shadeBack}
      <g clip-path="${url('cB')}"><rect width="1000" height="1000" fill="#000" opacity=".16"/></g>
      <ellipse cx="500" cy="258" rx="170" ry="14" fill="#000" opacity=".26" filter="${url('s3')}"/>
    </g>
    <g style="mix-blend-mode:screen">
      <ellipse cx="452" cy="500" rx="26" ry="150" fill="#fff" opacity=".15" transform="rotate(3 452 500)" filter="${url('s1')}"/>
      <ellipse cx="548" cy="500" rx="26" ry="150" fill="#fff" opacity=".13" transform="rotate(-3 548 500)" filter="${url('s1')}"/>
      <ellipse cx="500" cy="228" rx="130" ry="18" fill="#fff" opacity=".10" filter="${url('s2')}"/>
    </g>
    ${grainLayer(h, detail)}
    <g ${SEAM_STYLE}>
      <path d="M 343 248 C 448 262 552 262 657 248"/>
      ${seams}
    </g>
  </g>
  <path d="${SPATS}" fill="none" stroke="#000" stroke-opacity=".20" stroke-width="2.5"/>
</svg>`;
}

// ───────────────────────────── public API ─────────────────────────────

/**
 * Render a garment.
 * @returns {string} complete <svg> markup
 */
export function renderGarment({
  style = 'ls', view = 'front', baseColor = BASE_PRESETS.black,
  slots = {}, size = 1000, detail = 'full', uid, defs = '',
} = {}) {
  if (!STYLES[style]) throw new Error(`Unknown style "${style}"`);
  if (view !== 'front' && view !== 'back') throw new Error(`Unknown view "${view}"`);
  const h = ns(uid);
  const args = { style, view, baseColor, slots: slots || {}, size, detail, defs };
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
  uid, size = 1000, detail = 'full', defs = '', slots = {},
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
  return renderGarment({ style, view, baseColor, size, detail, uid, defs, slots: { ...rankSlots, ...slots } });
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
