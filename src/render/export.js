/**
 * export.js — get pixels out of SVG strings.
 *
 * Verified path (docs/export-test.html): serialise → Blob → <img> → drawImage → toBlob.
 * mix-blend-mode, feGaussianBlur and feTurbulence all survive. The canvas stays untainted
 * as long as embedded images are data: URLs (see art.js).
 */

const IS_TOUCH = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
export const MAX_EDGE = IS_TOUCH ? 2048 : 3000;   // iOS canvas area cap ≈ 16.7 MP

/** Force explicit width/height on the root <svg> (a viewBox alone is not enough for <img>). */
function withSize(svg, width, height) {
  return svg.replace(/<svg\b([^>]*)>/, (m, attrs) => {
    let a = attrs.replace(/\swidth="[^"]*"/, '').replace(/\sheight="[^"]*"/, '');
    if (!/xmlns=/.test(a)) a += ' xmlns="http://www.w3.org/2000/svg"';
    if (!/xmlns:xlink=/.test(a)) a += ' xmlns:xlink="http://www.w3.org/1999/xlink"';
    return `<svg${a} width="${width}" height="${height}">`;
  });
}

function svgToImage(svgString) {
  return new Promise((res, rej) => {
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);   // the SVG wrapper may be a blob: URL — it is
    const img = new Image();                 // same-origin; only *embedded* images must be data:
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('SVG failed to load into <img> — check for unescaped characters or an external image reference')); };
    img.src = url;
  });
}

function canvasToBlob(canvas, type = 'image/png', quality) {
  return new Promise((res, rej) => {
    try {
      canvas.toBlob(b => b ? res(b) : rej(new Error('toBlob returned null (canvas may be tainted or too large)')), type, quality);
    } catch (e) { rej(e); }
  });
}

/**
 * Rasterise an SVG string to a PNG Blob.
 * @param {string} svgString
 * @param {{width?:number,height?:number,type?:string,quality?:number,background?:string}} opts
 */
export async function svgToPng(svgString, { width = 2000, height, type = 'image/png', quality, background = null } = {}) {
  height = height || width;
  const k = Math.min(1, MAX_EDGE / Math.max(width, height));
  const W = Math.round(width * k), H = Math.round(height * k);
  const img = await svgToImage(withSize(svgString, W, H));
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  if (background) { ctx.fillStyle = background; ctx.fillRect(0, 0, W, H); }
  ctx.drawImage(img, 0, 0, W, H);
  try {
    const blob = await canvasToBlob(c, type, quality);
    return blob;
  } finally {
    c.width = c.height = 0;
  }
}

/** Trigger a browser download. (No-op inside sandboxed viewers that block downloads.) */
export function downloadBlob(blob, filename = 'export.png') {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Compose several SVG strings into ONE PNG grid (colourway grid, set view, listing pack).
 * @param {string[]} svgStrings
 * @param {{cols?:number,cellSize?:number,gap?:number,bg?:string,labels?:string[],labelColor?:string,title?:string}} opts
 */
export async function composeGrid(svgStrings, { cols = 3, cellSize = 700, gap = 24, bg = '#ffffff', labels = [], labelColor = '#1A1A1A', title = '', font = 'Barlow, "Segoe UI", system-ui, sans-serif' } = {}) {
  const n = svgStrings.length;
  if (!n) throw new Error('composeGrid: nothing to compose');
  cols = Math.max(1, Math.min(cols, n));
  const rows = Math.ceil(n / cols);
  const labelH = labels.length ? Math.round(cellSize * 0.09) : 0;
  const titleH = title ? Math.round(cellSize * 0.12) : 0;
  let W = gap + cols * (cellSize + gap);
  let H = gap + titleH + rows * (cellSize + labelH + gap);
  const k = Math.min(1, MAX_EDGE / Math.max(W, H));
  const cs = cellSize * k, g = gap * k, lh = labelH * k, th = titleH * k;
  W = Math.round(W * k); H = Math.round(H * k);

  const imgs = await Promise.all(svgStrings.map(s => svgToImage(withSize(s, Math.round(cs), Math.round(cs)))));
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  if (title) {
    ctx.fillStyle = labelColor; ctx.font = `600 ${Math.round(th * 0.45)}px ${font}`;
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.fillText(title.toUpperCase(), g, g + th / 2);
  }
  imgs.forEach((img, i) => {
    const r = Math.floor(i / cols), col = i % cols;
    const x = g + col * (cs + g), y = g + th + r * (cs + lh + g);
    ctx.drawImage(img, x, y, cs, cs);
    if (labels[i]) {
      ctx.fillStyle = labelColor; ctx.font = `500 ${Math.round(lh * 0.42)}px ${font}`;
      ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
      ctx.fillText(String(labels[i]).toUpperCase(), x + cs / 2, y + cs + lh / 2);
    }
  });
  try { return await canvasToBlob(c, 'image/png'); }
  finally { c.width = c.height = 0; }
}

/** Debug helper: prove the round-trip works and the canvas is untainted. */
export async function selfTest() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#2b6cf6"/><g style="mix-blend-mode:multiply"><circle cx="50" cy="70" r="40" fill="#000" opacity=".7"/></g></svg>`;
  const blob = await svgToPng(svg, { width: 200 });
  return { ok: blob.size > 0, bytes: blob.size };
}
