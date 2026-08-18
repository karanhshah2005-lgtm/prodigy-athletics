/**
 * marks.js — Prodigy brand marks as PATH GEOMETRY (no fonts, no images).
 * Generated from assets/wordmark.svg + assets/logo.svg. Letters are rectilinear
 * block-stencil paths in a 120-unit-high em box; the monogram is a P in a roundel.
 * Used by garment.js (chest / sleeve / back marks) and by the storefront.
 */
export const WORD_PRODIGY = { w: 600.0, h: 120, paths: [{"dx": 0.0, "d": "M0,0 L26,0 L26,120 L0,120 Z M0,0 L84,0 L84,26 L0,26 Z M58,0 L84,0 L84,76 L58,76 Z M0,50 L84,50 L84,76 L0,76 Z"}, {"dx": 98.0, "d": "M0,0 L26,0 L26,120 L0,120 Z M0,0 L84,0 L84,26 L0,26 Z M58,0 L84,0 L84,76 L58,76 Z M0,50 L84,50 L84,76 L0,76 Z M52,70 L78,70 L84,120 L58,120 Z"}, {"dx": 196.0, "d": "M0,0 L80,0 L80,26 L0,26 Z M0,94 L80,94 L80,120 L0,120 Z M0,26 L26,26 L26,94 L0,94 Z M54,26 L80,26 L80,94 L54,94 Z"}, {"dx": 290.0, "d": "M0,0 L26,0 L26,120 L0,120 Z M0,0 L78,0 L78,26 L0,26 Z M0,94 L78,94 L78,120 L0,120 Z M52,26 L78,26 L78,94 L52,94 Z"}, {"dx": 382.0, "d": "M0,0 L26,0 L26,120 L0,120 Z"}, {"dx": 422.0, "d": "M0,0 L80,0 L80,26 L0,26 Z M0,94 L80,94 L80,120 L0,120 Z M0,26 L26,26 L26,94 L0,94 Z M54,60 L80,60 L80,94 L54,94 Z M40,54 L80,54 L80,80 L40,80 Z"}, {"dx": 516.0, "d": "M0,0 L26,0 L50,60 L24,60 Z M60,60 L34,60 L58,0 L84,0 Z M29,54 L55,54 L55,120 L29,120 Z"}] };
export const WORD_ATHLETICS = { w: 704.0, h: 120, paths: [{"dx": 0.0, "d": "M0,120 L31,0 L57,0 L88,120 L62,120 L58,96 L30,96 L26,120 Z M44,24 L51,70 L37,70 Z", "fr": "evenodd"}, {"dx": 102.0, "d": "M0,0 L74,0 L74,26 L0,26 Z M24,0 L50,0 L50,120 L24,120 Z"}, {"dx": 190.0, "d": "M0,0 L26,0 L26,120 L0,120 Z M48,0 L74,0 L74,120 L48,120 Z M0,47 L74,47 L74,73 L0,73 Z"}, {"dx": 278.0, "d": "M0,0 L26,0 L26,120 L0,120 Z M0,94 L60,94 L60,120 L0,120 Z"}, {"dx": 352.0, "d": "M0,0 L26,0 L26,120 L0,120 Z M0,0 L62,0 L62,26 L0,26 Z M0,47 L56,47 L56,73 L0,73 Z M0,94 L62,94 L62,120 L0,120 Z"}, {"dx": 428.0, "d": "M0,0 L74,0 L74,26 L0,26 Z M24,0 L50,0 L50,120 L24,120 Z"}, {"dx": 516.0, "d": "M0,0 L26,0 L26,120 L0,120 Z"}, {"dx": 556.0, "d": "M0,0 L26,0 L26,120 L0,120 Z M0,0 L66,0 L66,26 L0,26 Z M0,94 L66,94 L66,120 L0,120 Z"}, {"dx": 636.0, "d": "M0,0 L68,0 L68,26 L0,26 Z M0,0 L26,0 L26,60 L0,60 Z M0,47 L68,47 L68,73 L0,73 Z M42,60 L68,60 L68,120 L42,120 Z M0,94 L68,94 L68,120 L0,120 Z"}] };
export const MONO = { vb: [246, 246], circle: [123, 123, 123], d: "M40,200 L40,40 L150,40 L190,80 L190,88 L150,128 L78,128 L78,200 Z M78,66 L148,66 L168,84 L148,102 L78,102 Z" };

const num = n => Math.round(n * 100) / 100;

/** <g> markup for a word, drawn with its cap-height = `height`, anchored per `anchor`. */
export function wordSVG(word, { x = 0, y = 0, height = 40, color = '#F5F3EE', anchor = 'middle', rotate = 0, opacity = 1 } = {}) {
  const k = height / word.h;
  const w = word.w * k;
  const ax = anchor === 'middle' ? -w / 2 : anchor === 'end' ? -w : 0;
  const inner = word.paths.map(p => `<path transform="translate(${num(p.dx)} 0)"${p.fr ? ` fill-rule="${p.fr}"` : ''} d="${p.d}"/>`).join('');
  return `<g transform="translate(${num(x)} ${num(y)}) rotate(${num(rotate)}) translate(${num(ax)} ${num(-height / 2)}) scale(${num(k)})" fill="${color}" opacity="${opacity}">${inner}</g>`;
}

/** Stacked lockup: PRODIGY over a smaller ATHLETICS, centred at (x, y). */
export function lockupSVG({ x = 0, y = 0, width = 160, color = '#F5F3EE', rotate = 0, opacity = 1 } = {}) {
  const h1 = width / WORD_PRODIGY.w * WORD_PRODIGY.h;      // cap height of PRODIGY at this width
  const h2 = h1 * 0.36;
  const gap = h1 * 0.28;
  const total = h1 + gap + h2;
  return `<g transform="translate(${num(x)} ${num(y)}) rotate(${num(rotate)})">
    ${wordSVG(WORD_PRODIGY, { x: 0, y: -total / 2 + h1 / 2, height: h1, color, opacity })}
    ${wordSVG(WORD_ATHLETICS, { x: 0, y: total / 2 - h2 / 2, height: h2, color, opacity })}
  </g>`;
}

/** Monogram roundel centred at (cx, cy) with diameter `size`. */
export function monoSVG({ cx = 0, cy = 0, size = 60, color = '#E8A33D', bg = '#0B1220', opacity = 1 } = {}) {
  const k = size / MONO.vb[0];
  const [ccx, ccy, r] = MONO.circle;
  return `<g transform="translate(${num(cx - size / 2)} ${num(cy - size / 2)}) scale(${num(k)})" opacity="${opacity}">
    <circle cx="${ccx}" cy="${ccy}" r="${r}" fill="${bg}"/>
    <path fill-rule="evenodd" d="${MONO.d}" fill="${color}"/>
  </g>`;
}
