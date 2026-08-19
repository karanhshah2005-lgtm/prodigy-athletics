/**
 * linkart.js — turn a pasted LINK (Pinterest pin, image URL) or pasted/dropped IMAGE into
 * an `art` object ({ dataUrl, w, h, name, warnings }) the renderer can use.
 *
 * Why this is not just fetch(url): the browser cannot read Pinterest directly — neither
 * pinterest.com pages, its oEmbed, nor i.pinimg.com send CORS headers (checked 2026-08-19).
 * So the chain is:
 *   1. an IMAGE in the clipboard / drop (right-click → Copy image → Ctrl+V)  → instant, exportable
 *   2. a direct image URL (i.pinimg.com/… or any *.jpg/png/webp)              → via a public
 *      image proxy that adds CORS (images.weserv.nl)                            → exportable
 *   3. a Pinterest pin URL (pinterest.com/pin/… , pin.it/…)                     → resolve the
 *      pin's original image through a public reader (r.jina.ai, ~10–20 s), then step 2
 *   4. anything else → a clear message telling the user how to copy the image instead
 *
 * Steps 2–3 use third-party public services; the UI says so. Everything ends as a data URL,
 * so exports keep working (see RENDERER-SEED: blob/cross-origin images would taint the canvas).
 */

const IMG_PROXY = u => `https://images.weserv.nl/?url=${encodeURIComponent(u.replace(/^https?:\/\//, ''))}&w=2048`;
const READER = u => `https://r.jina.ai/${u}`;

export const PIN_HELP =
  'Pinterest does not let websites read a pin directly. Fastest: open the pin, right-click the image → Copy image, then press Ctrl+V here (or drag the image onto this box). You can also paste the image address (i.pinimg.com/…).';

export function classifyInput(text) {
  const t = (text || '').trim();
  if (!t) return { kind: 'empty' };
  let u;
  try { u = new URL(t); } catch { return { kind: 'text' }; }
  const host = u.hostname.replace(/^www\./, '');
  if (/^i\.pinimg\.com$/.test(host) || /\.(png|jpe?g|webp|gif|avif|svg)(\?|$)/i.test(u.pathname)) return { kind: 'image', url: u.href };
  if (/(^|\.)pinterest\.[a-z.]+$/.test(host) && /\/pin\//.test(u.pathname)) return { kind: 'pin', url: u.href };
  if (/^pin\.it$/.test(host)) return { kind: 'pin', url: u.href, short: true };
  if (/(^|\.)pinterest\.[a-z.]+$/.test(host)) return { kind: 'pinterest-other', url: u.href };
  return { kind: 'url', url: u.href };
}

async function blobToArt(blob, name) {
  const dataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('That image could not be decoded.')); i.src = dataUrl; });
  // downscale very large images to keep the working copy light (same policy as art.js)
  const MAX = 2048;
  if (img.naturalWidth > MAX || img.naturalHeight > MAX) {
    const k = MAX / Math.max(img.naturalWidth, img.naturalHeight);
    const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    const out = { dataUrl: c.toDataURL('image/png'), w: c.width, h: c.height, name, type: 'image/png', warnings: ['Large image downscaled to 2048 px for preview. Keep your original for print.'] };
    c.width = c.height = 0;
    return out;
  }
  return { dataUrl, w: img.naturalWidth, h: img.naturalHeight, name, type: blob.type || 'image/png', warnings: [] };
}

// hosts known to send no CORS headers — go straight to the proxy (a direct try would only log a console error)
const NO_CORS_HOSTS = /(^|\.)pinimg\.com$|(^|\.)pinterest\.[a-z.]+$|(^|\.)instagram\.com$|(^|\.)cdninstagram\.com$|(^|\.)fbcdn\.net$/i;
async function fetchImageBlob(url, onStatus) {
  let host = ''; try { host = new URL(url).hostname; } catch { /* noop */ }
  if (!NO_CORS_HOSTS.test(host)) {
    // try direct first (works for CORS-enabled hosts), then the proxy
    try {
      const r = await fetch(url, { mode: 'cors' });
      if (r.ok) { const b = await r.blob(); if (b.type.startsWith('image/')) return b; }
    } catch { /* fall through */ }
  }
  onStatus && onStatus('Fetching the image through a public image proxy…');
  const r2 = await fetch(IMG_PROXY(url), { mode: 'cors' });
  if (!r2.ok) throw new Error(`Image proxy returned ${r2.status}.`);
  const b2 = await r2.blob();
  if (!b2.type.startsWith('image/')) throw new Error('The link did not return an image.');
  return b2;
}

async function resolvePinImage(pinUrl, onStatus, { timeoutMs = 45000 } = {}) {
  onStatus && onStatus('Reading the pin through a public reader (Pinterest blocks direct reads) — this can take 10–20 s…');
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(READER(pinUrl), { headers: { 'x-respond-with': 'html' }, signal: ctrl.signal });
    if (!r.ok) throw new Error(`Reader returned ${r.status}.`);
    const html = await r.text();
    // prefer the full-size original; og:image is usually a 736px derivative
    const orig = html.match(/https:\/\/i\.pinimg\.com\/originals\/[A-Za-z0-9/._-]+/);
    if (orig) return orig[0];
    const og = html.match(/property=["']og:image["'][^>]*content=["']([^"']+)["']/i) || html.match(/content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
    if (og && /pinimg\.com/.test(og[1])) return og[1];
    const any = html.match(/https:\/\/i\.pinimg\.com\/[0-9]{3,4}x\/[A-Za-z0-9/._-]+/);
    if (any) return any[0];
    throw new Error('Could not find the pin image in the page (Pinterest may have shown a sign-in wall).');
  } finally { clearTimeout(t); }
}

/**
 * Resolve any of: { file }, { text }, { dataTransfer } into an art object.
 * onStatus(msg) receives progress text for the UI.
 */
export async function resolveArtInput({ file = null, text = '', dataTransfer = null } = {}, onStatus = () => {}) {
  // 1. real image data (paste / drop) — best path
  if (!file && dataTransfer) {
    const f = [...(dataTransfer.files || [])].find(x => x.type.startsWith('image/'));
    if (f) file = f;
    if (!file && !text) {
      text = dataTransfer.getData('text/uri-list') || dataTransfer.getData('text/plain') || '';
      // dragging an <img> from another tab often gives an html fragment with the src
      if (!text) { const h = dataTransfer.getData('text/html'); const m = h && h.match(/src=["']([^"']+)["']/); if (m) text = m[1]; }
    }
  }
  if (file) {
    onStatus('Reading image…');
    return blobToArt(file, file.name || 'pasted-image.png');
  }
  const c = classifyInput(text);
  if (c.kind === 'empty') throw new Error('Paste an image, an image link, or a Pinterest pin link.');
  if (c.kind === 'text') throw new Error('That is not a link. ' + PIN_HELP);
  if (c.kind === 'image' || c.kind === 'url') {
    onStatus('Fetching image…');
    const blob = await fetchImageBlob(c.url, onStatus);
    return blobToArt(blob, c.url.split('/').pop().split('?')[0] || 'linked-image');
  }
  if (c.kind === 'pin') {
    const imgUrl = await resolvePinImage(c.url, onStatus);
    onStatus('Found the pin image — fetching…');
    const blob = await fetchImageBlob(imgUrl, onStatus);
    const art = await blobToArt(blob, imgUrl.split('/').pop());
    art.warnings = [...(art.warnings || []), 'Fetched via public reader + image proxy (r.jina.ai, images.weserv.nl). If Pinterest ever blocks this, copy the image and paste it instead.'];
    return art;
  }
  throw new Error(PIN_HELP);
}
