/**
 * spin3d.js — a real 360° spinning rashguard viewer (WebGL / three.js).
 *
 * No GLB: the garment is lofted procedurally from ellipse cross-sections, so it reads as
 * an "invisible mannequin" product shot — the same target as the SVG renderer in
 * garment.js — but it actually turns.
 *
 * REQUIRES an import map on the host page (OrbitControls imports the bare specifier
 * 'three'), e.g. for a page in /docs:
 *   <script type="importmap">{"imports":{
 *     "three":"../vendor/three/three.module.js",
 *     "three/addons/":"../vendor/three/addons/" }}</script>
 *
 * Public API:
 *   mountSpin(el, opts) -> { update(opts), setAutoRotate(bool), snapshot(width),
 *                            onInteract(cb), dispose() }
 * Extras used by the test harness (safe to ignore):
 *   setAzimuth(rad), setPolar(rad), getInfo()
 *
 * MARKS. The brand marks are the same PATH GEOMETRY the SVG renderer uses
 * (src/render/marks.js), rasterised through an <img> of an inline-SVG data URL, so the
 * chest lockup / sleeve wordmark / back print are pixel-identical between 2D and 3D.
 * Pass `chestMarkSvg` / `backTextSvg` / `sleeveTextSvg` to supply your own data-URL SVG.
 * Canvas text in 'Barlow Condensed' 800 is the synchronous fallback until an image
 * lands, and the only path for arbitrary (non-brand) strings.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { WORD_PRODIGY, WORD_ATHLETICS, wordSVG, lockupSVG, monoSVG } from './marks.js';

// ───────────────────────────── defaults ─────────────────────────────

const FONT_STACK = '"Barlow Condensed","Arial Narrow",Impact,sans-serif';

export const SPIN_DEFAULTS = Object.freeze({
  style: 'ls',
  baseColor: '#14161b',
  art: null,               // { dataUrl, w, h }
  artTile: 3,              // repeat count around the torso
  sleeveText: 'PRODIGY',
  sleeveTextColor: '#F5F3EE',
  sleeveColor: null,        // optional sleeve base (ranked construction) — falls back to baseColor
  sleeveTextCap: 0.32,     // cap height as a fraction of sleeve circumference
  sleeveTextSvg: null,     // data-URL SVG override for the sleeve run
  chestMark: 'wordmark',   // 'wordmark' | 'lockup' | 'mono' | null
  chestMarkColor: '#E8A33D',
  chestMarkBg: '#0B1220',  // roundel ground for chestMark:'mono'
  chestMarkSvg: null,      // data-URL SVG override, drawn onto the torso texture
  chestMarkWidth: 0.44,    // lockup width as a fraction of the chest width
  backText: null,          // e.g. 'PRODIGY'
  backTextSvg: null,       // data-URL SVG override
  autoRotate: true,
  speed: 0.6,              // ×6 = OrbitControls units; 0.39 ≈ the 14°/s the design system asks for
  maxTurns: 1.5,           // idle rotation STOPS after this many revolutions. Never loops forever.
  fill: 0.82,              // garment height as a fraction of the stage height (imagery rule: 80%)
  fillWide: 0.92,          // garment width as a fraction of the stage width on narrow stages
  keyboard: false,         // host element becomes a focusable slider: ←/→ 5°, Shift+←/→ 30°
  background: 'transparent',
  quality: 'auto',         // 'auto' | 'high' | 'low'
  zoom: false,
  pan: false,
  dragHint: false,         // draws nothing; the host hides its own label via onInteract()
});

const QUALITY = {
  high: { radial: 32, len: 44, sRadial: 22, sLen: 26, torsoTex: [2048, 1024], sleeveTex: 1024, dpr: 2 },
  low:  { radial: 20, len: 28, sRadial: 14, sLen: 18, torsoTex: [1024, 512],  sleeveTex: 512,  dpr: 1.5 },
};

// ───────────────────────────── colour helpers ─────────────────────────────

function hexToRgb(hex) {
  const h = String(hex || '#000').replace('#', '').trim();
  const s = h.length === 3 ? h.split('').map(c => c + c).join('') : h.slice(0, 6).padEnd(6, '0');
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}
function rgbToHex(r, g, b) {
  const c = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}
/** mix hex toward white (t>0) or black (t<0) */
function shade(hex, t) {
  const [r, g, b] = hexToRgb(hex);
  const to = t >= 0 ? 255 : 0, k = Math.abs(t);
  return rgbToHex(r + (to - r) * k, g + (to - g) * k, b + (to - b) * k);
}
function luminance(hex) {
  const [r, g, b] = hexToRgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

// ───────────────────────────── curve helpers ─────────────────────────────

/** Catmull–Rom through an array of numeric tuples, sampled at t ∈ [0, n-1]. */
function crSample(kp, t) {
  const n = kp.length;
  const i = Math.max(0, Math.min(n - 2, Math.floor(t)));
  const f = Math.max(0, Math.min(1, t - i));
  const p0 = kp[Math.max(0, i - 1)], p1 = kp[i], p2 = kp[i + 1], p3 = kp[Math.min(n - 1, i + 2)];
  const out = new Array(p1.length);
  const f2 = f * f, f3 = f2 * f;
  for (let k = 0; k < p1.length; k++) {
    out[k] = 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * f +
      (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * f2 +
      (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * f3);
  }
  return out;
}
const smoothstep = x => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };

// ───────────────────────────── torso profile ─────────────────────────────

// [ y, rx, rz, frontDepthMul, backDepthMul, superEllipseExp ]
const TORSO_KP = [
  [0.562, 0.112, 0.092, 1.00, 1.00, 2.10],  // neck rim
  [0.553, 0.142, 0.104, 1.02, 0.98, 2.15],
  [0.539, 0.186, 0.121, 1.03, 0.97, 2.20],
  [0.521, 0.238, 0.138, 1.04, 0.96, 2.25],
  [0.500, 0.284, 0.151, 1.05, 0.95, 2.30],
  [0.474, 0.305, 0.157, 1.05, 0.95, 2.32],  // shoulder line
  [0.430, 0.308, 0.159, 1.06, 0.94, 2.34],  // armhole, widest
  [0.350, 0.299, 0.157, 1.07, 0.93, 2.34],  // upper chest
  [0.260, 0.288, 0.152, 1.07, 0.93, 2.32],  // chest
  [0.150, 0.272, 0.142, 1.05, 0.95, 2.28],
  [0.030, 0.257, 0.131, 1.02, 0.98, 2.24],
  [-0.090, 0.249, 0.124, 1.00, 1.00, 2.20],
  [-0.190, 0.246, 0.121, 0.99, 1.01, 2.18],  // waist (~15% in from chest)
  [-0.300, 0.249, 0.124, 0.99, 1.01, 2.20],
  [-0.400, 0.252, 0.127, 1.00, 1.00, 2.22],
  [-0.462, 0.255, 0.130, 1.00, 1.00, 2.24],  // hem, slight flare
  [-0.488, 0.258, 0.132, 1.00, 1.00, 2.24],  // hem band (thicker rim)
  [-0.500, 0.255, 0.130, 1.00, 1.00, 2.24],  // hem edge
];

/** Sleeve radius shape, 1 at shoulder → 0 at cuff (before taper mix). */
const SLEEVE_SHAPE = [[0, 1.0], [0.12, 0.965], [0.30, 0.83], [0.55, 0.61], [0.80, 0.35], [1.0, 0.0]];
function sleeveShape(t) {
  for (let i = 0; i < SLEEVE_SHAPE.length - 1; i++) {
    const [a, va] = SLEEVE_SHAPE[i], [b, vb] = SLEEVE_SHAPE[i + 1];
    if (t <= b) { const f = (t - a) / (b - a); return va + (vb - va) * smoothstep(f); }
  }
  return 0;
}

// ───────────────────────────── geometry ─────────────────────────────

/**
 * Build an indexed grid surface from a position function.
 * Normals are computed analytically by central differences with angular WRAP so the
 * duplicated UV seam column gets identical normals (no lighting seam).
 * Winding: (a,b,c) = (i,j),(i,j+1),(i+1,j) → outward, given dj × di points outward.
 */
function latheGrid(cols, rows, posFn, uvFn) {
  const nv = (cols + 1) * (rows + 1);
  const pos = new Float32Array(nv * 3);
  const nor = new Float32Array(nv * 3);
  const uv = new Float32Array(nv * 2);
  const p = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3();
  const di = new THREE.Vector3(), dj = new THREE.Vector3(), nrm = new THREE.Vector3();
  const wrapI = i => ((i % cols) + cols) % cols;

  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++) {
      const k = j * (cols + 1) + i;
      posFn(wrapI(i) / cols, j / rows, p);
      pos[k * 3] = p.x; pos[k * 3 + 1] = p.y; pos[k * 3 + 2] = p.z;

      posFn(wrapI(i + 1) / cols, j / rows, a);
      posFn(wrapI(i - 1) / cols, j / rows, b);
      di.subVectors(a, b);

      const j0 = Math.max(0, j - 1), j1 = Math.min(rows, j + 1);
      posFn(wrapI(i) / cols, j1 / rows, a);
      posFn(wrapI(i) / cols, j0 / rows, b);
      dj.subVectors(a, b);

      nrm.crossVectors(dj, di);
      if (nrm.lengthSq() < 1e-14) nrm.set(0, 1, 0); else nrm.normalize();
      nor[k * 3] = nrm.x; nor[k * 3 + 1] = nrm.y; nor[k * 3 + 2] = nrm.z;

      const [u, v] = uvFn(i / cols, j / rows);
      uv[k * 2] = u; uv[k * 2 + 1] = v;
    }
  }

  const idx = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const A = j * (cols + 1) + i, B = (j + 1) * (cols + 1) + i, C = A + 1, D = B + 1;
      idx.push(A, B, C, B, D, C);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

const sgnPow = (x, e) => (x < 0 ? -Math.pow(-x, e) : Math.pow(x, e));

/**
 * Build the whole garment. Returns { group, meshes, metrics }.
 * Coordinates: Y up, +Z is the FRONT of the garment, camera starts on +Z.
 * Torso UV: front centre at u=0.25, back centre at u=0.75, v=1 at neck → v=0 at hem.
 */
function buildGarment(style, q) {
  const group = new THREE.Group();
  const RS = q.radial, LSg = q.len;

  // — sample the torso profile into rings, then derive an arc-length v mapping —
  const rings = [];
  for (let j = 0; j <= LSg; j++) {
    const t = (j / LSg) * (TORSO_KP.length - 1);
    const [y, rx, rz, fz, bz, n] = crSample(TORSO_KP, t);
    rings.push({ y, rx, rz, fz, bz, n });
  }
  // arc length (mean of the front and side profiles) → v
  let S = 0; const cum = [0];
  for (let j = 1; j < rings.length; j++) {
    const A = rings[j - 1], B = rings[j];
    const dFront = Math.hypot(B.rz - A.rz, B.y - A.y);
    const dSide = Math.hypot(B.rx - A.rx, B.y - A.y);
    S += (dFront + dSide) / 2;
    cum.push(S);
  }
  const vOf = j => 1 - cum[j] / S;
  const vAtY = y => {
    for (let j = 1; j < rings.length; j++) {
      if (y >= rings[j].y || j === rings.length - 1) {
        const A = rings[j - 1], B = rings[j];
        const f = Math.max(0, Math.min(1, (A.y - y) / Math.max(1e-6, A.y - B.y)));
        return vOf(j - 1) + (vOf(j) - vOf(j - 1)) * f;
      }
    }
    return 0;
  };

  const ringPos = (ring, u, out) => {
    const A = u * Math.PI * 2;
    const c = -Math.cos(A), s = Math.sin(A);
    const e = 2 / ring.n;
    const depthMul = (ring.fz + ring.bz) / 2 + (ring.fz - ring.bz) / 2 * s;
    out.set(ring.rx * sgnPow(c, e), ring.y, ring.rz * sgnPow(s, e) * depthMul);
    return out;
  };

  const torsoGeo = latheGrid(RS, LSg,
    (u, vj, out) => {
      const f = vj * LSg;
      const j0 = Math.min(rings.length - 1, Math.floor(f)), j1 = Math.min(rings.length - 1, j0 + 1);
      const k = f - j0, A = rings[j0], B = rings[j1];
      const r = {
        y: A.y + (B.y - A.y) * k, rx: A.rx + (B.rx - A.rx) * k, rz: A.rz + (B.rz - A.rz) * k,
        fz: A.fz + (B.fz - A.fz) * k, bz: A.bz + (B.bz - A.bz) * k, n: A.n + (B.n - A.n) * k,
      };
      return ringPos(r, u, out);
    },
    (u, vj) => {
      const f = vj * LSg, j0 = Math.min(rings.length - 1, Math.floor(f));
      const j1 = Math.min(rings.length - 1, j0 + 1), k = f - j0;
      return [u, vOf(j0) + (vOf(j1) - vOf(j0)) * k];
    });

  // — chest circumference (for texture anisotropy) —
  const chestRing = rings.reduce((best, r) => (Math.abs(r.y - 0.26) < Math.abs(best.y - 0.26) ? r : best), rings[0]);
  let chestCirc = 0;
  {
    const a = new THREE.Vector3(), b = new THREE.Vector3();
    for (let i = 0; i < 128; i++) {
      ringPos(chestRing, i / 128, a); ringPos(chestRing, (i + 1) / 128, b);
      chestCirc += a.distanceTo(b);
    }
  }

  // — sleeves —
  const isLS = style !== 'ss';
  const sLen = isLS ? 0.95 : 0.34;      // LS → wrist, SS → mid-bicep
  const taper = isLS ? 0.55 : 0.82;
  const r0 = 0.113;
  const origin0 = new THREE.Vector3(0.152, 0.437, 0.004);
  // ~24° from vertical, angled down/out with a touch of forward hang
  const dir0 = new THREE.Vector3(0.407, -0.910, 0.075).normalize();

  const sleeveRadius = t => {
    const base = r0 * (taper + (1 - taper) * sleeveShape(t));
    const rim = 1 + 0.10 * smoothstep((t - 0.955) / 0.045);
    return base * rim;
  };

  const sleeveData = [];   // { mirror, origin, axis, O, F }
  for (const s of [-1, 1]) {
    const axis = new THREE.Vector3(dir0.x * s, dir0.y, dir0.z).normalize();
    const origin = new THREE.Vector3(origin0.x * s, origin0.y, origin0.z);
    const O = new THREE.Vector3(s, 0, 0).addScaledVector(axis, -axis.x * s).normalize();
    const F = new THREE.Vector3().crossVectors(axis, O).normalize();
    if (F.z < 0) F.negate();
    sleeveData.push({ mirror: s === -1 ? 1 : -1, origin, axis, O, F, side: s });
  }

  const sleeveGeos = sleeveData.map(sd => latheGrid(q.sRadial, q.sLen,
    (u, t, out) => {
      const A = sd.mirror * (u - 0.5) * Math.PI * 2;
      const rr = sleeveRadius(t);
      out.copy(sd.origin).addScaledVector(sd.axis, t * sLen)
        .addScaledVector(sd.O, Math.cos(A) * rr)
        .addScaledVector(sd.F, Math.sin(A) * rr * 0.94);
      return out;
    },
    (u, t) => [u, 1 - t]));

  // — sleeve metrics for the texture —
  const rMid = sleeveRadius(0.5);
  const sleeveCirc = Math.PI * (3 * (rMid + rMid * 0.94) -
    Math.sqrt((3 * rMid + rMid * 0.94) * (rMid + 3 * rMid * 0.94)));

  // — inner planes (so you cannot see through) —
  const caps = [];
  const neckRing = rings[0];
  caps.push({ r: neckRing.rx * 0.99, rz: neckRing.rz * 0.99, pos: new THREE.Vector3(0, neckRing.y - 0.030, 0), axis: new THREE.Vector3(0, 1, 0) });
  const hemRing = rings[rings.length - 1];
  caps.push({ r: hemRing.rx * 0.985, rz: hemRing.rz * 0.985, pos: new THREE.Vector3(0, hemRing.y + 0.016, 0), axis: new THREE.Vector3(0, -1, 0) });
  for (const sd of sleeveData) {
    const p = sd.origin.clone().addScaledVector(sd.axis, sLen - 0.008);
    caps.push({ r: sleeveRadius(1) * 0.97, rz: sleeveRadius(1) * 0.97 * 0.94, pos: p, axis: sd.axis.clone(), basis: sd });
  }

  return {
    group, torsoGeo, sleeveGeos, sleeveData, caps,
    metrics: {
      vAtY, chestCirc, arcWorld: S,
      chestWidth: chestRing.rx * 2,
      sleeveLen: sLen, sleeveCirc,
      neckY: neckRing.y, hemY: hemRing.y,
    },
  };
}

// ───────────────────────────── canvas text ─────────────────────────────

function runMetrics(ctx, text, fontPx, tracking, weight) {
  ctx.font = `${weight} ${fontPx}px ${FONT_STACK}`;
  let w = 0;
  for (const ch of text) w += ctx.measureText(ch).width;
  w += tracking * fontPx * Math.max(0, text.length - 1);
  const m = ctx.measureText(text);
  const cap = m.actualBoundingBoxAscent || fontPx * 0.72;
  return { w, cap };
}
/** Draw `text` centred on the current origin, running along +x, cap-centred on y=0. */
function drawRun(ctx, text, fontPx, tracking, weight) {
  ctx.font = `${weight} ${fontPx}px ${FONT_STACK}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const { w, cap } = runMetrics(ctx, text, fontPx, tracking, weight);
  let x = -w / 2;
  const y = cap / 2;
  for (const ch of text) {
    ctx.fillText(ch, x, y);
    x += ctx.measureText(ch).width + tracking * fontPx;
  }
  return { w, cap };
}
/** Font size that fits both a run-length budget and a cap-height budget. */
function fitFont(ctx, text, tracking, weight, maxRunPx, maxCapPx) {
  const ref = runMetrics(ctx, text, 100, tracking, weight);
  const byRun = maxRunPx / Math.max(1e-3, ref.w) * 100;
  const byCap = maxCapPx / Math.max(1e-3, ref.cap) * 100;
  return Math.max(6, Math.min(byRun, byCap));
}

const _imgCache = new Map();
function getArtImage(dataUrl) {
  if (!dataUrl) return null;
  if (_imgCache.has(dataUrl)) return _imgCache.get(dataUrl);
  return null;
}
function loadArtImage(dataUrl) {
  if (!dataUrl) return Promise.resolve(null);
  if (_imgCache.has(dataUrl)) return Promise.resolve(_imgCache.get(dataUrl));
  return new Promise(res => {
    const img = new Image();
    img.onload = () => { _imgCache.set(dataUrl, img); res(img); };
    img.onerror = () => { _imgCache.set(dataUrl, null); res(null); };
    img.src = dataUrl;
  });
}

// ───────────────────────────── brand marks as images ─────────────────────────────
// Same path geometry as the SVG renderer. Wrapped in an <svg> with a GENEROUS intrinsic
// size so Chrome rasterises it at texture resolution rather than at the viewBox size.

const _markUrl = new Map();
function svgUrl(key, vbW, vbH, inner, pxW) {
  if (_markUrl.has(key)) return _markUrl.get(key);
  const w = Math.round(pxW), h = Math.round(pxW * vbH / vbW);
  const s = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${vbW} ${vbH}">${inner}</svg>`;
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s)}`;
  _markUrl.set(key, url);
  return url;
}

const WORDS = { PRODIGY: WORD_PRODIGY, ATHLETICS: WORD_ATHLETICS };

/** Stacked PRODIGY / ATHLETICS lockup. aspect ≈ 620:197. */
function lockupUrl(color) {
  return svgUrl(`lock|${color}`, 620, 200,
    lockupSVG({ x: 310, y: 100, width: 600, color }), 1240);
}
/** A single stencil word. aspect = word.w : word.h * 1.08 */
function wordUrl(text, color) {
  const w = WORDS[String(text).toUpperCase()];
  if (!w) return null;
  return svgUrl(`word|${text}|${color}`, w.w + 8, w.h + 8,
    wordSVG(w, { x: (w.w + 8) / 2, y: (w.h + 8) / 2, height: w.h, color }), 1800);
}
/** P-in-a-roundel monogram. Square. */
function monoUrl(color, bg) {
  return svgUrl(`mono|${color}|${bg}`, 246, 246,
    monoSVG({ cx: 123, cy: 123, size: 246, color, bg }), 620);
}

/** The data URLs this configuration wants, so the mount can preload them. */
function markUrls(o) {
  const out = [];
  const chest = o.chestMarkSvg || (o.chestMark === 'mono' ? monoUrl(o.chestMarkColor, o.chestMarkBg)
    : (o.chestMark === 'wordmark' || o.chestMark === 'lockup') ? lockupUrl(o.chestMarkColor)
      : o.chestMark ? wordUrl(o.chestMark, o.chestMarkColor) : null);
  const back = o.backText ? (o.backTextSvg || wordUrl(o.backText, o.chestMarkColor)) : null;
  const sleeve = o.sleeveText ? (o.sleeveTextSvg || wordUrl(o.sleeveText, o.sleeveTextColor)) : null;
  for (const u of [chest, back, sleeve]) if (u) out.push(u);
  return { chest, back, sleeve, all: out };
}

/**
 * Draw an already-loaded mark image in the CURRENT local space, centred on the origin,
 * running along +x, fitted to a run budget and a cap-height budget.
 * Returns the drawn box, or null if the image is not ready.
 */
function drawMark(ctx, img, { maxRun, cap, align = 'cap' }) {
  if (!img || !img.width) return null;
  const aspect = img.width / img.height;
  let h = cap, w = cap * aspect;
  if (align === 'run') { w = maxRun; h = w / aspect; }
  if (w > maxRun) { w = maxRun; h = w / aspect; }
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  return { w, h };
}

function tileArt(ctx, img, W, H, tileW, tileH) {
  const cols = Math.max(1, Math.round(W / tileW));
  const tw = W / cols;
  const th = tileH * (tw / tileW);
  const rows = Math.ceil(H / th) + 1;
  for (let r = -1; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.drawImage(img, c * tw, r * th, tw + 0.5, th + 0.5);
    }
  }
}

// ───────────────────────────── textures ─────────────────────────────

function buildTorsoCanvas(o, m, q) {
  const [W, H] = q.torsoTex;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');

  x.fillStyle = o.baseColor;
  x.fillRect(0, 0, W, H);

  const upw = m.chestCirc / W;         // world units per px across U
  const vpw = m.arcWorld / H;          // world units per px down V
  const squash = upw / vpw;            // apply as ctx.scale(1, squash) for world-isotropy

  const img = getArtImage(o.art && o.art.dataUrl);
  let tileWorld = 0;
  if (img && o.art) {
    const tiles = Math.max(1, Math.round(o.artTile || 3));
    tileWorld = m.chestCirc / tiles;
    const tw = tileWorld / upw;
    const th = tw * ((o.art.h || img.height) / (o.art.w || img.width)) * squash;
    tileArt(x, img, W, H, tw, th);
  }

  // hem band — a slightly darker rib, a garment feature (shading stays in the lights)
  const bandV = m.vAtY(-0.462);
  const bandTop = (1 - bandV) * H;
  x.save();
  x.globalAlpha = luminance(o.baseColor) > 0.6 ? 0.16 : 0.30;
  x.fillStyle = '#000';
  x.fillRect(0, bandTop, W, H - bandTop);
  x.globalAlpha = 0.18;
  x.fillStyle = '#fff';
  x.fillRect(0, bandTop - Math.max(1, H * 0.0025), W, Math.max(1, H * 0.0025));
  x.restore();

  const urls = markUrls(o);

  // ── chest mark, centred on the front (u = 0.25) ──
  if (o.chestMark || o.chestMarkSvg) {
    const cx = W * 0.25;
    const cy = (1 - m.vAtY(0.30)) * H;
    const mark = getArtImage(urls.chest);
    x.save();
    x.translate(cx, cy);
    x.scale(1, squash);
    x.fillStyle = o.chestMarkColor;
    if (mark) {
      const isMono = !o.chestMarkSvg && o.chestMark === 'mono';
      const wide = (isMono ? 0.30 : (o.chestMarkWidth ?? 0.44)) * m.chestWidth / upw;
      drawMark(x, mark, { maxRun: wide, cap: wide, align: 'run' });
    } else if (o.chestMark === 'mono') {
      const r = (0.30 * m.chestWidth * 0.5) / upw;
      x.lineWidth = r * 0.19;
      x.strokeStyle = o.chestMarkColor;
      x.beginPath(); x.arc(0, 0, r * 0.90, 0, Math.PI * 2); x.stroke();
      const fs = fitFont(x, 'P', 0, 800, r * 0.95, r * 1.05);
      drawRun(x, 'P', fs, 0, 800);
    } else if (o.chestMark) {
      // synchronous fallback: Barlow Condensed 800 lockup, same proportions as marks.js
      const maxRun = (o.chestMarkWidth ?? 0.44) * m.chestWidth / upw;
      const word = String(o.chestMark === 'wordmark' || o.chestMark === 'lockup' ? 'PRODIGY' : o.chestMark);
      const fs = fitFont(x, word, 0.04, 800, maxRun, maxRun);
      const main = drawRun(x, word, fs, 0.04, 800);
      const sub = 'ATHLETICS';
      const subFs = fitFont(x, sub, 0.34, 600, main.w * 0.98, fs * 0.34);
      x.save();
      x.translate(0, main.cap * 0.62 + subFs * 0.85);
      x.globalAlpha = 0.92;
      drawRun(x, sub, subFs, 0.34, 600);
      x.restore();
    }
    x.restore();
  }

  // ── back text, centred on the back (u = 0.75), between the shoulder blades ──
  if (o.backText || o.backTextSvg) {
    const cx = W * 0.75;
    const cy = (1 - m.vAtY(0.295)) * H;
    const mark = getArtImage(urls.back);
    x.save();
    x.translate(cx, cy);
    x.scale(1, squash);
    x.fillStyle = o.chestMarkColor;
    const maxRun = Math.min((0.66 * m.chestWidth) / upw, W * 0.28);
    if (mark) {
      drawMark(x, mark, { maxRun, cap: 0.16 / upw });
    } else if (o.backText) {
      const fs = fitFont(x, String(o.backText), 0.03, 800, maxRun, 0.14 / upw);
      drawRun(x, String(o.backText), fs, 0.03, 800);
    }
    x.restore();
  }

  return c;
}

function buildSleeveCanvas(o, m, q) {
  const S = q.sleeveTex;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const x = c.getContext('2d');

  const sleeveBase = o.sleeveColor || o.baseColor;
  x.fillStyle = sleeveBase;
  x.fillRect(0, 0, S, S);

  const upw = m.sleeveCirc / S;
  const vpw = m.sleeveLen / S;
  const squash = upw / vpw;

  const img = getArtImage(o.art && o.art.dataUrl);
  if (img && o.art) {
    const tiles = Math.max(1, Math.round(o.artTile || 3));
    const tileWorld = m.chestCirc / tiles;              // same print scale as the torso
    const tw = tileWorld / upw;
    const th = tw * ((o.art.h || img.height) / (o.art.w || img.width)) * squash;
    tileArt(x, img, S, S, tw, th);
  }

  // cuff band
  const bandH = S * 0.045;
  x.save();
  x.globalAlpha = luminance(sleeveBase) > 0.6 ? 0.14 : 0.22; x.fillStyle = '#000';
  x.fillRect(0, S - bandH, S, bandH);
  x.globalAlpha = 0.18; x.fillStyle = '#fff';
  x.fillRect(0, S - bandH - Math.max(1, S * 0.004), S, Math.max(1, S * 0.004));
  x.restore();

  // ── sleeve text: down the OUTSIDE of the arm (u = 0.5 is the outer face) ──
  // This is the signature detail and the organiser's first requirement, so it is sized
  // from the CAP HEIGHT, not from the run: the target is ~32% of the sleeve circumference,
  // which puts the letters a third of the way around the arm. They wrap a little onto the
  // front and back of the sleeve, which is what a real sublimated sleeve print does.
  // The run is then whatever the sleeve can carry, shoulder to cuff, cuff band excluded.
  const text = (o.sleeveText || '').trim();
  if (text || o.sleeveTextSvg) {
    const vTop = 0.975, vBot = 0.055;                  // shoulder seam → just above the cuff band
    const runPx = (vTop - vBot) * S;                   // available run in canvas px (after squash)
    const cy = (1 - (vTop + vBot) / 2) * S;
    const maxRun = runPx / Math.max(0.05, squash);     // …in the local (pre-squash) space
    const cap = Math.max(0.10, Math.min(0.42, o.sleeveTextCap ?? 0.32)) * m.sleeveCirc / upw;
    const mark = getArtImage(markUrls(o).sleeve);
    x.save();
    x.translate(S * 0.5, cy);
    x.scale(1, squash);                                // world-isotropy, applied before rotate
    x.rotate(Math.PI / 2);                             // run along +x (shoulder → cuff)
    x.fillStyle = o.sleeveTextColor;
    if (mark) {
      drawMark(x, mark, { maxRun, cap });
    } else if (text) {
      const fs = fitFont(x, text, 0.04, 800, maxRun, cap);
      drawRun(x, text, fs, 0.04, 800);
    }
    x.restore();
  }

  return c;
}

function makeTexture(canvas, renderer) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

// ───────────────────────────── mount ─────────────────────────────

const NOOP_API = () => ({
  update() {}, setAutoRotate() {}, dispose() {},
  onInteract() { return () => {}; },
  setAzimuth() {}, setPolar() {},
  getInfo() { return { fallback: true, triangles: 0, fps: 0 }; },
  async snapshot() { return null; },
});

export function mountSpin(el, opts = {}) {
  if (!el) throw new Error('mountSpin: no element');

  let renderer = null;
  try {
    const probe = document.createElement('canvas');
    const ok = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!ok) throw new Error('no webgl');
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (err) {
    el.dataset.spinFallback = '1';
    return NOOP_API();
  }

  let o = { ...SPIN_DEFAULTS, ...opts };
  const touch = typeof matchMedia === 'function' && matchMedia('(hover: none) and (pointer: coarse)').matches;
  const qualityFor = () => (o.quality === 'high' ? QUALITY.high
    : o.quality === 'low' ? QUALITY.low
      : (touch ? QUALITY.low : QUALITY.high));
  let q = qualityFor();

  // — renderer / scene —
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.dpr));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.98;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:pan-y;outline:none';
  el.appendChild(canvas);

  const scene = new THREE.Scene();
  // fov 26: the design-system value, chosen so the chest wordmark does not barrel
  const camera = new THREE.PerspectiveCamera(26, 1, 0.05, 40);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const roomScene = new RoomEnvironment();
  const envRT = pmrem.fromScene(roomScene, 0.04);
  scene.environment = envRT.texture;
  roomScene.traverse(n => { if (n.geometry) n.geometry.dispose(); if (n.material) n.material.dispose(); });

  // — lights —
  // The rig is parented to the CAMERA, so a turning garment keeps the same three-quarter
  // key and the same rim at every azimuth. A world-fixed rig sends the chest mark into
  // shadow somewhere in every revolution, which is the one thing the hero cannot do.
  // Directional targets stay at the world origin (the garment centre) by default.
  const rig = new THREE.Group();
  camera.add(rig);
  scene.add(camera);

  const key = new THREE.DirectionalLight(0xffffff, 1.55);
  key.position.set(-2.2, 2.6, 2.4);
  rig.add(key);
  const fillL = new THREE.DirectionalLight(0xffffff, 0.5);
  fillL.position.set(2.6, 0.3, 1.4);
  rig.add(fillL);
  // rim / back lights: a PAIR, behind the garment and out to either side, so both
  // silhouette edges catch a highlight at every azimuth. This is what stops a black long
  // sleeve on a navy hero reading as a flat cut-out, and it is what makes the back view
  // (where there is no chest mark to carry the eye) still read as a solid object.
  const rimA = new THREE.DirectionalLight(0xd8e4ff, 1.4);
  rimA.position.set(-2.9, 1.7, -2.5);
  rig.add(rimA);
  const rimB = new THREE.DirectionalLight(0xcdd9f0, 1.0);
  rimB.position.set(2.9, 1.3, -2.7);
  rig.add(rimB);
  const bounce = new THREE.HemisphereLight(0xdfe6f2, 0x0a0c10, 0.30);
  scene.add(bounce);

  /**
   * Tone-aware exposure. Sampling the base colour's luminance is what lets one rig carry
   * both ends of the catalogue: a near-black garment needs the extra stop, and the same
   * extra stop would clip a bone-white one to a flat shape.
   */
  function applyLighting() {
    const L = luminance(o.baseColor);
    const t = smoothstep((L - 0.05) / 0.45);          // 0 = black garment · 1 = bone white
    renderer.toneMappingExposure = 1.18 - 0.30 * t;
    key.intensity = 2.10 - 0.62 * t;
    fillL.intensity = 0.46 + 0.08 * t;
    rimA.intensity = 1.85 - 1.35 * t;
    rimB.intensity = 1.25 - 0.95 * t;
    fabric.sheen = fabricSleeve.sheen = 0.60 + 0.35 * (1 - t);
    bounce.intensity = 0.34 - 0.07 * t;
    const env = 0.98 - 0.22 * t;
    fabric.envMapIntensity = env;
    fabricSleeve.envMapIntensity = env;
    collarMat.envMapIntensity = env * 0.94;
    fabric.needsUpdate = fabricSleeve.needsUpdate = collarMat.needsUpdate = true;
    needsRender = true;
  }

  // — materials —
  const fabric = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: 0.55, metalness: 0.0,
    sheen: 0.6, sheenRoughness: 0.42, sheenColor: new THREE.Color(0xffffff),
    clearcoat: 0, side: THREE.DoubleSide, envMapIntensity: 0.85,
  });
  const collarMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: 0.62, metalness: 0,
    sheen: 0.45, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xffffff),
    side: THREE.DoubleSide, envMapIntensity: 0.8,
  });
  const innerMat = new THREE.MeshStandardMaterial({
    color: 0x111111, roughness: 0.95, metalness: 0, side: THREE.DoubleSide, envMapIntensity: 0.3,
  });

  const root = new THREE.Group();
  scene.add(root);

  let build = null, torsoTex = null, sleeveTex = null;
  let visible = true, raf = 0, disposed = false, needsRender = true;
  const owned = { geos: [], meshes: [] };

  function clearBuild() {
    for (const m of owned.meshes) root.remove(m);
    for (const g of owned.geos) g.dispose();
    owned.geos.length = 0; owned.meshes.length = 0;
  }

  function buildAll() {
    clearBuild();
    build = buildGarment(o.style, q);

    const torso = new THREE.Mesh(build.torsoGeo, fabric);
    root.add(torso); owned.geos.push(build.torsoGeo); owned.meshes.push(torso);

    build.sleeveGeos.forEach(g => {
      const mesh = new THREE.Mesh(g, fabricSleeve);
      root.add(mesh); owned.geos.push(g); owned.meshes.push(mesh);
    });

    // collar band
    const nr = 0.112, nz = 0.092;
    const collarGeo = new THREE.TorusGeometry(nr, 0.017, 10, Math.max(20, q.radial));
    // sample the neckline row of the torso texture so the collar binding matches the print
    {
      const uvA = collarGeo.attributes.uv;
      for (let i = 0; i < uvA.count; i++) uvA.setXY(i, uvA.getX(i) - 0.5, 0.997);
      uvA.needsUpdate = true;
    }
    const collar = new THREE.Mesh(collarGeo, collarMat);
    collar.rotation.x = -Math.PI / 2;
    collar.scale.set(1, nz / nr, 1);
    collar.position.set(0, build.metrics.neckY - 0.004, 0);
    root.add(collar); owned.geos.push(collarGeo); owned.meshes.push(collar);

    // inner planes / caps
    for (const cap of build.caps) {
      const g = new THREE.CircleGeometry(cap.r, Math.max(16, q.radial));
      const mesh = new THREE.Mesh(g, innerMat);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), cap.axis.clone().normalize());
      mesh.position.copy(cap.pos);
      if (!cap.basis) mesh.scale.set(1, cap.rz / cap.r, 1);
      root.add(mesh); owned.geos.push(g); owned.meshes.push(mesh);
    }

    frameCamera();
  }

  function applyColors() {
    fabric.sheenColor.set(shade(o.baseColor, 0.42));
    collarMat.color.set(0xd2d2d2);   // slight darkening over the sampled print
    innerMat.color.set(shade(o.baseColor, -0.72));
    applyLighting();
  }

  function rebuildTextures() {
    if (!build) return;
    const tt = makeTexture(buildTorsoCanvas(o, build.metrics, q), renderer);
    const st = makeTexture(buildSleeveCanvas(o, build.metrics, q), renderer);
    if (torsoTex) torsoTex.dispose();
    if (sleeveTex) sleeveTex.dispose();
    torsoTex = tt; sleeveTex = st;
    // one material carries both maps via per-mesh material clones? keep it simple:
    // torso uses `fabric`, sleeves use `fabricSleeve`
    fabric.map = torsoTex; fabric.needsUpdate = true;
    fabricSleeve.map = sleeveTex; fabricSleeve.needsUpdate = true;
    collarMat.map = torsoTex; collarMat.needsUpdate = true;
    applyColors();
    fabricSleeve.sheenColor.copy(fabric.sheenColor);
    needsRender = true;
  }

  // sleeves need their own map, so clone the fabric material once
  const fabricSleeve = fabric.clone();
  fabricSleeve.side = THREE.DoubleSide;

  /**
   * Framing. A bounding-SPHERE fit is rotation-proof but it frames the sphere, not the
   * garment: a tall, thin rashguard then fills barely 60% of the stage and the hero reads
   * as a small floating object. Turntable rotation is about Y only, so the real envelope
   * is a CYLINDER — radius r in XZ, half-height halfY — which is still yaw-invariant and
   * a great deal tighter. Distance is refit as the polar angle changes (keepFit), so the
   * garment neither shrinks nor clips when the viewer is tilted.
   */
  const ENV = { center: new THREE.Vector3(), r: 0.5, halfY: 0.7 };
  function measureEnvelope() {
    const box = new THREE.Box3().setFromObject(root);
    if (!Number.isFinite(box.min.x) || box.isEmpty()) return;
    box.getCenter(ENV.center);
    const dx = Math.max(ENV.center.x - box.min.x, box.max.x - ENV.center.x);
    const dz = Math.max(ENV.center.z - box.min.z, box.max.z - ENV.center.z);
    ENV.r = Math.max(1e-3, Math.hypot(dx, dz));
    ENV.halfY = Math.max(1e-3, (box.max.y - box.min.y) / 2);
  }
  const clamp01 = (v, lo, hi) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : hi));
  function fitDistance(polar) {
    const aspect = camera.aspect || 1;
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
    const fillV = clamp01(o.fill, 0.4, 0.96);
    const fillH = clamp01(o.fillWide, 0.4, 0.98);
    // screen-vertical half extent of the cylinder seen at this polar angle
    const halfV = ENV.halfY * Math.abs(Math.sin(polar)) + ENV.r * Math.abs(Math.cos(polar));
    const dv = (halfV / fillV) / Math.tan(vFov / 2);
    const dh = (ENV.r / fillH) / Math.tan(hFov / 2);
    return Math.max(dv, dh);
  }
  const sphTmp = new THREE.Spherical();
  const offTmp = new THREE.Vector3();
  function frameCamera() {
    measureEnvelope();
    controls.target.copy(ENV.center);
    offTmp.subVectors(camera.position, controls.target);
    if (offTmp.lengthSq() < 1e-6) offTmp.set(0, 0, 1);
    sphTmp.setFromVector3(offTmp);
    const d = fitDistance(sphTmp.phi);
    camera.position.copy(controls.target).addScaledVector(offTmp.normalize(), d);
    camera.near = Math.max(0.02, d - (ENV.r + ENV.halfY) * 2);
    camera.far = d + (ENV.r + ENV.halfY) * 4;
    camera.updateProjectionMatrix();
    controls.minDistance = d * 0.35;
    controls.maxDistance = d * 2.4;
    controls.update();
    needsRender = true;
  }
  /** Hold the fit as the user tilts. No-op when the host has enabled zoom. */
  function keepFit() {
    if (o.zoom) return;
    offTmp.subVectors(camera.position, controls.target);
    sphTmp.setFromVector3(offTmp);
    const want = fitDistance(sphTmp.phi);
    if (Math.abs(want - sphTmp.radius) < want * 0.003) return;
    sphTmp.radius = want;
    camera.position.copy(controls.target).add(offTmp.setFromSpherical(sphTmp));
    camera.updateProjectionMatrix();
  }

  // — controls —
  camera.position.set(0, 0.05, 3);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.enablePan = !!o.pan;
  controls.enableZoom = !!o.zoom;
  controls.minPolarAngle = THREE.MathUtils.degToRad(52);
  controls.maxPolarAngle = THREE.MathUtils.degToRad(104);
  controls.rotateSpeed = 0.85;
  controls.autoRotate = !!o.autoRotate;
  controls.autoRotateSpeed = (o.speed ?? 0.6) * 6;

  // — first-interaction signal —
  // The viewer draws no affordance of its own (`dragHint` is accepted and deliberately
  // renders nothing). The host owns the "DRAG TO SPIN" label and hides it from here, so
  // the label lives in the page's type system instead of inside a WebGL canvas.
  const interactCbs = new Set();
  let interacted = false;
  function fireInteract() {
    if (interacted) return;
    interacted = true;
    for (const cb of [...interactCbs]) { try { cb(); } catch { /* host's problem */ } }
    interactCbs.clear();
  }
  /** cb runs once, on the first drag / wheel / arrow key. Returns an unsubscribe. */
  function onInteract(cb) {
    if (typeof cb !== 'function') return () => {};
    if (interacted) { try { cb(); } catch { /* ignore */ } return () => {}; }
    interactCbs.add(cb);
    return () => interactCbs.delete(cb);
  }

  // Idle rotation STOPS on the first interaction, and otherwise after `maxTurns`
  // revolutions. It never resumes and it never loops forever (design system §5).
  let wantAutoRotate = !!o.autoRotate;
  let turned = 0;               // radians accumulated while auto-rotating
  const stopAutoRotate = () => { wantAutoRotate = false; controls.autoRotate = false; needsRender = true; };
  const onDown = () => { fireInteract(); stopAutoRotate(); };
  const onWheel = () => { fireInteract(); stopAutoRotate(); };
  const onKey = e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    fireInteract();
    stopAutoRotate();
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('wheel', onWheel, { passive: true });
  canvas.addEventListener('keydown', onKey);

  // — keyboard: the viewer announces as a slider in degrees —
  let detachKeys = () => {};
  if (o.keyboard) {
    const deg = () => {
      const a = -controls.getAzimuthalAngle() * 180 / Math.PI;
      return Math.round(((a % 360) + 360) % 360);
    };
    const announce = () => {
      const d = deg();
      el.setAttribute('aria-valuenow', String(d));
      el.setAttribute('aria-valuetext', `${d} degrees`);
    };
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'slider');
    el.setAttribute('aria-valuemin', '0');
    el.setAttribute('aria-valuemax', '359');
    el.setAttribute('aria-orientation', 'horizontal');
    announce();
    const step = (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      fireInteract();
      stopAutoRotate();
      const by = (e.shiftKey ? 30 : 5) * Math.PI / 180;
      setAzimuth(controls.getAzimuthalAngle() + (e.key === 'ArrowRight' ? -by : by));
      announce();
    };
    el.addEventListener('keydown', step);
    // announce after the damped motion has settled as well as at release
    const sync = () => { announce(); setTimeout(announce, 400); };
    window.addEventListener('pointerup', sync);
    detachKeys = () => { el.removeEventListener('keydown', step); window.removeEventListener('pointerup', sync); };
  }

  // — background —
  function applyBackground() {
    if (!o.background || o.background === 'transparent') {
      scene.background = null;
      renderer.setClearColor(0x000000, 0);
    } else {
      scene.background = new THREE.Color(o.background);
      renderer.setClearColor(new THREE.Color(o.background), 1);
    }
  }

  // — build —
  applyColors();
  buildAll();
  rebuildTextures();
  applyBackground();

  // art / marks / fonts are async: never block the first paint, just re-render when they
  // land. Marks are inline-SVG data URLs, so this settles inside one frame in practice.
  function loadAssets() {
    const urls = markUrls(o).all;
    if (o.art && o.art.dataUrl) urls.push(o.art.dataUrl);
    const pending = urls.filter(u => !_imgCache.has(u));
    if (pending.length) {
      Promise.all(pending.map(loadArtImage)).then(() => { if (!disposed) rebuildTextures(); });
    }
  }
  loadAssets();
  try {
    if (document.fonts && document.fonts.load) {
      Promise.all([
        document.fonts.load('800 40px "Barlow Condensed"'),
        document.fonts.load('600 40px "Barlow Condensed"'),
      ]).then(() => { if (!disposed) rebuildTextures(); }).catch(() => {});
    }
  } catch { /* ignore */ }

  // — sizing —
  let W = 1, H = 1;
  function resize() {
    const r = el.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    if (w === W && h === H) return;
    W = w; H = h;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.dpr));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    frameCamera();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(el);
  resize();

  // — loop —
  let frames = 0, fpsWindowStart = performance.now(), fps = 0;
  const io = new IntersectionObserver(entries => {
    visible = entries.some(e => e.isIntersecting);
    if (visible) start(); else stop();
  }, { threshold: 0.01 });
  io.observe(el);

  let lastTick = 0;
  function tick() {
    raf = requestAnimationFrame(tick);
    // OrbitControls.update() reports whether the camera actually moved — skip idle redraws.
    // The delta is passed so idle rotation runs at a real 14°/s instead of 14° per 60
    // FRAMES, which halves on a 30fps display.
    const t = performance.now();
    const dt = lastTick ? Math.min(0.1, (t - lastTick) / 1000) : 1 / 60;
    lastTick = t;
    const before = controls.getAzimuthalAngle();
    const moved = controls.update(dt);
    if (moved) {
      keepFit();
      if (controls.autoRotate) {
        // count the idle revolutions and hard-stop at maxTurns
        let d = controls.getAzimuthalAngle() - before;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        turned += Math.abs(d);
        if (turned >= Math.max(0, o.maxTurns ?? 1.5) * Math.PI * 2) stopAutoRotate();
      }
    }
    if (!moved && !needsRender) return;
    renderer.render(scene, camera);
    needsRender = false;
    frames++;
    const now = performance.now();
    if (now - fpsWindowStart >= 500) {
      fps = frames * 1000 / (now - fpsWindowStart);
      frames = 0; fpsWindowStart = now;
    }
  }
  function start() { if (!raf && !disposed) { fpsWindowStart = performance.now(); frames = 0; raf = requestAnimationFrame(tick); } }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  start();

  // — API —
  function update(next = {}) {
    if (disposed) return;
    const prev = o;
    o = { ...o, ...next };
    const qPrev = q;
    q = qualityFor();
    const geoDirty = next.style !== undefined && next.style !== prev.style || q !== qPrev;
    const texDirty = geoDirty || ['baseColor', 'sleeveColor', 'art', 'artTile', 'sleeveText', 'sleeveTextColor',
      'sleeveTextCap', 'sleeveTextSvg', 'chestMark', 'chestMarkColor', 'chestMarkBg',
      'chestMarkSvg', 'chestMarkWidth', 'backText', 'backTextSvg',
    ].some(k => next[k] !== undefined && next[k] !== prev[k]);

    if (next.background !== undefined) applyBackground();
    if (next.speed !== undefined) controls.autoRotateSpeed = (o.speed ?? 0.6) * 6;
    if (next.zoom !== undefined) controls.enableZoom = !!o.zoom;
    if (next.pan !== undefined) controls.enablePan = !!o.pan;
    if (next.autoRotate !== undefined) setAutoRotate(!!o.autoRotate);

    if (geoDirty) buildAll();
    if (texDirty) { rebuildTextures(); loadAssets(); }
    needsRender = true;
  }

  function setAutoRotate(on) {
    wantAutoRotate = !!on;
    turned = 0;
    controls.autoRotate = !!on;
    needsRender = true;
  }

  function setAzimuth(rad) {
    const off = new THREE.Vector3().subVectors(camera.position, controls.target);
    const sph = new THREE.Spherical().setFromVector3(off);
    sph.theta = rad;
    camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(sph));
    camera.lookAt(controls.target);
    controls.update();
    renderer.render(scene, camera);
  }
  function setPolar(rad) {
    const off = new THREE.Vector3().subVectors(camera.position, controls.target);
    const sph = new THREE.Spherical().setFromVector3(off);
    sph.phi = Math.max(0.05, Math.min(Math.PI - 0.05, rad));
    camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(sph));
    camera.lookAt(controls.target);
    controls.update();
    renderer.render(scene, camera);
  }

  async function snapshot(width = 1200) {
    if (disposed) return null;
    const w = Math.max(16, Math.round(width));
    const h = Math.max(16, Math.round(w * (H / Math.max(1, W))));
    const prevPR = renderer.getPixelRatio();
    renderer.setPixelRatio(1);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
    renderer.setPixelRatio(prevPR);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    return blob;
  }

  function getInfo() {
    return {
      fps: Math.round(fps * 10) / 10,
      triangles: renderer.info.render.triangles,
      drawCalls: renderer.info.render.calls,
      frame: renderer.info.render.frame,
      running: !!raf,
      autoRotating: !!controls.autoRotate,
      autoRotateWanted: !!wantAutoRotate,
      turns: Math.round((turned / (Math.PI * 2)) * 100) / 100,
      azimuthDeg: Math.round(((-controls.getAzimuthalAngle() * 180 / Math.PI) % 360 + 360) % 360),
      fill: o.fill,
      geometries: renderer.info.memory.geometries,
      textures: renderer.info.memory.textures,
      size: [W, H],
      style: o.style,
      quality: q === QUALITY.high ? 'high' : 'low',
      interacted,
      dragHint: !!o.dragHint,
    };
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    stop();
    detachKeys();
    io.disconnect(); ro.disconnect();
    interactCbs.clear();
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('wheel', onWheel);
    canvas.removeEventListener('keydown', onKey);
    controls.dispose();
    clearBuild();
    if (torsoTex) torsoTex.dispose();
    if (sleeveTex) sleeveTex.dispose();
    fabric.dispose(); fabricSleeve.dispose(); collarMat.dispose(); innerMat.dispose();
    envRT.dispose(); pmrem.dispose();
    renderer.dispose();
    if (canvas.parentNode === el) el.removeChild(canvas);
  }

  return { update, setAutoRotate, snapshot, dispose, onInteract, setAzimuth, setPolar, getInfo };
}

export default mountSpin;
