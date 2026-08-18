/**
 * catalog.js — SAMPLE storefront data. No real SKUs, no real prices exist for this brand
 * (see docs/DESIGN.md §7) — every price object below carries sample:true and every price
 * MUST be rendered with a "sample" label. Do not treat any value here as a real fact.
 *
 * Product shape:
 * {
 *   id, name, style:'ls'|'ss'|'shorts'|'spats', theme, gender:'Unisex'|'Women', baseColor,
 *   artSpec: patterns.js spec | null,           // null only for `ranked` items
 *   slots: { [slotKey]: true },                 // which garment.js slots get the artwork
 *   ranked: { belt } | null,
 *   pairId: string | null,                      // links an LS/SS sleeve-length sibling pair
 *   isSet: boolean, partner: { style, slots } | null,   // "Set:" two-garment merchandising
 *   price: { sample:true, amount, currency:'CAD', compareAt? },
 *   badges: [ 'New' | 'Flagship' | 'Sale' ],   // never 'Best seller' — no sales history exists
 *   colorways: [hex,...],                       // dots; belts for ranked, recolors otherwise
 * }
 *
 * The ranked short-sleeve rashguard (white/blue/purple/brown/black) is the client's ONE
 * confirmed real product (see DESIGN.md OBSERVED section) — it is the hero, first in the
 * list and carries the only "Flagship" badge (the one confirmed real line).
 */

import { BELT_HEX } from '../render/garment.js';

export const THEMES = Object.freeze(['Ranked', 'Camo', 'Minimalist', 'Flag', 'Geometric', 'Abstract', 'Waves']);
export const CUTS = Object.freeze([
  { key: 'ls', label: 'Long sleeve' },
  { key: 'ss', label: 'Short sleeve' },
  { key: 'shorts', label: 'Shorts' },
  { key: 'spats', label: 'Spats' },
  { key: 'sets', label: 'Sets' }, // virtual cut — filters isSet:true regardless of underlying style
]);
export const GENDERS = Object.freeze(['Unisex', 'Women']);

const BELTS = ['white', 'blue', 'purple', 'brown', 'black'];
const BELT_COLORWAYS = BELTS.map(b => BELT_HEX[b]);

const NAVY = '#0B1220', BONE = '#F5F3EE', BLACK = '#14161b', GREY = '#5A5E66';

/** Small helper so sample prices never accidentally read as real. */
const price = (amount, extra = {}) => ({ sample: true, amount, currency: 'CAD', ...extra });

const camoColors = ['#2b3a2a', '#4a5b3d', '#7a7d55', '#1c2418'];
const minimalColorsDark = [NAVY, '#E8A33D', BONE];
const minimalColorsLight = [BONE, NAVY, '#E8A33D'];
const flagColors = ['#C8102E', '#FFFFFF', NAVY];
const geoColors = [NAVY, '#E8A33D', '#5A5A5A'];
const gridColors = [NAVY, '#DBDBDB', '#E8A33D'];
const kanjiColors = ['#141414', '#E8A33D'];
const topoColors = [NAVY, '#1B4DB1', '#5A5A5A'];
const wavesColorsCool = [NAVY, '#1B4DB1', '#22B6FF'];
const wavesColorsWarm = ['#141414', '#5A3A22', '#E8A33D'];
const stripesColors = [NAVY, '#E8A33D', BONE];
const halftoneColors = [NAVY, '#E8A33D'];

export const PRODUCTS = Object.freeze([
  // ── Ranked (the one confirmed real product) ─────────────────────────────
  {
    id: 'ranked-ss', name: 'Ranked Short-Sleeve Rashguard', style: 'ss', theme: 'Ranked', gender: 'Unisex',
    baseColor: BLACK, artSpec: null, slots: {}, ranked: { belt: 'white' }, pairId: 'ranked',
    isSet: false, partner: null,
    price: price(75), badges: ['Flagship'], colorways: BELT_COLORWAYS,
  },
  {
    id: 'ranked-ls', name: 'Ranked Long-Sleeve Rashguard', style: 'ls', theme: 'Ranked', gender: 'Unisex',
    baseColor: BLACK, artSpec: null, slots: {}, ranked: { belt: 'blue' }, pairId: 'ranked',
    isSet: false, partner: null,
    price: price(85), badges: ['New'], colorways: BELT_COLORWAYS,
  },

  // ── Camo ─────────────────────────────────────────────────────────────────
  {
    id: 'recon-camo-ls', name: 'Recon Camo Long-Sleeve', style: 'ls', theme: 'Camo', gender: 'Unisex',
    baseColor: '#1c2418', artSpec: { kind: 'camo', colors: camoColors, seed: 11 }, slots: { all: true },
    ranked: null, pairId: 'recon-camo', isSet: false, partner: null,
    price: price(88), badges: [], colorways: ['#2b3a2a', '#26303f', '#3a2b2b'],
  },
  {
    id: 'recon-camo-ss', name: 'Recon Camo Short-Sleeve', style: 'ss', theme: 'Camo', gender: 'Unisex',
    baseColor: '#1c2418', artSpec: { kind: 'camo', colors: camoColors, seed: 11 }, slots: { all: true },
    ranked: null, pairId: 'recon-camo', isSet: false, partner: null,
    price: price(78), badges: [], colorways: ['#2b3a2a', '#26303f', '#3a2b2b'],
  },
  {
    id: 'recon-camo-shorts', name: 'Recon Camo Grappling Shorts', style: 'shorts', theme: 'Camo', gender: 'Unisex',
    baseColor: '#1c2418', artSpec: { kind: 'camo', colors: camoColors, seed: 11 }, slots: { all: true },
    ranked: null, pairId: null, isSet: false, partner: null,
    price: price(58), badges: [], colorways: ['#2b3a2a', '#26303f', '#3a2b2b'],
  },

  // ── Minimalist ───────────────────────────────────────────────────────────
  {
    id: 'ink-minimal-ls', name: 'Ink Minimalist Long-Sleeve', style: 'ls', theme: 'Minimalist', gender: 'Unisex',
    baseColor: NAVY, artSpec: { kind: 'minimal', colors: minimalColorsDark, seed: 2 }, slots: { all: true },
    ranked: null, pairId: 'ink-minimal', isSet: false, partner: null,
    price: price(82), badges: [], colorways: [NAVY, '#141414', GREY],
  },
  {
    id: 'bone-minimal-ss', name: 'Bone Minimalist Short-Sleeve', style: 'ss', theme: 'Minimalist', gender: 'Women',
    baseColor: BONE, artSpec: { kind: 'minimal', colors: minimalColorsLight, seed: 3 }, slots: { all: true },
    ranked: null, pairId: null, isSet: false, partner: null,
    price: price(72), badges: [], colorways: [BONE, '#DBDBDB', '#E8A33D'],
  },
  {
    id: 'ink-minimal-spats', name: 'Ink Minimalist Spats', style: 'spats', theme: 'Minimalist', gender: 'Unisex',
    baseColor: NAVY, artSpec: { kind: 'minimal', colors: minimalColorsDark, seed: 2 }, slots: { all: true },
    ranked: null, pairId: null, isSet: false, partner: null,
    price: price(66), badges: [], colorways: [NAVY, '#141414', GREY],
  },

  // ── Flag ─────────────────────────────────────────────────────────────────
  {
    id: 'flag-maple-ls', name: 'Flag Maple Long-Sleeve', style: 'ls', theme: 'Flag', gender: 'Unisex',
    baseColor: '#C8102E', artSpec: { kind: 'flag-ca', colors: flagColors, seed: 4 }, slots: { all: true },
    ranked: null, pairId: 'flag-maple', isSet: false, partner: null,
    price: price(88), badges: ['New'], colorways: ['#C8102E', NAVY, '#141414'],
  },
  {
    id: 'flag-maple-ss', name: 'Flag Maple Short-Sleeve', style: 'ss', theme: 'Flag', gender: 'Women',
    baseColor: '#141414', artSpec: { kind: 'flag-ca', colors: flagColors, seed: 4 }, slots: { sleeveL: true, sleeveR: true },
    ranked: null, pairId: 'flag-maple', isSet: false, partner: null,
    price: price(76), badges: [], colorways: ['#C8102E', NAVY, '#141414'],
  },

  // ── Geometric ────────────────────────────────────────────────────────────
  {
    id: 'fracture-geo-ls', name: 'Fracture Geometric Long-Sleeve', style: 'ls', theme: 'Geometric', gender: 'Unisex',
    baseColor: NAVY, artSpec: { kind: 'geo', colors: geoColors, seed: 5 }, slots: { all: true },
    ranked: null, pairId: 'fracture-geo', isSet: false, partner: null,
    price: price(85), badges: [], colorways: [NAVY, '#141414', '#5A3A22'],
  },
  {
    id: 'prism-grid-ss', name: 'Prism Grid Short-Sleeve', style: 'ss', theme: 'Geometric', gender: 'Women',
    baseColor: NAVY, artSpec: { kind: 'grid', colors: gridColors, seed: 6, cell: 36 }, slots: { all: true },
    ranked: null, pairId: 'prism-grid', isSet: false, partner: null,
    price: price(74), badges: [], colorways: [NAVY, '#141414', '#1B4DB1'],
  },
  {
    id: 'prism-grid-shorts', name: 'Prism Grid Shorts', style: 'shorts', theme: 'Geometric', gender: 'Women',
    baseColor: NAVY, artSpec: { kind: 'grid', colors: gridColors, seed: 6, cell: 36 }, slots: { all: true },
    ranked: null, pairId: null, isSet: false, partner: null,
    price: price(56, { compareAt: 64 }), badges: ['Sale'], colorways: [NAVY, '#141414', '#1B4DB1'],
  },
  {
    id: 'signal-stripes-ss', name: 'Signal Stripes Short-Sleeve', style: 'ss', theme: 'Geometric', gender: 'Unisex',
    baseColor: NAVY, artSpec: { kind: 'stripes', colors: stripesColors, seed: 13, count: 9, angle: 38 }, slots: { all: true },
    ranked: null, pairId: null, isSet: false, partner: null,
    price: price(73), badges: [], colorways: [NAVY, '#141414', '#5A3A22'],
  },
  {
    id: 'halftone-fade-ss', name: 'Halftone Fade Short-Sleeve', style: 'ss', theme: 'Geometric', gender: 'Unisex',
    baseColor: NAVY, artSpec: { kind: 'halftone', colors: halftoneColors, seed: 12, cell: 22 }, slots: { all: true },
    ranked: null, pairId: null, isSet: false, partner: null,
    price: price(77), badges: ['New'], colorways: [NAVY, '#141414', '#5A3A22'],
  },

  // ── Abstract ─────────────────────────────────────────────────────────────
  {
    id: 'brushline-ls', name: 'Brushline Abstract Long-Sleeve', style: 'ls', theme: 'Abstract', gender: 'Unisex',
    baseColor: '#141414', artSpec: { kind: 'kanji-abstract', colors: kanjiColors, seed: 7, strokes: 4 }, slots: { all: true },
    ranked: null, pairId: 'brushline', isSet: false, partner: null,
    price: price(90), badges: ['New'], colorways: ['#141414', NAVY, '#5A3A22'],
  },
  {
    id: 'topo-abstract-ss', name: 'Topo Abstract Short-Sleeve', style: 'ss', theme: 'Abstract', gender: 'Unisex',
    baseColor: NAVY, artSpec: { kind: 'topo', colors: topoColors, seed: 8, lines: 10 }, slots: { all: true },
    ranked: null, pairId: null, isSet: false, partner: null,
    price: price(76), badges: [], colorways: [NAVY, '#141414', '#1B4DB1'],
  },

  // ── Waves ────────────────────────────────────────────────────────────────
  {
    id: 'tide-waves-ls', name: 'Tide Waves Long-Sleeve', style: 'ls', theme: 'Waves', gender: 'Women',
    baseColor: NAVY, artSpec: { kind: 'waves', colors: wavesColorsCool, seed: 9, bands: 7 }, slots: { all: true },
    ranked: null, pairId: 'tide-waves', isSet: false, partner: null,
    price: price(87), badges: [], colorways: [NAVY, '#1B4DB1', '#141414'],
  },
  {
    id: 'current-waves-ss', name: 'Current Waves Short-Sleeve', style: 'ss', theme: 'Waves', gender: 'Unisex',
    baseColor: '#141414', artSpec: { kind: 'waves', colors: wavesColorsWarm, seed: 10, bands: 7 }, slots: { all: true },
    ranked: null, pairId: null, isSet: false, partner: null,
    price: price(75, { compareAt: 89 }), badges: ['Sale'], colorways: ['#141414', NAVY, '#5A3A22'],
  },
  {
    id: 'tide-waves-spats', name: 'Tide Waves Spats', style: 'spats', theme: 'Waves', gender: 'Women',
    baseColor: NAVY, artSpec: { kind: 'waves', colors: wavesColorsCool, seed: 9, bands: 7 }, slots: { all: true },
    ranked: null, pairId: null, isSet: false, partner: null,
    price: price(68), badges: [], colorways: [NAVY, '#1B4DB1', '#141414'],
  },

  // ── Sets — one artwork across rashguard + shorts/spats, merchandised as the unit ────────
  {
    id: 'set-camo-recon', name: 'Set: Recon Camo', style: 'ss', theme: 'Camo', gender: 'Unisex',
    baseColor: '#1c2418', artSpec: { kind: 'camo', colors: camoColors, seed: 11 }, slots: { all: true },
    ranked: null, pairId: null, isSet: true, partner: { style: 'shorts', slots: { all: true } },
    price: price(118), badges: ['New'], colorways: ['#2b3a2a', '#26303f', '#3a2b2b'],
  },
  {
    id: 'set-flag-maple', name: 'Set: Flag Maple', style: 'ls', theme: 'Flag', gender: 'Unisex',
    baseColor: '#C8102E', artSpec: { kind: 'flag-ca', colors: flagColors, seed: 4 }, slots: { all: true },
    ranked: null, pairId: null, isSet: true, partner: { style: 'spats', slots: { all: true } },
    price: price(145), badges: [], colorways: ['#C8102E', NAVY, '#141414'],
  },
  {
    id: 'set-fracture-geo', name: 'Set: Fracture Geo', style: 'ss', theme: 'Geometric', gender: 'Women',
    baseColor: NAVY, artSpec: { kind: 'geo', colors: geoColors, seed: 5 }, slots: { all: true },
    ranked: null, pairId: null, isSet: true, partner: { style: 'shorts', slots: { all: true } },
    price: price(112), badges: [], colorways: [NAVY, '#141414', '#5A3A22'],
  },
  {
    id: 'set-brushline', name: 'Set: Brushline', style: 'ls', theme: 'Abstract', gender: 'Unisex',
    baseColor: '#141414', artSpec: { kind: 'kanji-abstract', colors: kanjiColors, seed: 7, strokes: 4 }, slots: { all: true },
    ranked: null, pairId: null, isSet: true, partner: { style: 'spats', slots: { all: true } },
    price: price(150), badges: [], colorways: ['#141414', NAVY, '#5A3A22'],
  },
]);

export function findProduct(id) {
  return PRODUCTS.find(p => p.id === id) || null;
}

/** The LS/SS sibling of a product that shares a pairId, if one exists (drives the PDP Sleeve pill). */
export function pairedProduct(product) {
  if (!product?.pairId) return null;
  return PRODUCTS.find(p => p.id !== product.id && p.pairId === product.pairId) || null;
}
