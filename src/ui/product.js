/**
 * product.js — the product page (product.html?id=<product id>), modelled on an
 * albinoandpreto.com product page: a stacked gallery on the left, the buy column on the
 * right, plain paragraphs, no accordions. Every product card on shop.html links here.
 *
 * Gallery order: placeholder flat-lay front, placeholder flat-lay back (docs/PHOTOS.md,
 * "Placeholder product imagery" — captioned as placeholders on the page), then the
 * renders of the cut (front, back) and, for tops, the 360.
 *
 * Prices are sample data (catalog.js); every unsupplied spec renders "— TO CONFIRM";
 * the sample cart counts in sessionStorage and connects to nothing.
 */

import { PRODUCTS, findProduct, SIZES } from '../data/catalog.js';
import { svgToPng } from '../render/export.js';
import { makePattern } from '../data/patterns.js';
import {
  $, $$, esc, priceText, REDUCED, CUT_LABEL, productSvg, cropSvg, hotspots, cardHtml,
  productHref, productPhoto, photoAlt, PHOTO_PX, initHeader, bumpCart,
} from './shared.js';

initHeader();

const root = $('#product');
const id = new URLSearchParams(location.search).get('id');
const product = findProduct(id);
// boot is at the end of the file: the helpers below are const bindings, not hoisted

/* ── relations ─────────────────────────────────────────────────────────── */

const isTopStyle = (style) => style === 'ls' || style === 'ss';

/**
 * Set members: the same artwork line, cut for the other half of the kit. A top proposes
 * the bottoms and a bottom proposes the tops; a line with no counterpart gets no block
 * rather than a padded one.
 */
function setMates(p) {
  const top = isTopStyle(p.style);
  return PRODUCTS
    .filter(x => x.line === p.line && x.id !== p.id && !x.pieces && isTopStyle(x.style) !== top)
    .slice(0, 3);
}
/** The same garment in the other cut, when the range carries one. */
function cutSwitch(p) {
  if (!isTopStyle(p.style) || p.pieces) return null;
  return PRODUCTS.find(x => x.line === p.line && x.id !== p.id && isTopStyle(x.style)
    && x.baseColor === p.baseColor) || null;
}
function moreFrom(p, exclude) {
  const skip = new Set([p.id, ...exclude.map(x => x.id)]);
  return PRODUCTS.filter(x => x.line === p.line && !skip.has(x.id)).slice(0, 4);
}

function specRows(p) {
  const gi = p.style === 'gi';
  const rows = [
    ['Cut', CUT_LABEL[p.style]],
    ['Sleeve', p.style === 'ls' ? 'Long' : p.style === 'ss' ? 'Short' : '—'],
    ['Body colour', 'See colourway'],
    ['Fabric', null],
    ['Weight', null],
    ['Print method', gi ? null : 'Dye sublimation, all-over'],
    ['Sizes', gi ? 'A0–A6' : 'XS–4XL'],
  ];
  return rows.map(([k, v]) => `<tr><th class="t-label" scope="row">${esc(k)}</th><td class="t-body-s">${v ? esc(v) : '<span class="todo">— to confirm</span>'}</td></tr>`).join('');
}

/* ── page ──────────────────────────────────────────────────────────────── */

function shot(src, alt, caption, first = false) {
  return `
    <figure class="pdp__shot">
      <img src="${src}" width="${PHOTO_PX}" height="${PHOTO_PX}" alt="${esc(alt)}" decoding="async"${first ? ' fetchpriority="high"' : ' loading="lazy"'}>
      <figcaption class="t-micro">${caption}</figcaption>
    </figure>`;
}

function render(p) {
  document.title = `${p.name} — Prodigy Athletics (Sample Storefront)`;
  const isTop = isTopStyle(p.style);
  const mates = setMates(p);
  const more = moreFrom(p, mates);
  const otherCut = cutSwitch(p);

  const crops = isTop ? hotspots(p.style).slice(0, 3).map(h => `
    <div>
      <div class="cropstage">${cropSvg(productSvg(p, { size: 1000, view: h.view }), h.crop)}</div>
      <span class="t-label">${esc(h.n)} ${esc(h.label)}</span>
    </div>`).join('') : '';

  const PLACEHOLDER = 'Placeholder image &mdash; stands in for Prodigy&rsquo;s own photograph of this product.';

  root.innerHTML = `
    <p class="pdp__crumb t-label"><a href="shop.html">Shop</a> / <a href="shop.html#shop">${esc(p.line)}</a> / ${esc(CUT_LABEL[p.style])}</p>
    <div class="pdp__grid">
      <div class="pdp__gallery">
        ${shot(productPhoto(p.id, 'front'), photoAlt(p, 'front'), `${PLACEHOLDER} Front.`, true)}
        ${shot(productPhoto(p.id, 'back'), photoAlt(p, 'back'), `${PLACEHOLDER} Back.`)}
        <figure class="pdp__shot pdp__shot--render">
          <div class="pdp__stage">${productSvg(p, { size: 700 })}</div>
          <figcaption class="t-micro">Render of the cut from the pattern file &mdash; front</figcaption>
        </figure>
        <figure class="pdp__shot pdp__shot--render">
          <div class="pdp__stage">${productSvg(p, { size: 700, view: 'back' })}</div>
          <figcaption class="t-micro">Render of the cut from the pattern file &mdash; back</figcaption>
        </figure>
        ${isTop ? `
        <figure class="pdp__shot pdp__shot--render">
          <div class="pdp__stage is-spin" id="spinStage"><div class="pdp__spin" id="pdpSpinHost"></div></div>
          <figcaption class="t-micro">360 &mdash; drag to rotate</figcaption>
        </figure>` : ''}
      </div>

      <div class="pdp__buy">
        <span class="pdp__eyebrow t-label">${esc(p.eyebrow)}</span>
        ${p.unconfirmed ? `<span class="pdp__eyebrow t-label todo">${esc(p.unconfirmed)}</span>` : ''}
        <h1 class="t-h1" id="pdpTitle">${esc(p.name)}</h1>
        <p class="pdp__price t-body">${priceText(p)}</p>

        ${otherCut ? `
        <div class="pdp__field">
          <label class="t-label" for="pdpCut">Sleeve</label>
          <select id="pdpCut">
            <option value="${esc(p.style === 'ss' ? p.id : otherCut.id)}"${p.style === 'ss' ? ' selected' : ''}>Short</option>
            <option value="${esc(p.style === 'ls' ? p.id : otherCut.id)}"${p.style === 'ls' ? ' selected' : ''}>Long</option>
          </select>
        </div>` : ''}

        <div class="pdp__field">
          <label class="t-label" for="pdpSize">Size</label>
          <select id="pdpSize">${(p.sizes || SIZES).map(s => `<option>${s}</option>`).join('')}</select>
        </div>

        <div class="pdp__add">
          <button class="btn btn--ink btn--wide t-button" type="button" id="pdpAdd">Add to cart</button>
          <p class="pdp__note t-caption">Checkout is not connected. This is a sample storefront.</p>
        </div>

        <div class="pdp__sec">
          <span class="t-label">Details</span>
          <p class="t-body-s">${esc(p.copy[0])}</p>
          <p class="t-body-s">${esc(p.copy[1])}</p>
        </div>

        <div class="pdp__sec">
          <span class="t-label">Fit and sizing</span>
          <p class="t-body-s">${esc(p.copy[2])}</p>
          <table class="spec"><caption class="vh">Specification</caption><tbody>${specRows(p)}</tbody></table>
        </div>

        <div class="pdp__sec">
          <span class="t-label">Shipping and returns</span>
          <p class="t-body-s">Sample text. Shipping and returns policy <span class="todo">— to confirm</span>.</p>
        </div>

        <div class="pdp__sec">
          <span class="t-label">About the images</span>
          <p class="t-body-s">The two photographs are placeholders standing in for Prodigy&rsquo;s own product photography; the logo on them is Prodigy&rsquo;s, reproduced from the team&rsquo;s photographs. The renders are drawn from the pattern file and show the cut, not the fabric.</p>
        </div>
      </div>
    </div>
    ${crops ? `<div class="pdp__sec"><span class="t-label">The detail</span><div class="pdp__crops">${crops}</div></div>` : ''}
    ${mates.length ? `<div class="pdp__sec">
      <span class="t-label">Complete the set</span>
      <p class="t-body-s">One artwork, cut for each style.</p>
      <div class="pdp__row">${mates.map(x => cardHtml(x)).join('')}</div>
    </div>` : ''}
    ${more.length ? `<div class="pdp__sec">
      <span class="t-label">More from ${esc(p.line)}</span>
      <div class="pdp__row pdp__row--4">${more.map(x => cardHtml(x)).join('')}</div>
    </div>` : ''}
  `;

  const cut = $('#pdpCut');
  if (cut) cut.addEventListener('change', () => { if (cut.value !== p.id) location.href = productHref(cut.value); });

  $('#pdpAdd').addEventListener('click', () => bumpCart());

  // The 360 bakes six 1024px textures, so it waits until its figure is on screen.
  const spinStage = $('#spinStage');
  if (spinStage) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some(en => en.isIntersecting)) { io.disconnect(); mountSpin(p); }
    }, { rootMargin: '200px' });
    io.observe(spinStage);
  }
}

function notFound() {
  document.title = 'Product not found — Prodigy Athletics';
  root.innerHTML = `
    <div class="prod__missing">
      <span class="t-label">Not found</span>
      <h1 class="t-h1">No product with that id.</h1>
      <p class="t-body-s"><a class="tlink" href="shop.html#shop">Back to the whole range</a></p>
    </div>`;
}

/* ── 360 ───────────────────────────────────────────────────────────────── */

/**
 * The product's own flat render, baked onto the 3D garment: front/back × torso and the
 * two sleeves, unshaded (detail:'tex'), so the 360 carries the same artwork and the same
 * marks as the flat views next to it. Data URLs, because the viewer reads these back off
 * a canvas.
 */
const BAKE_PX = 1024;
function blobToDataUrl(blob) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(r.error || new Error('bake read failed'));
    r.readAsDataURL(blob);
  });
}
async function bakeProduct(p) {
  const jobs = [];
  for (const view of ['front', 'back']) {
    for (const part of ['torso', 'sleeveL', 'sleeveR']) {
      const svg = productSvg(p, { view, part, detail: 'tex', size: BAKE_PX });
      const name = part === 'torso' ? view : `${part}${view === 'front' ? 'Front' : 'Back'}`;
      jobs.push(svgToPng(svg, { width: BAKE_PX }).then(blobToDataUrl).then((url) => [name, url]));
    }
  }
  return Object.fromEntries(await Promise.all(jobs));
}

let spin = null;
async function mountSpin(p) {
  const host = $('#pdpSpinHost');
  try {
    const mod = await import('../render/spin3d.js');
    let bake = null;
    try { bake = await bakeProduct(p); } catch (e) { console.warn('360 bake failed — showing the plain garment', e); }
    if (!host.isConnected) return;
    spin = mod.mountSpin(host, {
      style: p.style,
      baseColor: p.baseColor,
      sleeveColor: null,
      // With a bake every print — artwork, chest lockup, sleeve run, back word — is
      // already in the texture. Without one, fall back to the procedural marks.
      bake,
      art: bake ? null : (p.artSpec ? makePattern(p.artSpec, 320) : null),
      artTile: 3,
      sleeveText: bake ? null : 'PRODIGY',
      sleeveTextColor: p.marks?.sleeves?.color || '#F5F3EE',
      chestMark: bake ? null : 'wordmark',
      chestMarkColor: p.marks?.chest?.color || '#F5F3EE',
      backText: bake ? null : 'PRODIGY',
      autoRotate: !REDUCED,
      speed: 0.6,
    });
  } catch (err) {
    console.warn('spin3d unavailable', err);
    const fig = host.closest('.pdp__shot');
    if (fig) fig.remove();
  }
}

/* ── boot ──────────────────────────────────────────────────────────────── */

if (product) render(product); else notFound();

// hook for automated verification
window.__product = { id: product ? product.id : null, spin: () => spin, cards: () => $$('.card').length };
