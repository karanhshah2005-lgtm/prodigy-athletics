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
  sleeveTextCap: 0.18,     // cap height as a fraction of sleeve circumference (max 0.289 = ±52°)
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
  mannequin: 'grey',       // 'grey' | 'none' — matte bust form: neck stub + wrist stubs
  wrinkles: true,          // 2-4 mm compression creases at the underarm / elbow / waist
  azimuth: 25,             // first-mount view: 3/4 …
  polar: 82,               // … and slightly high, looking a little down onto the shoulders
});

// Row/column counts are a SAMPLING budget, not a polygon budget: the crease displacement
// below is only as fine as the grid that carries it, so the two move together. A crease
// finer than 2× the sample spacing does not become a finer crease, it becomes noise.
// 84×84 puts a torso column every ~12 mm and a row every ~9 mm, which is what the ~25 mm
// creases below need. It is ~14k triangles for the torso — nothing, on any GPU.
const QUALITY = {
  high: { radial: 84, len: 84, sRadial: 28, sLen: 48, stubSeg: 20, torsoTex: [2048, 1024], sleeveTex: 1024, dpr: 2 },
  low:  { radial: 48, len: 52, sRadial: 18, sLen: 30, stubSeg: 14, torsoTex: [1024, 512],  sleeveTex: 512,  dpr: 1.5 },
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

const smoothstep = x => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };

// ───────────────────────────── the body underneath ─────────────────────────────
//
// Everything below is an implicit MALE SIZE M body, in METRES, height 1.75. The garment
// surface is that body + `EASE` (a compression fit sits ~6 mm off the skin), and the
// bands (collar / cuff / hem) stand `PROUD` of the garment. Origin: y = 0 is the NECK
// BASE, +Z is the front, +X is the wearer's LEFT as seen from the camera (screen right).
//
// The numbers that make it read as a body rather than a tube:
//   · the shoulder is a trapezius SLOPE (~20° at the neck, steepening over the acromion)
//     that hands over to a ROUND deltoid cap — a pipe hanging off a funnel is the tell
//     that kills every procedural garment;
//   · the torso is a superellipse (n ≈ 2.6), front fuller than back, with a lat V from
//     the armpit down to the waist and a flare back out to the hip;
//   · the arms are ABDUCTED and BENT, so the sleeve is a loft along a polyline, and there
//     is daylight between the sleeve and the ribs.

const TAU = Math.PI * 2;
const D2R = Math.PI / 180;

const EASE = 0.006;      // garment surface = body + this
const PROUD = 0.003;     // collar / cuff / hem bands
const NECK_R = 0.062;    // neck radius at the base (the garment's collar opening)
const FORM_NECK_R = 0.056; // the visible bust-form stub: strictly INSIDE the collar
const FORM_GREY = '#74777C'; // …and its base tone, pulled further down for dark garments
const SH_Y = -0.105;     // where the shoulder yoke hands over to the torso tube
const PY = 0.22;         // fraction of the torso's vertical rows spent on the yoke

// Deltoid cap. This is the single most important shape in the model — a round sleeve
// HEAD is what makes a rashguard read as clothing on a shoulder rather than a pipe stuck
// on a funnel. It is NOT a separate ball: the sleeve loft simply starts 40 mm BEFORE the
// shoulder joint and closes over it as a spheroid, so the cap, the sleeve head and the
// sleeve are one continuous surface with one seam against the torso.
// The apex must land AT OR JUST BELOW the trapezius ridge — a cap that peaks above the
// trap reads as a suit epaulette. With pivot y -0.110 / abduct 17° / CAP_H 0.040 the apex
// is (0.180, -0.070) and the trapezius surface at x = 0.180 is y = -0.069, i.e. flush.
const CAP_H = 0.040;     // axial half-height of the sleeve head, back from the joint

const ARM = {
  pivot: [0.180, -0.110, 0],
  upper: 0.33, fore: 0.27,
  abduct: 17 * D2R,      // away from the body — opens the armscye so there is DAYLIGHT
  forward: -3 * D2R,     // the humerus hangs a little BEHIND the coronal plane …
  elbow: 17 * D2R,       // … and the forearm breaks forward again: the elbow break.
                         // Net: elbow 17 mm behind the plane, wrist 48 mm in front of it,
                         // which is a relaxed hanging arm. A straight cone is the tell;
                         // so is a wrist 90 mm out in front, which is a reach.
  carry: 5 * D2R,        // …and outward: the frontal-plane carrying angle
};
// garment radius along the arm: [arc length from the pivot, radius]
// body radii .051 upper / .045 elbow / .028 wrist, each + EASE. The forearm SWELLS just
// below the elbow (max girth at s ≈ 0.38) — a monotonic taper reads as a windsock.
const ARM_R = [[0, 0.058], [0.055, 0.0578], [0.16, 0.0570], [0.33, 0.0505], [0.39, 0.0512], [0.46, 0.0430], [0.60, 0.0330]];
const WRIST_R = 0.028;   // the bare body radius, for the mannequin stub
const LS_END = 0.580;    // long sleeve stops 20 mm above the wrist (arc from the pivot)
const SS_END = 0.235;    // short sleeve just above the elbow (~72% of the upper arm)
const CUFF_W = 0.026;    // cuff band width
const CUFF_GRIP = 0.030; // the cuff band pulls IN 3% — it grips, it does not flare
// The sleeve print does NOT sit on the dead-outer face of the arm. A run centred there is
// exactly on the silhouette at az 0 and az 180, so every glyph loses half its cap height
// to the edge and the run reads as disconnected blocks. Real sleeve prints sit on the
// outer-FRONT of the sleeve; 38° forward clears the silhouette at az 0 with the ±32°
// half-width below, and is still square to the camera in profile. The two sleeves need
// OPPOSITE uv shifts (their frames mirror), hence × side.
const SLEEVE_PRINT_SHIFT = 38 / 360;

// [ y, rx, rz, frontDepthMul, backDepthMul, superEllipseExp ]
// chest 1.00 (w .34 / d .24) · under-chest .92 · waist .84 (w .30 / d .22) · hip .94
const TORSO_KP = [
  [-0.105, 0.196, 0.108, 1.02, 0.98, 2.50],  // armpit / lat — widest point of the tube
  [-0.140, 0.186, 0.114, 1.04, 0.96, 2.55],
  [-0.170, 0.174, 0.120, 1.05, 0.95, 2.60],  // chest, deepest
  [-0.230, 0.166, 0.118, 1.05, 0.95, 2.58],
  [-0.290, 0.158, 0.114, 1.03, 0.97, 2.55],  // under-chest
  [-0.350, 0.152, 0.111, 1.01, 0.99, 2.52],
  [-0.400, 0.150, 0.110, 1.00, 1.00, 2.50],  // waist
  // Below the waist a COMPRESSION top does not flare. The hip is held to +0.5% of the
  // waist and the gripper band pulls back in 2%, and the body runs 40 mm longer so it
  // covers the torso to the waistband of the shorts (IBJJF 8.1.14) instead of stopping
  // at the natural waist and silhouetting as an A-line tee.
  [-0.470, 0.1505, 0.1105, 1.00, 1.00, 2.52],
  [-0.530, 0.1512, 0.1110, 1.00, 1.00, 2.55],
  [-0.580, 0.1505, 0.1108, 0.99, 1.01, 2.56],  // hip
  [-0.620, 0.1490, 0.1100, 0.99, 1.01, 2.58],
  [-0.660, 0.1484, 0.1096, 0.99, 1.01, 2.60],  // hem band
  [-0.700, 0.1480, 0.1092, 0.99, 1.01, 2.60],
  [-0.706, 0.1455, 0.1074, 0.99, 1.01, 2.60],  // hem edge, rolled under
];
const HEM_BAND_Y = -0.657;

/** The collar dips 30 mm lower at the front than at the back. sa = sin(angle), +1 = front. */
const necklineY = sa => -0.015 - 0.015 * sa;

// ───────────────────────────── value noise (fabric) ─────────────────────────────
// Evaluated at the UNDISPLACED world position, so it is automatically continuous across
// the UV wrap seam: u = 0 and u = 1 are the same point, hence the same displacement.

function h3(x, y, z) {
  let n = (x * 374761393 + y * 668265263 + z * 1274126177) | 0;
  n = (n ^ (n >>> 13)) | 0;
  n = Math.imul(n, 1274126177) | 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}
function noise3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const l = (a, b, t) => a + (b - a) * t;
  const c000 = h3(xi, yi, zi), c100 = h3(xi + 1, yi, zi);
  const c010 = h3(xi, yi + 1, zi), c110 = h3(xi + 1, yi + 1, zi);
  const c001 = h3(xi, yi, zi + 1), c101 = h3(xi + 1, yi, zi + 1);
  const c011 = h3(xi, yi + 1, zi + 1), c111 = h3(xi + 1, yi + 1, zi + 1);
  return l(l(l(c000, c100, u), l(c010, c110, u), v), l(l(c001, c101, u), l(c011, c111, u), v), w);
}
/** signed, roughly [-1, 1] */
function fbm(x, y, z) {
  return (noise3(x, y, z) - 0.5) * 1.30 + (noise3(x * 2.17 + 11, y * 2.17 + 3, z * 2.17 - 7) - 0.5) * 0.70;
}

// ───────────────────────────── geometry ─────────────────────────────

/**
 * Build an indexed grid surface from a position function.
 * Normals are computed analytically by central differences with angular WRAP so the
 * duplicated UV seam column gets identical normals (no lighting seam) — and, because the
 * differences are taken on the FINAL position, they already account for the wrinkle
 * displacement. There is no separate "recompute normals" pass to get out of step.
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
/** shortest signed distance between two values on a unit circle */
const wrapU = d => d - Math.round(d);
const gauss = (x, s) => Math.exp(-(x / s) * (x / s));
/** piecewise-smooth interpolation of a [[x, y], …] table */
function tableAt(tbl, x) {
  if (x <= tbl[0][0]) return tbl[0][1];
  for (let i = 0; i < tbl.length - 1; i++) {
    const [a, va] = tbl[i], [b, vb] = tbl[i + 1];
    if (x <= b) return va + (vb - va) * smoothstep((x - a) / (b - a));
  }
  return tbl[tbl.length - 1][1];
}

/** The arm chain: pivot → (0.33) elbow → (0.27) wrist, with a smooth bend at the elbow. */
function armChain(side) {
  const rotX = (v, t) => { const c = Math.cos(t), s = Math.sin(t); return new THREE.Vector3(v.x, v.y * c - v.z * s, v.y * s + v.z * c); };
  const base = new THREE.Vector3(Math.sin(ARM.abduct) * side, -Math.cos(ARM.abduct), 0);
  // The forearm breaks FORWARD at the elbow (sagittal, a rotation about X) and also
  // carries a little further OUT (frontal — the carrying angle, which is an extra
  // abduction, not an X rotation). Both together are what stops the arm reading as a rod.
  const carry = ARM.abduct + (ARM.carry || 0);
  const baseF = new THREE.Vector3(Math.sin(carry) * side, -Math.cos(carry), 0);
  const dU = rotX(base, -ARM.forward).normalize();
  const dF = rotX(baseF, -(ARM.forward + ARM.elbow)).normalize();
  const pivot = new THREE.Vector3(ARM.pivot[0] * side, ARM.pivot[1], ARM.pivot[2]);
  const elbow = pivot.clone().addScaledVector(dU, ARM.upper);
  const wrist = elbow.clone().addScaledVector(dF, ARM.fore);
  const bend = 0.085;                       // half-width of the elbow blend, in arc length
  const A = elbow.clone().addScaledVector(dU, -bend);
  const C = elbow.clone().addScaledVector(dF, bend);

  /** point at arc length s from the pivot */
  const at = (s, out) => {
    if (s <= ARM.upper - bend) return out.copy(pivot).addScaledVector(dU, s);
    if (s >= ARM.upper + bend) return out.copy(elbow).addScaledVector(dF, s - ARM.upper);
    const t = (s - (ARM.upper - bend)) / (2 * bend), it = 1 - t;
    return out.set(
      it * it * A.x + 2 * it * t * elbow.x + t * t * C.x,
      it * it * A.y + 2 * it * t * elbow.y + t * t * C.y,
      it * it * A.z + 2 * it * t * elbow.z + t * t * C.z);
  };
  const dir = (s, out) => {
    if (s <= ARM.upper - bend) return out.copy(dU);
    if (s >= ARM.upper + bend) return out.copy(dF);
    const t = (s - (ARM.upper - bend)) / (2 * bend);
    return out.set(
      2 * ((1 - t) * (elbow.x - A.x) + t * (C.x - elbow.x)),
      2 * ((1 - t) * (elbow.y - A.y) + t * (C.y - elbow.y)),
      2 * ((1 - t) * (elbow.z - A.z) + t * (C.z - elbow.z))).normalize();
  };
  return { side, pivot, elbow, wrist, dU, dF, at, dir };
}

/**
 * Build the whole garment. Returns { parts, metrics }.
 * Coordinates: Y up, +Z is the FRONT of the garment, camera starts on +Z.
 * Torso UV: front centre at u=0.25, back centre at u=0.75, v=1 at neck → v=0 at hem.
 */
function buildGarment(style, q, opts) {
  const RS = q.radial, LSg = q.len;
  const wrinkles = opts.wrinkles !== false;
  const parts = [];

  // — sample the torso profile into rings —
  const rings = [];
  for (let j = 0; j < TORSO_KP.length; j++) {
    const [y, rx, rz, fz, bz, n] = TORSO_KP[j];
    rings.push({ y, rx: rx + EASE, rz: rz + EASE, fz, bz, n });
  }
  const ringAtIndex = (f, out) => {
    const j0 = Math.max(0, Math.min(rings.length - 2, Math.floor(f))), j1 = j0 + 1, k = f - j0;
    const A = rings[j0], B = rings[j1];
    out.y = A.y + (B.y - A.y) * k; out.rx = A.rx + (B.rx - A.rx) * k;
    out.rz = A.rz + (B.rz - A.rz) * k; out.fz = A.fz + (B.fz - A.fz) * k;
    out.bz = A.bz + (B.bz - A.bz) * k; out.n = A.n + (B.n - A.n) * k;
    return out;
  };
  const ringPos = (ring, u, out) => {
    const A = u * TAU;
    const c = -Math.cos(A), s = Math.sin(A);
    const e = 2 / ring.n;
    const depthMul = (ring.fz + ring.bz) / 2 + (ring.fz - ring.bz) / 2 * s;
    out.set(ring.rx * sgnPow(c, e), ring.y, ring.rz * sgnPow(s, e) * depthMul);
    return out;
  };

  /** push a point out (or in) along its own XZ radius */
  const pushRadial = (p, d) => {
    const l = Math.hypot(p.x, p.z);
    if (l < 1e-6) return;
    p.x += p.x / l * d; p.z += p.z / l * d;
  };

  // — anatomy on top of the cross-sections: pecs in front, spine groove behind —
  const shapeMods = (u, y) => {
    const df = wrapU(u - 0.25), db = wrapU(u - 0.75);
    let d = 0;
    // pectoral swell, two lobes ~19° either side of centre, peaking at y = -0.17
    const gPec = gauss(y + 0.170, 0.060);
    d += 0.0165 * gauss(Math.abs(df) - 0.095, 0.060) * gPec;
    d -= 0.0050 * gauss(df, 0.034) * gPec;                       // sternum valley
    // the fabric drops back in under the pecs — the shadow line that reads as a chest
    d -= 0.0022 * gauss(df, 0.11) * gauss(y + 0.272, 0.038);
    // spine groove + scapula flats
    const gBack = gauss(y + 0.270, 0.150);
    d -= 0.0070 * gauss(db, 0.028) * gBack;
    d += 0.0050 * gauss(Math.abs(db) - 0.075, 0.050) * gauss(y + 0.215, 0.090);
    return d;
  };

  // — fabric behaviour: compression wrinkles where a rashguard actually creases —
  const uaL = new THREE.Vector3(-0.160, -0.172, 0), uaR = new THREE.Vector3(0.160, -0.172, 0);
  /** 0 inside the sleeve head, 1 well clear of it: creases must never punch through it */
  const deltoidClear = (p) => {
    const qx = (Math.abs(p.x) - ARM.pivot[0]) / 0.105;
    const qy = (p.y - ARM.pivot[1]) / 0.105;
    const qz = p.z / 0.125;
    return smoothstep(Math.sqrt(qx * qx + qy * qy + qz * qz) - 0.55);
  };
  // Creases have a DIRECTION. An isotropic noise field at fist scale is not a crease, it
  // is a bleach stain — which is exactly what a low-frequency, undirected displacement
  // reads as on a matte black knit. So: a small fine-grain crumple for tooth, plus the
  // two families that a compression top actually forms — diagonals radiating off the
  // underarm at ~38°, and horizontal stacks 30-60 mm above the hem.
  const HEM_STACK_Y = -0.690;
  const torsoWrinkle = (p) => {
    if (!wrinkles) return 0;
    const dArm = Math.min(p.distanceTo(uaL), p.distanceTo(uaR));
    const wArm = gauss(dArm, 0.115);
    const backness = Math.max(0, -p.z) / 0.13;
    const wLow = gauss(p.y + 0.430, 0.110) * (0.45 + 0.55 * Math.min(1, backness));
    const w = Math.min(1, 0.10 + 0.95 * wArm + 0.80 * wLow);
    // 1 — fine crumple: ~25 mm features at 1.2 mm, the finest the 12 mm grid can carry
    let d = 0.0012 * w * fbm(p.x * 40, p.y * 52, p.z * 40);
    // 2 — underarm creases, ~38° off vertical, ~33 mm apart
    d += 0.0022 * wArm * Math.sin((0.79 * (p.y + 0.168) + 0.61 * (Math.abs(p.x) - 0.160)) * 190);
    // 3 — horizontal stacks where the body length gathers just above the hem gripper
    const wHem = gauss(p.y - HEM_STACK_Y, 0.045);
    d += 0.0022 * wHem * Math.sin(p.y * 135 + 1.6 * fbm(p.x * 7, p.y * 3, p.z * 7));
    return d * deltoidClear(p);
  };

  const TMP = new THREE.Vector3();
  const RTOP = { ...rings[0] };
  const RCUR = { ...rings[0] };

  const torsoPos = (u, pv, out) => {
    const A = u * TAU, ca = -Math.cos(A), sa = Math.sin(A);
    if (pv < PY) {
      // — the shoulder yoke: neckline → shoulder line, trapezius slope —
      // xz opens fast and y falls slow, so the surface leaves the collar as a shelf at
      // ~10-20° (the trapezius) and steepens to ~70° over the acromion.
      const t = pv / PY;
      const nr = NECK_R + EASE;
      const nx = nr * ca, nz = nr * sa, ny = necklineY(sa);
      ringPos(RTOP, u, TMP);
      // The trapezius leaves the neck at ~20° and steepens over the acromion, where the
      // deltoid cap takes over the silhouette. That handover only reads if the ramp is
      // still ABOVE the cap near the neck and BELOW it out at the shoulder point — hence
      // a per-angle exponent: slow at the sides (trap), quicker at front and back (chest).
      const ex = Math.pow(t, 0.60), ey = Math.pow(t, 1.45 + 0.25 * ca * ca);
      out.set(nx + (TMP.x - nx) * ex, ny + (SH_Y - ny) * ey, nz + (TMP.z - nz) * ex);
    } else {
      const f = ((pv - PY) / (1 - PY)) * (rings.length - 1);
      ringAtIndex(f, RCUR);
      ringPos(RCUR, u, out);
    }
    let d = shapeMods(u, out.y);
    if (out.y < HEM_BAND_Y) d += PROUD * smoothstep((HEM_BAND_Y - out.y) / 0.012);
    pushRadial(out, d);
    pushRadial(out, torsoWrinkle(out));
    return out;
  };

  // — arc-length v mapping, measured down the FRONT profile (where the marks live) —
  const vRows = [], yRows = [];
  {
    const a = new THREE.Vector3(), b = new THREE.Vector3();
    let S = 0; const cum = [0];
    torsoPos(0.25, 0, b); yRows.push(b.y);
    for (let j = 1; j <= LSg; j++) {
      torsoPos(0.25, j / LSg, a);
      S += a.distanceTo(b);
      cum.push(S); yRows.push(a.y); b.copy(a);
    }
    for (let j = 0; j <= LSg; j++) vRows.push(1 - cum[j] / S);
    var arcWorld = S;
  }
  const vOf = pv => {
    const f = Math.max(0, Math.min(LSg, pv * LSg));
    const j0 = Math.min(LSg - 1, Math.floor(f)), k = f - j0;
    return vRows[j0] + (vRows[j0 + 1] - vRows[j0]) * k;
  };
  const vAtY = y => {
    if (y >= yRows[0]) return vRows[0];
    for (let j = 1; j <= LSg; j++) {
      if (y >= yRows[j]) {
        const f = (yRows[j - 1] - y) / Math.max(1e-6, yRows[j - 1] - yRows[j]);
        return vRows[j - 1] + (vRows[j] - vRows[j - 1]) * f;
      }
    }
    return vRows[LSg];
  };

  const torsoGeo = latheGrid(RS, LSg, torsoPos, (u, pv) => [u, vOf(pv)]);
  parts.push({ geo: torsoGeo, kind: 'torso' });

  // — chest circumference (for texture anisotropy) —
  const chestRing = rings[2];
  let chestCirc = 0;
  {
    const a = new THREE.Vector3(), b = new THREE.Vector3();
    for (let i = 0; i < 128; i++) {
      ringPos(chestRing, i / 128, a); ringPos(chestRing, (i + 1) / 128, b);
      chestCirc += a.distanceTo(b);
    }
  }

  // — collar: a binding ring swept around the neckline, standing PROUD —
  {
    const Rc = NECK_R + EASE + PROUD * 0.5, rt = 0.0105;
    const collarGeo = latheGrid(Math.max(24, Math.min(48, RS)), 10, (u, w, out) => {
      const A = u * TAU, ca = -Math.cos(A), sa = Math.sin(A);
      const B = -w * TAU;                       // sign chosen so the normals face outward
      const rr = Rc + rt * Math.cos(B);
      out.set(rr * ca, necklineY(sa) + rt * Math.sin(B), rr * sa);
      return out;
    }, u => [u - 0.5, 0.995]);                  // samples the flat neckline row of the print
    parts.push({ geo: collarGeo, kind: 'collar' });
  }

  // — sleeves: a loft along the bent arm, rooted INSIDE the deltoid cap —
  const isLS = style !== 'ss';
  const sEnd = isLS ? LS_END : SS_END;
  const arms = [armChain(1), armChain(-1)];
  const sTotal = CAP_H + sEnd;
  // s < 0 is the shoulder head: a spheroid closing over the joint, tangent to the tube at
  // s = 0 so the head flows into the sleeve with no crease and no second object.
  // The cuff band GRIPS: it pulls in 3%, it does not stand proud and flare. A flared
  // opening with the arm stub coming out of a ring gap is the cap-sleeve-tee tell.
  const sleeveRadius = s => {
    if (s < 0) return ARM_R[0][1] * Math.sqrt(Math.max(0, 1 - (s / CAP_H) * (s / CAP_H)));
    const grip = smoothstep((s - (sEnd - CUFF_W)) / 0.018);
    return tableAt(ARM_R, s) * (1 - CUFF_GRIP * grip);
  };
  // rows are spent 22% on the head (it is a hemisphere and needs them) but v stays
  // proportional to ARC LENGTH, so the print is not stretched over the shoulder
  const sOf = t => (t < 0.22 ? -CAP_H + CAP_H * (t / 0.22) : (t - 0.22) / 0.78 * sEnd);
  const vOfT = t => 1 - (sOf(t) + CAP_H) / sTotal;
  const capV = 1 - CAP_H / sTotal;              // where the head ends and the arm begins
  const elbowInner = new THREE.Vector3();

  const sleeveData = arms.map(arm => {
    const side = arm.side;
    const mirror = side === -1 ? 1 : -1;        // keeps the sleeve print un-mirrored
    const T = new THREE.Vector3(), O = new THREE.Vector3(), F = new THREE.Vector3();
    const ref = new THREE.Vector3(side, 0, 0);
    const frame = (s) => {
      arm.dir(s, T);
      O.copy(ref).addScaledVector(T, -ref.dot(T)).normalize();
      F.crossVectors(T, O).normalize();
      if (F.z * side < 0) F.negate();
      if (side < 0) F.negate();
      return { T, O, F };
    };
    return { arm, side, mirror, frame };
  });

  const sleeveGeos = sleeveData.map(sd => {
    const P = new THREE.Vector3();
    // inner elbow: on the body-side/front of the elbow, where a sleeve always bunches
    sd.arm.at(ARM.upper, elbowInner);
    const inner = elbowInner.clone().addScaledVector(new THREE.Vector3(-sd.side * 0.02, 0, 0.03), 1);
    const geo = latheGrid(q.sRadial, q.sLen, (u, t, out) => {
      const s = sOf(t);
      const A = sd.mirror * (u - 0.5) * TAU;
      const rr = sleeveRadius(s);
      const { O, F } = sd.frame(Math.max(0, s));
      sd.arm.at(s, P);
      out.copy(P).addScaledVector(O, Math.cos(A) * rr).addScaledVector(F, Math.sin(A) * rr * 0.95);
      if (wrinkles) {
        const w = Math.min(1, 0.30 + 1.15 * gauss(out.distanceTo(inner), 0.075))
          * smoothstep((s - 0.020) / 0.060);  // never over the shoulder head
        const d = 0.0032 * w * fbm(out.x * 30, out.y * 22, out.z * 30);
        out.addScaledVector(O, Math.cos(A) * d).addScaledVector(F, Math.sin(A) * d);
      }
      return out;
    }, (u, t) => [u + SLEEVE_PRINT_SHIFT * sd.side, vOfT(t)]);
    return geo;
  });
  sleeveGeos.forEach(g => parts.push({ geo: g, kind: 'sleeve' }));

  // — sleeve metrics for the texture —
  const rMid = sleeveRadius(sEnd * 0.5);
  const b = rMid * 0.95;
  const sleeveCirc = Math.PI * (3 * (rMid + b) - Math.sqrt((3 * rMid + b) * (rMid + 3 * b)));

  // — inner planes, so you cannot see through the openings —
  const hemRing = rings[rings.length - 1];
  const cuffR = sleeveRadius(sEnd);
  const caps = [];
  {
    const P = new THREE.Vector3();
    caps.push({ r: (NECK_R + EASE) * 0.99, rz: (NECK_R + EASE) * 0.99, pos: new THREE.Vector3(0, -0.030, 0), axis: new THREE.Vector3(0, 1, 0) });
    caps.push({ r: hemRing.rx * 0.985, rz: hemRing.rz * 0.985, pos: new THREE.Vector3(0, hemRing.y + 0.014, 0), axis: new THREE.Vector3(0, -1, 0) });
    for (const sd of sleeveData) {
      sd.arm.at(sEnd - 0.006, P);
      const { T } = sd.frame(sEnd - 0.006);
      const rr = cuffR * 0.97;
      caps.push({ r: rr, rz: rr * 0.95, pos: P.clone(), axis: T.clone(), flat: true });
    }
  }

  // — inner facings: a 12 mm turn-under of GARMENT cloth at every opening, so the hem,
  //   the cuffs and the neckline read as a rolled edge rather than a punched hole —
  const facings = [];
  {
    const P = new THREE.Vector3();
    facings.push({ kind: 'body', r: (NECK_R + EASE) * 0.985, rz: (NECK_R + EASE) * 0.985, len: 0.012,
      pos: new THREE.Vector3(0, -0.039, 0), axis: new THREE.Vector3(0, 1, 0) });
    facings.push({ kind: 'body', r: hemRing.rx * 0.985, rz: hemRing.rz * 0.985, len: 0.012,
      pos: new THREE.Vector3(0, hemRing.y + 0.008, 0), axis: new THREE.Vector3(0, 1, 0) });
    for (const sd of sleeveData) {
      sd.arm.at(sEnd - 0.007, P);
      const { T } = sd.frame(sEnd - 0.007);
      const rr = cuffR * 0.975;
      facings.push({ kind: 'sleeve', r: rr, rz: rr * 0.95, len: 0.012, pos: P.clone(), axis: T.clone() });
    }
  }

  // — the visible mannequin: a matte bust form, neck stub + arm stubs, nothing else.
  //   Everything here is strictly NARROWER than the opening it comes out of, and flat-
  //   capped: a capsule leaves a hemisphere standing proud of the cuff, which photographs
  //   as a ping-pong ball and out-values the product. The neck is a CUT bust form, not a
  //   porcelain dome. —
  const mannequin = [];
  if (opts.mannequin !== 'none') {
    const NR = FORM_NECK_R;
    const prof = [
      [NR, -0.055], [NR, 0.004], [NR * 0.985, 0.008], [NR * 0.93, 0.013],
      [NR * 0.78, 0.017], [NR * 0.44, 0.020], [NR * 0.001, 0.021],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    mannequin.push({ kind: 'lathe', profile: prof, segments: Math.max(20, Math.min(48, RS)) });
    const P = new THREE.Vector3();
    // the bare limb continuing out of the cuff: body radius, i.e. the cuff minus the ease
    const rStub = Math.max(WRIST_R * 0.6, cuffR - EASE - 0.002);
    for (const sd of sleeveData) {
      sd.arm.at(sEnd, P);
      const { T } = sd.frame(sEnd);
      mannequin.push({
        kind: 'stub', radius: rStub, radius2: rStub * 0.94, length: 0.065,
        pos: P.clone().addScaledVector(T, -0.020), dir: T.clone(),
      });
    }
  }

  return {
    parts, caps, facings, mannequin,
    metrics: {
      vAtY, chestCirc, arcWorld,
      chestWidth: chestRing.rx * 2,
      sleeveLen: sTotal, sleeveCirc, sleeveCapV: capV,
      sleeveRadius, sleeveSOfV: v => (1 - v) * sTotal - CAP_H,
      neckY: 0, hemY: hemRing.y, hemBandY: HEM_BAND_Y,
      armpitY: -0.175,
      // the set-in armscye, as a curve rather than a plane cut: it leaves the acromion,
      // arcs 24 mm FORWARD of the coronal plane at its widest, and closes at the underarm
      armscye: { yTop: -0.066, yArm: -0.186, halfMax: 0.058, shift: 0.024 },
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
function markBox(img, { maxRun, cap, align = 'cap' }) {
  const aspect = img.width / img.height;
  let h = cap, w = cap * aspect;
  if (align === 'run') { w = maxRun; h = w / aspect; }
  if (w > maxRun) { w = maxRun; h = w / aspect; }
  return { w, h };
}
function drawMark(ctx, img, opts, shape = null) {
  if (!img || !img.width) return null;
  const { w, h } = markBox(img, opts);
  if (shape) shapedBlit(ctx, w, h, s => s.drawImage(img, -w / 2, -h / 2, w, h), shape);
  else ctx.drawImage(img, -w / 2, -h / 2, w, h);
  return { w, h };
}
/** the canvas-text fallback, through the same per-slice transform */
function drawRunShaped(ctx, text, fontPx, tracking, weight, color, shape) {
  const { w, cap } = runMetrics(ctx, text, fontPx, tracking, weight);
  const h = cap * 1.08;
  shapedBlit(ctx, w, h, s => { s.fillStyle = color; drawRun(s, text, fontPx, tracking, weight); }, shape);
  return { w, cap };
}
/** a parabolic sag: the centre sits `frac` of the run's own width below the ends */
const bowSag = (w, frac) => (t => frac * w * 4 * t * (1 - t));

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

/**
 * Draw a run (image or text) through a per-slice transform, so a print can TAPER with the
 * tube it is printed on and SAG with the curve of the body. A flat blit is the decal tell:
 * a sleeve run whose 'Y' at the wrist is the same cap height as its 'P' at the shoulder is
 * not a print, and a dead-straight baseline across a curved back is not a print either.
 * The run is centred on the current origin and runs along +x, cap-centred on y = 0.
 * `scaleAt(t)` scales the cap height at run fraction t; `sagAt(t)` offsets it in +y.
 */
function shapedBlit(ctx, w, h, drawFn, { slices = 48, scaleAt = null, sagAt = null } = {}) {
  const px = 2;
  const cw = Math.max(2, Math.round(Math.abs(w) * px)), ch = Math.max(2, Math.round(Math.abs(h) * px));
  const sc = document.createElement('canvas');
  sc.width = cw; sc.height = ch;
  const s = sc.getContext('2d');
  s.setTransform(px, 0, 0, px, cw / 2, ch / 2);
  drawFn(s, w, h);
  const n = Math.max(1, Math.round(slices));
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n, tm = (t0 + t1) / 2;
    const k = scaleAt ? scaleAt(tm) : 1;
    const dy = sagAt ? sagAt(tm) : 0;
    ctx.drawImage(sc, t0 * cw, 0, (t1 - t0) * cw, ch,
      -w / 2 + t0 * w, -h * k / 2 + dy, (t1 - t0) * w + 0.5, h * k);
  }
}

/**
 * The set-in armscye, in texture space. A real colour break / seam does NOT run straight
 * down the side: it leaves the acromion, arcs forward of the coronal plane, and closes at
 * the underarm. u0 is the side centre (0 or 0.5); `front` is the u direction of the chest.
 * Returns { pts: [[uFront, uBack, v] …] } sampled top → underarm.
 */
function armscyeCurve(m, u0, front, N = 32) {
  const A = m.armscye;
  const vTop = m.vAtY(A.yTop), vArm = m.vAtY(A.yArm);
  const halfU = A.halfMax / m.chestCirc, shiftU = A.shift / m.chestCirc;
  const pts = [];
  for (let k = 0; k <= N; k++) {
    const t = k / N;
    const lens = Math.pow(Math.sin(Math.PI * t), 0.80);
    const uc = u0 + front * shiftU * lens;
    const hw = halfU * lens;
    pts.push([uc + front * hw, uc - front * hw, vTop + (vArm - vTop) * t]);
  }
  return pts;
}
/** trace one branch (0 = front, 1 = back) of the armscye as a canvas path */
function armscyePath(x, pts, branch, W, H, du) {
  x.beginPath();
  for (let k = 0; k < pts.length; k++) {
    const px = (pts[k][branch] + du) * W, py = (1 - pts[k][2]) * H;
    if (k === 0) x.moveTo(px, py); else x.lineTo(px, py);
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
  const bandV = m.vAtY(m.hemBandY);
  const bandTop = (1 - bandV) * H;
  x.save();
  x.globalAlpha = luminance(o.baseColor) > 0.6 ? 0.16 : 0.30;
  x.fillStyle = '#000';
  x.fillRect(0, bandTop, W, H - bandTop);
  x.globalAlpha = 0.18;
  x.fillStyle = '#fff';
  x.fillRect(0, bandTop - Math.max(1, H * 0.0025), W, Math.max(1, H * 0.0025));
  x.restore();

  // ── set-in armscye: the colour break and the seam, on the SAME curve ──
  // A colour block that stops at a vertical chord is a construction error — it reads as a
  // sleeve sewn on at mid-bicep. A set-in sleeve head OWNS the shoulder: the seam leaves
  // the acromion 25 mm inboard of the shoulder point, arcs forward, and closes at the
  // underarm. The sleeve colour is painted on the torso out to that curve, so the break
  // the eye sees is the armscye and not the silhouette where the sleeve mesh emerges.
  // sides: u = 0 / 1 is the wearer's right, u = 0.5 the left; the chest is at u = 0.25.
  const SIDES = [{ u0: 0.5, front: -1, du: 0 }, { u0: 0.0, front: 1, du: 0 }, { u0: 0.0, front: 1, du: 1 }];
  const armscyes = SIDES.map(s => ({ ...s, pts: armscyeCurve(m, s.u0, s.front) }));
  if (o.sleeveColor && o.sleeveColor !== o.baseColor) {
    x.save();
    x.fillStyle = o.sleeveColor;
    for (const a of armscyes) {
      x.beginPath();
      for (let k = 0; k < a.pts.length; k++) {
        const px = (a.pts[k][0] + a.du) * W, py = (1 - a.pts[k][2]) * H;
        if (k === 0) x.moveTo(px, py); else x.lineTo(px, py);
      }
      for (let k = a.pts.length - 1; k >= 0; k--) {
        x.lineTo((a.pts[k][1] + a.du) * W, (1 - a.pts[k][2]) * H);
      }
      x.closePath(); x.fill();
    }
    x.restore();
  }
  {
    const light = luminance(o.baseColor) > 0.6;
    x.save();
    x.lineCap = 'round'; x.lineJoin = 'round';
    for (const a of armscyes) {
      for (const branch of [0, 1]) {
        x.globalAlpha = light ? 0.13 : 0.22;
        x.strokeStyle = '#000';
        x.lineWidth = Math.max(1.5, W * 0.0018);
        armscyePath(x, a.pts, branch, W, H, a.du); x.stroke();
        x.globalAlpha = light ? 0.10 : 0.13;
        x.strokeStyle = '#fff';
        x.lineWidth = Math.max(1, W * 0.0009);
        x.save(); x.translate(0, -H * 0.0025);
        armscyePath(x, a.pts, branch, W, H, a.du); x.stroke();
        x.restore();
      }
    }
    x.restore();
  }

  const urls = markUrls(o);

  // ── chest mark, centred on the front (u = 0.25) ──
  if (o.chestMark || o.chestMarkSvg) {
    const cx = W * 0.25;
    const cy = (1 - m.vAtY(-0.205)) * H;
    const mark = getArtImage(urls.chest);
    x.save();
    x.translate(cx, cy);
    x.scale(1, squash);
    x.fillStyle = o.chestMarkColor;
    if (mark) {
      const isMono = !o.chestMarkSvg && o.chestMark === 'mono';
      const wide = (isMono ? 0.30 : (o.chestMarkWidth ?? 0.44)) * m.chestWidth / upw;
      // 2% bow: the chest is a curve, and a print laid straight across it is a sticker
      drawMark(x, mark, { maxRun: wide, cap: wide, align: 'run' }, { sagAt: bowSag(wide, 0.02) });
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
    const cy = (1 - m.vAtY(-0.215)) * H;
    const mark = getArtImage(urls.back);
    x.save();
    x.translate(cx, cy);
    x.scale(1, squash);
    x.fillStyle = o.chestMarkColor;
    const maxRun = Math.min((0.66 * m.chestWidth) / upw, W * 0.28);
    if (mark) {
      const box = markBox(mark, { maxRun, cap: 0.16 / upw });
      drawMark(x, mark, { maxRun, cap: 0.16 / upw }, { sagAt: bowSag(box.w, 0.03) });
    } else if (o.backText) {
      const fs = fitFont(x, String(o.backText), 0.03, 800, maxRun, 0.14 / upw);
      const ref = runMetrics(x, String(o.backText), fs, 0.03, 800);
      drawRunShaped(x, String(o.backText), fs, 0.03, 800, o.chestMarkColor, { sagAt: bowSag(ref.w, 0.03) });
    }
    x.restore();
  }

  // ── baked occlusion, LAST so that EVERY mark above receives the same multiply ──
  // A print that does not darken where the cloth darkens is a decal. And a garment with
  // no AO at the armscye has nothing tying the sleeve to the body.
  {
    x.save();
    x.globalCompositeOperation = 'multiply';
    // 1 — the armscye: 0.72 at the seam, recovering to 1.0 over 45 mm
    const rampPx = (0.045 / m.chestCirc) * W;
    x.lineCap = 'round'; x.lineJoin = 'round';
    x.strokeStyle = '#000';
    for (const a of armscyes) {
      for (const branch of [0, 1]) {
        for (let i = 6; i >= 1; i--) {
          x.globalAlpha = 0.055;
          x.lineWidth = Math.max(1.5, rampPx * 2 * (i / 6));
          armscyePath(x, a.pts, branch, W, H, a.du);
          x.stroke();
        }
      }
    }
    x.globalAlpha = 1;
    // 2 — the shadow the hem band casts on the body: 0.80 recovering over 25 mm
    const yB = (1 - m.vAtY(m.hemBandY)) * H;
    const yE = (1 - m.vAtY(m.hemBandY - 0.025)) * H;
    const g = x.createLinearGradient(0, yB, 0, yE);
    g.addColorStop(0, 'rgb(204,204,204)');
    g.addColorStop(1, 'rgb(255,255,255)');
    x.fillStyle = g;
    x.fillRect(0, yB, W, Math.max(1, yE - yB));
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

  // cuff band (the geometry pulls it in; this is only the rib's tone)
  const bandH = S * 0.045;
  x.save();
  x.globalAlpha = luminance(sleeveBase) > 0.6 ? 0.14 : 0.22; x.fillStyle = '#000';
  x.fillRect(0, S - bandH, S, bandH);
  x.globalAlpha = 0.11; x.fillStyle = '#fff';
  x.fillRect(0, S - bandH - Math.max(1, S * 0.004), S, Math.max(1, S * 0.004));
  x.restore();

  // ── sleeve text: down the OUTSIDE of the arm (u = 0.5 is the outer face) ──
  // Sized from the CAP HEIGHT, not from the run. The cap is capped at 0.289 of the sleeve
  // circumference = ±52° about the outer face: at polar 82 the visible half-width of the
  // tube is ≈ ±70°, so ±52° leaves an 18° margin and no glyph is ever sliced in half by
  // the silhouette at any azimuth in the spin — which is what made the run read at az 0
  // as disconnected white blocks.
  // And it TAPERS: each slice is scaled by sleeveRadius(s)/sleeveRadius(shoulder), so the
  // 'Y' at the wrist is not the same cap height as the 'P' at the shoulder and the print
  // keeps a constant angular width all the way down the arm.
  const text = (o.sleeveText || '').trim();
  if (text || o.sleeveTextSvg) {
    const vTop = (m.sleeveCapV ?? 0.98) - 0.02, vBot = 0.055;   // below the head → above the cuff
    const runPx = (vTop - vBot) * S;                   // available run in canvas px (after squash)
    const vMid = (vTop + vBot) / 2;
    const cy = (1 - vMid) * S;
    const maxRun = runPx / Math.max(0.05, squash);     // …in the local (pre-squash) space
    const cap = Math.max(0.10, Math.min(0.289, o.sleeveTextCap ?? 0.18)) * m.sleeveCirc / upw;
    const mark = getArtImage(markUrls(o).sleeve);
    // run fraction t → v → arc s → radius, normalised at the shoulder end of the run
    const rAt = (v) => m.sleeveRadius(Math.max(0, m.sleeveSOfV(v)));
    const taperFor = (w) => {
      const vSpan = (w * squash) / S;
      const vOfT = t => vMid + (0.5 - t) * vSpan;
      const r0 = rAt(vOfT(0)) || 1;
      return { scaleAt: t => rAt(vOfT(t)) / r0 };
    };
    x.save();
    x.translate(S * 0.5, cy);
    x.scale(1, squash);                                // world-isotropy, applied before rotate
    x.rotate(Math.PI / 2);                             // run along +x (shoulder → cuff)
    x.fillStyle = o.sleeveTextColor;
    if (mark) {
      const box = markBox(mark, { maxRun, cap });
      drawMark(x, mark, { maxRun, cap }, taperFor(box.w));
    } else if (text) {
      const fs = fitFont(x, text, 0.04, 800, maxRun, cap);
      const ref = runMetrics(x, text, fs, 0.04, 800);
      drawRunShaped(x, text, fs, 0.04, 800, o.sleeveTextColor, taperFor(ref.w));
    }
    x.restore();
  }

  // ── baked occlusion at the sleeve HEAD, after the print: the armscye is in shadow on
  //    every real garment, and it is what ties the sleeve to the body ──
  {
    const vHead = m.sleeveCapV ?? 0.94;
    const y0 = 0, y1 = (1 - vHead + 0.06) * S;
    const g = x.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, 'rgb(180,180,180)');
    g.addColorStop(1, 'rgb(255,255,255)');
    x.save();
    x.globalCompositeOperation = 'multiply';
    x.fillStyle = g;
    x.fillRect(0, y0, S, Math.max(1, y1 - y0));
    x.restore();
  }

  return c;
}

/**
 * A tiny procedural KNIT normal map. A rashguard is a warp knit: fine vertical wales with
 * a staggered loop across them. At strength 0.15 it never reads as a pattern — it just
 * stops the fabric from looking like painted plastic when the key light rakes across it.
 * Built once, shared by every viewer on the page, and NEVER colour-managed (normals are
 * data, not colour).
 */
let _knitTex = null;
function knitNormalTexture() {
  if (_knitTex) return _knitTex;
  const S = 64;
  const h = new Float32Array(S * S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const wale = Math.cos((x / S) * TAU * 16) * 0.55;
      const course = Math.cos((y / S) * TAU * 12 + (x / S) * TAU * 8) * 0.30;
      const loop = Math.cos(((x + (y % 2) * 2) / S) * TAU * 8) * 0.15;
      h[y * S + x] = wale + course + loop;
    }
  }
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(S, S);
  const at = (x, y) => h[((y + S) % S) * S + ((x + S) % S)];
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * 0.5;
      const dy = (at(x, y + 1) - at(x, y - 1)) * 0.5;
      const nx = -dx, ny = -dy, nz = 1;
      const l = Math.hypot(nx, ny, nz);
      const k = (y * S + x) * 4;
      img.data[k] = Math.round((nx / l * 0.5 + 0.5) * 255);
      img.data[k + 1] = Math.round((ny / l * 0.5 + 0.5) * 255);
      img.data[k + 2] = Math.round((nz / l * 0.5 + 0.5) * 255);
      img.data[k + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  _knitTex = t;
  return t;
}

/**
 * The contact shadow: black with a radial alpha falloff, 0.42 at the centre to 0 at the
 * edge. Built once and shared page-wide. Squashing happens on the mesh, not here.
 */
let _shadowTex = null;
function contactShadowTexture() {
  if (_shadowTex) return _shadowTex;
  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grd.addColorStop(0.00, 'rgba(0,0,0,0.42)');
  grd.addColorStop(0.42, 'rgba(0,0,0,0.26)');
  grd.addColorStop(0.74, 'rgba(0,0,0,0.07)');
  grd.addColorStop(1.00, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  _shadowTex = t;
  return t;
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
  // A rig parented to the CAMERA is fatal in a 360° viewer: the shading never travels
  // across the form, the highlight sits in the same screen-space place at every azimuth,
  // and the product reads as a rotating matte sticker rather than as an object. So the
  // rig lives in the WORLD — a real turntable set, where the lights stay put and the
  // camera travels — and the shading sweeps across the chest and around onto the back as
  // the garment turns.
  // Two constraints pull against each other, and this rig is what satisfies both:
  //   · the chest mark must never fall into blackness ⇒ the ring counter-rotates by 38%
  //     of the azimuth, so at az 180 the light has moved 111° relative to the camera but
  //     only 68° across the garment — a clearly visible sweep, no black mark;
  //   · a near-black garment reflects ~1% of what hits it, so any azimuth left without a
  //     light within ~45° reads as a flat cut-out ⇒ FOUR lights, evenly spaced at 90° in
  //     XZ, at different heights and intensities so the ring is never uniform.
  // Only a low fill stays on the camera, purely to keep the marks legible.
  const RIG_FOLLOW = 0.38;
  const worldRig = new THREE.Group();
  scene.add(worldRig);
  const rig = new THREE.Group();      // camera-parented: the fill only
  camera.add(rig);
  scene.add(camera);

  const key = new THREE.DirectionalLight(0xffffff, 1.55);      // front-left, high
  key.position.set(-2.4, 2.6, 2.4);
  worldRig.add(key);
  const keyB = new THREE.DirectionalLight(0xfff2e8, 0.9);      // back-right, high
  keyB.position.set(2.4, 2.3, -2.4);
  worldRig.add(keyB);
  const fillL = new THREE.DirectionalLight(0xffffff, 0.5);
  fillL.position.set(2.6, 0.3, 1.4);
  rig.add(fillL);
  // the cool pair, low: they carry the silhouette edge and the back view (where there is
  // no chest mark to carry the eye) so the garment still reads as a solid object.
  const rimA = new THREE.DirectionalLight(0xd8e4ff, 1.4);      // back-left, low
  rimA.position.set(-2.4, 1.7, -2.4);
  worldRig.add(rimA);
  const rimB = new THREE.DirectionalLight(0xcdd9f0, 1.0);      // front-right, low
  rimB.position.set(2.4, 1.3, 2.4);
  worldRig.add(rimB);
  /** hold the world rig at its share of the current azimuth */
  function trackLights() {
    worldRig.rotation.y = controls.getAzimuthalAngle() * RIG_FOLLOW;
  }
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
    keyB.intensity = (2.10 - 0.62 * t) * 0.62;
    fillL.intensity = 0.40 + 0.10 * t;   // the only camera-parented light: mark legibility
    rimA.intensity = 1.85 - 1.35 * t;
    rimB.intensity = 1.25 - 0.95 * t;
    // the bust form is exposed AGAINST the garment, not with it: under a dark garment the
    // rig runs 1.18 EV / key 2.10 and a mid grey blows out to near-white, so pull it down
    formMat.color.set(shade(FORM_GREY, -0.34 + 0.34 * t));
    formMat.needsUpdate = true;
    fabric.sheen = fabricSleeve.sheen = 0.60 + 0.35 * (1 - t);
    bounce.intensity = 0.42 - 0.12 * t;
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
  // the inside of the garment is the garment, in shadow — not a hard-coded black hole.
  // A fixed 0x111111 is flatly wrong for a bone-white or a pink style.
  const innerMat = new THREE.MeshStandardMaterial({
    color: 0x111111, roughness: 0.95, metalness: 0, side: THREE.DoubleSide, envMapIntensity: 0.15,
  });
  // the 12 mm turn-under at every opening: garment cloth, so the edge rolls
  const facingMat = new THREE.MeshStandardMaterial({
    color: 0x888888, roughness: 0.72, metalness: 0, side: THREE.DoubleSide, envMapIntensity: 0.5,
  });
  const facingSleeveMat = facingMat.clone();
  // the bust form itself: matte, no sheen, nothing that competes with the garment.
  // A real bust form photographs 2.5-3 stops UNDER a white garment, and this rig runs
  // exposure 1.18 / key 2.10 for a dark one — 0xA9A9AC came out at ~0xF2F2F4, i.e. the
  // brightest object in the frame. It is a prop; it must never out-value the product.
  const formMat = new THREE.MeshStandardMaterial({
    color: FORM_GREY, roughness: 0.96, metalness: 0, envMapIntensity: 0.18,
  });
  // contact shadow: one unlit quad with a baked radial falloff. No shadow map, one draw
  // call — but without it the garment hangs in mid-air, which no product shot does.
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, map: contactShadowTexture(), transparent: true,
    depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
  });

  // knit normal, tiled to roughly a 5 mm wale. The source canvas is shared page-wide;
  // each material gets a cheap clone so it can carry its own repeat.
  const knitClones = [];
  function knitFor(mat, rx, ry) {
    const t = knitNormalTexture().clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    t.needsUpdate = true;
    knitClones.push(t);
    mat.normalMap = t;
    mat.normalScale = new THREE.Vector2(0.15, 0.15);
    mat.needsUpdate = true;
  }
  // 5 mm wale on EVERY panel: the knit tile carries 16 wales and 12 courses, so the
  // repeat is (world span) / (0.005 × count). Hard-coded repeats put a different cloth on
  // the sleeve than on the torso, which is visible the moment the key rakes across both.
  const WALE = 0.005;
  const knitRepeat = (mat, circ, len) =>
    knitFor(mat, Math.max(2, circ / (WALE * 16)), Math.max(2, len / (WALE * 12)));
  knitFor(fabric, 12, 13);
  knitFor(collarMat, 10, 2);

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

  const MAT = () => ({ torso: fabric, sleeve: fabricSleeve, collar: collarMat, inner: innerMat });

  function add(geo, mat) {
    const mesh = new THREE.Mesh(geo, mat);
    root.add(mesh); owned.geos.push(geo); owned.meshes.push(mesh);
    return mesh;
  }

  function buildAll() {
    clearBuild();
    build = buildGarment(o.style, q, { mannequin: o.mannequin, wrinkles: o.wrinkles });
    const mats = MAT();

    for (const part of build.parts) add(part.geo, mats[part.kind] || fabric);

    // inner planes / caps
    for (const cap of build.caps) {
      const g = new THREE.CircleGeometry(cap.r, Math.max(16, q.radial));
      const mesh = add(g, innerMat);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), cap.axis.clone().normalize());
      mesh.position.copy(cap.pos);
      if (!cap.flat) mesh.scale.set(1, cap.rz / cap.r, 1);
    }

    // inner facings: a short tube of GARMENT cloth just inside each opening
    for (const f of build.facings || []) {
      const g = new THREE.CylinderGeometry(f.r, f.r, f.len, Math.max(16, Math.min(48, q.radial)), 1, true);
      const mesh = add(g, f.kind === 'sleeve' ? facingSleeveMat : facingMat);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), f.axis.clone().normalize());
      mesh.position.copy(f.pos);
      mesh.scale.set(1, 1, f.rz / f.r);
    }

    // the visible bust form. Flat-capped CYLINDERS, never capsules: a capsule leaves a
    // hemisphere standing proud of the cuff, which photographs as a ping-pong ball.
    for (const m of build.mannequin) {
      if (m.kind === 'lathe') {
        add(new THREE.LatheGeometry(m.profile, m.segments), formMat);
      } else {
        const g = new THREE.CylinderGeometry(m.radius, m.radius2 ?? m.radius, m.length,
          Math.max(12, q.stubSeg), 1, false);
        const mesh = add(g, formMat);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), m.dir.clone().normalize());
        mesh.position.copy(m.pos);
      }
    }

    // the contact shadow, on the ground under the form
    {
      const R = 0.34;
      const g = new THREE.PlaneGeometry(R * 2, R * 2);
      const mesh = add(g, shadowMat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(0, build.metrics.hemY - 0.015, 0);
      mesh.scale.set(1, 0.62, 1);          // squashed in Z: a floor contact, not a disc
      mesh.renderOrder = -1;
      mesh.userData.noFit = true;          // never let it drive the framing
    }

    frameCamera();
  }

  function applyColors() {
    fabric.sheenColor.set(shade(o.baseColor, 0.42));
    collarMat.color.set(0xd2d2d2);   // slight darkening over the sampled print
    // the interior is the cloth in shadow, not a hole punched in the mesh
    innerMat.color.set(shade(o.baseColor, -0.42));
    facingMat.color.set(shade(o.baseColor, -0.10));
    facingSleeveMat.color.set(shade(o.sleeveColor || o.baseColor, -0.10));
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
    knitRepeat(fabric, build.metrics.chestCirc, build.metrics.arcWorld);
    knitRepeat(fabricSleeve, build.metrics.sleeveCirc, build.metrics.sleeveLen);
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
  // The sleeve tube and the deltoid cap are EMBEDDED in the torso — that union is what
  // makes the shoulder round. Give them a constant depth bias so the near-tangent band
  // where the cap emerges from the trapezius resolves as one clean seam curve instead of
  // a speckled z-fight.
  fabricSleeve.polygonOffset = true;
  fabricSleeve.polygonOffsetFactor = -2;
  fabricSleeve.polygonOffsetUnits = -2;
  knitFor(fabricSleeve, 4, 10);   // replaced by knitRepeat() once the metrics are known

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
    const box = new THREE.Box3();
    root.updateMatrixWorld(true);
    for (const mesh of owned.meshes) {
      if (mesh.userData.noFit) continue;     // the contact shadow is not the garment
      box.expandByObject(mesh);
    }
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
  let firstFit = true;
  function frameCamera() {
    measureEnvelope();
    controls.target.copy(ENV.center);
    offTmp.subVectors(camera.position, controls.target);
    if (firstFit) {
      // The opening pose is stated against the TARGET, not the world origin — the target
      // sits at the garment's centre, so setting it on camera.position alone lands ~6° off.
      firstFit = false;
      offTmp.setFromSpherical(new THREE.Spherical(1,
        THREE.MathUtils.degToRad(Math.max(52, Math.min(98, o.polar ?? 82))),
        THREE.MathUtils.degToRad(o.azimuth ?? 25)));
    }
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
  // First mount looks slightly DOWN onto the shoulders (polar 82°) from three-quarters
  // (azimuth 25°): straight-on hides the abduction gap and flattens the deltoid, and the
  // three-quarter is the angle every on-model rashguard photo is shot from.
  {
    const sph = new THREE.Spherical(3,
      THREE.MathUtils.degToRad(Math.max(52, Math.min(98, o.polar ?? 82))),
      THREE.MathUtils.degToRad(o.azimuth ?? 25));
    camera.position.setFromSpherical(sph);
  }
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.enablePan = !!o.pan;
  controls.enableZoom = !!o.zoom;
  controls.minPolarAngle = THREE.MathUtils.degToRad(52);
  // never below 98°: under the horizon the camera looks up into the hem, and no framing
  // of a product should ever be shot from inside the garment
  controls.maxPolarAngle = THREE.MathUtils.degToRad(98);
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
  trackLights();

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
      trackLights();
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
    const geoDirty = (next.style !== undefined && next.style !== prev.style) || q !== qPrev
      || (next.mannequin !== undefined && next.mannequin !== prev.mannequin)
      || (next.wrinkles !== undefined && next.wrinkles !== prev.wrinkles);
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
    trackLights();
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
      mannequin: o.mannequin,
      wrinkles: o.wrinkles !== false,
      polarDeg: Math.round(new THREE.Spherical().setFromVector3(
        new THREE.Vector3().subVectors(camera.position, controls.target)).phi * 180 / Math.PI),
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
    for (const t of knitClones) t.dispose();
    fabric.dispose(); fabricSleeve.dispose(); collarMat.dispose(); innerMat.dispose(); formMat.dispose();
    facingMat.dispose(); facingSleeveMat.dispose(); shadowMat.dispose();
    envRT.dispose(); pmrem.dispose();
    renderer.dispose();
    if (canvas.parentNode === el) el.removeChild(canvas);
  }

  return { update, setAutoRotate, snapshot, dispose, onInteract, setAzimuth, setPolar, getInfo };
}

export default mountSpin;
