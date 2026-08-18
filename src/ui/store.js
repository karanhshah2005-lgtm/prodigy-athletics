/**
 * store.js — Prodigy Athletics storefront (SAMPLE), Albino & Preto-style restyle.
 *
 * Wires src/data/catalog.js + src/data/patterns.js through src/render/garment.js (and
 * src/render/panel.js for the cut sheet) into: the release panels, the product grid, the
 * PDP modal and the demo cart in index.html.
 *
 * Every product image is produced by renderGarment()/renderRanked()/renderCutSheet() at
 * call time. There is no photography anywhere in this file, and no claim about the brand
 * that is not marked as sample data.
 */

import { renderGarment, renderRanked, slotBBox, BELT_HEX, estimateRankCoverage } from '../render/garment.js';
import { artPatternDef, artPatternRef } from '../render/art.js';
import { renderCutSheet } from '../render/panel.js';
import { makePattern } from '../data/patterns.js';
import { PRODUCTS, THEMES, findProduct, pairedProduct } from '../data/catalog.js';

// ───────────────────────────── constants ─────────────────────────────

const SIZE_LIST = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];
const HEX_TO_BELT = Object.fromEntries(Object.entries(BELT_HEX).map(([k, v]) => [v.toLowerCase(), k]));
const beltFromHex = hex => (hex ? HEX_TO_BELT[String(hex).toLowerCase()] || null : null);

/** IBJJF Art. 8.1.14, verbatim. Never paraphrase this into a rule it does not state. */
const RANK_RULE_TEXT = '"Both genders must wear a shirt of elastic material (skin tight) long enough to cover the torso all the way to the waistband of the shorts, colored black, white, or black and white, and with at least 10% of the rank color(belt) to which the athlete belongs."';

let UID_N = 0;
const nextUid = (prefix = 'p') => `${prefix}${(UID_N++).toString(36)}`;

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ───────────────────────────── rendering helpers ─────────────────────────────

/**
 * Render one product (or its set partner) to an SVG string. Always mints a fresh uid
 * (docs/AGENT-CONTEXT.md rule 2) — never reuse a returned string in two DOM locations.
 */
function renderPiece(product, { view = 'front', colorHex = null, size = 300, detail = 'lite', uidPrefix = 'p', asPartner = false } = {}) {
  const uid = nextUid(uidPrefix);

  if (!asPartner && product.ranked) {
    const belt = colorHex ? (beltFromHex(colorHex) || product.ranked.belt) : product.ranked.belt;
    return renderRanked({ style: product.style, view, belt, uid, size, detail });
  }

  const style = asPartner ? product.partner.style : product.style;
  const slotsSpec = (asPartner ? product.partner.slots : product.slots) || {};
  const artSpecBase = (asPartner ? (product.partner.artSpec || product.artSpec) : product.artSpec);
  const baseColor = colorHex || (asPartner ? (product.partner.baseColor || product.baseColor) : product.baseColor);

  let defs = '';
  const slots = {};
  if (artSpecBase && Object.keys(slotsSpec).length) {
    const effectiveSpec = colorHex ? { ...artSpecBase, colors: [colorHex, ...(artSpecBase.colors || []).slice(1)] } : artSpecBase;
    const art = makePattern(effectiveSpec, 320);
    for (const key of Object.keys(slotsSpec)) {
      if (!slotsSpec[key]) continue;
      const tile = key === 'all';
      const bbox = tile ? undefined : slotBBox(style, view, key);
      defs += artPatternDef({ uid, key, art, tile, bbox, transform: { scale: tile ? 0.65 : 0.92 } });
      slots[key] = artPatternRef({ uid, key });
    }
  }
  return renderGarment({ style, view, baseColor, slots, size, detail, uid, defs });
}

/** Flood any cut with one artSpec — used by the SETS panel to share art across 3 cuts. */
function renderArtPiece({ style, view = 'front', artSpec, baseColor, size = 520, detail = 'full', uidPrefix = 'ap' }) {
  const uid = nextUid(uidPrefix);
  const art = makePattern(artSpec, 320);
  const defs = artPatternDef({ uid, key: 'all', art, tile: true, transform: { scale: 0.65 } });
  return renderGarment({ style, view, baseColor, slots: { all: artPatternRef({ uid, key: 'all' }) }, size, detail, uid, defs });
}

// ───────────────────────────── colourway resolution ─────────────────────────────

function activeColorwayIndex(product) {
  const idx = state.selectedColorway.get(product.id);
  if (idx != null) return idx;
  const hex = String(product.ranked ? BELT_HEX[product.ranked.belt] : (product.artSpec?.colors?.[0] ?? product.baseColor) ?? '').toLowerCase();
  const found = (product.colorways || []).findIndex(c => c.toLowerCase() === hex);
  return found >= 0 ? found : 0;
}
function currentColorHex(product) {
  const idx = state.selectedColorway.get(product.id);
  return idx != null ? (product.colorways?.[idx] ?? null) : null;
}
function colorwayLabel(product, hex) {
  if (product.ranked) { const b = beltFromHex(hex); return b ? `${b[0].toUpperCase()}${b.slice(1)} belt` : hex; }
  return hex;
}
const priceMarkup = product => `$${product.price.amount} sample`;

// ───────────────────────────── collections ─────────────────────────────
// The SHOP flyout replaces the old filter rail: one collection at a time, exactly like
// A&P's /collections/* pages. No multi-facet state, no drawer.

const COLLECTIONS = [
  { key: 'new', label: 'New releases', match: p => (p.badges || []).includes('New') },
  { key: 'all', label: 'All', match: () => true },
  { key: 'ls', label: 'Long sleeve', match: p => p.style === 'ls' },
  { key: 'ss', label: 'Short sleeve', match: p => p.style === 'ss' },
  { key: 'ranked', label: 'Ranked', match: p => p.theme === 'Ranked' },
  { key: 'shorts', label: 'Shorts', match: p => p.style === 'shorts' },
  { key: 'spats', label: 'Spats', match: p => p.style === 'spats' },
  { key: 'sets', label: 'Sets', match: p => p.isSet },
  ...THEMES.filter(t => t !== 'Ranked').map((t, i) => ({
    key: `theme-${t.toLowerCase()}`, label: t, match: p => p.theme === t, rule: i === 0,
  })),
];
const collectionByKey = key => COLLECTIONS.find(c => c.key === key) || COLLECTIONS[1];

// ───────────────────────────── state ─────────────────────────────

const state = {
  collection: 'all',
  sort: 'featured',
  selectedColorway: new Map(),  // productId -> colourway index (only once a shopper picks one)
  cart: [],                     // { productId, name, size, colorHex, priceAmount }
  pdp: null,                    // { product, view }
};

function sortProducts(list) {
  const arr = [...list];
  if (state.sort === 'price-asc') arr.sort((a, b) => a.price.amount - b.price.amount);
  else if (state.sort === 'price-desc') arr.sort((a, b) => b.price.amount - a.price.amount);
  else if (state.sort === 'name-asc') arr.sort((a, b) => a.name.localeCompare(b.name));
  return arr;
}
function currentList() { return sortProducts(PRODUCTS.filter(collectionByKey(state.collection).match)); }

// ───────────────────────────── header ─────────────────────────────

const hdrLinks = document.getElementById('hdrLinks');
const shopMenu = document.getElementById('shopMenu');

hdrLinks.innerHTML = `
  <li><button type="button" id="shopBtn" aria-expanded="false" aria-controls="shopMenu">Shop</button></li>
  <li><a href="#shop" data-collection="ranked">Ranked</a></li>
  <li><a href="#shop" data-collection="sets">Sets</a></li>
  <li><a href="studio.html">Studio</a></li>
  <li><button type="button" id="cartBtn">Cart <span id="cartCount">0</span></button></li>`;

document.getElementById('shopMenuList').innerHTML = COLLECTIONS.map(c =>
  `<li${c.rule ? ' class="is-rule"' : ''}><button type="button" data-collection="${c.key}">${escapeHtml(c.label)}</button></li>`
).join('');

const shopBtn = document.getElementById('shopBtn');
function setShopMenu(open) {
  shopMenu.hidden = !open;
  shopBtn.setAttribute('aria-expanded', String(open));
}
shopBtn.addEventListener('click', (e) => { e.stopPropagation(); setShopMenu(shopMenu.hidden); });
document.addEventListener('click', (e) => {
  if (!shopMenu.hidden && !shopMenu.contains(e.target) && e.target !== shopBtn) setShopMenu(false);
});

// Logo: wordmark.svg is inlined (not <img>) so its `color` can be forced to black — the
// file carries color="#F5F3EE" as a presentation attribute on the <svg> itself, which
// plain inheritance from a parent can never override.
const hdrLogo = document.getElementById('hdrLogo');
fetch('assets/wordmark.svg')
  .then(r => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
  .then(txt => {
    const doc = new DOMParser().parseFromString(txt, 'image/svg+xml');
    const svg = doc.querySelector('svg');
    if (!svg) return;
    svg.removeAttribute('color');
    svg.style.color = '#000';
    svg.setAttribute('aria-hidden', 'true');
    hdrLogo.replaceChildren(svg);
  })
  .catch(() => { /* the text fallback already in the markup stays */ });

// Every [data-collection] control anywhere on the page routes through here.
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-collection]');
  if (!el) return;
  e.preventDefault();
  setShopMenu(false);
  applyCollection(el.dataset.collection);
});

function applyCollection(key) {
  state.collection = key;
  renderGrid();
  document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.getElementById('sampleStripClose').addEventListener('click', () => {
  document.getElementById('sampleStrip').classList.add('is-hidden');
});

// ───────────────────────────── release panels ─────────────────────────────
// A&P's homepage is a stack of full-bleed editorial photographs. We have renders, not
// photography, so each panel is a light stage with 3–5 large garments composed flat-lay
// style. Honest by construction: they are obviously renders.

const PANEL_SIZE = 520;

/**
 * Tight crop boxes per cut, derived from slotBBox(style, view, 'all') plus a small
 * margin for the renderer's own contact shadow (ellipse at cy≈898). The renderer emits a
 * 1000x1000 viewBox with a lot of empty margin; on a full-bleed editorial panel that
 * margin is what makes a 520px render look small. Cropping the viewBox — not scaling the
 * artwork — is what fills the stage.
 */
const CROP = {
  ls:     [90, 178, 820, 760],
  ss:     [165, 178, 670, 760],
  shorts: [232, 215, 536, 723],
  spats:  [325, 186, 350, 752],
};
const aspectOf = style => CROP[style][2] / CROP[style][3];

/**
 * One shared crop for grid cards and the PDP stage: the union of every cut's extents.
 * Using ONE box (rather than the per-cut boxes above) keeps relative scale honest —
 * shorts stay smaller than a long-sleeve instead of being blown up to the same height —
 * while still removing ~35% of the renderer's dead margin.
 */
const GRID_CROP = [90, 175, 820, 765];
const cropUniform = svgString =>
  svgString.replace('viewBox="0 0 1000 1000"', `viewBox="${GRID_CROP.join(' ')}"`);

/** Re-viewBox a render to its crop and drop the fixed width/height so CSS can size it. */
function cropSvg(svgString, style) {
  const [x, y, w, h] = CROP[style];
  return svgString
    .replace(/\swidth="\d+"\sheight="\d+"/, '')
    .replace('viewBox="0 0 1000 1000"', `viewBox="${x} ${y} ${w} ${h}"`);
}

/**
 * One figure in a panel row. flex-grow = aspect ⇒ every figure in the row resolves to the
 * same height. max-width = stageHeight × aspect is the ceiling that keeps that height from
 * exceeding the stage: `max-height` on the <svg> cannot do this job — with width:100%
 * already definite, a percentage max-height squashes the render instead of scaling it.
 */
const fig = (svgString, aspect, cls = '') =>
  `<div class="panel__fig ${cls}" style="flex:${aspect.toFixed(3)} 1 0%;max-width:calc(var(--stage-h) * ${aspect.toFixed(3)})">${svgString}</div>`;

const garmentFig = (svgString, style) => fig(cropSvg(svgString, style), aspectOf(style));

function panelRanked() {
  return ['white', 'blue', 'purple', 'brown', 'black']
    .map(belt => garmentFig(renderRanked({ style: 'ss', view: 'front', belt, uid: nextUid('rk'), size: PANEL_SIZE, detail: 'full' }), 'ss'))
    .join('');
}

function panelSets() {
  // One artSpec across three cuts — the same camo the "Set: Recon Camo" product uses.
  const src = findProduct('set-camo-recon');
  const spec = src.artSpec, base = src.baseColor;
  return ['ss', 'shorts', 'spats']
    .map(style => garmentFig(renderArtPiece({ style, artSpec: spec, baseColor: base, size: PANEL_SIZE, uidPrefix: 'set' }), style))
    .join('');
}

function panelNew() {
  return ['flag-maple-ls', 'halftone-fade-ss', 'brushline-ls']
    .map(id => {
      const p = findProduct(id);
      return garmentFig(renderPiece(p, { view: 'front', size: PANEL_SIZE, detail: 'full', uidPrefix: 'nw' }), p.style);
    }).join('');
}

function panelStudio() {
  const garment = renderGarment({ style: 'ls', view: 'front', baseColor: '#14161b', size: PANEL_SIZE, detail: 'full', uid: nextUid('dy') });
  const sheet = renderCutSheet({ style: 'ls', slots: {}, baseColor: '#14161b', uid: nextUid('cs') });
  const m = sheet.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const sheetAspect = m ? Number(m[1]) / Number(m[2]) : 1.5;
  return garmentFig(garment, 'ls') + fig(sheet, sheetAspect, 'panel__fig--sheet');
}

const PANELS = [
  { caption: 'Ranked', href: '#shop', collection: 'ranked', build: panelRanked },
  { caption: 'Sets', href: '#shop', collection: 'sets', build: panelSets },
  { caption: 'New releases', href: '#shop', collection: 'new', build: panelNew },
  { caption: 'Design your own', href: 'studio.html', collection: null, build: panelStudio },
];

function renderPanels() {
  document.getElementById('panels').innerHTML = PANELS.map(p => `
    <a class="panel${p.collection === 'ranked' ? ' panel--ranked' : ''}" href="${p.href}"${p.collection ? ` data-collection="${p.collection}"` : ''}>
      <div class="panel__stage" aria-hidden="true">${p.build()}</div>
      <span class="panel__caption">${escapeHtml(p.caption)}</span>
    </a>`).join('');
}

// ───────────────────────────── grid ─────────────────────────────

const gridEl = document.getElementById('grid');
const gridCountEl = document.getElementById('gridCount');

/** Front view only — A&P's grid has no hover swap and no second image. */
function itemMediaMarkup(product) {
  const svg = renderPiece(product, { view: 'front', colorHex: currentColorHex(product), size: 300, detail: 'lite', uidPrefix: 'g' });
  return `<div class="item__media">${cropUniform(svg)}</div>`;
}

function renderGrid() {
  const list = currentList();
  gridCountEl.textContent = `${list.length} product${list.length === 1 ? '' : 's'}`;
  if (!list.length) {
    gridEl.innerHTML = `<p class="empty-state">No products in this collection.</p>`;
    return;
  }
  const t0 = performance.now();
  gridEl.innerHTML = list.map(p => `
    <article class="item" data-id="${p.id}">
      ${itemMediaMarkup(p)}
      <p class="item__title"><a href="#p-${p.id}" data-role="open">${escapeHtml(p.name)}</a></p>
      <p class="item__price">${priceMarkup(p)}</p>
    </article>`).join('');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__prodigyStore = window.__prodigyStore || {};
    window.__prodigyStore.lastGridPaintMs = Math.round(performance.now() - t0);
  }));
}

gridEl.addEventListener('click', (e) => {
  const item = e.target.closest('.item');
  if (!item) return;
  const product = findProduct(item.dataset.id);
  if (!product) return;
  const opener = e.target.closest('[data-role="open"]');
  if (opener) e.preventDefault();
  openPDP(product);
});

document.getElementById('sortSelect').addEventListener('change', (e) => { state.sort = e.target.value; renderGrid(); });

// ───────────────────────────── footer ─────────────────────────────

document.getElementById('ftrLinks').innerHTML = `
  <li><a href="#shop" data-collection="all">Shop</a></li>
  <li><a href="studio.html">Studio</a></li>
  <li><a href="#policies" data-policy="shipping">Shipping (sample)</a></li>
  <li><a href="#policies" data-policy="returns">Returns (sample)</a></li>
  <li><a href="#policies" data-policy="sizing">Sizing (sample)</a></li>
  <li><a href="https://instagram.com/prodigy_athletics_canada" target="_blank" rel="noopener">@prodigy_athletics_canada</a></li>`;

document.getElementById('ftrSignup').addEventListener('submit', (e) => {
  e.preventDefault();   // inert by design — there is no list behind this field
});

// ───────────────────────────── cart (demo) ─────────────────────────────

const overlay = document.getElementById('drawerOverlay');
const cartDrawer = document.getElementById('cartDrawer');
const cartCountEl = document.getElementById('cartCount');

function openCart() {
  renderCartDrawer();
  cartDrawer.classList.add('is-open');
  cartDrawer.setAttribute('aria-hidden', 'false');
  overlay.classList.add('is-open');
}
function closeCart() {
  cartDrawer.classList.remove('is-open');
  cartDrawer.setAttribute('aria-hidden', 'true');
  overlay.classList.remove('is-open');
}
document.getElementById('cartBtn').addEventListener('click', openCart);
document.getElementById('cartClose').addEventListener('click', closeCart);
overlay.addEventListener('click', closeCart);

function addToCart(product, size, colorHex) {
  state.cart.push({ productId: product.id, name: product.name, size, colorHex, priceAmount: product.price.amount, ranked: !!product.ranked });
  updateCartCount();
}
function removeFromCart(i) { state.cart.splice(i, 1); updateCartCount(); renderCartDrawer(); }
function updateCartCount() { cartCountEl.textContent = String(state.cart.length); }

function renderCartDrawer() {
  const body = document.getElementById('cartDrawerBody');
  if (!state.cart.length) {
    body.innerHTML = `<p class="cart-empty"><strong>Demo cart — checkout not connected.</strong>Add a size from any product to see it listed here. Nothing on this page can be purchased; there is no payment or shipping behind it.</p>`;
    return;
  }
  const lines = state.cart.map((line, i) => {
    const product = findProduct(line.productId);
    const svg = product ? renderPiece(product, { view: 'front', colorHex: line.colorHex, size: 120, detail: 'lite', uidPrefix: 'cart' }) : '';
    const colorNote = line.ranked ? colorwayLabel(product, line.colorHex) : '';
    return `<div class="cart-line">
      <div class="cart-line__thumb">${svg}</div>
      <div class="cart-line__meta">
        <b>${escapeHtml(line.name)}</b>
        <span>Size ${escapeHtml(line.size)}${colorNote ? ' · ' + escapeHtml(colorNote) : ''} · $${line.priceAmount} sample</span>
      </div>
      <button class="cart-line__remove" data-remove="${i}" aria-label="Remove">&times;</button>
    </div>`;
  }).join('');
  const subtotal = state.cart.reduce((s, l) => s + l.priceAmount, 0);
  body.innerHTML = `${lines}
    <p class="cart-total">Subtotal: $${subtotal} sample</p>
    <p class="cart-empty"><strong>Demo cart — checkout not connected.</strong>This total is illustrative only.</p>`;
  body.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', () => removeFromCart(Number(b.dataset.remove))));
}

// ───────────────────────────── PDP ─────────────────────────────

const pdpOverlay = document.getElementById('pdpOverlay');
const pdpBody = document.getElementById('pdpBody');
document.getElementById('pdpClose').addEventListener('click', closePDP);
pdpOverlay.addEventListener('click', (e) => { if (e.target === pdpOverlay) closePDP(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closePDP(); closeCart(); setShopMenu(false); } });

let pdpReturnFocus = null;
function openPDP(product) {
  pdpReturnFocus = document.activeElement;
  state.pdp = { product, view: 'front', size: SIZE_LIST[2] };
  renderPDP();
  pdpOverlay.classList.add('is-open');
  document.getElementById('pdpClose')?.focus();
}
function closePDP() {
  if (!pdpOverlay.classList.contains('is-open')) return;
  pdpOverlay.classList.remove('is-open');
  state.pdp = null;
  if (pdpReturnFocus && typeof pdpReturnFocus.focus === 'function') pdpReturnFocus.focus();
  pdpReturnFocus = null;
}
// keep Tab inside the open dialog
pdpOverlay.addEventListener('keydown', (e) => {
  if (e.key !== 'Tab' || !pdpOverlay.classList.contains('is-open')) return;
  const f = [...pdpOverlay.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')]
    .filter(el => !el.disabled && el.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});

const CHEV_LEFT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 5 8 12 15 19"/></svg>`;
const CHEV_RIGHT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 5 16 12 9 19"/></svg>`;

function cutNoun(style) {
  return style === 'shorts' ? 'grappling shorts' : style === 'spats' ? 'spats' : 'rashguards';
}

function renderPDP() {
  const { product, view } = state.pdp;
  const colorHex = currentColorHex(product);
  const main = cropUniform(renderPiece(product, { view, colorHex, size: 800, detail: 'full', uidPrefix: 'main' }));
  const paired = pairedProduct(product);

  const sleeveField = paired ? `
    <div class="pdp__field">
      <label for="pdpSleeve">Sleeve</label>
      <select id="pdpSleeve">
        <option value="${product.style === 'ls' ? product.id : paired.id}" ${product.style === 'ls' ? 'selected' : ''}>Long sleeve</option>
        <option value="${product.style === 'ss' ? product.id : paired.id}" ${product.style === 'ss' ? 'selected' : ''}>Short sleeve</option>
      </select>
    </div>` : '';

  const sizeField = `
    <div class="pdp__field">
      <label for="pdpSize">Size</label>
      <select id="pdpSize">${SIZE_LIST.map(s => `<option ${s === state.pdp.size ? 'selected' : ''}>${s}</option>`).join('')}</select>
    </div>`;

  const colorField = (product.colorways || []).length ? `
    <div class="pdp__field">
      <label for="pdpColor">Colourway</label>
      <select id="pdpColor">${(product.colorways || []).map((hex, i) =>
        `<option value="${i}" ${i === activeColorwayIndex(product) ? 'selected' : ''}>${escapeHtml(colorwayLabel(product, hex))}</option>`).join('')}</select>
    </div>` : '';

  const rankCopy = product.ranked ? `
    <p><b>Rank colour (IBJJF Art. 8.1.14) —</b> Approx. ${Math.round(estimateCoverage(product) * 100)}% rank colour on this construction; IBJJF Art. 8.1.14 requires at least 10%. The rule reads: ${escapeHtml(RANK_RULE_TEXT)}</p>
    <p class="pdp__muted">That percentage is an approx. area estimate from the garment geometry, not a measurement of a physical sample, and it is not a legality ruling — inspection at weigh-in is a visual judgment call by tournament officials.</p>` : '';

  const bundleCopy = product.isSet ? `
    <p><b>In this set —</b> ${product.partner.style === 'shorts' ? 'grappling shorts' : 'spats'} in the same artwork, included; the $${product.price.amount} sample price covers both pieces.</p>` : '';

  pdpBody.innerHTML = `
    <div class="pdp__gallery">
      <div class="pdp__stage">
        ${main}
        <button class="pdp__chev pdp__chev--prev" data-view="${view === 'front' ? 'back' : 'front'}" aria-label="Previous view">${CHEV_LEFT}</button>
        <button class="pdp__chev pdp__chev--next" data-view="${view === 'front' ? 'back' : 'front'}" aria-label="Next view">${CHEV_RIGHT}</button>
        <span class="pdp__viewlabel">${view === 'front' ? 'Front' : 'Back'}</span>
      </div>
    </div>
    <div class="pdp__info">
      <h1 class="pdp__title" id="pdpTitle">${escapeHtml(product.name)}</h1>
      <p class="pdp__price">${priceMarkup(product)}</p>
      <div class="pdp__fields">${sleeveField}${sizeField}${colorField}</div>
      <button class="pdp__add" id="pdpAddBtn">Add to cart (demo)</button>
      <div class="pdp__copy">
        <p class="pdp__muted">Demo cart — checkout is not connected. Nothing here can be purchased.</p>
        <p><b>Fabric &amp; fit —</b> Sample text; fabric and fit spec to be confirmed by Prodigy Athletics. Category default for sublimated ${cutNoun(product.style)}: 100% polyester, dye-sublimated${product.style === 'shorts' ? '' : ', compression fit — size up for a looser fit'}. Sizes XS–4XL.</p>
        <p><b>Shipping —</b> Sample text; shipping policy to be confirmed by Prodigy Athletics.</p>
        <p><b>Returns —</b> Sample text; returns policy to be confirmed by Prodigy Athletics.</p>
        ${bundleCopy}
        ${rankCopy}
        <p class="pdp__muted">This image is a live render from our design tool, not a photograph of a finished garment.</p>
        <a class="pdp__studio-link" href="studio.html">Customise this design in the Studio →</a>
      </div>
    </div>`;

  pdpBody.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => { state.pdp.view = b.dataset.view; renderPDP(); }));
  pdpBody.querySelector('#pdpSize')?.addEventListener('change', (e) => { state.pdp.size = e.target.value; });
  pdpBody.querySelector('#pdpColor')?.addEventListener('change', (e) => {
    state.selectedColorway.set(product.id, Number(e.target.value));
    renderPDP();
    renderGrid();
  });
  pdpBody.querySelector('#pdpSleeve')?.addEventListener('change', (e) => {
    const p2 = findProduct(e.target.value);
    if (p2 && p2.id !== product.id) { state.pdp = { product: p2, view: state.pdp.view, size: state.pdp.size }; renderPDP(); }
  });
  pdpBody.querySelector('#pdpAddBtn')?.addEventListener('click', (e) => {
    addToCart(product, state.pdp.size, colorHex);
    const btn = e.currentTarget, orig = btn.textContent;
    btn.textContent = 'Added ✓';
    setTimeout(() => { btn.textContent = orig; }, 1000);
  });
}

function estimateCoverage(product) {
  // Delegates to garment.js's own estimator (the same construction renderRanked uses).
  const slotsPainted = product.style === 'shorts' || product.style === 'spats' ? ['waistband'] : ['sleeveL', 'sleeveR', 'collar'];
  return estimateRankCoverage({ style: product.style, slotsPainted });
}

// ───────────────────────────── init ─────────────────────────────

renderPanels();
renderGrid();
updateCartCount();
