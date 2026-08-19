/**
 * collab-marks.js — marks for the "Prodigy × 死" gi (client brief: A&P × KISS gi as the
 * layout example, with the Japanese character for death instead of KISS, and a skull on
 * both sides). Everything here is PATH geometry — no fonts at render time.
 *
 *  SHI   — 死 (U+6B7B), outline extracted from Noto Sans JP Black (OFL). Font units:
 *          unitsPerEm UPM, advance ADV; y is font-up, so it is drawn with scale(k, -k).
 *  SKULL — original bold skull, box 0..200 × 0..220, evenodd holes for eyes/nose/teeth.
 *  BOLT  — optional lightning bolt, box 0..100 × 0..260 (the "bolt" variant).
 */
export const SHI = { upm: 1000, adv: 1000, d: 'M51 788H952V648H51ZM222 560H452V427H222ZM137 288 217 395Q246 381 279.5 361.5Q313 342 344.0 322.0Q375 302 394 284L309 165Q292 184 262.5 206.0Q233 228 199.5 249.5Q166 271 137 288ZM850 539 956 413Q907 380 854.0 349.0Q801 318 748.0 290.0Q695 262 645 237Q638 261 621.0 294.0Q604 327 590 349Q636 374 682.5 406.5Q729 439 772.0 473.5Q815 508 850 539ZM555 665H702V103Q702 66 708.0 56.0Q714 46 736 46Q741 46 751.5 46.0Q762 46 774.0 46.0Q786 46 796.5 46.0Q807 46 812 46Q827 46 835.0 57.5Q843 69 847.0 101.0Q851 133 853 192Q877 174 916.0 157.0Q955 140 984 133Q977 52 960.5 3.5Q944 -45 912.0 -66.0Q880 -87 826 -87Q818 -87 806.5 -87.0Q795 -87 781.5 -87.0Q768 -87 755.0 -87.0Q742 -87 730.5 -87.0Q719 -87 712 -87Q650 -87 616.0 -69.5Q582 -52 568.5 -10.5Q555 31 555 103ZM395 560H423L448 564L542 532Q517 372 464.5 250.0Q412 128 336.0 42.5Q260 -43 163 -92Q153 -75 134.0 -52.5Q115 -30 94.5 -9.0Q74 12 58 23Q150 65 219.0 134.5Q288 204 332.5 303.0Q377 402 395 532ZM215 678 362 644Q337 570 301.0 493.0Q265 416 220.0 347.5Q175 279 121 228Q108 243 89.0 260.5Q70 278 49.5 294.5Q29 311 13 322Q62 365 102.0 425.0Q142 485 170.5 551.5Q199 618 215 678Z' };
export const SKULL = { w: 200, h: 220, d: 'M 8.0,100.0 L 8.1,95.3 L 8.5,90.6 L 9.1,85.9 L 10.0,81.3 L 11.1,76.7 L 12.5,72.2 L 14.1,67.7 L 16.0,63.4 L 18.0,59.1 L 20.3,55.0 L 22.8,51.0 L 25.6,47.1 L 28.5,43.4 L 31.6,39.8 L 34.9,36.4 L 38.4,33.1 L 42.1,30.1 L 45.9,27.2 L 49.9,24.5 L 54.0,22.1 L 58.2,19.8 L 62.6,17.8 L 67.0,16.0 L 71.6,14.4 L 76.2,13.1 L 80.9,12.0 L 85.6,11.1 L 90.4,10.5 L 95.2,10.1 L 100.0,10.0 L 104.8,10.1 L 109.6,10.5 L 114.4,11.1 L 119.1,12.0 L 123.8,13.1 L 128.4,14.4 L 133.0,16.0 L 137.4,17.8 L 141.8,19.8 L 146.0,22.1 L 150.1,24.5 L 154.1,27.2 L 157.9,30.1 L 161.6,33.1 L 165.1,36.4 L 168.4,39.8 L 171.5,43.4 L 174.4,47.1 L 177.2,51.0 L 179.7,55.0 L 182.0,59.1 L 184.0,63.4 L 185.9,67.7 L 187.5,72.2 L 188.9,76.7 L 190.0,81.3 L 190.9,85.9 L 191.5,90.6 L 191.9,95.3 L 192.0,100.0 L 192.0,100.0 L 190.0,124.0 L 184.0,138.0 L 162.0,152.0 L 158.0,168.0 L 150.0,178.0 L 146.0,206.0 L 126.0,218.0 L 74.0,218.0 L 54.0,206.0 L 50.0,178.0 L 42.0,168.0 L 38.0,152.0 L 16.0,138.0 L 10.0,124.0 L 8.0,100.0 Z M 89.8,120.0 L 88.5,123.2 L 86.5,126.1 L 84.0,128.7 L 81.0,130.8 L 77.6,132.5 L 73.9,133.7 L 69.9,134.3 L 65.8,134.5 L 61.6,134.0 L 57.5,133.0 L 53.5,131.5 L 49.8,129.5 L 46.5,127.1 L 43.6,124.3 L 41.2,121.2 L 39.3,117.9 L 38.1,114.4 L 37.5,110.9 L 37.5,107.4 L 38.2,104.0 L 39.5,100.8 L 41.5,97.9 L 44.0,95.3 L 47.0,93.2 L 50.4,91.5 L 54.1,90.3 L 58.1,89.7 L 62.2,89.5 L 66.4,90.0 L 70.5,91.0 L 74.5,92.5 L 78.2,94.5 L 81.5,96.9 L 84.4,99.7 L 86.8,102.8 L 88.7,106.1 L 89.9,109.6 L 90.5,113.1 L 90.5,116.6 Z M 161.8,104.0 L 162.5,107.4 L 162.5,110.9 L 161.9,114.4 L 160.7,117.9 L 158.8,121.2 L 156.4,124.3 L 153.5,127.1 L 150.2,129.5 L 146.5,131.5 L 142.5,133.0 L 138.4,134.0 L 134.2,134.5 L 130.1,134.3 L 126.1,133.7 L 122.4,132.5 L 119.0,130.8 L 116.0,128.7 L 113.5,126.1 L 111.5,123.2 L 110.2,120.0 L 109.5,116.6 L 109.5,113.1 L 110.1,109.6 L 111.3,106.1 L 113.2,102.8 L 115.6,99.7 L 118.5,96.9 L 121.8,94.5 L 125.5,92.5 L 129.5,91.0 L 133.6,90.0 L 137.8,89.5 L 141.9,89.7 L 145.9,90.3 L 149.6,91.5 L 153.0,93.2 L 156.0,95.3 L 158.5,97.9 L 160.5,100.8 Z M 100.0,132.0 L 114.0,160.0 L 106.0,164.0 L 100.0,157.0 L 94.0,164.0 L 86.0,160.0 Z M 60.0,176.0 L 140.0,176.0 L 140.0,181.0 L 60.0,181.0 Z M 69.5,181.0 L 74.5,181.0 L 74.5,208.0 L 69.5,208.0 Z M 83.5,181.0 L 88.5,181.0 L 88.5,208.0 L 83.5,208.0 Z M 97.5,181.0 L 102.5,181.0 L 102.5,208.0 L 97.5,208.0 Z M 111.5,181.0 L 116.5,181.0 L 116.5,208.0 L 111.5,208.0 Z M 125.5,181.0 L 130.5,181.0 L 130.5,208.0 L 125.5,208.0 Z' };
export const BOLT = { w: 100, h: 260, d: 'M 62,0 L 100,0 L 58,104 L 88,104 L 22,260 L 40,150 L 8,150 Z' };

const num = n => Math.round(n * 100) / 100;
const strokeAttr = (stroke, sw, k) => stroke ? ` stroke="${stroke}" stroke-width="${num(sw / k)}" stroke-linejoin="round" paint-order="stroke fill"` : '';

/** 死 centred at (x, y); `size` ≈ the visual height of the character. */
export function shiSVG({ x = 0, y = 0, size = 100, fill = '#F5F3EE', stroke = null, strokeWidth = 0, rotate = 0, opacity = 1 } = {}) {
  const k = size / (SHI.upm * 0.88);
  return `<g transform="translate(${num(x)} ${num(y)}) rotate(${num(rotate)}) scale(${num(k)} ${num(-k)}) translate(${num(-SHI.adv / 2)} ${num(-380)})" opacity="${opacity}"><path d="${SHI.d}" fill="${fill}"${strokeAttr(stroke, strokeWidth, k)}/></g>`;
}

/** Skull centred at (x, y) with height `size`. */
export function skullSVG({ x = 0, y = 0, size = 100, fill = '#F5F3EE', stroke = null, strokeWidth = 0, rotate = 0, opacity = 1 } = {}) {
  const k = size / SKULL.h;
  return `<g transform="translate(${num(x)} ${num(y)}) rotate(${num(rotate)}) scale(${num(k)}) translate(${num(-SKULL.w / 2)} ${num(-SKULL.h / 2)})" opacity="${opacity}"><path fill-rule="evenodd" d="${SKULL.d}" fill="${fill}"${strokeAttr(stroke, strokeWidth, k)}/></g>`;
}

/** Bolt centred at (x, y) with height `size`. */
export function boltSVG({ x = 0, y = 0, size = 100, fill = '#F5F3EE', stroke = null, strokeWidth = 0, rotate = 0, opacity = 1 } = {}) {
  const k = size / BOLT.h;
  return `<g transform="translate(${num(x)} ${num(y)}) rotate(${num(rotate)}) scale(${num(k)}) translate(${num(-BOLT.w / 2)} ${num(-BOLT.h / 2)})" opacity="${opacity}"><path d="${BOLT.d}" fill="${fill}"${strokeAttr(stroke, strokeWidth, k)}/></g>`;
}

/**
 * "Patch" gradient (sunset: gold → red → purple), namespaced by uid.
 * Returns { defs, fill } — put `defs` inside the SVG's own <defs>; use `fill` on the mark.
 */
export function sunsetGradient(uid, key = 'sunset', colors = {}, opts = {}) {
  const { top = '#E8A33D', mid = '#E0245E', bottom = '#5B2C8F' } = colors;
  const id = `${uid}-${key}`;
  // `flip` reverses the gradient AXIS (not the stops), for marks drawn inside a group with
  // a negative y scale — SHI is drawn scale(k,-k) because its outline is font-up, so an
  // un-flipped objectBoundingBox gradient would render gold at the bottom.
  const [y1, y2] = opts.flip ? [1, 0] : [0, 1];
  return {
    defs: `<linearGradient id="${id}" x1="0" y1="${y1}" x2="0" y2="${y2}"><stop offset="0" stop-color="${top}"/><stop offset=".55" stop-color="${mid}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>`,
    fill: `url(#${id})`,
  };
}

/**
 * Contrast topstitching as a ZIGZAG polyline along a spine.
 * `pts` = [[x,y], …] the spine (a polyline; sample curves yourself). `amp` is half the
 * peak-to-peak width, `step` the run between direction changes. Returns a path `d` —
 * STROKE it, never fill it. `step` is honoured approximately: it is rounded so the
 * zigzag starts and ends exactly on the spine's endpoints.
 */
export function zigzagPath(pts, { amp = 12, step = 30, phase = 0 } = {}) {
  if (!Array.isArray(pts) || pts.length < 2) return '';
  const segs = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const dx = x1 - x0, dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) continue;
    segs.push({ x0, y0, ux: dx / len, uy: dy / len, len, s0: total });
    total += len;
  }
  if (!segs.length) return '';
  const at = s => {
    let g = segs[segs.length - 1];
    for (const q of segs) { if (s <= q.s0 + q.len) { g = q; break; } }
    const t = s - g.s0;
    return { x: g.x0 + g.ux * t, y: g.y0 + g.uy * t, nx: -g.uy, ny: g.ux };
  };
  const n = Math.max(2, Math.round(total / Math.max(step, 1)));
  const out = [];
  for (let i = 0; i <= n; i++) {
    const p = at(total * i / n);
    const a = (i === 0 || i === n) ? 0 : ((i + phase) % 2 ? amp : -amp);
    out.push(`${i === 0 ? 'M' : 'L'} ${num(p.x + p.nx * a)} ${num(p.y + p.ny * a)}`);
  }
  return out.join(' ');
}

/** The same spine as a plain polyline — the `zigzag:false` version of a stitch run. */
export function polylinePath(pts) {
  if (!Array.isArray(pts) || pts.length < 2) return '';
  return pts.map(([x, y], i) => `${i ? 'L' : 'M'} ${num(x)} ${num(y)}`).join(' ');
}
