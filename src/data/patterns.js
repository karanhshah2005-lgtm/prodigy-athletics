/**
 * patterns.js — deterministic procedural artwork generator for the storefront catalog.
 *
 * No photography, no stock art, no copyrighted characters or real brand marks — every
 * catalog "artwork" is generated on a <canvas> from a small JSON spec so the sample
 * storefront never has to fake or source product photography.
 *
 * makePattern(spec, size) -> { dataUrl, w, h }  — SAME shape as art.js's demoArt(), so the
 * result drops straight into artPatternDef({ art, ... }) unchanged.
 *
 * spec = { kind, colors:[hex,...], seed:n, ...kind-specific params }
 * kind ∈ 'geo' | 'camo' | 'stripes' | 'grid' | 'topo' | 'halftone' | 'flag-ca' | 'minimal'
 *       | 'kanji-abstract' | 'waves'
 *
 * Deterministic: same spec + size always produces the same pixels (seeded PRNG, no
 * Math.random). Results are cached by JSON key so re-rendering the same colourway across
 * a front/back pair or a grid + PDP never re-pays the canvas cost.
 */

const DEFAULT_COLORS = ['#0B1220', '#E8A33D', '#F5F3EE', '#5A5A5A'];

const CACHE = new Map();

/** mulberry32 — small, fast, deterministic PRNG. Same seed -> same sequence, always. */
function mulberry32(seed) {
  let t = (seed >>> 0) || 1;
  return function rnd() {
    t |= 0; t = (t + 0x6D2B79F5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function cols(colors) {
  const c = Array.isArray(colors) && colors.length ? colors : DEFAULT_COLORS;
  return { c0: c[0] || DEFAULT_COLORS[0], c1: c[1] || DEFAULT_COLORS[1], c2: c[2] || DEFAULT_COLORS[2], c3: c[3] || DEFAULT_COLORS[3], all: c };
}

// ───────────────────────────── kind generators ─────────────────────────────
// Every generator fills the WHOLE canvas (0,0,size,size) — it will be tiled or letterboxed
// by artPatternDef() downstream, so it must look right cropped to a square, not centred art.

function kGeo(ctx, size, colors, rnd, spec) {
  const { c0, c1, c2 } = cols(colors);
  ctx.fillStyle = c0; ctx.fillRect(0, 0, size, size);
  const n = spec.rings || 3;
  for (let i = 0; i < n; i++) {
    const r = size * (0.16 + i * 0.13) + (rnd() - 0.5) * size * 0.03;
    ctx.strokeStyle = i % 2 ? c2 : c1;
    ctx.lineWidth = size * (0.018 + (i === 0 ? 0.012 : 0));
    ctx.beginPath(); ctx.arc(size * 0.5, size * 0.42, r, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.strokeStyle = c1; ctx.lineWidth = size * 0.035;
  ctx.beginPath(); ctx.moveTo(0, size * (0.15 + rnd() * 0.1)); ctx.lineTo(size, size * (0.75 + rnd() * 0.1)); ctx.stroke();
  ctx.strokeStyle = c2; ctx.lineWidth = size * 0.018;
  ctx.beginPath(); ctx.moveTo(0, size * (0.85 - rnd() * 0.1)); ctx.lineTo(size, size * (0.05 + rnd() * 0.1)); ctx.stroke();
  ctx.fillStyle = c1; ctx.fillRect(0, 0, size, size * 0.05);
}

function kCamo(ctx, size, colors, rnd, spec) {
  const { all } = cols(colors);
  const palette = all.length >= 3 ? all : DEFAULT_COLORS;
  ctx.fillStyle = palette[0]; ctx.fillRect(0, 0, size, size);
  const blobs = spec.blobs || 42;
  for (let i = 0; i < blobs; i++) {
    ctx.fillStyle = palette[1 + (i % (palette.length - 1))];
    const px = rnd() * size, py = rnd() * size;
    const r = (size * 0.05) + rnd() * size * 0.14;
    ctx.beginPath();
    for (let a = 0; a <= 7; a++) {
      const ang = (a / 7) * Math.PI * 2;
      const rr = r * (0.65 + rnd() * 0.55);
      const x = px + Math.cos(ang) * rr, y = py + Math.sin(ang) * rr;
      a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fill();
  }
}

function kStripes(ctx, size, colors, rnd, spec) {
  const { all } = cols(colors);
  const palette = all.length >= 2 ? all : DEFAULT_COLORS;
  const count = spec.count || 9;
  const angle = ((spec.angle ?? 40) * Math.PI) / 180;
  ctx.save();
  ctx.translate(size / 2, size / 2); ctx.rotate(angle); ctx.translate(-size, -size);
  const band = (size * 2) / count;
  for (let i = 0; i < count * 2; i++) {
    ctx.fillStyle = palette[i % palette.length];
    ctx.fillRect(i * band, 0, band + 1, size * 2);
  }
  ctx.restore();
}

function kGrid(ctx, size, colors, rnd, spec) {
  const { c0, c1, c2 } = cols(colors);
  ctx.fillStyle = c0; ctx.fillRect(0, 0, size, size);
  const cell = spec.cell || 34;
  ctx.strokeStyle = c1; ctx.lineWidth = Math.max(1, size * 0.004);
  ctx.globalAlpha = 0.85;
  for (let x = 0; x <= size; x += cell) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size); ctx.stroke(); }
  for (let y = 0; y <= size; y += cell) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke(); }
  ctx.globalAlpha = 1;
  const cols_ = Math.ceil(size / cell), rows_ = Math.ceil(size / cell);
  const hits = spec.accents || 14;
  ctx.fillStyle = c2;
  for (let i = 0; i < hits; i++) {
    const gx = Math.floor(rnd() * cols_) * cell, gy = Math.floor(rnd() * rows_) * cell;
    ctx.fillRect(gx + 1, gy + 1, cell - 2, cell - 2);
  }
}

function kTopo(ctx, size, colors, rnd, spec) {
  const { c0, c1, c2 } = cols(colors);
  ctx.fillStyle = c0; ctx.fillRect(0, 0, size, size);
  const lines = spec.lines || 9;
  const seedPhase = rnd() * Math.PI * 2;
  for (let i = 0; i < lines; i++) {
    const t = i / (lines - 1);
    const baseY = size * (0.08 + t * 0.86);
    ctx.strokeStyle = i % 3 === 0 ? c2 : c1;
    ctx.lineWidth = size * (i % 3 === 0 ? 0.012 : 0.006);
    ctx.globalAlpha = 0.5 + 0.5 * (1 - Math.abs(t - 0.5) * 2);
    ctx.beginPath();
    for (let x = 0; x <= size; x += size / 40) {
      const y = baseY + Math.sin(x * 0.02 + seedPhase + t * 3) * size * 0.045 * (0.4 + t);
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function kHalftone(ctx, size, colors, rnd, spec) {
  const { c0, c1 } = cols(colors);
  ctx.fillStyle = c0; ctx.fillRect(0, 0, size, size);
  const cell = spec.cell || 22;
  ctx.fillStyle = c1;
  for (let y = 0, row = 0; y < size + cell; y += cell, row++) {
    for (let x = 0; x < size + cell; x += cell) {
      const gradT = x / size; // dot size ramps left -> right, halftone-fade style
      const jitter = (rnd() - 0.5) * cell * 0.15;
      const r = Math.max(0.6, (cell * 0.46) * gradT + jitter);
      const ox = row % 2 ? cell / 2 : 0;
      ctx.beginPath(); ctx.arc(x + ox, y, r, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function kFlagCa(ctx, size, colors, rnd, spec) {
  const { c0, c1, c2 } = cols(colors); // c0 = red band, c1 = white band, c2 = leaf accent
  const red = c0, white = c1, leaf = c2 || c0;
  const third = size / 3;
  ctx.fillStyle = red; ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = white; ctx.fillRect(third, 0, third, size);
  // stylised, angular leaf-ish geometric mark — original geometry, not a traced maple leaf
  const cx = size / 2, cy = size / 2, s = size * 0.19;
  ctx.fillStyle = leaf;
  ctx.beginPath();
  const pts = [
    [0, -1.15], [0.28, -0.55], [0.62, -0.62], [0.34, -0.18],
    [0.58, 0.05], [0.2, 0.12], [0.14, 0.62], [0, 0.3],
    [-0.14, 0.62], [-0.2, 0.12], [-0.58, 0.05], [-0.34, -0.18],
    [-0.62, -0.62], [-0.28, -0.55],
  ];
  pts.forEach(([px, py], i) => {
    const x = cx + px * s, y = cy + py * s;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.closePath(); ctx.fill();
}

function kMinimal(ctx, size, colors, rnd, spec) {
  const { c0, c1, c2 } = cols(colors);
  ctx.fillStyle = c0; ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = c1;
  ctx.fillRect(size * 0.485, 0, size * 0.03, size);
  ctx.fillRect(0, size * 0.94, size, size * 0.02);
  ctx.strokeStyle = c2 || c1; ctx.lineWidth = size * 0.008;
  ctx.strokeRect(size * 0.08, size * 0.08, size * 0.84, size * 0.84);
}

function kKanjiAbstract(ctx, size, colors, rnd, spec) {
  const { c0, c1 } = cols(colors);
  ctx.fillStyle = c0; ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = c1; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const strokes = spec.strokes || 4;
  for (let i = 0; i < strokes; i++) {
    const x0 = rnd() * size * 0.3 + size * 0.1;
    const y0 = rnd() * size * 0.3 + size * 0.1;
    const x1 = size - rnd() * size * 0.3 - size * 0.1;
    const y1 = size - rnd() * size * 0.3 - size * 0.1;
    const mx = (x0 + x1) / 2 + (rnd() - 0.5) * size * 0.3;
    const my = (y0 + y1) / 2 + (rnd() - 0.5) * size * 0.3;
    const w0 = size * (0.02 + rnd() * 0.05);
    // brush taper: several overlapping strokes, width decreasing toward the tail
    const segs = 5;
    for (let s = 0; s < segs; s++) {
      const t0 = s / segs, t1 = (s + 1) / segs;
      const px0 = bez(x0, mx, x1, t0), py0 = bez(y0, my, y1, t0);
      const px1 = bez(x0, mx, x1, t1), py1 = bez(y0, my, y1, t1);
      ctx.lineWidth = w0 * (1 - 0.55 * t0);
      ctx.beginPath(); ctx.moveTo(px0, py0); ctx.lineTo(px1, py1); ctx.stroke();
    }
  }
  function bez(a, b, c, t) { return (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c; }
}

function kWaves(ctx, size, colors, rnd, spec) {
  const { all } = cols(colors);
  const palette = all.length >= 2 ? all : DEFAULT_COLORS;
  ctx.fillStyle = palette[0]; ctx.fillRect(0, 0, size, size);
  const bands = spec.bands || 7;
  const phase = rnd() * Math.PI * 2;
  for (let i = 0; i < bands; i++) {
    const t = i / bands;
    ctx.strokeStyle = palette[1 + (i % (palette.length - 1))];
    ctx.lineWidth = size * 0.05;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    for (let x = 0; x <= size; x += size / 50) {
      const y = size * (0.1 + t * 0.86) + Math.sin(x * 0.018 + phase + i) * size * 0.05;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

const KIND_FNS = {
  geo: kGeo,
  camo: kCamo,
  stripes: kStripes,
  grid: kGrid,
  topo: kTopo,
  halftone: kHalftone,
  'flag-ca': kFlagCa,
  minimal: kMinimal,
  'kanji-abstract': kKanjiAbstract,
  waves: kWaves,
};

/**
 * Generate (or fetch cached) procedural artwork for a spec.
 * @param {{kind:string, colors?:string[], seed?:number, [param:string]:any}} spec
 * @param {number} size — square canvas edge, px
 * @returns {{dataUrl:string, w:number, h:number}}
 */
export function makePattern(spec = {}, size = 320) {
  const key = JSON.stringify(spec) + '|' + size;
  const hit = CACHE.get(key);
  if (hit) return hit;

  const kind = spec.kind || 'minimal';
  const fn = KIND_FNS[kind] || KIND_FNS.minimal;
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d');
  const rnd = mulberry32(spec.seed ?? 1);
  fn(ctx, size, spec.colors, rnd, spec);
  const out = { dataUrl: c.toDataURL('image/png'), w: size, h: size };
  c.width = c.height = 0;
  CACHE.set(key, out);
  return out;
}

export const PATTERN_KINDS = Object.freeze(Object.keys(KIND_FNS));
