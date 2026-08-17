/**
 * art.js — uploaded artwork → paintable SVG <pattern>.
 *
 * THE RULE (see docs/RENDERER-SEED.md): artwork is embedded as a data: URL, never a
 * blob: URL. A blob: URL taints the export canvas and toDataURL throws SecurityError.
 */

export const DEFAULT_TRANSFORM = Object.freeze({ scale: 1, rotate: 0, x: 0, y: 0 });

const MAX_PIXELS = 12_000_000;   // warn above ~12 MP
const RESIZE_TO = 2048;          // long edge for the working copy

/**
 * Read a File/Blob into { dataUrl, w, h, name, type }.
 * - EXIF orientation is applied (createImageBitmap imageOrientation:'from-image', with
 *   a fallback for browsers that lack it).
 * - Very large uploads are downscaled to RESIZE_TO on the long edge so we never hold a
 *   96 MB RGBA buffer from a phone photo. The working copy is what gets embedded.
 * - Always resolves to a PNG data URL (transparency preserved), except SVG uploads which
 *   are embedded as their own data URL untouched.
 */
export async function fileToArt(file) {
  if (!file) throw new Error('No file');
  const type = file.type || '';
  if (!type.startsWith('image/')) throw new Error(`"${file.name}" is not an image (${type || 'unknown type'}). Upload PNG, JPG, WebP or SVG.`);

  if (type === 'image/svg+xml') {
    const dataUrl = await readAsDataURL(file);
    const { w, h } = await probeSize(dataUrl);
    return { dataUrl, w, h, name: file.name, type, warnings: [] };
  }

  const warnings = [];
  let bmp = null;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    // fallback: decode via <img> (no EXIF handling in very old engines)
    const raw = await readAsDataURL(file);
    const img = await loadImage(raw);
    bmp = img;
  }
  const w0 = bmp.width, h0 = bmp.height;
  if (w0 * h0 > MAX_PIXELS) warnings.push(`Large image (${(w0 * h0 / 1e6).toFixed(1)} MP) — downscaled to ${RESIZE_TO}px for preview. Keep your original for print.`);

  const k = Math.min(1, RESIZE_TO / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * k)), h = Math.max(1, Math.round(h0 * k));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.drawImage(bmp, 0, 0, w, h);
  if (bmp.close) bmp.close();
  const dataUrl = c.toDataURL('image/png');
  c.width = c.height = 0; // release
  return { dataUrl, w, h, name: file.name, type, warnings };
}

function readAsDataURL(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(r.error || new Error('Read failed'));
    r.readAsDataURL(file);
  });
}
function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('Image decode failed'));
    img.src = src;
  });
}
async function probeSize(dataUrl) {
  try { const img = await loadImage(dataUrl); return { w: img.naturalWidth || 1000, h: img.naturalHeight || 1000 }; }
  catch { return { w: 1000, h: 1000 }; }
}

/**
 * Build a <pattern> for artwork.
 *
 * tile:true  → the artwork repeats. Tile size = art size × scale (in viewBox units, where
 *              1 unit ≈ 1/1000 of the garment frame). transform.x/y pan the tiling;
 *              rotate spins it about the tile centre.
 * tile:false → the artwork is placed ONCE, centred and letterboxed inside `bbox`
 *              ([x,y,w,h] in viewBox units — use slotBBox from garment.js). scale/rotate/
 *              x/y then adjust it about the bbox centre. Outside the image the pattern is
 *              transparent so the base colour / all-over layer shows through.
 *
 * `baseTile` (default 400) is the tile width in viewBox units at scale 1 for tiled mode,
 * so a 1:1 image at scale 1 repeats ~2.5× across the garment frame.
 */
export function artPatternDef({ uid, key = 'art', art, transform = DEFAULT_TRANSFORM, tile = true, bbox = [0, 0, 1000, 1000], baseTile = 400 } = {}) {
  if (!art || !art.dataUrl) return '';
  const id = `${uid}-${key}`;
  const t = { ...DEFAULT_TRANSFORM, ...transform };
  const href = art.dataUrl;
  const ar = (art.w || 1) / (art.h || 1);

  if (tile) {
    const tw = baseTile * t.scale;
    const th = tw / ar;
    // rotate + pan about the tile centre so controls feel anchored
    const pt = `translate(${fmt(t.x)} ${fmt(t.y)}) rotate(${fmt(t.rotate)} ${fmt(tw / 2)} ${fmt(th / 2)})`;
    return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${fmt(tw)}" height="${fmt(th)}" patternTransform="${pt}">
  <image href="${href}" xlink:href="${href}" x="0" y="0" width="${fmt(tw)}" height="${fmt(th)}" preserveAspectRatio="none"/>
</pattern>`;
  }

  // single placement inside bbox
  const [bx, by, bw, bh] = bbox;
  const cx = bx + bw / 2, cy = by + bh / 2;
  // fit image into bbox
  let iw = bw, ih = bw / ar;
  if (ih > bh) { ih = bh; iw = bh * ar; }
  iw *= t.scale; ih *= t.scale;
  const ix = cx - iw / 2 + t.x, iy = cy - ih / 2 + t.y;
  // pattern tile = whole frame so the image never repeats
  return `<pattern id="${id}" patternUnits="userSpaceOnUse" x="0" y="0" width="1000" height="1000">
  <g transform="rotate(${fmt(t.rotate)} ${fmt(cx + t.x)} ${fmt(cy + t.y)})">
    <image href="${href}" xlink:href="${href}" x="${fmt(ix)}" y="${fmt(iy)}" width="${fmt(iw)}" height="${fmt(ih)}" preserveAspectRatio="none"/>
  </g>
</pattern>`;
}

export function artPatternRef({ uid, key = 'art' }) {
  return `url(#${uid}-${key})`;
}

function fmt(n) { return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0; }

/**
 * Convenience: a small procedural demo artwork (data URL) so the studio has something to
 * show before an upload, and so tests never depend on a file. Deterministic.
 */
export function demoArt(kind = 'geo', size = 300) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d');
  const s = size / 150;
  if (kind === 'geo') {
    x.fillStyle = '#141642'; x.fillRect(0, 0, size, size);
    x.strokeStyle = '#ff2e63'; x.lineWidth = 13 * s; x.beginPath(); x.arc(75 * s, 75 * s, 54 * s, 0, 7); x.stroke();
    x.fillStyle = '#00d9c0'; x.beginPath(); x.arc(75 * s, 75 * s, 27 * s, 0, 7); x.fill();
    x.strokeStyle = '#ffb703'; x.lineWidth = 8 * s; x.beginPath(); x.moveTo(0, 0); x.lineTo(size, size); x.moveTo(size, 0); x.lineTo(0, size); x.stroke();
    x.fillStyle = '#ff2e63'; x.fillRect(0, 0, size, 15 * s);
  } else if (kind === 'camo') {
    const cols = ['#2b3a2a', '#4a5b3d', '#7a7d55', '#1c2418'];
    x.fillStyle = cols[0]; x.fillRect(0, 0, size, size);
    let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    for (let i = 0; i < 40; i++) {
      x.fillStyle = cols[1 + (i % 3)];
      x.beginPath();
      const px = rnd() * size, py = rnd() * size, r = (10 + rnd() * 26) * s;
      for (let a = 0; a < 7; a++) { const ang = a / 7 * Math.PI * 2; const rr = r * (0.7 + rnd() * 0.6); x.lineTo(px + Math.cos(ang) * rr, py + Math.sin(ang) * rr); }
      x.closePath(); x.fill();
    }
  } else { // 'mark' — a single logo-like mark on transparent
    x.clearRect(0, 0, size, size);
    x.fillStyle = '#E8A33D';
    x.beginPath(); x.moveTo(75 * s, 18 * s); x.lineTo(126 * s, 48 * s); x.lineTo(112 * s, 118 * s); x.lineTo(38 * s, 118 * s); x.lineTo(24 * s, 48 * s); x.closePath(); x.fill();
    x.fillStyle = '#0B1220'; x.font = `bold ${64 * s}px Impact, 'Arial Narrow', sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('P', 75 * s, 78 * s);
  }
  return { dataUrl: c.toDataURL('image/png'), w: size, h: size, name: `demo-${kind}.png`, type: 'image/png', warnings: [] };
}
