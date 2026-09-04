/**
 * store.js — Prodigy Athletics storefront (shop.html).
 *
 * Implements docs/DESIGN-SYSTEM.md: sample strip, sticky header, hero, the numbered
 * sections and the shop grid. Every product tile is a link to product.html
 * (src/ui/product.js); the helpers both pages share live in shared.js.
 *
 * Every garment view on this page is produced by src/render/*. Campaign photography is
 * the client's own (docs/PHOTOS.md); the grid's product photographs are PLACEHOLDERS
 * (docs/PHOTOS.md, "Placeholder product imagery") until the client's own arrive, and are
 * captioned as such. Prices are sample data (catalog.js) and specs render "— TO CONFIRM".
 */

import { STYLES, GI_PRESETS } from '../render/garment.js';
import { renderCutSheet } from '../render/panel.js';
import { PRODUCTS, findProduct } from '../data/catalog.js';
import { $, $$, esc, nextUid, priceText, REDUCED, svgFor, productSvg, cropSvg, hotspots, cardHtml, productHref, initHeader } from './shared.js';

const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

/* ── 1. header: transparent over the hero, solid after 80px (shared.js) ── */

initHeader();

/* ── 2. hero — the real 360 viewer ─────────────────────────────────────── */

let heroApi = null;
async function mountHero() {
  const host = $('#heroSpin');
  const hint = $('#heroDrag');
  if (!host) return;   // hero runs imagery-only; the 360 lives on product pages and in the Studio
  // Without WebGL the host stops being a rotatable control, so it drops back to an image.
  const toStaticImage = () => {
    host.removeAttribute('tabindex');
    for (const a of ['aria-valuemin', 'aria-valuemax', 'aria-valuenow', 'aria-valuetext', 'aria-orientation']) host.removeAttribute(a);
    host.setAttribute('role', 'img');
    host.setAttribute('aria-label', 'Black long-sleeve rashguard, front view');
    $('#heroFallback').style.display = 'block';
    hint.style.display = 'none';
    host.innerHTML = svgFor({ style: 'ls', baseColor: '#14161b', marks: HERO_MARKS, size: 560 });
  };
  let mod;
  try {
    mod = await import('../render/spin3d.js');
  } catch (err) {
    console.warn('spin3d unavailable', err);
    host.dataset.spinFallback = '1';
    toStaticImage();
    return;
  }
  heroApi = mod.mountSpin(host, {
    style: 'ls',
    baseColor: '#14161b',
    sleeveText: 'PRODIGY',
    sleeveTextColor: '#F5F3EE',
    chestMark: 'wordmark',
    chestMarkColor: '#F5F3EE',
    backText: 'PRODIGY',
    autoRotate: !REDUCED,
    // 0.39 x 6 = 2.34 OrbitControls units ~= the 14 deg/s the design system specifies.
    // Rotation stops on first interaction, and after 1.5 revolutions if nobody touches it.
    speed: 0.39,
    maxTurns: 1.5,
    keyboard: true,
    dragHint: true,
  });
  if (host.dataset.spinFallback === '1') {
    toStaticImage();
    return;
  }
  if (REDUCED) hint.textContent = 'Drag to rotate';
  // The affordance fades on first drag and does not come back this session.
  if (typeof heroApi.onInteract === 'function') heroApi.onInteract(() => hint.classList.add('is-gone'));
}

const HERO_MARKS = {
  chest: { kind: 'lockup', color: '#F5F3EE', width: 150 },
  sleeves: { text: 'PRODIGY', color: '#F5F3EE' },
  back: { kind: 'word', color: '#F5F3EE', width: 250 },
};

/* ── 2b. hero photo rotation ───────────────────────────────────────────── */

/**
 * The wide action hero figure — since 2026-09-04 the only hero figure, the blue-SS
 * portrait beside it is removed (owner direction) — cycles through the client's
 * photographs. The clinch frame in shop.html stays
 * the base layer — LCP, no-JS and reduced-motion behaviour are exactly the static page —
 * and the overlays only download after the window load event. The overlays are
 * decorative repetition of "the team, photographed", so they carry empty alt +
 * aria-hidden and screen readers keep the stable base description; the credit caption
 * is true for every frame.
 */
const HERO_ROTATE_MS = 1000;   // client-directed cadence
const HERO_ROTATION = [
  'assets/photos/hero-rot-skirt-patch.webp',
  'assets/photos/hero-rot-taping.webp',
  'assets/photos/hero-rot-genius-belt.webp',
];

function buildHeroRotation() {
  if (REDUCED) return;
  const fig = $('.hero__models--action');
  const cap = fig && fig.querySelector('figcaption');
  if (!fig || !cap) return;
  const start = () => {
    const overlays = HERO_ROTATION.map((src) => {
      const img = el(`<img class="hero__rot" src="${src}" alt="" aria-hidden="true" width="1376" height="768" decoding="async">`);
      fig.insertBefore(img, cap);
      return img;
    });
    let i = 0;   // 0 = the base photograph; 1..n = overlays
    setInterval(() => {
      if (document.hidden) return;   // a background tab holds its frame
      i = (i + 1) % (overlays.length + 1);
      overlays.forEach((img, j) => img.classList.toggle('is-on', j + 1 === i));
    }, HERO_ROTATE_MS);
  };
  if (document.readyState === 'complete') start();
  else addEventListener('load', start, { once: true });
}

/* ── 4. section 02 — core ──────────────────────────────────────────────── */

/**
 * Each core cell is [team photograph] over [render]. The photograph is static markup in
 * shop.html — it carries its own credit caption and must not depend on this module
 * running — so the render mounts into the cell rather than replacing the row.
 */
function buildCore() {
  for (const mount of $$('#coreRow .core__mount')) {
    const p = findProduct(mount.dataset.core);
    if (!p) continue;
    mount.innerHTML = `
      <a class="card core__item" href="${productHref(p.id)}" data-id="${esc(p.id)}">
        <span class="stage">${productSvg(p, { size: 620 })}</span>
        <span class="card__title t-card-title">${esc(p.name)}</span>
        <span class="card__price t-price">${priceText(p)}</span>
      </a>`;
  }
}

/* ── 5. section 03 — sets ──────────────────────────────────────────────── */

/**
 * Hem / cuff bottom of each style in the 1000-unit viewBox. Used to drop every render
 * onto ONE horizon, instead of aligning the (identical) square canvases and letting the
 * garments float at three different heights.
 */
const HEM_Y = { ls: 822, ss: 822, shorts: 764, spats: 884 };
const horizonShift = (style) => `transform:translateY(${((884 - (HEM_Y[style] || 884)) / 10).toFixed(2)}%)`;

function buildSets() {
  const set = findProduct('recon-set');
  const bottomMk = { waist: { color: '#F5F3EE' }, leg: { color: '#F5F3EE' } };
  const pieces = [
    { style: 'ls', marks: set.marks, label: 'Long sleeve', id: 'recon-ls' },
    { style: 'shorts', marks: bottomMk, label: 'Shorts', id: 'recon-shorts' },
    { style: 'spats', marks: bottomMk, label: 'Spats', id: 'recon-spats' },
  ];
  $('#setsRow').innerHTML = pieces.map(pc => `
    <a class="card card--tile sets__item" href="${productHref(pc.id)}" data-id="${esc(pc.id)}">
      <span class="sets__piece" style="${horizonShift(pc.style)}">
        ${svgFor({ style: pc.style, baseColor: set.baseColor, artSpec: set.artSpec, artScale: set.artScale, marks: pc.marks, size: 520 })}
      </span>
      <span class="t-label">${esc(pc.label)}</span>
    </a>`).join('');
}

/* ── 6. section 04 — the detail ────────────────────────────────────────── */

/** The homepage detail section always shows the long-sleeve render. */
const HOTSPOTS = hotspots('ls');

const DETAIL_SVG = {};
let activeSpot = 1; // default state is 02

function buildDetail() {
  DETAIL_SVG.front = svgFor({ style: 'ls', baseColor: '#14161b', marks: HERO_MARKS, view: 'front', size: 1000 });
  DETAIL_SVG.back = svgFor({ style: 'ls', baseColor: '#14161b', marks: HERO_MARKS, view: 'back', size: 1000 });

  $('#detailList').innerHTML = HOTSPOTS.map((h, i) => `
    <li>
      <button class="detail__row" type="button" data-spot="${i}" aria-pressed="false">
        <span class="t-label">${h.n}</span>
        <span>
          <span class="t-h3">${esc(h.label)}</span>
          <span class="detail__cap t-body-s">${h.cap}</span>
        </span>
      </button>
    </li>`).join('');

  $('#detailList').addEventListener('click', (e) => {
    const b = e.target.closest('[data-spot]');
    if (b) setSpot(Number(b.dataset.spot));
  });
  setSpot(activeSpot);
}

function setSpot(i) {
  activeSpot = i;
  const h = HOTSPOTS[i];
  const stage = $('#detailStage');
  const [cx, cy, cw, ch] = h.crop;
  stage.innerHTML = cropSvg(DETAIL_SVG[h.view], h.crop);

  HOTSPOTS.forEach((s, j) => {
    if (s.view !== h.view) return;
    const left = ((s.at[0] - cx) / cw) * 100;
    const top = ((s.at[1] - cy) / ch) * 100;
    if (left < 2 || left > 98 || top < 2 || top > 98) return;
    const dot = el(`<button class="detail__dot t-micro" type="button" data-spot="${j}"
      aria-label="${esc(s.n)} ${esc(s.label)}" style="left:${left.toFixed(2)}%;top:${top.toFixed(2)}%">${s.n}</button>`);
    if (j === i) {
      dot.classList.add('is-active');
      // gold leader line, from the active hotspot out to the caption column
      stage.appendChild(el(`<span class="detail__lead" style="left:calc(${left.toFixed(2)}% + 16px);top:${top.toFixed(2)}%;right:0"></span>`));
    }
    dot.addEventListener('click', () => setSpot(j));
    stage.appendChild(dot);
  });

  $$('#detailList .detail__row').forEach((b, j) => {
    b.classList.toggle('is-active', j === i);
    b.setAttribute('aria-pressed', String(j === i));
  });
}

/* ── 7. section 05 — gis ───────────────────────────────────────────────── */

/**
 * Section 04 — the gi row is the three GENIUS SKUs (the real product line, catalog.js)
 * rendered from the pattern files, plus the Prodigy × 死 studio concept. Every card is a
 * .card[data-id] link to its product page (product.html). The gi jacket
 * only renders if the renderer ships a 'gi' style; otherwise the static placeholder stays.
 */
function buildGis() {
  if (!STYLES.gi || !GI_PRESETS) return;
  const genius = ['genius-gi-black', 'genius-gi-white', 'genius-gi-blue'].map(findProduct).filter(Boolean);
  let out;
  try {
    out = genius.map(p => `
      <a class="card card--tile gis__item" href="${productHref(p.id)}" data-id="${esc(p.id)}">
        ${productSvg(p, { size: 420 })}
        <span class="t-label">${esc(p.name)}</span>
      </a>`).join('') + `
      <a class="card card--tile gis__item gis__item--featured" href="${productHref('shi-gi-black')}" data-id="shi-gi-black">
        ${svgFor({ style: 'gi', baseColor: GI_PRESETS.black, design: 'shi', size: 420 })}
        <span class="t-label">Prodigy × 死 — concept</span>
      </a>`;
  } catch (err) {
    console.warn('gi render unavailable', err);
    return;
  }
  $('#gisRow').innerHTML = `<div class="gis__row">${out}</div>
    <p class="t-caption gis__note">Renders of the cut — the GENIUS embroidery lives in the photographs, not the renders. The 死 gi is a concept, not a product Prodigy stocks. The full range <span class="todo">— to confirm</span>.</p>`;
}

/* ── 8. section 06 — studio ────────────────────────────────────────────── */

/**
 * The studio section is commented out of shop.html (hidden 2026-09-01, owner direction),
 * so both hosts are null. The guard is not defensive dressing: without it this throws,
 * and the throw takes down the nextFrame callback that queues buildGrid() with it, so
 * the whole product grid disappears. Keep the guard even after the section returns.
 */
function buildStudio() {
  const garmentHost = $('#studioGarment');
  const sheetHost = $('#studioSheet');
  if (!garmentHost || !sheetHost) return;
  garmentHost.innerHTML = `<div class="studio__stage">${svgFor({ style: 'ls', baseColor: '#14161b', marks: HERO_MARKS, size: 640 })}</div>`
    + '<span class="t-label">Live preview</span>';
  sheetHost.innerHTML = renderCutSheet({ style: 'ls', uid: nextUid(), baseColor: '#14161b' });
}

/* ── 9. shop grid ──────────────────────────────────────────────────────── */

const PREVIEW = 8;   // blueprint section 09: eight cards, then one text link

/** Product cards are the shared photo card (shared.js): placeholder flat-lay, back view
 * on hover, name, price — each a link to product.html. */
function buildGrid() {
  const grid = $('#grid');
  grid.innerHTML = PRODUCTS.map((p, i) => cardHtml(p, { more: i >= PREVIEW })).join('');

  // "SHOW ALL" reveals the rest of the range in place. There is no second page to link
  // to, and a link that goes nowhere is not an honest control.
  const all = $('#shopAll');
  if (all) {
    all.textContent = `Show all ${PRODUCTS.length}`;
    all.addEventListener('click', () => {
      grid.classList.add('is-all');
      all.closest('.shopall').remove();
    });
  }
}

/* ── entrance: one per section header, fires once ──────────────────────── */

function observeReveals() {
  if (REDUCED) { $$('.reveal').forEach(n => n.classList.add('is-in')); return; }
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
    }
  }, { threshold: 0.15 });
  $$('.reveal').forEach(n => io.observe(n));
}

/* ── boot ──────────────────────────────────────────────────────────────── */

// The hero is the LCP element, so it mounts first and the rest of the page is built in
// yielded chunks. Building 25 grid cards synchronously delayed first paint (and font
// application) past the preload budget.
mountHero();
buildHeroRotation();

const nextFrame = (fn) => requestAnimationFrame(() => requestAnimationFrame(fn));
nextFrame(() => {
  buildCore();
  nextFrame(() => {
    buildSets();
    buildDetail();
    buildGis();
    buildStudio();
    nextFrame(() => {
      buildGrid();
      observeReveals();
    });
  });
});

// hook for automated verification
window.__store = {
  products: PRODUCTS.length,
  spot: () => activeSpot,
  setSpot,
  heroInfo: () => (heroApi && heroApi.getInfo ? heroApi.getInfo() : null),
};
