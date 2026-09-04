/**
 * catalog.js — SAMPLE storefront data for Prodigy Athletics.
 *
 * HONESTY (docs/DESIGN.md §7, docs/DESIGN-SYSTEM.md rule 11): zero real prices, SKUs,
 * fabrics or weights exist for this brand. Every price object carries sample:true and is
 * rendered as "$NN sample". Every unsupplied spec renders "— TO CONFIRM". Nothing in this
 * file is a fact about the client's business.
 *
 * Product shape
 * {
 *   id        string
 *   name      string   card-title register, UPPERCASE, e.g. "CORE LONG SLEEVE — BLACK"
 *   line      string   merchandising line: 'Genius' | 'Core' | 'Oni' | 'Maple' | 'Sets'
 *   eyebrow   string   mono eyebrow on the PDP, e.g. "CORE — LONG SLEEVE"
 *   style     'ls'|'ss'|'shorts'|'spats'|'gi'     garment.js style key
 *   baseColor hex
 *   artSpec   patterns.js spec | null
 *   artScale  number   tile scale for artPatternDef
 *   marks     garment.js `marks` option — EVERY rashguard carries the PRODIGY name
 *   unconfirmed string | undefined            visible "— to confirm" token on card + PDP
 *   price     { sample:true, amount, currency }
 *   sizes     string[]                            XS–4XL. Gi sizing (A0–A6) never appears on a rashguard.
 *   pieces    [{ style, marks }] | null           set members beyond the primary style
 *   copy      [p1, p2, p3]                        PDP paragraphs, fixed order
 * }
 */

import { BASE_PRESETS, GI_PRESETS } from '../render/garment.js';

/** Rashguard / bottoms sizing. A0–A6 is gi sizing and lives on the gi section only. */
export const SIZES = Object.freeze(['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL']);
export const GI_SIZES = 'A0–A6';

export const LINES = Object.freeze(['Genius', 'Core', 'Oni', 'Maple', 'Sets']);

const BLACK = BASE_PRESETS.black;   // #14161b
const WHITE = BASE_PRESETS.white;   // #ECECEA
const BONE_MARK = '#F5F3EE';
const INK_MARK = '#0B1220';

// Currency is one of the things DESIGN.md §7 says the client still has to supply, so a
// price carries none. It renders "$NN sample" and asserts nothing about CAD or USD.
const price = (amount) => ({ sample: true, amount, currency: null });

/* ── artwork specs ─────────────────────────────────────────────────────── */

// Oni (2026-09-04, owner direction: drop the camouflage line) — crimson-on-black seigaiha waves stand in
// for the oni-mask concept print on the renders; the concept art itself lives in the placeholder frames.
const ONI = { kind: 'waves', colors: ['#14161b', '#7a0f14', '#b3202a'], seed: 11, bands: 6 };
const MAPLE = { kind: 'flag-ca', colors: ['#C8102E', '#F7F5F0', '#C8102E'], seed: 4 };

/* ── mark sets ─────────────────────────────────────────────────────────── */
// Every top: chest lockup + PRODIGY down both sleeves + back print.
// Every bottom: PRODIGY on the waistband + down one leg.

const topMarks = (c) => ({
  chest: { kind: 'lockup', color: c, width: 150 },
  sleeves: { text: 'PRODIGY', color: c },
  back: { kind: 'word', color: c, width: 250 },
});
const bottomMarks = (c) => ({ waist: { color: c }, leg: { color: c } });

/* ── shared paragraphs ─────────────────────────────────────────────────── */

const P_SPEC = 'Fabric — TO CONFIRM. Weight — TO CONFIRM. Dye sublimation prints flat on the roll, then the pieces are cut and sewn.';
// Fit and care are specs like any other: nothing in §7 OBSERVED states either, so neither
// "compression fit" nor a wash instruction is asserted here.
const P_FIT = 'Sizes run XS to 4XL. Fit, care and size chart — TO CONFIRM.';
const P_FIT_BOTTOM = P_FIT;

const CUT_WORD = { ls: 'long sleeve', ss: 'short sleeve', shorts: 'shorts', spats: 'spats' };

/* ── products ──────────────────────────────────────────────────────────── */

function core(id, style, colorName, hex, amount) {
  const cut = CUT_WORD[style];
  const markColor = hex === WHITE ? INK_MARK : BONE_MARK;
  return {
    id, line: 'Core',
    name: `CORE ${style === 'ls' ? 'LONG SLEEVE' : 'SHORT SLEEVE'} — ${colorName.toUpperCase()}`,
    eyebrow: `CORE — ${style === 'ls' ? 'LONG SLEEVE' : 'SHORT SLEEVE'}`,
    style, baseColor: hex, artSpec: null, artScale: 1,
    marks: topMarks(markColor), price: price(amount), sizes: SIZES, pieces: null,
    copy: [
      `Core ${cut} in ${colorName.toLowerCase()}, with no artwork on the body. Chest lockup, PRODIGY down both sleeves, one back print.`,
      P_SPEC,
      P_FIT,
    ],
  };
}

export const PRODUCTS = Object.freeze([
  /* ── Genius — the gi Prodigy actually makes (client photographs, docs/PHOTOS.md) ── */
  {
    id: 'genius-gi-black', line: 'Genius', name: 'GENIUS GI — BLACK',
    eyebrow: 'GI — GENIUS',
    style: 'gi', baseColor: GI_PRESETS.black, artSpec: null, artScale: 1,
    marks: null, design: null, price: price(250), sizes: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6'], pieces: 'jacket + pants',
    copy: [
      'Black GENIUS gi, as photographed on the team: embroidered brain between the shoulder blades, GENIUS across the back skirt, brain patch on the front skirt, and the equation stitched down the pant leg. The product view is a render of the cut; the thumbnail photograph is the gi itself.',
      'Jacket weave, weight and pant fabric — TO CONFIRM.',
      'Gi sizes A0–A6 — size chart TO CONFIRM.',
    ],
  },
  {
    id: 'genius-gi-white', line: 'Genius', name: 'GENIUS GI — WHITE',
    eyebrow: 'GI — GENIUS',
    style: 'gi', baseColor: GI_PRESETS.white, artSpec: null, artScale: 1,
    marks: null, design: null, price: price(250), sizes: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6'], pieces: 'jacket + pants',
    copy: [
      'White GENIUS gi with the same layout as the black: brain at the yoke, GENIUS across the back skirt, brain patch on the front skirt. Photographed competition-side; the product view is a render of the cut.',
      'Jacket weave, weight and pant fabric — TO CONFIRM.',
      'Gi sizes A0–A6 — size chart TO CONFIRM.',
    ],
  },
  {
    id: 'genius-gi-blue', line: 'Genius', name: 'GENIUS GI — BLUE',
    eyebrow: 'GI — GENIUS',
    style: 'gi', baseColor: GI_PRESETS.blue, artSpec: null, artScale: 1,
    marks: null, design: null, price: price(250), sizes: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6'], pieces: 'jacket + pants',
    copy: [
      'Competition-blue GENIUS gi — brain patch at the yoke, GENIUS across the back skirt, photographed on the mats at a tournament. The product view is a render of the cut.',
      'Jacket weave, weight and pant fabric — TO CONFIRM.',
      'Gi sizes A0–A6 — size chart TO CONFIRM.',
    ],
  },
  {
    id: 'shi-gi-black', line: 'Prodigy × 死', name: 'PRODIGY × 死 GI — BLACK',
    eyebrow: 'GI — CONCEPT',
    style: 'gi', baseColor: '#141416', artSpec: null, artScale: 1,
    marks: null, design: 'shi', unconfirmed: 'Concept — not stocked', price: price(270), sizes: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6'], pieces: 'jacket + pants',
    copy: [
      'Black gi. 死 across the upper back and on the front skirt; a skull on the outer sleeve of each arm and on both shins of the pants; monogram patches either side of the lapel; PRODIGY ATHLETICS down the lapel; contrast stitching on the lapel, cuffs and hem.',
      'Jacket weave, weight and pant fabric — TO CONFIRM.',
      'Gi sizes A0–A6 — size chart TO CONFIRM.',
    ],
  },
  {
    id: 'shi-gi-white', line: 'Prodigy × 死', name: 'PRODIGY × 死 GI — WHITE',
    eyebrow: 'GI — CONCEPT',
    style: 'gi', baseColor: '#F4F2EC', artSpec: null, artScale: 1,
    marks: null, design: 'shi', unconfirmed: 'Concept — not stocked', price: price(270), sizes: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6'], pieces: 'jacket + pants',
    copy: [
      'White gi with the same 死 layout: back and skirt character, skulls on both sleeves and both shins, monograms, lapel wordmark, contrast stitching.',
      'Jacket weave, weight and pant fabric — TO CONFIRM.',
      'Gi sizes A0–A6 — size chart TO CONFIRM.',
    ],
  },
  /* ── Core ──────────────────────────────────────────────────────────── */
  core('core-ls-black', 'ls', 'Black', BLACK, 78),
  core('core-ls-white', 'ls', 'White', WHITE, 78),
  core('core-ss-black', 'ss', 'Black', BLACK, 68),
  core('core-ss-white', 'ss', 'White', WHITE, 68),

  /* ── Oni ────────────────────────────────────────────────────── */
  {
    id: 'recon-ls', line: 'Oni', name: 'ONI LONG SLEEVE',
    eyebrow: 'ONI — LONG SLEEVE',
    style: 'ls', baseColor: '#14161b', artSpec: ONI, artScale: 0.62,
    marks: topMarks(BONE_MARK), price: price(88), sizes: SIZES, pieces: null,
    copy: [
      'Oni long sleeve. The mask sits on the chest and the petals run to the seam on every panel, so the print carries across the join instead of stopping at a panel edge.',
      P_SPEC,
      P_FIT,
    ],
  },
  {
    id: 'recon-ss', line: 'Oni', name: 'ONI SHORT SLEEVE',
    eyebrow: 'ONI — SHORT SLEEVE',
    style: 'ss', baseColor: '#14161b', artSpec: ONI, artScale: 0.62,
    marks: topMarks(BONE_MARK), price: price(78), sizes: SIZES, pieces: null,
    copy: [
      'Oni short sleeve. Same file as the long sleeve, re-cut for the shorter pattern piece.',
      P_SPEC,
      P_FIT,
    ],
  },
  {
    id: 'recon-shorts', line: 'Oni', name: 'ONI GRAPPLING SHORTS',
    eyebrow: 'ONI — SHORTS',
    style: 'shorts', baseColor: '#14161b', artSpec: ONI, artScale: 0.62,
    marks: bottomMarks(BONE_MARK), price: price(62), sizes: SIZES, pieces: null,
    copy: [
      'Oni grappling shorts. PRODIGY sits on the waistband and down the right leg.',
      P_SPEC,
      P_FIT_BOTTOM,
    ],
  },
  {
    id: 'recon-spats', line: 'Oni', name: 'ONI SPATS',
    eyebrow: 'ONI — SPATS',
    style: 'spats', baseColor: '#14161b', artSpec: ONI, artScale: 0.62,
    marks: bottomMarks(BONE_MARK), price: price(68), sizes: SIZES, pieces: null,
    copy: [
      'Oni spats. Waistband name, one leg print, and the same Oni file as the tops.',
      P_SPEC,
      P_FIT_BOTTOM,
    ],
  },
  {
    id: 'recon-set', line: 'Sets', name: 'ONI SET — LONG SLEEVE + SHORTS',
    eyebrow: 'SETS — ONI',
    style: 'ls', baseColor: '#14161b', artSpec: ONI, artScale: 0.62,
    marks: topMarks(BONE_MARK), price: price(142), sizes: SIZES,
    pieces: [{ style: 'shorts', marks: bottomMarks(BONE_MARK) }],
    copy: [
      'One artwork, cut for the long sleeve and the shorts. That is a set.',
      P_SPEC,
      P_FIT,
    ],
  },

  /* ── Maple ─────────────────────────────────────────────────────────── */
  {
    id: 'maple-ls', line: 'Maple', name: 'MAPLE LONG SLEEVE',
    eyebrow: 'MAPLE — LONG SLEEVE',
    style: 'ls', baseColor: '#C8102E', artSpec: MAPLE, artScale: 0.85,
    marks: topMarks(INK_MARK), price: price(88), sizes: SIZES, pieces: null,
    copy: [
      'Maple long sleeve. Two red bands, a white centre panel and one leaf, drawn as flat shapes rather than a photograph of a flag.',
      P_SPEC,
      P_FIT,
    ],
  },
  {
    id: 'maple-set', line: 'Sets', name: 'MAPLE SET — LONG SLEEVE + SPATS',
    eyebrow: 'SETS — MAPLE',
    style: 'ls', baseColor: '#C8102E', artSpec: MAPLE, artScale: 0.85,
    marks: topMarks(INK_MARK), price: price(150), sizes: SIZES,
    pieces: [{ style: 'spats', marks: bottomMarks(INK_MARK) }],
    copy: [
      'One artwork, cut for the long sleeve and the spats. The bands land in different places on each piece, because the pattern pieces are different shapes.',
      P_SPEC,
      P_FIT,
    ],
  },

  /* ── Plain bottoms ─────────────────────────────────────────────────── */
  {
    id: 'shorts-black', line: 'Core', name: 'GRAPPLING SHORTS — BLACK',
    eyebrow: 'CORE — SHORTS',
    style: 'shorts', baseColor: BLACK, artSpec: null, artScale: 1,
    marks: bottomMarks(BONE_MARK), price: price(62), sizes: SIZES, pieces: null,
    copy: [
      'Grappling shorts in black, with no artwork. PRODIGY on the waistband and down the right leg.',
      P_SPEC,
      P_FIT_BOTTOM,
    ],
  },
  {
    id: 'spats-black', line: 'Core', name: 'SPATS — BLACK',
    eyebrow: 'CORE — SPATS',
    style: 'spats', baseColor: BLACK, artSpec: null, artScale: 1,
    marks: bottomMarks(BONE_MARK), price: price(66), sizes: SIZES, pieces: null,
    copy: [
      'Spats in black, with no artwork. Waistband name and one leg print.',
      P_SPEC,
      P_FIT_BOTTOM,
    ],
  },

  /* ── Core set ──────────────────────────────────────────────────────── */
  {
    id: 'core-set', line: 'Sets', name: 'CORE SET — LONG SLEEVE + SHORTS',
    eyebrow: 'SETS — CORE',
    style: 'ls', baseColor: BLACK, artSpec: null, artScale: 1,
    marks: topMarks(BONE_MARK), price: price(132), sizes: SIZES,
    pieces: [{ style: 'shorts', marks: bottomMarks(BONE_MARK) }],
    copy: [
      'Core long sleeve and core shorts, both black. The set is the two pieces, not a discount.',
      P_SPEC,
      P_FIT,
    ],
  },
]);

export function findProduct(id) {
  return PRODUCTS.find(p => p.id === id) || null;
}

export function productsByLine(line) {
  return PRODUCTS.filter(p => p.line === line);
}

