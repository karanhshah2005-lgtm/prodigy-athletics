/**
 * store.js — Prodigy Athletics storefront (homepage + PDP modal).
 *
 * Implements docs/DESIGN-SYSTEM.md: sample strip, sticky header, 360 hero, the six
 * numbered sections, the shop grid and the PDP.
 *
 * Every garment on this page is produced by src/render/*. There is no photography and
 * no placeholder image file. Prices are sample data (catalog.js), specs render
 * "— TO CONFIRM", and nothing certifies anything against the IBJJF rule book.
 */

import { renderGarment, renderRanked, STYLES, GI_PRESETS, BELT_HEX } from '../render/garment.js';
import { renderCutSheet } from '../render/panel.js';
import { artPatternDef, artPatternRef } from '../render/art.js';
import { makePattern } from '../data/patterns.js';
import { svgToPng } from '../render/export.js';
import {
  PRODUCTS, findProduct, BELTS, BELT_LABEL, SIZES,
  RANKED_SS, IBJJF_814, IBJJF_URL,
} from '../data/catalog.js';

/* ── helpers ───────────────────────────────────────────────────────────── */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let UID = 0;
const nextUid = () => `s${(UID++).toString(36)}`;

/** Sample prices only. Never render a bare number. */
const priceText = (p) => `$${p.price.amount} sample`;

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * One garment render. Handles the artwork pattern defs and the ranked construction.
 * Every svg gets its own uid so ids never cross-wire between instances.
 */
function svgFor({ style, view = 'front', baseColor, artSpec = null, artScale = 1, ranked = null, marks = null, size = 1000, detail = 'full', design = null, part = null }) {
  const uid = nextUid();
  let defs = '', slots = {};
  if (artSpec) {
    const art = makePattern(artSpec, 320);
    defs = artPatternDef({ uid, art, tile: true, transform: { scale: artScale } });
    slots = { all: artPatternRef({ uid }) };
  }
  if (ranked) {
    return renderRanked({ style, view, belt: ranked.belt, body: ranked.body, uid, size, detail, marks, defs, slots, part });
  }
  return renderGarment({ style, view, baseColor, slots, size, detail, uid, defs, marks, design, part });
}

const productSvg = (p, opts = {}) => svgFor({
  style: p.style, baseColor: p.baseColor, artSpec: p.artSpec, artScale: p.artScale,
  ranked: p.ranked, marks: p.marks, design: p.design || null, ...opts,
});

/**
 * A detail crop is the SAME svg string with its root viewBox rewritten — no second
 * render, no image file, no zoom transform. box = [x, y, w, h] in viewBox units.
 */
function cropSvg(svg, box) {
  const cut = svg.indexOf('>');
  const head = svg.slice(0, cut)
    .replace(/\swidth="[^"]*"/, '')
    .replace(/\sheight="[^"]*"/, '')
    .replace(/viewBox="[^"]*"/, `viewBox="${box.join(' ')}"`);
  return head + svg.slice(cut);
}

/* ── 1. header: transparent over the hero, ink-navy after 80px ─────────── */

const hdr = $('#hdr');
const onScroll = () => hdr.classList.toggle('is-solid', window.scrollY > 80);
addEventListener('scroll', onScroll, { passive: true });
onScroll();

const menuBtn = $('#hdrMenu');
const navEl = $('#hdrNav');
menuBtn.addEventListener('click', () => {
  const open = navEl.classList.toggle('is-open');
  menuBtn.setAttribute('aria-expanded', String(open));
});
navEl.addEventListener('click', (e) => {
  if (e.target.closest('a')) { navEl.classList.remove('is-open'); menuBtn.setAttribute('aria-expanded', 'false'); }
});

/* ── 2. hero — the real 360 viewer ─────────────────────────────────────── */

let heroApi = null;
async function mountHero() {
  const host = $('#heroSpin');
  const hint = $('#heroDrag');
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

/* ── 3. section 01 — ranked ────────────────────────────────────────────── */

function buildRanked() {
  const row = $('#rankedRow');
  row.innerHTML = RANKED_SS.map(p => `
    <button class="card card--tile ranked__item" type="button" data-id="${esc(p.id)}">
      ${productSvg(p, { size: 420, detail: 'full' })}
      <span class="t-label">${esc(BELT_LABEL[p.ranked.belt])}</span>
    </button>`).join('');
}

/* ── 4. section 02 — core ──────────────────────────────────────────────── */

/**
 * Each core cell is [model photograph] over [render]. The photograph is static markup in
 * index.html — it carries its own AI caption and must not depend on this module running —
 * so the render mounts into the cell rather than replacing the row.
 */
function buildCore() {
  for (const mount of $$('#coreRow .core__mount')) {
    const p = findProduct(mount.dataset.core);
    if (!p) continue;
    mount.innerHTML = `
      <button class="card core__item" type="button" data-id="${esc(p.id)}">
        <span class="stage">${productSvg(p, { size: 620 })}</span>
        <span class="card__title t-card-title">${esc(p.name)}</span>
        <span class="card__price t-price">${priceText(p)}</span>
      </button>`;
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
    <button class="card card--tile sets__item" type="button" data-id="${esc(pc.id)}">
      <span class="sets__piece" style="${horizonShift(pc.style)}">
        ${svgFor({ style: pc.style, baseColor: set.baseColor, artSpec: set.artSpec, artScale: set.artScale, marks: pc.marks, size: 520 })}
      </span>
      <span class="t-label">${esc(pc.label)}</span>
    </button>`).join('');
}

/* ── 6. section 04 — the detail ────────────────────────────────────────── */

/**
 * Detail crops. `at` and `crop` are in the rendered viewBox space (0-1000), and the
 * sleeve run sits in a DIFFERENT place on each cut: garment.js draws the long sleeve
 * down to the wrist (SLEEVE_AXIS.ls, mid-run ~y 542) and the short sleeve as a stub at
 * the shoulder (SLEEVE_AXIS.ss, mid-run ~y 363, and much closer to the body). One crop
 * table for both cuts left every short-sleeve product with two empty panels, so the
 * table is per style. Chest and back marks sit at the same height on both cuts.
 */
function hotspots(style) {
  const ss = style === 'ss';
  // sleeve mark centres, mapped through garment.js's RASH_XF (x1.1 about [500,520])
  const sl = ss ? { x: 731, y: 363 } : { x: 783, y: 542 };
  const sr = ss ? { x: 269, y: 363 } : { x: 217, y: 542 };
  // 2.2x crop, 3:2, kept inside the 1000-unit canvas so a crop never opens onto bare ground
  const fit = (v, span) => Math.round(Math.max(0, Math.min(1000 - span, v)));
  const box = (cx, cy) => [fit(cx - 226, 453), fit(cy - 151, 302), 453, 302];
  return [
    {
      n: '01', label: 'Chest wordmark', view: 'front', at: [500, 357], crop: box(500, 357),
      cap: 'Chest lockup, centred on the front body panel. Print height <span class="todo">— to confirm</span>.',
    },
    {
      n: '02', label: 'Left sleeve', view: 'front', at: [sl.x, sl.y], crop: box(sl.x, sl.y),
      cap: 'PRODIGY runs shoulder to cuff on both sleeves. It reads from inside your own guard.',
    },
    {
      n: '03', label: 'Right sleeve', view: 'front', at: [sr.x, sr.y], crop: box(sr.x, sr.y),
      cap: 'Mirrored, so the name runs the same direction on either arm.',
    },
    {
      n: '04', label: 'Back print', view: 'back', at: [500, 318], crop: box(500, 318),
      cap: 'Back print sits between the shoulder blades, clear of the collar seam.',
    },
  ];
}

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

const GI_MARKS = {
  chest: { kind: 'lockup', color: 'auto', width: 78 },
  back: { kind: 'word', color: 'auto', width: 250 },
  sleeves: { text: 'PRODIGY', color: 'auto' },
};

/**
 * The gi jacket only renders if the renderer ships a 'gi' style. Until it does, the
 * section keeps its "GI RENDER — TO CONFIRM" slot rather than showing a stand-in.
 */
function buildGis() {
  if (!STYLES.gi || !GI_PRESETS) return;
  // Featured: the Prodigy × 死 gi (black), then the plain white and blue.
  const colours = [
    { key: 'black', label: 'Prodigy × 死 — Black', design: 'shi', marks: null },
    { key: 'white', label: 'White', design: null, marks: GI_MARKS },
    { key: 'blue', label: 'Blue', design: null, marks: GI_MARKS },
  ];
  let out;
  try {
    out = colours.map(c => `
      <div class="gis__item${c.design ? ' gis__item--featured' : ''}">
        ${svgFor({ style: 'gi', baseColor: GI_PRESETS[c.key], marks: c.marks, design: c.design, size: 420 })}
        <span class="t-label">${esc(c.label)}</span>
      </div>`).join('');
  } catch (err) {
    console.warn('gi render unavailable', err);
    return;
  }
  $('#gisRow').innerHTML = `<div class="gis__row">${out}</div>
    <p class="t-caption gis__note">Sample colourways. The range Prodigy actually stocks <span class="todo">— to confirm</span>.</p>`;
}

/* ── 8. section 06 — studio ────────────────────────────────────────────── */

function buildStudio() {
  $('#studioGarment').innerHTML = `<div class="studio__stage">${svgFor({ style: 'ls', baseColor: '#14161b', marks: HERO_MARKS, size: 640 })}</div>`
    + '<span class="t-label">Live preview</span>';
  $('#studioSheet').innerHTML = renderCutSheet({ style: 'ls', uid: nextUid(), baseColor: '#14161b' });
}

/* ── 9. shop grid ──────────────────────────────────────────────────────── */

/**
 * One grid card. `more` holds it behind SHOW ALL; `back` adds the hover slot the shop
 * grid fills lazily (rows inside the PDP have no hover renderer, so they omit it rather
 * than crossfade to an empty stage).
 */
function cardHtml(p, { more = false, back = true } = {}) {
  return `
    <button class="card${more ? ' card--more' : ''}" type="button" data-id="${esc(p.id)}">
      <span class="stage">
        ${productSvg(p, { size: 316, detail: 'lite' })}
        ${back ? `<span class="stage stage--back" data-back="${esc(p.id)}"></span>` : ''}
      </span>
      <span class="card__title t-card-title">${esc(p.name)}</span>
      <span class="card__price t-price">${priceText(p)}</span>
      ${p.unconfirmed ? `<span class="card__todo t-micro todo">${esc(p.unconfirmed)}</span>` : ''}
    </button>`;
}

const PREVIEW = 8;   // blueprint section 09: eight cards, then one text link

function buildGrid() {
  const grid = $('#grid');
  grid.innerHTML = PRODUCTS.map((p, i) => cardHtml(p, { more: i >= PREVIEW })).join('');

  // "SHOP ALL" reveals the rest of the range in place. There is no second page to link
  // to, and a link that goes nowhere is not an honest control.
  const all = $('#shopAll');
  if (all) {
    all.textContent = `Show all ${PRODUCTS.length}`;
    all.addEventListener('click', () => {
      grid.classList.add('is-all');
      all.closest('.shopall').remove();
    });
  }

  // back view is rendered on first hover only — one extra render per hovered card
  grid.addEventListener('pointerenter', (e) => {
    const c = e.target.closest?.('.card');
    if (!c) return;
    const back = $('[data-back]', c);
    if (back && !back.dataset.done) {
      back.dataset.done = '1';
      back.innerHTML = productSvg(findProduct(c.dataset.id), { size: 316, detail: 'lite', view: 'back' });
    }
  }, true);
}

/* ── PDP ───────────────────────────────────────────────────────────────── */

const overlay = $('#pdpOverlay');
const pdpBody = $('#pdpBody');
let pdpSpin = null;
let cart = 0;

const CUT_LABEL = { ls: 'Long sleeve', ss: 'Short sleeve', shorts: 'Shorts', spats: 'Spats' };

function specRows(p) {
  const rows = [
    ['Cut', CUT_LABEL[p.style]],
    ['Sleeve', p.style === 'ls' ? 'Long' : p.style === 'ss' ? 'Short' : '—'],
    ['Body colour', p.ranked ? (p.ranked.body === 'white' ? 'White' : 'Black') : 'See colourway'],
    ['Rank colour', p.ranked ? 'Sleeve panels and collar binding' : 'None'],
    ['Fabric', null],
    ['Weight', null],
    ['Print method', 'Dye sublimation, all-over'],
    ['Sizes', 'XS–4XL'],
  ];
  return rows.map(([k, v]) => `<tr><th class="t-label" scope="row">${esc(k)}</th><td class="t-body-s">${v ? esc(v) : '<span class="todo">— to confirm</span>'}</td></tr>`).join('');
}

/**
 * The gallery view survives a variant change and the rest of the session, per the
 * blueprint's "state persists in sessionStorage".
 */
const VIEW_KEY = 'prodigy.pdpView';
const readView = () => { try { return sessionStorage.getItem(VIEW_KEY); } catch { return null; } };
const writeView = (v) => { try { sessionStorage.setItem(VIEW_KEY, v); } catch { /* private mode */ } };

/**
 * Set members: the same artwork line, cut for the other half of the kit. A top proposes
 * the bottoms and a bottom proposes the tops; a line with no counterpart (Ranked has no
 * shorts) gets no block rather than a padded one.
 */
const isTopStyle = (style) => style === 'ls' || style === 'ss';
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
    && x.baseColor === p.baseColor
    && (x.ranked ? x.ranked.belt : null) === (p.ranked ? p.ranked.belt : null)) || null;
}

function moreFrom(p, exclude) {
  const skip = new Set([p.id, ...exclude.map(x => x.id)]);
  return PRODUCTS.filter(x => x.line === p.line && !skip.has(x.id)).slice(0, 4);
}

function openPdp(id) {
  const p = findProduct(id);
  if (!p) return;
  if (pdpSpin) { pdpSpin.dispose(); pdpSpin = null; }
  const isTop = p.style === 'ls' || p.style === 'ss';
  const canSpin = isTop;   // ranked tops spin too — spin3d takes sleeveColor
  let view = readView() || 'front';
  if (view === 'spin' && !canSpin) view = 'front';
  const mates = setMates(p);
  const more = moreFrom(p, mates);
  const otherCut = cutSwitch(p);
  const front = productSvg(p, { size: 700 });
  const back = productSvg(p, { size: 700, view: 'back' });

  const crops = isTop ? hotspots(p.style).slice(0, 3).map(h => `
    <div>
      <div class="cropstage">${cropSvg(productSvg(p, { size: 1000, view: h.view }), h.crop)}</div>
      <span class="t-label">${esc(h.n)} ${esc(h.label)}</span>
    </div>`).join('') : '';

  pdpBody.innerHTML = `
    <p class="pdp__crumb t-label">${esc(p.line)} / ${esc(CUT_LABEL[p.style])}</p>
    <div class="pdp__grid">
      <div class="pdp__gallery">
        <div class="seg t-label" id="pdpSeg">
          <button type="button" data-view="front"${view === 'front' ? ' class="is-on"' : ''}>Front</button>
          <button type="button" data-view="back"${view === 'back' ? ' class="is-on"' : ''}>Back</button>
          ${canSpin ? `<button type="button" data-view="spin"${view === 'spin' ? ' class="is-on"' : ''}>360</button>` : ''}
        </div>
        <div class="pdp__stage${view === 'spin' ? ' is-spin' : ''}" id="pdpStage">
          <span data-slot="flat">${view === 'back' ? back : front}</span>
          <div class="pdp__spin" id="pdpSpinHost"></div>
        </div>
        ${canSpin ? '' : `<p class="pdp__note t-caption">${isTop
          ? 'The 360 view does not carry rank colour yet, so it is not offered on this product.'
          : 'The 360 view covers tops only for now.'}</p>`}
      </div>

      <div class="pdp__buy">
        <span class="pdp__eyebrow t-label">${esc(p.eyebrow)}</span>
        ${p.unconfirmed ? `<span class="pdp__eyebrow t-label todo">${esc(p.unconfirmed)}</span>` : ''}
        <h2 class="t-h1" id="pdpTitle">${esc(p.name)}</h2>
        <p class="pdp__price t-body">${priceText(p)}</p>

        ${otherCut ? `
        <div class="pdp__field">
          <span class="pdp__flabel t-label">Sleeve</span>
          <div class="seg t-label" id="pdpCut">
            <button type="button" data-cut="${esc(p.style === 'ss' ? p.id : otherCut.id)}"${p.style === 'ss' ? ' class="is-on"' : ''}>Short</button>
            <button type="button" data-cut="${esc(p.style === 'ls' ? p.id : otherCut.id)}"${p.style === 'ls' ? ' class="is-on"' : ''}>Long</button>
          </div>
        </div>` : ''}

        ${p.ranked ? `
        <div class="pdp__field">
          <label class="t-label" for="pdpBelt">Rank colour</label>
          <select id="pdpBelt">${BELTS.map(b => `<option value="${b}"${b === p.ranked.belt ? ' selected' : ''}>${BELT_LABEL[b]}</option>`).join('')}</select>
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
          <table class="spec">${specRows(p)}</table>
        </div>

        ${p.ranked ? `
        <div class="pdp__sec">
          <span class="t-label">IBJJF Art. 8.1.14</span>
          <p class="t-body-s">&ldquo;${esc(IBJJF_814)}&rdquo;</p>
          <p class="t-body-s">The federation publishes no measuring method, so we build well clear of the line.
            <a class="tlink" href="${IBJJF_URL}" target="_blank" rel="noopener">Rule book</a></p>
        </div>` : ''}

        <div class="pdp__sec">
          <span class="t-label">Shipping and returns</span>
          <p class="t-body-s">Sample text. Shipping and returns policy <span class="todo">— to confirm</span>.</p>
        </div>
      </div>
    </div>
    ${crops ? `<div class="pdp__sec"><span class="t-label">The detail</span><div class="pdp__crops">${crops}</div></div>` : ''}
    ${mates.length ? `<div class="pdp__sec">
      <span class="t-label">Complete the set</span>
      <p class="t-body-s">One artwork, cut for each style.</p>
      <div class="pdp__row">${mates.map(x => cardHtml(x, { back: false })).join('')}</div>
    </div>` : ''}
    ${more.length ? `<div class="pdp__sec">
      <span class="t-label">More from ${esc(p.line)}</span>
      <div class="pdp__row pdp__row--4">${more.map(x => cardHtml(x, { back: false })).join('')}</div>
    </div>` : ''}
  `;

  const stage = $('#pdpStage');
  const flat = $('[data-slot="flat"]', stage);
  if (view === 'spin') mountPdpSpin(p);
  $('#pdpSeg').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-view]');
    if (!b) return;
    $$('#pdpSeg button').forEach(x => x.classList.toggle('is-on', x === b));
    const v = b.dataset.view;
    writeView(v);
    if (v === 'spin') {
      stage.classList.add('is-spin');
      if (!pdpSpin) await mountPdpSpin(p);
    } else {
      stage.classList.remove('is-spin');
      flat.innerHTML = v === 'back' ? back : front;
    }
  });


  const cutSeg = $('#pdpCut');
  if (cutSeg) cutSeg.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cut]');
    if (b && b.dataset.cut !== p.id) openPdp(b.dataset.cut);
  });

  const beltSel = $('#pdpBelt');
  if (beltSel) beltSel.addEventListener('change', () => openPdp(`ranked-${p.style}-${beltSel.value}`));

  $('#pdpAdd').addEventListener('click', () => {
    cart += 1;
    $('#cartCount').textContent = String(cart);
  });

  overlay.classList.add('is-open');
  document.body.style.overflow = 'hidden';
  $('#pdp').focus({ preventScroll: true });
}

/**
 * The product's own flat render, baked onto the 3D garment: front/back × torso and the
 * two sleeves, unshaded (detail:'tex'), so the 360 carries the same artwork, the same
 * ranked colours and the same marks as the flat views next to it. Data URLs, because the
 * viewer reads these back off a canvas.
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

async function mountPdpSpin(p) {
  const host = $('#pdpSpinHost');
  try {
    const mod = await import('../render/spin3d.js');
    let bake = null;
    try { bake = await bakeProduct(p); } catch (e) { console.warn('360 bake failed — showing the plain garment', e); }
    if (!host.isConnected) return;
    pdpSpin = mod.mountSpin(host, {
      style: p.style,
      baseColor: p.baseColor,
      sleeveColor: p.ranked && p.ranked.belt && BELT_HEX[p.ranked.belt] ? BELT_HEX[p.ranked.belt] : null,
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
  }
}

function closePdp() {
  overlay.classList.remove('is-open');
  document.body.style.overflow = '';
  if (pdpSpin) { pdpSpin.dispose(); pdpSpin = null; }
  pdpBody.innerHTML = '';
}
// cards inside COMPLETE THE SET / MORE FROM open their own product in place
pdpBody.addEventListener('click', (e) => {
  const c = e.target.closest('.pdp__row .card');
  if (!c) return;
  openPdp(c.dataset.id);
  overlay.scrollTop = 0;
});

$('#pdpClose').addEventListener('click', closePdp);
overlay.addEventListener('click', (e) => { if (e.target === overlay) closePdp(); });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && overlay.classList.contains('is-open')) closePdp(); });

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

// Every product tile on the page — grid card, ranked belt, core pair, set piece — opens
// its PDP through one delegated handler.
$('#main').addEventListener('click', (e) => {
  const c = e.target.closest('.card[data-id]');
  if (c) openPdp(c.dataset.id);
});

const nextFrame = (fn) => requestAnimationFrame(() => requestAnimationFrame(fn));
nextFrame(() => {
  buildRanked();
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
  openPdp,
  closePdp,
  heroInfo: () => (heroApi && heroApi.getInfo ? heroApi.getInfo() : null),
};
