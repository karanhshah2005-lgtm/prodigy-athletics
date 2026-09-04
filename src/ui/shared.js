/**
 * shared.js — everything the shop page (store.js) and the product page (product.js)
 * have in common: DOM helpers, the garment-render wrapper, the placeholder-photo
 * convention, the product card, the header and the sample cart.
 *
 * Product photography on the storefront is PLACEHOLDER imagery (docs/PHOTOS.md,
 * "Placeholder product imagery"): one flat-lay-on-white frame per product per view at
 * assets/photos/products/<id>-<view>.webp, generated to stand in for the client's own
 * product photographs and captioned as placeholders wherever it appears. Nothing in a
 * placeholder frame is a fact about the product — the render is still the view of the cut.
 */

import { renderGarment } from '../render/garment.js';
import { artPatternDef, artPatternRef } from '../render/art.js';
import { makePattern } from '../data/patterns.js';

/* ── DOM ───────────────────────────────────────────────────────────────── */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
export const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let UID = 0;
export const nextUid = () => `s${(UID++).toString(36)}`;

export const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Sample prices only. Never render a bare number. */
export const priceText = (p) => `$${p.price.amount} sample`;

export const CUT_LABEL = { ls: 'Long sleeve', ss: 'Short sleeve', shorts: 'Shorts', spats: 'Spats', gi: 'Gi' };

/* ── renders ───────────────────────────────────────────────────────────── */

/**
 * One garment render. Handles the artwork pattern defs.
 * Every svg gets its own uid so ids never cross-wire between instances.
 */
export function svgFor({ style, view = 'front', baseColor, artSpec = null, artScale = 1, marks = null, size = 1000, detail = 'full', design = null, part = null }) {
  const uid = nextUid();
  let defs = '', slots = {};
  if (artSpec) {
    const art = makePattern(artSpec, 320);
    defs = artPatternDef({ uid, art, tile: true, transform: { scale: artScale } });
    slots = { all: artPatternRef({ uid }) };
  }
  return renderGarment({ style, view, baseColor, slots, size, detail, uid, defs, marks, design, part });
}

export const productSvg = (p, opts = {}) => svgFor({
  style: p.style, baseColor: p.baseColor, artSpec: p.artSpec, artScale: p.artScale,
  marks: p.marks, design: p.design || null, ...opts,
});

/**
 * A detail crop is the SAME svg string with its root viewBox rewritten — no second
 * render, no image file, no zoom transform. box = [x, y, w, h] in viewBox units.
 */
export function cropSvg(svg, box) {
  const cut = svg.indexOf('>');
  const head = svg.slice(0, cut)
    .replace(/\swidth="[^"]*"/, '')
    .replace(/\sheight="[^"]*"/, '')
    .replace(/viewBox="[^"]*"/, `viewBox="${box.join(' ')}"`);
  return head + svg.slice(cut);
}

/* ── placeholder photography + product links ───────────────────────────── */

export const PHOTO_PX = 1024;
export const productPhoto = (id, view = 'front') => `assets/photos/products/${encodeURIComponent(id)}-${view}.webp`;
export const productHref = (id) => `product.html?id=${encodeURIComponent(id)}`;

/** Honest alt: says it is a placeholder, says what the frame shows, claims nothing else. */
export const photoAlt = (p, view) =>
  `Placeholder image: ${p.name.toLowerCase()} laid flat on white in a concept design with the Prodigy logo, ${view} view. Stands in for the client's own photograph.`;

/**
 * One product card, modelled on an albinoandpreto.com collection tile: the flat-lay on
 * white, the back view on hover, the name and the price, nothing else. It is a link to
 * the product page. `more` holds it behind SHOW ALL on the shop grid.
 */
export function cardHtml(p, { more = false } = {}) {
  return `
    <a class="card${more ? ' card--more' : ''}" href="${productHref(p.id)}" data-id="${esc(p.id)}">
      <span class="stage stage--photo">
        <img class="card__photo" src="${productPhoto(p.id, 'front')}" width="${PHOTO_PX}" height="${PHOTO_PX}" loading="lazy" decoding="async" alt="${esc(photoAlt(p, 'front'))}">
        <img class="card__photo card__photo--back" src="${productPhoto(p.id, 'back')}" width="${PHOTO_PX}" height="${PHOTO_PX}" loading="lazy" decoding="async" alt="">
      </span>
      <span class="card__title t-card-title">${esc(p.name)}</span>
      <span class="card__price t-price">${priceText(p)}</span>
      ${p.unconfirmed ? `<span class="card__todo t-micro todo">${esc(p.unconfirmed)}</span>` : ''}
    </a>`;
}

/* ── header + sample cart ──────────────────────────────────────────────── */

const CART_KEY = 'prodigy.cart';
export const readCart = () => { try { return Number(sessionStorage.getItem(CART_KEY)) || 0; } catch { return 0; } };
export function bumpCart() {
  const n = readCart() + 1;
  try { sessionStorage.setItem(CART_KEY, String(n)); } catch { /* private mode */ }
  const out = $('#cartCount');
  if (out) out.textContent = String(n);
  return n;
}

/** Sticky header: solid after 80px of scroll; MENU toggle on phones; cart count. */
export function initHeader() {
  const hdr = $('#hdr');
  if (!hdr) return;
  const onScroll = () => hdr.classList.toggle('is-solid', window.scrollY > 80);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const menuBtn = $('#hdrMenu');
  const navEl = $('#hdrNav');
  if (menuBtn && navEl) {
    menuBtn.addEventListener('click', () => {
      const open = navEl.classList.toggle('is-open');
      menuBtn.setAttribute('aria-expanded', String(open));
    });
    navEl.addEventListener('click', (e) => {
      if (e.target.closest('a')) { navEl.classList.remove('is-open'); menuBtn.setAttribute('aria-expanded', 'false'); }
    });
  }

  const out = $('#cartCount');
  if (out) out.textContent = String(readCart());
}

/* ── detail crops (shop section 03 + product page) ─────────────────────── */

/**
 * Detail crops. `at` and `crop` are in the rendered viewBox space (0-1000), and the
 * sleeve run sits in a DIFFERENT place on each cut: garment.js draws the long sleeve
 * down to the wrist (SLEEVE_AXIS.ls, mid-run ~y 542) and the short sleeve as a stub at
 * the shoulder (SLEEVE_AXIS.ss, mid-run ~y 363, and much closer to the body). One crop
 * table for both cuts left every short-sleeve product with two empty panels, so the
 * table is per style. Chest and back marks sit at the same height on both cuts.
 */
export function hotspots(style) {
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
