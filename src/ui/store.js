/**
 * store.js — Prodigy Athletics storefront (SAMPLE). Wires src/data/catalog.js +
 * src/data/patterns.js through src/render/garment.js into the grid / filters / PDP /
 * cart-count UI in index.html. No backend, no checkout — this is a relaunch showcase.
 *
 * Every product image is produced by renderGarment()/renderRanked() at call time. There
 * is no photography anywhere in this file.
 */

import { renderGarment, renderRanked, slotBBox, BELT_HEX, estimateRankCoverage } from '../render/garment.js';
import { artPatternDef, artPatternRef } from '../render/art.js';
import { svgToPng } from '../render/export.js';
import { makePattern } from '../data/patterns.js';
import { PRODUCTS, THEMES, CUTS, GENDERS, findProduct, pairedProduct } from '../data/catalog.js';

// ───────────────────────────── constants ─────────────────────────────

const SIZE_LIST = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];
const BELTS = ['white', 'blue', 'purple', 'brown', 'black'];
const HEX_TO_BELT = Object.fromEntries(Object.entries(BELT_HEX).map(([k, v]) => [v.toLowerCase(), k]));
const beltFromHex = hex => (hex ? HEX_TO_BELT[String(hex).toLowerCase()] || null : null);

const RANK_RULE_TEXT = '"Both genders must wear a shirt of elastic material (skin tight) long enough to cover the torso all the way to the waistband of the shorts, colored black, white, or black and white, and with at least 10% of the rank color(belt) to which the athlete belongs."';

let UID_N = 0;
const nextUid = (prefix = 'p') => `${prefix}${(UID_N++).toString(36)}`;

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ───────────────────────────── rendering ─────────────────────────────

/**
 * Render one product (or its set partner) to an SVG string. Always mints a fresh uid
 * (see docs/AGENT-CONTEXT.md rule 2) — never reuse a returned string in two DOM
 * locations at once, call this again instead.
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

function cardSvgs(product, colorHex) {
  return {
    front: renderPiece(product, { view: 'front', colorHex, size: 300, detail: 'lite', uidPrefix: 'c' }),
    back: renderPiece(product, { view: 'back', colorHex, size: 300, detail: 'lite', uidPrefix: 'c' }),
  };
}

function zoomSvg(svgString, [x, y, w, h]) {
  const f = n => Math.round(n * 10) / 10;
  return svgString.replace('viewBox="0 0 1000 1000"', `viewBox="${f(x)} ${f(y)} ${f(w)} ${f(h)}"`);
}
/** A generic "zoom toward the upper-centre of the garment" crop for the PDP detail thumb. */
function detailCropBox(style, view) {
  const [x, y, w, h] = slotBBox(style, view, 'all');
  const cx = x + w / 2, cy = y + h * 0.34;
  const zw = w * 0.42, zh = h * 0.42;
  return [cx - zw / 2, cy - zh / 2, zw, zh];
}

// ───────────────────────────── colourway resolution ─────────────────────────────
// selectedColorway is unset (authored default) until a shopper actually clicks a dot —
// this avoids collapsing a two-tone design (e.g. black body / red sleeve accent) to a
// flat single hue before anyone has asked for a recolour.

function effectiveHex(product) {
  const idx = state.selectedColorway.get(product.id);
  if (idx != null) return product.colorways?.[idx] ?? null;
  if (product.ranked) return BELT_HEX[product.ranked.belt];
  return product.artSpec?.colors?.[0] ?? product.baseColor;
}
function activeColorwayIndex(product) {
  const idx = state.selectedColorway.get(product.id);
  if (idx != null) return idx;
  const hex = String(effectiveHex(product) || '').toLowerCase();
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

// ───────────────────────────── state ─────────────────────────────

const state = {
  filters: { cuts: new Set(), themes: new Set(), genders: new Set(), colors: new Set() },
  openGroups: new Set(['cut', 'theme']),
  query: '',
  sort: 'featured',
  selectedColorway: new Map(),  // productId -> colourway index (only once user picks one)
  cart: [],                     // { productId, name, size, colorHex, priceAmount }
  pdp: null,                    // { product, activeThumb }
};

const priceLabel = a => `$${a} CAD`;
const ALL_COLOR_HEX = [...new Set(PRODUCTS.flatMap(p => p.colorways || []).map(h => h.toLowerCase()))].slice(0, 14);
const PRICE_MIN = Math.min(...PRODUCTS.map(p => p.price.amount));
const PRICE_MAX = Math.max(...PRODUCTS.map(p => p.price.amount));

// ───────────────────────────── filtering / sorting ─────────────────────────────

function productMatchesDim(p, dim, value) {
  if (dim === 'cuts') return value === 'sets' ? p.isSet : p.style === value;
  if (dim === 'themes') return p.theme === value;
  if (dim === 'genders') return p.gender === value;
  if (dim === 'colors') return (p.colorways || []).some(c => c.toLowerCase() === value);
  return true;
}

function matchesFilters(p, excludeDim) {
  const f = state.filters;
  if (excludeDim !== 'cuts' && f.cuts.size && ![...f.cuts].some(v => productMatchesDim(p, 'cuts', v))) return false;
  if (excludeDim !== 'themes' && f.themes.size && !f.themes.has(p.theme)) return false;
  if (excludeDim !== 'genders' && f.genders.size && !f.genders.has(p.gender)) return false;
  if (excludeDim !== 'colors' && f.colors.size && !(p.colorways || []).some(c => f.colors.has(c.toLowerCase()))) return false;
  if (f.priceMax != null && p.price.amount > f.priceMax) return false;
  if (state.query) {
    const hay = `${p.name} ${p.theme} ${p.gender} ${p.style} ${p.isSet ? 'set' : ''}`.toLowerCase();
    if (!hay.includes(state.query)) return false;
  }
  return true;
}

function countFor(dim, value) {
  return PRODUCTS.filter(p => matchesFilters(p, dim) && productMatchesDim(p, dim, value)).length;
}

function sortProducts(list) {
  const arr = [...list];
  if (state.sort === 'price-asc') arr.sort((a, b) => a.price.amount - b.price.amount);
  else if (state.sort === 'price-desc') arr.sort((a, b) => b.price.amount - a.price.amount);
  else if (state.sort === 'name-asc') arr.sort((a, b) => a.name.localeCompare(b.name));
  return arr;
}

function currentList() { return sortProducts(PRODUCTS.filter(p => matchesFilters(p))); }

// ───────────────────────────── card markup ─────────────────────────────

function badgesMarkup(product) {
  const cls = { New: 'badge--new', 'Best seller': 'badge--bestseller', Sale: 'badge--sale' };
  const specific = (product.badges || []).map(b => {
    if (b === 'Sale' && product.price.compareAt) {
      const save = product.price.compareAt - product.price.amount;
      return `<span class="badge ${cls[b]}">Save $${save}</span>`;
    }
    return `<span class="badge ${cls[b] || ''}">${b}</span>`;
  }).join('');
  return `${specific}<span class="badge badge--sample" title="Sample data — not a real product listing">Sample</span>`;
}

function priceMarkup(product) {
  const { amount, compareAt } = product.price;
  const was = compareAt ? `<span class="was">$${compareAt}</span>` : '';
  return `${was}$${amount} <span class="sample-tag" title="Sample pricing — real prices to be confirmed by Prodigy Athletics">sample</span>`;
}

function colorDotsMarkup(product) {
  const activeIdx = activeColorwayIndex(product);
  return (product.colorways || []).map((hex, i) =>
    `<button class="dot ${i === activeIdx ? 'is-active' : ''}" style="background:${hex}" data-idx="${i}" aria-label="${escapeHtml(colorwayLabel(product, hex))}" title="${escapeHtml(colorwayLabel(product, hex))}"></button>`
  ).join('');
}

function quickAddMarkup() {
  return SIZE_LIST.map(s => `<button class="qsize" data-size="${s}">${s}</button>`).join('');
}

function mediaMarkup(product) {
  const colorHex = currentColorHex(product);
  if (product.isSet) {
    const topF = renderPiece(product, { view: 'front', colorHex, size: 300, detail: 'lite', uidPrefix: 'st' });
    const topB = renderPiece(product, { view: 'back', colorHex, size: 300, detail: 'lite', uidPrefix: 'st' });
    const botF = renderPiece(product, { view: 'front', colorHex, size: 300, detail: 'lite', uidPrefix: 'sb', asPartner: true });
    const botB = renderPiece(product, { view: 'back', colorHex, size: 300, detail: 'lite', uidPrefix: 'sb', asPartner: true });
    return `<div class="card__front card__front--set"><div class="set-half">${topF}</div><div class="set-half">${botF}</div></div>
            <div class="card__back card__back--set"><div class="set-half">${topB}</div><div class="set-half">${botB}</div></div>`;
  }
  const { front, back } = cardSvgs(product, colorHex);
  return `<div class="card__front">${front}</div><div class="card__back">${back}</div>`;
}

function buildCardEl(product) {
  const el = document.createElement('article');
  el.className = 'card';
  el.dataset.id = product.id;
  el.innerHTML = `
    <div class="card__media">
      <div class="card__badges">${badgesMarkup(product)}</div>
      ${mediaMarkup(product)}
      <div class="card__quickadd">${quickAddMarkup()}</div>
    </div>
    <div class="card__info">
      <p class="card__title"><a href="#p-${product.id}" data-role="open">${escapeHtml(product.name)}</a></p>
      <p class="card__price">${priceMarkup(product)}</p>
      <div class="card__dots">${colorDotsMarkup(product)}</div>
    </div>`;
  return el;
}

function refreshCardMedia(el, product) {
  const media = el.querySelector('.card__media');
  const badges = media.querySelector('.card__badges');
  const quickadd = media.querySelector('.card__quickadd');
  media.querySelectorAll('.card__front, .card__back').forEach(n => n.remove());
  badges.insertAdjacentHTML('afterend', mediaMarkup(product));
  void quickadd; // unchanged — still the last child, after the freshly-inserted front/back
  el.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('is-active', i === activeColorwayIndex(product)));
}

// ───────────────────────────── grid ─────────────────────────────

const gridEl = document.getElementById('grid');
const gridCountEl = document.getElementById('gridCount');
const perfNoteEl = document.getElementById('perfNote');
const pngCache = new Map(); // `${id}|${idx}` -> { frontUrl, backUrl }

function renderGrid() {
  const list = currentList();
  gridCountEl.textContent = `${list.length} product${list.length === 1 ? '' : 's'}`;
  if (!list.length) {
    gridEl.replaceChildren();
    gridEl.insertAdjacentHTML('beforeend', `<div class="empty-state">No products match these filters.<br><button class="clear-filters" data-clear style="margin-top:10px">Clear filters</button></div>`);
    perfNoteEl.textContent = '';
    return;
  }
  const t0 = performance.now();
  const frag = document.createDocumentFragment();
  const cards = [];
  for (const p of list) { const el = buildCardEl(p); frag.appendChild(el); cards.push(el); }
  gridEl.replaceChildren(frag);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const paintMs = Math.round(performance.now() - t0);
    window.__prodigyStore = window.__prodigyStore || {};
    window.__prodigyStore.lastGridPaintMs = paintMs;
    const svgCount = cards.reduce((n, el) => n + el.querySelectorAll('svg').length, 0);
    perfNoteEl.textContent = `Grid rendered ${cards.length} product cards (${svgCount} SVGs) in ${paintMs} ms.`;
    if (paintMs > 400) rasterizeGrid(cards, list);
  }));
}

async function rasterizeGrid(cards, list) {
  await Promise.all(cards.map(async (el, i) => {
    const product = list[i];
    if (product.isSet) return; // two-garment cards aren't rasterised — keep them live SVG
    const idx = activeColorwayIndex(product);
    const key = `${product.id}|${idx}`;
    let entry = pngCache.get(key);
    if (!entry) {
      const colorHex = currentColorHex(product);
      const { front, back } = cardSvgs(product, colorHex);
      try {
        const [fBlob, bBlob] = await Promise.all([svgToPng(front, { width: 600 }), svgToPng(back, { width: 600 })]);
        entry = { frontUrl: URL.createObjectURL(fBlob), backUrl: URL.createObjectURL(bBlob) };
        pngCache.set(key, entry);
      } catch { return; }
    }
    const frontHost = el.querySelector('.card__front');
    const backHost = el.querySelector('.card__back');
    if (frontHost) frontHost.innerHTML = `<img src="${entry.frontUrl}" alt="">`;
    if (backHost) backHost.innerHTML = `<img src="${entry.backUrl}" alt="">`;
  }));
  window.__prodigyStore.rasterized = true;
  window.__prodigyStore.rasterizedAt = Math.round(performance.now());
}

gridEl.addEventListener('click', (e) => {
  const clearBtn = e.target.closest('[data-clear]');
  if (clearBtn) { clearFilters(); return; }

  const card = e.target.closest('.card');
  if (!card) return;
  const product = findProduct(card.dataset.id);
  if (!product) return;

  const dot = e.target.closest('.dot');
  if (dot) { e.stopPropagation(); state.selectedColorway.set(product.id, Number(dot.dataset.idx)); refreshCardMedia(card, product); return; }

  const qsize = e.target.closest('.qsize');
  if (qsize) { e.stopPropagation(); addToCart(product, qsize.dataset.size); flashAdded(qsize); return; }

  if (e.target.closest('.card__quickadd')) return;

  const media = e.target.closest('.card__media');
  const opener = e.target.closest('[data-role="open"]');
  if (media || opener) {
    if (opener) e.preventDefault();
    if (media && isTouch() && !card.classList.contains('touch-flip')) { card.classList.add('touch-flip'); return; }
    openPDP(product);
  }
});

function isTouch() { return typeof matchMedia === 'function' && matchMedia('(hover: none)').matches; }

function flashAdded(btn) {
  const original = btn.textContent;
  btn.textContent = '✓';
  btn.disabled = true;
  setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 900);
}

// ───────────────────────────── filters ─────────────────────────────

function fopt(dim, value, label) {
  const active = state.filters[dim].has(value);
  const count = countFor(dim, value);
  const disabled = count === 0 && !active ? 'style="opacity:.45"' : '';
  return `<label class="fopt" ${disabled}><input type="checkbox" data-dim="${dim}" data-value="${escapeHtml(value)}" ${active ? 'checked' : ''}> ${escapeHtml(label)} <span class="fopt__count">${count}</span></label>`;
}
function swatchBtn(hex) {
  const active = state.filters.colors.has(hex);
  return `<button class="fswatch ${active ? 'is-active' : ''}" style="background:${hex}" data-dim="colors" data-value="${hex}" title="${hex}"></button>`;
}

function buildFilterHTML() {
  const open = g => state.openGroups.has(g) ? 'is-open' : '';
  const chevron = `<svg class="fgroup__chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>`;
  const priceMax = state.filters.priceMax ?? PRICE_MAX;
  return `
  <div class="fgroup ${open('cut')}" data-fg="cut">
    <button class="fgroup__head" data-toggle>Cut ${chevron}</button>
    <div class="fgroup__body">${CUTS.map(c => fopt('cuts', c.key, c.label)).join('')}</div>
  </div>
  <div class="fgroup ${open('theme')}" data-fg="theme">
    <button class="fgroup__head" data-toggle>Theme ${chevron}</button>
    <div class="fgroup__body">${THEMES.map(t => fopt('themes', t, t)).join('')}</div>
  </div>
  <div class="fgroup ${open('gender')}" data-fg="gender">
    <button class="fgroup__head" data-toggle>Gender ${chevron}</button>
    <div class="fgroup__body">${GENDERS.map(g => fopt('genders', g, g)).join('')}</div>
  </div>
  <div class="fgroup ${open('color')}" data-fg="color">
    <button class="fgroup__head" data-toggle>Colour ${chevron}</button>
    <div class="fgroup__body"><div class="fswatches">${ALL_COLOR_HEX.map(swatchBtn).join('')}</div></div>
  </div>
  <div class="fgroup ${open('size')}" data-fg="size">
    <button class="fgroup__head" data-toggle>Size ${chevron}</button>
    <div class="fgroup__body">
      <div class="fsizes">${SIZE_LIST.map(s => `<span class="fsize">${s}</span>`).join('')}</div>
      <p class="search-hint" style="margin-top:8px">Display only — every size is in stock for every design.</p>
    </div>
  </div>
  <div class="fgroup ${open('price')}" data-fg="price">
    <button class="fgroup__head" data-toggle>Price ${chevron}</button>
    <div class="fgroup__body">
      <div class="fprice">
        <input type="range" min="${PRICE_MIN}" max="${PRICE_MAX}" step="1" value="${priceMax}" data-price-range style="width:100%">
        <span class="text-sm">Up to $${priceMax} sample</span>
      </div>
    </div>
  </div>
  <button class="clear-filters" data-clear>Clear filters</button>`;
}

const filterRailDesktop = document.getElementById('filterRailDesktop');
const filterDrawerBody = document.getElementById('filterDrawerBody');

function renderFilters() {
  const html = buildFilterHTML();
  filterRailDesktop.innerHTML = html;
  filterDrawerBody.innerHTML = html;
}

function wireFilterContainer(container) {
  container.addEventListener('click', (e) => {
    const head = e.target.closest('[data-toggle]');
    if (head) {
      const fg = head.closest('.fgroup').dataset.fg;
      state.openGroups.has(fg) ? state.openGroups.delete(fg) : state.openGroups.add(fg);
      renderFilters();
      return;
    }
    const sw = e.target.closest('button[data-dim][data-value]');
    if (sw) { toggleFilter(sw.dataset.dim, sw.dataset.value); return; }
    if (e.target.closest('[data-clear]')) { clearFilters(); return; }
  });
  container.addEventListener('change', (e) => {
    const cb = e.target.closest('input[type="checkbox"][data-dim]');
    if (cb) toggleFilter(cb.dataset.dim, cb.dataset.value);
  });
  container.addEventListener('input', (e) => {
    const range = e.target.closest('[data-price-range]');
    if (range) { state.filters.priceMax = Number(range.value); renderFilters(); renderGrid(); }
  });
}
function toggleFilter(dim, value) {
  const s = state.filters[dim];
  s.has(value) ? s.delete(value) : s.add(value);
  renderFilters(); renderGrid();
}
function clearFilters() {
  state.filters = { cuts: new Set(), themes: new Set(), genders: new Set(), colors: new Set() };
  state.query = '';
  const si = document.getElementById('searchInput'); if (si) si.value = '';
  renderFilters(); renderGrid();
}
wireFilterContainer(filterRailDesktop);
wireFilterContainer(filterDrawerBody);

document.getElementById('sortSelect').addEventListener('change', (e) => { state.sort = e.target.value; renderGrid(); });

// ───────────────────────────── nav / drawers / tiles / footer ─────────────────────────────

const CATEGORY_LINKS = [
  { label: 'Long sleeve', cut: 'ls' },
  { label: 'Short sleeve', cut: 'ss' },
  { label: 'Ranked', theme: 'Ranked' },
  { label: 'Shorts', cut: 'shorts' },
  { label: 'Spats', cut: 'spats' },
  { label: 'Sets', cut: 'sets' },
];

function catLinkAttrs(link) {
  const attrs = [];
  if (link.cut) attrs.push(`data-set-cut="${link.cut}"`);
  if (link.theme) attrs.push(`data-set-theme="${link.theme}"`);
  return attrs.join(' ');
}

document.getElementById('navRowList').innerHTML =
  CATEGORY_LINKS.map(l => `<li><a href="#shop" ${catLinkAttrs(l)}>${l.label}</a></li>`).join('') +
  `<li><a href="studio.html">Design your own</a></li>`;

document.getElementById('drawerNavTree').innerHTML =
  CATEGORY_LINKS.map(l => `<li><a href="#shop" ${catLinkAttrs(l)}>${l.label}</a></li>`).join('') +
  `<li><a href="studio.html">Design your own</a></li>`;

document.getElementById('footerShopList').innerHTML =
  CATEGORY_LINKS.map(l => `<li><a href="#shop" ${catLinkAttrs(l)}>${l.label}</a></li>`).join('');

// Category tiles — one representative render each
const TILE_DEFS = [
  { label: 'Long sleeve', cut: 'ls', render: () => renderGarment_LSTile() },
  { label: 'Short sleeve', cut: 'ss', render: () => renderTileFor('current-waves-ss') },
  { label: 'Ranked', theme: 'Ranked', render: () => renderRanked({ style: 'ss', view: 'front', belt: 'black', uid: nextUid('tile'), size: 260, detail: 'lite' }) },
  { label: 'Shorts', cut: 'shorts', render: () => renderTileFor('prism-grid-shorts') },
  { label: 'Spats', cut: 'spats', render: () => renderTileFor('tide-waves-spats') },
  { label: 'Sets', cut: 'sets', render: () => renderTileFor('set-camo-recon') },
];
function renderGarment_LSTile() { return renderTileFor('fracture-geo-ls'); }
function renderTileFor(id) {
  const p = findProduct(id);
  return renderPiece(p, { view: 'front', size: 260, detail: 'lite', uidPrefix: 'tile' });
}
document.getElementById('tiles').innerHTML = TILE_DEFS.map(t =>
  `<a class="tile" href="#shop" ${catLinkAttrs(t)}>${t.render()}<span class="tile__label">${t.label}</span></a>`
).join('');

function applyCategoryLink(el) {
  clearFiltersSilent();
  const cut = el.dataset.setCut, theme = el.dataset.setTheme;
  if (cut) state.filters.cuts.add(cut);
  if (theme) state.filters.themes.add(theme);
  renderFilters(); renderGrid();
  closeAllDrawers();
  document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function clearFiltersSilent() {
  state.filters = { cuts: new Set(), themes: new Set(), genders: new Set(), colors: new Set() };
}
document.addEventListener('click', (e) => {
  const link = e.target.closest('[data-set-cut],[data-set-theme]');
  if (link) { e.preventDefault(); applyCategoryLink(link); }
});

// hero background render
document.getElementById('heroBg').innerHTML = renderRanked({ style: 'ls', view: 'front', belt: 'blue', uid: nextUid('hero'), size: 900, detail: 'full' });

// ── drawers ──
const overlay = document.getElementById('drawerOverlay');
const drawers = { nav: document.getElementById('navDrawer'), search: document.getElementById('searchDrawer'), cart: document.getElementById('cartDrawer'), filter: document.getElementById('filterDrawer') };
function openDrawer(name) {
  closeAllDrawers();
  drawers[name].classList.add('is-open');
  drawers[name].setAttribute('aria-hidden', 'false');
  overlay.classList.add('is-open');
}
function closeAllDrawers() {
  Object.values(drawers).forEach(d => { d.classList.remove('is-open'); d.setAttribute('aria-hidden', 'true'); });
  overlay.classList.remove('is-open');
}
document.getElementById('hamburgerBtn').addEventListener('click', () => openDrawer('nav'));
document.getElementById('searchBtn').addEventListener('click', () => { openDrawer('search'); document.getElementById('searchInput').focus(); });
document.getElementById('cartBtn').addEventListener('click', () => { renderCartDrawer(); openDrawer('cart'); });
document.getElementById('filterToggleBtn').addEventListener('click', () => openDrawer('filter'));
overlay.addEventListener('click', closeAllDrawers);
document.querySelectorAll('[data-close-drawer]').forEach(b => b.addEventListener('click', closeAllDrawers));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeAllDrawers(); closePDP(); } });

document.getElementById('searchInput').addEventListener('input', (e) => {
  state.query = e.target.value.trim().toLowerCase();
  renderGrid();
});

// announcement bar
document.getElementById('annbarClose').addEventListener('click', () => {
  document.getElementById('annbar').classList.add('is-hidden');
});

// ───────────────────────────── cart ─────────────────────────────

const cartCountEl = document.getElementById('cartCount');
function addToCart(product, size, colorHexOverride) {
  const colorHex = colorHexOverride !== undefined ? colorHexOverride : currentColorHex(product);
  state.cart.push({ productId: product.id, name: product.name, size, colorHex, priceAmount: product.price.amount, ranked: !!product.ranked });
  updateCartCount();
}
function removeFromCart(index) { state.cart.splice(index, 1); updateCartCount(); renderCartDrawer(); }
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
      <div style="width:56px;height:56px;background:#fff;border-radius:4px;overflow:hidden;flex:none">${svg}</div>
      <div class="cart-line__meta">
        <b>${escapeHtml(line.name)}</b>
        <span>Size ${line.size}${colorNote ? ' · ' + escapeHtml(colorNote) : ''} · $${line.priceAmount} sample</span>
      </div>
      <button class="icon-btn" data-remove="${i}" aria-label="Remove" style="width:26px;height:26px">&times;</button>
    </div>`;
  }).join('');
  const subtotal = state.cart.reduce((s, l) => s + l.priceAmount, 0);
  body.innerHTML = `${lines}
    <p style="margin-top:14px;font-size:13px"><strong>Subtotal: $${subtotal} sample</strong></p>
    <p class="cart-empty" style="margin-top:6px"><strong>Demo cart — checkout not connected.</strong>This total is illustrative only.</p>`;
  body.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', () => removeFromCart(Number(b.dataset.remove))));
}

// ───────────────────────────── PDP ─────────────────────────────

const pdpOverlay = document.getElementById('pdpOverlay');
const pdpBody = document.getElementById('pdpBody');
document.getElementById('pdpClose').addEventListener('click', closePDP);
pdpOverlay.addEventListener('click', (e) => { if (e.target === pdpOverlay) closePDP(); });

function openPDP(product) {
  state.pdp = { product, activeThumb: 'front', size: SIZE_LIST[2] };
  renderPDP();
  pdpOverlay.classList.add('is-open');
}
function closePDP() { pdpOverlay.classList.remove('is-open'); state.pdp = null; }

function renderPDP() {
  const { product, activeThumb } = state.pdp;
  const colorHex = currentColorHex(product);

  const thumbFront = renderPiece(product, { view: 'front', colorHex, size: 200, detail: 'lite', uidPrefix: 'th' });
  const thumbBack = renderPiece(product, { view: 'back', colorHex, size: 200, detail: 'lite', uidPrefix: 'th' });
  const thumbDetail = zoomSvg(renderPiece(product, { view: 'front', colorHex, size: 200, detail: 'lite', uidPrefix: 'th' }), detailCropBox(product.style, 'front'));
  let main;
  if (activeThumb === 'back') main = renderPiece(product, { view: 'back', colorHex, size: 800, detail: 'full', uidPrefix: 'main' });
  else if (activeThumb === 'detail') main = zoomSvg(renderPiece(product, { view: 'front', colorHex, size: 800, detail: 'full', uidPrefix: 'main' }), detailCropBox(product.style, 'front'));
  else main = renderPiece(product, { view: 'front', colorHex, size: 800, detail: 'full', uidPrefix: 'main' });

  const paired = pairedProduct(product);
  const sleevePills = paired ? `
    <div class="variant-group">
      <label>Sleeve</label>
      <div class="pills">
        <button class="pill ${product.style === 'ls' ? 'is-active' : ''}" data-open-product="${product.style === 'ls' ? product.id : paired.id}">Long sleeve</button>
        <button class="pill ${product.style === 'ss' ? 'is-active' : ''}" data-open-product="${product.style === 'ss' ? product.id : paired.id}">Short sleeve</button>
      </div>
    </div>` : '';

  const sizePills = `
    <div class="variant-group">
      <label>Size</label>
      <div class="pills">${SIZE_LIST.map(s => `<button class="pill ${s === state.pdp.size ? 'is-active' : ''}" data-pick-size="${s}">${s}</button>`).join('')}</div>
    </div>`;

  const colorwayPills = (product.colorways || []).length ? `
    <div class="variant-group">
      <label>Colourway</label>
      <div class="pdp__dots">${(product.colorways || []).map((hex, i) =>
        `<button class="dot ${i === activeColorwayIndex(product) ? 'is-active' : ''}" style="background:${hex}" data-pick-color="${i}" title="${escapeHtml(colorwayLabel(product, hex))}" aria-label="${escapeHtml(colorwayLabel(product, hex))}"></button>`
      ).join('')}</div>
    </div>` : '';

  const rankAccordion = product.ranked ? `
    <div class="acc-item" data-acc>
      <button class="acc-item__head">Rank colour (IBJJF Art. 8.1.14) <svg class="acc-item__chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg></button>
      <div class="acc-item__body">
        <p>Approx. ${Math.round(estimateCoverage(product) * 100)}% rank colour on this construction — IBJJF Art. 8.1.14 requires at least 10%.</p>
        <blockquote class="rule">${RANK_RULE_TEXT}</blockquote>
        <p>This is an area estimate from the garment geometry, not a measurement of a physical sample, and it is not a legality ruling — inspection at weigh-in is a visual judgment call by tournament officials.</p>
      </div>
    </div>` : '';

  const bundle = product.isSet ? `
    <div class="bundle">
      <h4>Complete the set</h4>
      <div class="bundle-item">
        <div class="bundle-item__media">${renderPiece(product, { view: 'front', colorHex, size: 200, detail: 'lite', uidPrefix: 'bd', asPartner: true })}</div>
        <div class="bundle-item__meta">
          <b>${product.partner.style === 'shorts' ? 'Grappling shorts' : 'Spats'} — same artwork</b>
          <span>Included in this set · $${product.price.amount} sample covers both pieces</span>
        </div>
      </div>
    </div>` : '';

  pdpBody.innerHTML = `
    <div class="pdp__thumbs">
      <button class="pdp__thumb ${activeThumb === 'front' ? 'is-active' : ''}" data-thumb="front">${thumbFront}</button>
      <button class="pdp__thumb ${activeThumb === 'back' ? 'is-active' : ''}" data-thumb="back">${thumbBack}</button>
      <button class="pdp__thumb ${activeThumb === 'detail' ? 'is-active' : ''}" data-thumb="detail">${thumbDetail}</button>
    </div>
    <div class="pdp__main">${main}</div>
    <div class="pdp__info">
      <p class="pdp__eyebrow">${escapeHtml(product.theme)} · ${escapeHtml(product.gender)}${product.isSet ? ' · Set' : ''}</p>
      <h2 class="pdp__title" id="pdpTitle">${escapeHtml(product.name)}</h2>
      <p class="pdp__price">${priceMarkup(product)}</p>
      ${sleevePills}
      ${sizePills}
      ${colorwayPills}
      <div class="accordion">
        <div class="acc-item" data-acc>
          <button class="acc-item__head">Fabric &amp; fit <svg class="acc-item__chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg></button>
          <div class="acc-item__body">100% polyester, dye-sublimated, compression fit. Runs true to a snug rashguard fit — size up for a looser fit. Sizes XS–4XL.</div>
        </div>
        <div class="acc-item" data-acc>
          <button class="acc-item__head">Shipping <svg class="acc-item__chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg></button>
          <div class="acc-item__body">Sample text — shipping policy to be confirmed by Prodigy Athletics.</div>
        </div>
        <div class="acc-item" data-acc>
          <button class="acc-item__head">Returns <svg class="acc-item__chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg></button>
          <div class="acc-item__body">Sample text — returns policy to be confirmed by Prodigy Athletics.</div>
        </div>
        ${rankAccordion}
      </div>
      <div class="pdp__addtocart">
        <button class="btn btn--primary btn--block" id="pdpAddBtn">Add to cart (demo)</button>
        <p class="pdp__note">Demo cart — checkout is not connected. Nothing here can be purchased.</p>
      </div>
      ${bundle}
      <a class="pdp__studio-link" href="studio.html">Customise this design in the Studio →</a>
    </div>`;

  pdpBody.querySelectorAll('[data-thumb]').forEach(b => b.addEventListener('click', () => { state.pdp.activeThumb = b.dataset.thumb; renderPDP(); }));
  pdpBody.querySelectorAll('[data-pick-size]').forEach(b => b.addEventListener('click', () => { state.pdp.size = b.dataset.pickSize; renderPDP(); }));
  pdpBody.querySelectorAll('[data-pick-color]').forEach(b => b.addEventListener('click', () => { state.selectedColorway.set(product.id, Number(b.dataset.pickColor)); renderPDP(); }));
  pdpBody.querySelectorAll('[data-open-product]').forEach(b => b.addEventListener('click', () => { const p2 = findProduct(b.dataset.openProduct); if (p2) openPDP(p2); }));
  pdpBody.querySelectorAll('[data-acc]').forEach(item => item.querySelector('.acc-item__head').addEventListener('click', () => item.classList.toggle('is-open')));
  pdpBody.querySelector('#pdpAddBtn')?.addEventListener('click', (e) => {
    addToCart(product, state.pdp.size, colorHex);
    const btn = e.currentTarget; const orig = btn.textContent;
    btn.textContent = 'Added ✓'; setTimeout(() => { btn.textContent = orig; }, 1000);
  });
}

function estimateCoverage(product) {
  // Delegates to garment.js's own estimator (same construction renderRanked uses for this
  // style) rather than re-deriving the panel-area numbers here.
  const slotsPainted = product.style === 'shorts' || product.style === 'spats' ? ['waistband'] : ['sleeveL', 'sleeveR', 'collar'];
  return estimateRankCoverage({ style: product.style, slotsPainted });
}

// ───────────────────────────── init ─────────────────────────────

renderFilters();
renderGrid();
updateCartCount();
