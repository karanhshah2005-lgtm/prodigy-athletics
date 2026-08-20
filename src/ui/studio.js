/**
 * studio.js — Prodigy Athletics Studio UI.
 * Owns: studio.html / studio.js / studio.css only. Consumes src/render/*.js as a
 * library — never edits it. See docs/AGENT-CONTEXT.md for the module contract.
 */

import {
  renderGarment, renderRanked, slotsFor, STYLES, BELT_HEX, BASE_PRESETS, estimateRankCoverage,
} from '../render/garment.js';
import { fileToArt, artPatternDef, artPatternRef, DEFAULT_TRANSFORM, demoArt } from '../render/art.js';
import { resolveArtInput, classifyInput, PIN_HELP } from '../render/linkart.js';
import { svgToPng, downloadBlob, composeGrid } from '../render/export.js';

// panel.js (cut sheet) may still be mid-write by another agent — load it lazily
// and degrade gracefully if it isn't there yet (per task brief).
let panelModulePromise = null;
function loadPanelModule() {
  if (!panelModulePromise) {
    panelModulePromise = import('../render/panel.js').catch((e) => {
      console.warn('panel.js not available yet — cut sheet view will retry on next open.', e);
      return null;
    });
  }
  return panelModulePromise;
}

// ───────────────────────────── state ─────────────────────────────

const state = {
  style: 'ss',
  view: 'front',           // 'front' | 'back' — drives slotsFor(); art is stored per this
  canvasTab: 'front',      // 'front' | 'back' | 'spin' | 'cutsheet' — what the canvas currently shows
  baseColor: BASE_PRESETS.black,
  aop: false,
  ranked: { on: false, belt: 'blue', body: 'black' },
  art: {},                 // { [slotKey]: { art, transform:{scale,rotate,x,y}, tile } } — for state.style
  activeSlot: 'all',
  activePanel: 'style',    // style | art | colour | ranked | scenes | export
  sheetOpen: false,        // mobile bottom-sheet visibility
  scenesSelected: { front: true, back: true, cutsheet: false, grid: false, set: false },
  onboardDone: false,      // once artwork has landed the onboarding card never returns this session
  artSteps: { add: true, placement: true, adjust: true },   // <details open> state for Art panel steps 1/2/3
  linkStatus: { msg: '', kind: '' },             // mirrored into every .link-status node
};

/** The honest disclosure that sits under BOTH link inputs. Verbatim, do not soften. */
const LINK_NOTE = 'Pinterest blocks direct reads, so pin links go through a public reader (10–20 s). '
  + 'Faster: right-click the image on Pinterest → Copy image → Ctrl+V here.';
state.linkStatus.msg = LINK_NOTE;

/**
 * The three honesty rows the cut sheet itself carries (src/render/panel.js), mirrored
 * here verbatim so they are legible in the studio and not only in the exported PNG.
 * Keep in sync with panel.js if that file's rows ever change.
 */
const CUT_SHEET_NOTES = [
  { key: 'BLEED', text: 'drawn at approx. 8 mm equivalent — this sheet has no established real-world scale; confirm bleed with your printer' },
  { key: 'FABRIC', text: 'category default, not a confirmed spec: 100% polyester, sublimation-ready, white base — dark blanks cannot be sublimated' },
  { key: 'NOTE', text: 'Cross-seam alignment is confirmed at sampling, not on this sheet.' },
];

const SCENES = [
  { key: 'front', label: 'Front' },
  { key: 'back', label: 'Back' },
  { key: 'cutsheet', label: 'Cut sheet' },
  { key: 'grid', label: 'Colourway grid' },
  { key: 'set', label: 'Set view' },
];

// Monochrome inline glyphs — currentColor, so the rail's active gold state tints them.
// (No emoji anywhere in the UI: docs/DESIGN-SYSTEM.md copy rules.)
function glyph(paths, { fillRule = '' } = {}) {
  return `<svg class="ico" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"
    fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"${fillRule}>${paths}</svg>`;
}
const ICONS = {
  shirt: glyph('<path d="M9 3.2 4.8 5.1 3 8.6l3.1 1.7V21h11.8V10.3L21 8.6l-1.8-3.5L15 3.2a3 3 0 0 1-6 0Z"/>'),
  image: glyph('<rect x="3" y="4.5" width="18" height="15" rx="1.6"/><circle cx="8.4" cy="10" r="1.5"/><path d="m3.6 17.6 4.9-4.6 3.4 3.2 3.4-3.6 5.1 5"/>'),
  drop: glyph('<path d="M12 3.2c0 0 6 6.3 6 10.1a6 6 0 0 1-12 0c0-3.8 6-10.1 6-10.1Z"/><path d="M9 13.6a3 3 0 0 0 3 3"/>'),
  belt: glyph('<rect x="2.5" y="9" width="19" height="6" rx="1.2"/><rect x="9" y="7.2" width="6" height="9.6" rx="1.2"/><path d="M12 10.6v2.8"/>'),
  download: glyph('<path d="M12 3.5v11.2"/><path d="m7.4 10.6 4.6 4.6 4.6-4.6"/><path d="M4.2 19.8h15.6"/>'),
  grid: glyph('<rect x="3" y="3" width="18" height="18" rx="1.6"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>'),
  link: glyph('<path d="M9.6 14.4 14.4 9.6"/><path d="m11.2 7.4 1.9-1.9a3.8 3.8 0 0 1 5.4 5.4l-1.9 1.9"/><path d="m12.8 16.6-1.9 1.9a3.8 3.8 0 0 1-5.4-5.4l1.9-1.9"/>'),
};

const PANEL_ITEMS = [
  { key: 'style', label: 'Style', icon: ICONS.shirt },
  { key: 'art', label: 'Art', icon: ICONS.image },
  { key: 'colour', label: 'Colour', icon: ICONS.drop },
  { key: 'ranked', label: 'Ranked', icon: ICONS.belt },
];
// Desktop rail: no Export entry. The scenes rail on the right is permanently visible at
// ≥1024px and already carries the picker AND the Export button; a rail entry rendered a
// second identical gold "Export selected" into the left panel at the same time.
const RAIL_ITEMS = PANEL_ITEMS;
// Mobile strip: there is no scenes rail below 1024px, so Scenes + Export live here.
const TAB_ITEMS = [...PANEL_ITEMS, { key: 'scenes', label: 'Scenes', icon: ICONS.grid }, { key: 'export', label: 'Export', icon: ICONS.download }];

const gridSetCache = { grid: null, set: null };
let gridSetDebounce = null;

// ───────────────────────────── DOM refs ─────────────────────────────

const iconRailEl = document.getElementById('iconRail');
const tabStripEl = document.getElementById('tabStrip');
const contextualPanelEl = document.getElementById('contextualPanel');
const viewSwitcherEl = document.getElementById('viewSwitcher');
const canvasStageEl = document.getElementById('canvasStage');
const svgHostEl = document.getElementById('svgHost');
const overlayHostEl = document.getElementById('overlayHost');
const dragLayerEl = document.getElementById('dragLayer');
const cutsheetNotesEl = document.getElementById('cutsheetNotes');
const scenesRailEl = document.getElementById('scenesRail');
const toastHostEl = document.getElementById('toastHost');
const fileInputEl = document.getElementById('fileInput');
const onboardCardEl = document.getElementById('onboardCard');

const cropModalEl = document.getElementById('cropModal');
const cropImgEl = document.getElementById('cropImg');
const cropStageEl = document.getElementById('cropStage');
const cropBoxEl = document.getElementById('cropBox');
const cropSquareEl = document.getElementById('cropSquare');
const cropPreviewEl = document.getElementById('cropPreview');
const cropCancelEl = document.getElementById('cropCancel');
const cropFullEl = document.getElementById('cropFull');
const cropApplyEl = document.getElementById('cropApply');

// ───────────────────────────── small utils ─────────────────────────────

function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function shortLabel(label) { return label.replace(/\s*\([^)]*\)\s*/g, '').toUpperCase(); }
function isPanelSlot(slotDef) { return !!slotDef && slotDef.piece && slotDef.piece !== 'whole garment' && !slotDef.zone; }

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  toastHostEl.appendChild(t);
  setTimeout(() => t.remove(), 3400);
}

// ───────────────────────────── slot / art helpers ─────────────────────────────

function visibleSlots(style = state.style, view = state.view) {
  const list = slotsFor(style, view);
  if (!state.aop) return list;
  return list.filter((s) => s.key === 'all' || s.zone);
}

function ensureActiveSlot() {
  const vis = visibleSlots();
  if (!vis.some((s) => s.key === state.activeSlot)) {
    state.activeSlot = vis[0] ? vis[0].key : 'all';
  }
}

function rankedAutoSlotKeys() {
  const fam = STYLES[state.style] && STYLES[state.style].family;
  if (fam === 'rashguard') return new Set(['sleeveL', 'sleeveR', 'collar']);
  if (fam === 'shorts' || fam === 'spats') return new Set(['waistband']);
  return new Set();
}

function setStyle(newStyle) {
  if (!STYLES[newStyle] || newStyle === state.style) return;
  const keep = ['all', 'chest', 'upperBack'];
  const newKeys = new Set([...slotsFor(newStyle, 'front'), ...slotsFor(newStyle, 'back')].map((s) => s.key));
  const newArt = {};
  for (const k of keep) if (state.art[k] && newKeys.has(k)) newArt[k] = state.art[k];
  state.style = newStyle;
  state.art = newArt;
  invalidateGridSetCache();
  render();
}

function setCanvasTab(tab) {
  state.canvasTab = tab;
  if (tab === 'front' || tab === 'back') state.view = tab;
  render();
}

/** Build concatenated <pattern> defs + a slots paint map for one style/view, from an art bucket. */
function buildDefsAndSlots(style, view, uid, artBucket) {
  const bucket = artBucket || state.art;
  const list = slotsFor(style, view);
  let defs = '';
  const slots = {};
  for (const s of list) {
    const entry = bucket[s.key];
    if (!entry || !entry.art) continue;
    defs += artPatternDef({ uid, key: s.key, art: entry.art, transform: entry.transform || DEFAULT_TRANSFORM, tile: entry.tile !== false, bbox: s.bbox });
    slots[s.key] = artPatternRef({ uid, key: s.key });
  }
  return { defs, slots };
}

function buildGarmentSvg({ style, view, uid, size = 1000, detail = 'full', artBucket }) {
  const { defs, slots } = buildDefsAndSlots(style, view, uid, artBucket);
  if (state.ranked.on) {
    return renderRanked({ style, view, belt: state.ranked.belt, body: state.ranked.body, uid, size, detail, defs, slots });
  }
  return renderGarment({ style, view, baseColor: state.baseColor, slots, uid, size, detail, defs });
}

function assignArtToActiveSlot(art, { repeat = false } = {}) {
  const slotDef = visibleSlots().find((s) => s.key === state.activeSlot) || slotsFor(state.style, state.view)[0];
  if (slotDef) state.activeSlot = slotDef.key;
  // Panel pieces repeat by default (a sleeve panel reads as fabric). The whole-garment
  // 'all' slot does NOT: a user's own image tiled 2.5× across the torso was the first
  // thing they saw, seams and all. Generated demo patterns pass repeat:true — they are
  // drawn to repeat.
  const tile = isPanelSlot(slotDef) ? true : (slotDef && slotDef.key === 'all' ? !!repeat : false);
  state.art[state.activeSlot] = { art, transform: { ...DEFAULT_TRANSFORM }, tile };
  state.onboardDone = true;          // artwork has landed — the onboarding card is done for the session
  // Hand the user straight to the controls they now need. Without this the panel stayed
  // on Style and "adjust the scale" had no visible entry point at all.
  state.activePanel = 'art';
  state.artSteps.add = false;        // step 1 collapses once there IS artwork
  state.artSteps.adjust = true;
  if (matchMedia('(max-width: 1023px)').matches) state.sheetOpen = true;
  invalidateGridSetCache();
  render();
}

function loadSampleData() {
  const demo = demoArt('geo');
  const slotDef = visibleSlots().find((s) => s.key === state.activeSlot) || slotsFor(state.style, state.view)[0];
  state.activeSlot = slotDef ? slotDef.key : 'all';
  state.art[state.activeSlot] = { art: demo, transform: { ...DEFAULT_TRANSFORM }, tile: !isPanelSlot(slotDef) && slotDef.key !== 'all' ? false : true };
  if (STYLES[state.style].family === 'rashguard') {
    const zoneKey = state.view === 'front' ? 'chest' : 'upperBack';
    if (zoneKey !== state.activeSlot) {
      state.art[zoneKey] = { art: demoArt('mark'), transform: { ...DEFAULT_TRANSFORM }, tile: false };
    }
  }
  state.ranked.on = true;
  state.ranked.belt = 'blue';
  state.onboardDone = true;
  invalidateGridSetCache();
  showToast('Sample data loaded — placeholder artwork, not a client asset.');
  render();
}

// ───────────────────────────── coverage estimator ─────────────────────────────

function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return [0, 0, 0];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0; const l = (max + min) / 2;
  const d = max - min;
  let s = 0;
  if (d) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return [h, s, l];
}
function colorMatchesBelt(r, g, b, beltRgb) {
  const [h1, s1, l1] = rgbToHsl(r, g, b);
  const [h2, s2, l2] = rgbToHsl(beltRgb[0], beltRgb[1], beltRgb[2]);
  const dl = Math.abs(l1 - l2);
  if (s2 < 0.14) return dl < 0.15 && s1 < 0.22; // achromatic belt (white / black)
  let dh = Math.abs(h1 - h2); if (dh > 180) dh = 360 - dh;
  return dh < 16 && dl < 0.16 && s1 > 0.12;
}


/** Same two auto-flip rules as garment.js renderRanked — keeps the control honest. */
function effectiveBody(belt, body) {
  if (belt === 'black' && body === 'black') return 'white';
  if (belt === 'white' && body === 'white') return 'black';
  return body;
}

/** "1800 × 2400 px · 6 × 8 in @ 300 dpi" — sublimation artwork is normally supplied at 300 dpi. */
const PRINT_DPI = 300;
function printSizeLabel(printPx, { brief = false } = {}) {
  const [w, h] = printPx;
  const win = Math.round(w / PRINT_DPI * 10) / 10, hin = Math.round(h / PRINT_DPI * 10) / 10;
  return brief
    ? `${w} &times; ${h} px &middot; ${win} &times; ${hin} in`
    : `${w} &times; ${h} px &middot; ${win} &times; ${hin} in @ ${PRINT_DPI} dpi`;
}

async function computeCoveragePct() {
  // Belt-INDEPENDENT area estimate: render an unshaded (detail:'flat') mask of the
  // same construction with the rank-coloured slots painted a marker colour and
  // everything else dark, then count marker pixels over garment pixels — front and
  // back both, since the rule is about the garment's surface, not one photo of it.
  // (Colour-matching the shaded render was biased: multiply shading darkened white
  // sleeves out of the match window and under-reported white/blue belts.)
  const MARK = '#FF00FF';
  const rankKeys = [...rankedAutoSlotKeys()].filter((k) => !(state.art[k] && state.art[k].art));
  const markSlots = {};
  for (const k of rankKeys) markSlots[k] = MARK;
  // user-art slots occlude rank colour: paint them dark so they never count
  for (const k of Object.keys(state.art)) if (state.art[k] && state.art[k].art && k !== 'all') markSlots[k] = '#101010';
  let total = 0, match = 0;
  for (const view of ['front', 'back']) {
    const uid = 'cov-' + view;
    const svg = renderGarment({ style: state.style, view, baseColor: '#101010', slots: markSlots, uid, size: 200, detail: 'flat' });
    const blob = await svgToPng(svg, { width: 200, height: 200 });
    const bitmap = await createImageBitmap(blob);
    const c = document.createElement('canvas');
    c.width = 200; c.height = 200;
    const ctx = c.getContext('2d');
    ctx.drawImage(bitmap, 0, 0);
    if (bitmap.close) bitmap.close();
    const { data } = ctx.getImageData(0, 0, 200, 200);
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 200) continue;
      total++;
      if (data[i] > 200 && data[i + 1] < 80 && data[i + 2] > 200) match++;
    }
    c.width = c.height = 0;
  }
  if (!total) throw new Error('no opaque pixels sampled');
  return Math.round((match / total) * 100);
}

function fallbackCoveragePct() {
  const rankKeys = [...rankedAutoSlotKeys()];
  const painted = rankKeys.filter((k) => !(state.art[k] && state.art[k].art));
  const frac = estimateRankCoverage({ style: state.style, slotsPainted: painted });
  return Math.round(frac * 100);
}

let coverageToken = 0;
async function refreshCoverage() {
  const pctEl0 = document.getElementById('coveragePct');
  if (!pctEl0) return;
  const myToken = ++coverageToken;
  let pct;
  try { pct = await computeCoveragePct(); }
  catch (e) { console.warn('pixel coverage estimate failed, using geometry fallback', e); pct = fallbackCoveragePct(); }
  if (myToken !== coverageToken) return; // superseded by a newer request
  const pctEl = document.getElementById('coveragePct');
  if (pctEl) pctEl.textContent = `approx. ${pct}%`;
}

// ───────────────────────────── export scenes ─────────────────────────────

function setPairStyles() {
  if (state.style === 'shorts' || state.style === 'spats') return { top: 'ss', bottom: state.style };
  return { top: state.style, bottom: 'shorts' };
}

async function buildGridBlob(cellSize) {
  const belts = ['white', 'blue', 'purple', 'brown', 'black'];
  const svgs = belts.map((b) => {
    const uid = 'grid-' + b;
    const { defs, slots } = buildDefsAndSlots(state.style, 'front', uid);
    return renderRanked({ style: state.style, view: 'front', belt: b, body: state.ranked.body, uid, size: 500, detail: 'lite', defs, slots });
  });
  return composeGrid(svgs, { cols: 5, cellSize, labels: belts.map(cap), title: `${STYLES[state.style].short} — ranked colourways` });
}

function garmentSvgFor(style, uid, cellSize, artBucket) {
  const { defs, slots } = buildDefsAndSlots(style, 'front', uid, artBucket);
  return state.ranked.on
    ? renderRanked({ style, view: 'front', belt: state.ranked.belt, body: state.ranked.body, uid, size: cellSize, detail: 'lite', defs, slots })
    : renderGarment({ style, view: 'front', baseColor: state.baseColor, slots, uid, size: cellSize, detail: 'lite', defs });
}

async function buildSetBlob(cellSize) {
  const { top, bottom } = setPairStyles();
  const allEntry = state.art.all;
  const artBucket = allEntry && allEntry.art ? { all: allEntry } : {};
  const svgTop = garmentSvgFor(top, 'set-top', cellSize, artBucket);
  const svgBottom = garmentSvgFor(bottom, 'set-bottom', cellSize, artBucket);
  return composeGrid([svgTop, svgBottom], { cols: 2, cellSize, labels: [STYLES[top].short, STYLES[bottom].short], title: `${STYLES[top].short} + ${STYLES[bottom].short} set` });
}

function invalidateGridSetCache() {
  if (gridSetCache.grid) URL.revokeObjectURL(gridSetCache.grid);
  if (gridSetCache.set) URL.revokeObjectURL(gridSetCache.set);
  gridSetCache.grid = null;
  gridSetCache.set = null;
}

function scheduleGridSetThumb(key) {
  if (gridSetDebounce) clearTimeout(gridSetDebounce);
  gridSetDebounce = setTimeout(async () => {
    try {
      const blob = key === 'grid' ? await buildGridBlob(90) : await buildSetBlob(90);
      const url = URL.createObjectURL(blob);
      if (gridSetCache[key]) URL.revokeObjectURL(gridSetCache[key]);
      gridSetCache[key] = url;
    } catch (e) { console.warn('scene thumbnail build failed:', key, e); }
    render();
  }, 300);
}

function sceneThumbHTML(key) {
  if (key === 'front' || key === 'back') {
    return buildGarmentSvg({ style: state.style, view: key, uid: 'sc-' + key, size: 140, detail: 'lite' });
  }
  if (key === 'cutsheet') {
    return `<span class="loading-txt">CUT<br>SHEET</span>`;
  }
  if (key === 'grid' || key === 'set') {
    if (gridSetCache[key]) return `<img src="${gridSetCache[key]}" alt="">`;
    scheduleGridSetThumb(key);
    return `<span class="loading-txt">&hellip;</span>`;
  }
  return '';
}

async function buildSceneBlob(key) {
  if (key === 'front' || key === 'back') {
    const svg = buildGarmentSvg({ style: state.style, view: key, uid: 'exp-' + key, size: 1000, detail: 'full' });
    return svgToPng(svg, { width: 2400 });
  }
  if (key === 'cutsheet') {
    const mod = await loadPanelModule();
    if (!mod) throw new Error('cut sheet module is not ready yet');
    const uid = 'exp-sheet';
    const { defs, slots } = buildDefsAndSlots(state.style, state.view, uid);
    const svg = mod.renderCutSheet({ style: state.style, slots, baseColor: state.baseColor, uid, defs });
    return svgToPng(svg, { width: 2600 });
  }
  if (key === 'grid') return buildGridBlob(700);
  if (key === 'set') return buildSetBlob(700);
  throw new Error('unknown scene ' + key);
}

async function exportSelected() {
  const chosen = SCENES.filter((s) => state.scenesSelected[s.key]);
  const setStatus = (msg, busy) => {
    document.querySelectorAll('.export-status').forEach((el) => {
      el.textContent = msg;
      el.classList.toggle('busy', !!busy);
    });
  };
  if (!chosen.length) { setStatus('Pick at least one scene to export.', false); return; }
  for (let i = 0; i < chosen.length; i++) {
    const s = chosen[i];
    setStatus(`Exporting ${s.label} (${i + 1} / ${chosen.length})…`, true);
    await new Promise((r) => setTimeout(r, 20)); // let the status line paint before the heavy work
    try {
      const blob = await buildSceneBlob(s.key);
      downloadBlob(blob, `prodigy-${state.style}-${s.key}.png`);
    } catch (e) {
      console.error('export failed:', s.key, e);
      setStatus(`Could not export ${s.label}: ${e.message}`, false);
      showToast(`Export failed: ${s.label}`);
      return;
    }
  }
  setStatus(`Sent ${chosen.length} PNG${chosen.length > 1 ? 's' : ''} to your browser downloads — check the download bar.`, false);
}

// ───────────────────────────── panel builders ─────────────────────────────

function buildStylePanel() {
  const styles = ['ls', 'ss', 'shorts', 'spats'];
  const cards = styles.map((k) => {
    const svg = renderGarment({ style: k, size: 120, detail: 'lite', uid: 'thumb-' + k });
    const active = state.style === k ? 'active' : '';
    return `<button type="button" class="style-card ${active}" data-action="set-style" data-style="${k}">${svg}<div class="style-card-label">${esc(STYLES[k].short)}</div></button>`;
  }).join('');
  return `
    <div class="panel-section">
      <div class="panel-title">Style</div>
      <div class="style-grid">${cards}</div>
    </div>
    <div class="panel-section">
      <label class="toggle-row"><input type="checkbox" data-action="toggle-aop" ${state.aop ? 'checked' : ''}> Simple mode</label>
      <div class="panel-note">Hides the individual panel print areas. The all-over print and the chest logo zone stay, so one artwork covers the whole garment.</div>
    </div>`;
}

function buildActiveSlotControls(slotDef, entry) {
  if (!slotDef) return `<div class="slot-empty-note">No print area selected.</div>`;
  if (!entry || !entry.art) {
    return `<div class="slot-empty-note">No artwork yet. Upload a file or try a sample above — it will appear here.</div>`;
  }
  const t = entry.transform;
  const scalePct = Math.round(t.scale * 100);
  // The whole-garment slot gets the toggle too — it is the slot most likely to be handed
  // a photo or a logo, where a repeat is the wrong answer.
  const canRepeat = isPanelSlot(slotDef) || slotDef.key === 'all';
  return `
    <div class="control-row">
      <div class="control-label"><span>Scale</span></div>
      <div class="control-inline">
        <input type="range" id="scaleRange" min="10" max="300" step="1" value="${scalePct}">
        <input type="number" id="scaleNum" min="10" max="300" value="${scalePct}"> %
      </div>
    </div>
    <div class="control-row">
      <div class="control-label"><span>Rotation</span></div>
      <div class="dial-wrap">
        <div class="rotate-dial" id="rotateDial"><div class="dial-knob" id="dialKnob" style="transform:rotate(${t.rotate}deg)"></div></div>
        <input type="range" id="rotateRange" min="0" max="359" step="1" value="${Math.round(t.rotate)}" aria-label="Rotation">
        <div class="control-inline"><input type="number" id="rotateNum" min="0" max="359" step="1" value="${Math.round(t.rotate)}"><span>&deg;</span></div>
      </div>
    </div>
    <div class="control-row">
      <div class="control-label"><span>Position</span></div>
      <div class="panel-note" style="margin-top:0">Drag the garment on the canvas to move the artwork.</div>
      <button type="button" class="btn btn--secondary btn-block" data-action="recenter">Back to centre</button>
    </div>
    ${canRepeat ? `<label class="toggle-row"><input type="checkbox" data-action="toggle-tile" ${entry.tile !== false ? 'checked' : ''}> Repeat artwork</label>
    <div class="panel-note">Off places one copy, scaled to the print area. On repeats it as a pattern.</div>` : ''}
    <button type="button" class="btn btn--secondary btn-block btn-remove" data-action="remove-art">Remove artwork</button>`;
}

/** The "from a link" block — rendered in the Art panel, above the upload zone. */
function buildLinkBox() {
  return `
    <div class="link-box" id="linkBox">
      <div class="link-label">${ICONS.link}<span>From Pinterest or any image link</span></div>
      <div class="link-row">
        <label class="sr-only" for="linkInput">Pinterest pin or image link</label>
        <input type="url" class="link-input" id="linkInput" placeholder="Paste a pin or image link&hellip;" autocomplete="off" spellcheck="false" value="${esc(linkFieldValue)}">
        <button type="button" class="btn btn--primary" data-action="fetch-link">Fetch</button>
      </div>
      <div class="link-status${state.linkStatus.kind ? ' is-' + state.linkStatus.kind : ''}" aria-live="polite">${esc(state.linkStatus.msg)}</div>
    </div>`;
}

function buildArtPanel() {
  const vis = visibleSlots();
  const rows = vis.map((s) => {
    const entry = state.art[s.key];
    const active = s.key === state.activeSlot ? 'active' : '';
    const thumb = entry && entry.art ? `<img src="${entry.art.dataUrl}" alt="">` : 'empty';
    return `<button type="button" class="slot-row ${active}" data-action="set-active-slot" data-key="${s.key}" aria-pressed="${s.key === state.activeSlot}">
      <span class="slot-thumb">${thumb}</span>
      <span class="slot-meta">
        <span class="slot-name">${esc(s.label)}</span>
        <span class="slot-size">${printSizeLabel(s.printPx)}</span>
      </span>
    </button>`;
  }).join('');

  const activeSlotDef = vis.find((s) => s.key === state.activeSlot);
  const activeEntry = state.art[state.activeSlot];
  const placedCount = vis.filter((s) => state.art[s.key] && state.art[s.key].art).length;
  const hasAnyArt = Object.keys(state.art).some((k) => state.art[k] && state.art[k].art);
  // Step 1 is ~430px tall. Once there IS artwork it collapses, so Placement and Adjust —
  // the controls the user now needs — sit above the fold instead of below the input they
  // have already finished with.
  const addOpen = (!hasAnyArt || state.artSteps.add) ? 'open' : '';
  const addMeta = activeEntry && activeEntry.art ? esc(activeEntry.art.name || 'Artwork placed') : '';

  return `
    <details class="panel-section step" data-step="add" ${addOpen}>
      <summary><p class="eyebrow">1 &mdash; Add artwork</p><span class="step-meta">${addMeta}</span></summary>
      <div class="step-body">
      ${buildLinkBox()}
      <div class="upload-zone" id="uploadZone" data-action="browse" role="button" tabindex="0">
        Drop an image here or <b>browse</b>
        <div class="hint">PNG &middot; JPG &middot; WebP &middot; SVG &middot; or paste with Ctrl+V</div>
      </div>
      <p class="eyebrow sample-label">Or try sample art</p>
      <div class="sample-buttons">
        <button type="button" data-action="use-demo" data-kind="geo">Geo</button>
        <button type="button" data-action="use-demo" data-kind="camo">Camo</button>
        <button type="button" data-action="use-demo" data-kind="mark">Mark</button>
      </div>
      <div class="panel-note">Sample artwork is placeholder art generated in the browser, not a client asset.</div>
      </div>
    </details>

    <details class="panel-section step" data-step="placement" ${state.artSteps.placement ? 'open' : ''}>
      <summary><p class="eyebrow">2 &mdash; Placement</p><span class="step-meta">${placedCount} of ${vis.length} filled</span></summary>
      <div class="step-body">
        <div class="slot-list">${rows}</div>
        <div class="panel-note">Each print area shows the artwork size the factory receives at 300 dpi.</div>
      </div>
    </details>

    <details class="panel-section step" data-step="adjust" ${state.artSteps.adjust ? 'open' : ''}>
      <summary><p class="eyebrow">3 &mdash; Adjust</p><span class="step-meta">${activeSlotDef ? esc(shortLabel(activeSlotDef.label)) : ''}</span></summary>
      <div class="step-body active-slot-controls">
        ${buildActiveSlotControls(activeSlotDef, activeEntry)}
      </div>
    </details>`;
}

function buildColourPanel() {
  const presetEntries = Object.entries(BASE_PRESETS);
  const isCustom = !presetEntries.some(([, hex]) => hex.toLowerCase() === state.baseColor.toLowerCase());
  const swatches = presetEntries.map(([name, hex]) => {
    const active = !isCustom && hex.toLowerCase() === state.baseColor.toLowerCase();
    return `<button type="button" class="swatch ${active ? 'active' : ''}" style="background:${hex}" title="${esc(cap(name))}" data-action="set-basecolor" data-color="${hex}"></button>`;
  }).join('');
  const rankedNote = state.ranked.on
    ? `<div class="panel-note warn">Ranked mode is on — body colour comes from the Belt/Body picker in the Ranked panel while it's active.</div>` : '';
  return `
    <div class="panel-section">
      <div class="panel-title">Base colour</div>
      <div class="swatch-row">${swatches}</div>
      <div class="custom-color-row">
        <input type="color" id="customColorInput" value="${/^#([0-9a-f]{6})$/i.test(state.baseColor) ? state.baseColor : '#14161b'}">
        <span>Custom</span>
      </div>
      <div class="panel-note">Sublimation prints on white polyester — the base colour is part of the artwork, so any colour costs the same.</div>
      ${rankedNote}
    </div>`;
}

function buildRankedPanel() {
  const belts = ['white', 'blue', 'purple', 'brown', 'black'];
  const beltChips = belts.map((b) => `<button type="button" class="belt-swatch ${state.ranked.belt === b ? 'active' : ''}" data-action="set-belt" data-belt="${b}">
      <span class="chip" style="background:${BELT_HEX[b]}"></span>${cap(b)}
    </button>`).join('');
  const effBody = effectiveBody(state.ranked.belt, state.ranked.body);
  const coverageBlock = state.ranked.on
    ? `<div class="coverage-box">
        <div class="coverage-pct" id="coveragePct">approx. &hellip;%</div>
        <div class="coverage-label">rank colour — IBJJF Art. 8.1.14 requires at least 10%.</div>
        <div class="coverage-caveat">Area estimate from the garment geometry, not a measurement of a physical sample, and not a legality ruling — inspection at weigh-in is a visual call by tournament officials.</div>
      </div>`
    : `<div class="coverage-box"><div class="panel-note" style="margin:0">Turn on Ranked mode to see the coverage estimate.</div></div>`;
  return `
    <div class="panel-section">
      <label class="toggle-row"><input type="checkbox" data-action="toggle-ranked" ${state.ranked.on ? 'checked' : ''}> Ranked mode</label>
      <div class="panel-note">Your confirmed line: belt-ranked short-sleeve in five colours (white, blue, purple, brown, black).</div>
    </div>
    <div class="panel-section">
      <div class="panel-title">Belt colour</div>
      <div class="belt-row">${beltChips}</div>
      <div class="panel-title">Body</div>
      <div class="body-row">
        <button type="button" class="body-btn ${effBody === 'black' ? 'active' : ''}" data-action="set-body" data-body="black">Black${effBody === 'black' && state.ranked.body !== 'black' ? ' (auto)' : ''}</button>
        <button type="button" class="body-btn ${effBody === 'white' ? 'active' : ''}" data-action="set-body" data-body="white">White${effBody === 'white' && state.ranked.body !== 'white' ? ' (auto)' : ''}</button>
      </div>
      <div class="panel-note">Auto-flips: a black belt on a black body switches the body to white, and a white belt on a white body switches it to black, so the rank colour stays legible.</div>
    </div>
    <div class="panel-section">
      ${coverageBlock}
      <details class="rule-details">
        <summary>Rule text</summary>
        <div class="rule-quote">&ldquo;Both genders must wear a shirt of elastic material (skin tight) long enough to cover the torso all the way to the waistband of the shorts, colored black, white, or black and white, and with at least 10% of the rank color(belt) to which the athlete belongs.&rdquo;</div>
        <a href="https://ibjjf.com/books-videos" target="_blank" rel="noopener">IBJJF books &amp; videos</a>
      </details>
      <details class="myth-details">
        <summary>Common myths</summary>
        <ul>
          <li>There's no IBJJF rule capping sponsor logos at 50% on a rashguard — the patch-size rules are for the gi, not rashguards.</li>
          <li>There's no rule text specifying rashguard sleeve length, or banning sleeveless designs.</li>
        </ul>
      </details>
    </div>`;
}

function renderScenesPickerHTML() {
  const rows = SCENES.map((s) => {
    const checked = state.scenesSelected[s.key] ? 'checked' : '';
    return `<label class="scene-row">
      <input type="checkbox" data-action="toggle-scene" data-scene="${s.key}" ${checked}>
      <span class="scene-thumb">${sceneThumbHTML(s.key)}</span>
      <span class="scene-label">${esc(s.label)}</span>
    </label>`;
  }).join('');
  return `<div class="panel-section" style="border-top:none;margin-top:0;padding-top:0;">
    <div class="panel-title">Scenes</div>
    <div class="scene-list">${rows}</div>
  </div>`;
}

function exportSummaryText() {
  const sel = SCENES.filter((sc) => state.scenesSelected[sc.key]);
  return sel.length
    ? `${sel.length} scene${sel.length > 1 ? 's' : ''}: ${sel.map((sc) => sc.label).join(', ')}`
    : 'No scenes selected — tick them under Scenes.';
}

/**
 * Ticking a scene only changes a checkbox and one summary line. A full render() rebuilt
 * both scene lists (re-rendering every thumbnail) and threw keyboard focus away, so this
 * patches the two things that actually moved and syncs the duplicate picker on mobile.
 */
function syncSceneSelectionUI(sourceEl) {
  document.querySelectorAll('[data-action="toggle-scene"]').forEach((cb) => {
    if (cb !== sourceEl) cb.checked = !!state.scenesSelected[cb.dataset.scene];
  });
  document.querySelectorAll('.export-summary').forEach((el) => { el.textContent = exportSummaryText(); });
  document.querySelectorAll('[data-action="export-selected"]').forEach(applyExportEmphasis);
}

/**
 * Before there is anything to export, Export is not the primary act — the link box is.
 * A gold block 3.9× the area of the real CTA was the loudest thing on an empty studio,
 * and DESIGN-SYSTEM.md §1 caps gold at three visible instances.
 */
function applyExportEmphasis(btn) {
  if (!btn) return;
  const quiet = !state.onboardDone;
  btn.classList.toggle('btn--primary', !quiet);
  btn.classList.toggle('btn--secondary', quiet);
}

function renderExportActionHTML() {
  const quiet = !state.onboardDone;
  return `<div class="panel-section" style="border-top:none;margin-top:0;padding-top:0;">
    <div class="panel-title">Export</div>
    <div class="export-summary">${esc(exportSummaryText())}</div>
    <button type="button" class="btn ${quiet ? 'btn--secondary' : 'btn--primary'} btn-block" data-action="export-selected">Export selected</button>
    <div class="export-status">${quiet ? 'No artwork placed yet — this exports the plain garment.' : ''}</div>
    <div class="panel-note">PNGs are web previews at 2000&ndash;3000 px. The cut sheet is a flat pattern starting point in the format factories send back &mdash; confirm scale and bleed with your printer.</div>
  </div>`;
}

function renderPanelBody(tab) {
  switch (tab) {
    case 'style': return buildStylePanel();
    case 'art': return buildArtPanel();
    case 'colour': return buildColourPanel();
    case 'ranked': return buildRankedPanel();
    case 'scenes': return renderScenesPickerHTML();
    case 'export': return renderExportActionHTML();
    default: return buildStylePanel();
  }
}

// ───────────────────────────── canvas ─────────────────────────────

function renderEmptyOverlays() {
  const vis = visibleSlots();
  const rankAuto = rankedAutoSlotKeys();
  let html = '';
  for (const s of vis) {
    const entry = state.art[s.key];
    const hasArt = !!(entry && entry.art);
    const isRankAuto = state.ranked.on && rankAuto.has(s.key) && !hasArt;
    if (hasArt || isRankAuto) continue;
    // Once an all-over print is placed the spec sheet has done its job — keep only
    // the ACTIVE slot's guide so labels never sit on top of the artwork.
    if (state.art.all && state.art.all.art && s.key !== state.activeSlot) continue;
    const [x, y, w, h] = s.bbox;
    const isActive = s.key === state.activeSlot;
    // 'all' spans the whole garment; pin its label to the top-left corner so it never
    // collides with the panel labels centred inside their own boxes.
    const anchorCls = s.key === 'all' ? ' is-whole' : '';
    html += `<div class="empty-slot-overlay ${isActive ? 'is-active' : ''}${anchorCls}" style="left:${x / 10}%;top:${y / 10}%;width:${w / 10}%;height:${h / 10}%">
      <span>${esc(shortLabel(s.label))}<br>${printSizeLabel(s.printPx, { brief: true })}</span>
    </div>`;
  }
  overlayHostEl.innerHTML = html;
}

function renderGarmentCanvas({ overlays = true } = {}) {
  cutsheetNotesEl.hidden = true;
  cutsheetNotesEl.innerHTML = '';
  const svg = buildGarmentSvg({ style: state.style, view: state.view, uid: 'studio', size: 1000, detail: 'full' });
  svgHostEl.innerHTML = svg;
  const activeEntry = state.art[state.activeSlot];
  dragLayerEl.classList.toggle('draggable', !!(activeEntry && activeEntry.art));
  if (overlays) renderEmptyOverlays();
}

async function renderCutSheetView() {
  overlayHostEl.innerHTML = '';
  dragLayerEl.classList.remove('draggable');
  const mod = await loadPanelModule();
  if (state.canvasTab !== 'cutsheet') return; // user navigated away while we awaited
  if (!mod) {
    svgHostEl.innerHTML = `<div class="slot-empty-note" style="padding:24px;text-align:center;">Cut sheet module loading&hellip;</div>`;
    cutsheetNotesEl.hidden = true;
    return;
  }
  const uid = 'sheet';
  const { defs, slots } = buildDefsAndSlots(state.style, state.view, uid);
  let svg;
  try {
    svg = mod.renderCutSheet({ style: state.style, slots, baseColor: state.baseColor, uid, defs });
  } catch (e) {
    console.error('renderCutSheet failed:', e);
    svgHostEl.innerHTML = `<div class="slot-empty-note" style="padding:24px;">Could not render the cut sheet.</div>`;
    return;
  }
  svgHostEl.innerHTML = svg;
  let warnings = [];
  try { warnings = mod.seamStraddleWarnings({ style: state.style, slots }) || []; } catch (e) { console.warn('seamStraddleWarnings failed:', e); }
  // The sheet's own honesty rows are 12px inside a 1820-unit viewBox — about 4 CSS px on
  // screen. They stay in the SVG for the exported PNG; these are the same three lines at a
  // size a person can actually read in the studio.
  const sheetNotes = CUT_SHEET_NOTES.map((n) => `<div class="sheet-note"><b>${esc(n.key)}</b> ${esc(n.text)}</div>`).join('');
  cutsheetNotesEl.hidden = false;
  cutsheetNotesEl.innerHTML = warnings.map((w) => `<div class="warn-item">${esc(w)}</div>`).join('') + sheetNotes;
}

function updateCanvas(opts) {
  if (state.canvasTab !== 'spin' && spin) disposeSpin();
  if (state.canvasTab === 'cutsheet') renderCutSheetView();
  else if (state.canvasTab === 'spin') renderSpinView();
  else renderGarmentCanvas(opts);
}

// ───────────────────────────── 360° view (WebGL, lazy) ─────────────────────────────
//
// The 360 shows the SAME render as the flat view. It does not re-derive the design:
// garment.js renders each physical piece unshaded (detail:'tex', part:'torso' |
// 'sleeveL' | 'sleeveR') for the front and the back, those six PNGs are handed to
// spin3d as `bake`, and the viewer wraps them onto the mesh. Anything the user places —
// all-over art, a body panel, the chest logo zone, their own scale / rotation / offset,
// ranked sleeve colours — therefore appears in the 360 exactly where it appears flat.
let spin = null, spinMod = null, spinHostEl = null;
let spinBakeTimer = null, spinBakeSeq = 0, spinBakeKey = null;
const BAKE_PX = 1024;

async function loadSpinModule() {
  if (spinMod) return spinMod;
  try { spinMod = await import('../render/spin3d.js'); } catch (e) { console.warn('spin3d unavailable', e); spinMod = null; }
  return spinMod;
}

function disposeSpin() {
  if (spinBakeTimer) { clearTimeout(spinBakeTimer); spinBakeTimer = null; }
  spinBakeSeq++;
  if (spin) { try { spin.dispose(); } catch { /* noop */ } }
  spin = null; spinHostEl = null; spinBakeKey = null;
}

/** Blobs taint nothing, but the viewer draws these into a canvas it reads back. */
function blobToDataUrl(blob) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(r.error || new Error('bake read failed'));
    r.readAsDataURL(blob);
  });
}

/** Everything that changes what is PRINTED. Cheap enough to run on every keystroke. */
function spinDesignKey() {
  const art = Object.keys(state.art).sort().map((k) => {
    const e = state.art[k];
    if (!e || !e.art) return null;
    const t = e.transform || DEFAULT_TRANSFORM;
    const d = e.art.dataUrl || '';
    return [k, d.length, d.slice(-32), e.tile !== false, t.scale, t.rotate, t.x, t.y];
  }).filter(Boolean);
  return JSON.stringify([state.style, state.baseColor, state.ranked.on, state.ranked.belt,
    state.ranked.body, art]);
}

/** The six unshaded piece renders the viewer wraps onto the mesh. */
async function buildSpinBake() {
  const style = state.style;
  const jobs = [];
  for (const view of ['front', 'back']) {
    const uid = `bk-${view}`;
    const { defs, slots } = buildDefsAndSlots(style, view, uid);
    for (const part of ['torso', 'sleeveL', 'sleeveR']) {
      const common = { style, view, uid, size: BAKE_PX, detail: 'tex', defs, slots, part };
      const svg = state.ranked.on
        ? renderRanked({ ...common, belt: state.ranked.belt, body: state.ranked.body })
        : renderGarment({ ...common, baseColor: state.baseColor });
      const name = part === 'torso' ? view : `${part}${view === 'front' ? 'Front' : 'Back'}`;
      jobs.push(svgToPng(svg, { width: BAKE_PX }).then(blobToDataUrl).then((url) => [name, url]));
    }
  }
  return Object.fromEntries(await Promise.all(jobs));
}

function setSpinNote(on) {
  const n = svgHostEl.querySelector('.spin-baking');
  if (n) n.hidden = !on;
}

/** Re-bake when the design changes. Debounced, and a no-op when nothing moved. */
function scheduleSpinBake(immediate = false) {
  if (spinBakeTimer) { clearTimeout(spinBakeTimer); spinBakeTimer = null; }
  if (spinDesignKey() === spinBakeKey) return;
  setSpinNote(true);
  const run = async () => {
    spinBakeTimer = null;
    const seq = ++spinBakeSeq;
    const key = spinDesignKey();
    try {
      const bake = await buildSpinBake();
      if (seq !== spinBakeSeq || !spin || state.canvasTab !== 'spin') return;
      spin.update({ ...spinOptsFromState(), bake });
      spinBakeKey = key;
    } catch (e) {
      console.warn('360 bake failed — showing the plain garment', e);
    } finally {
      if (seq === spinBakeSeq) setSpinNote(false);
    }
  };
  if (immediate) run(); else spinBakeTimer = setTimeout(run, 250);
}
function toneLight(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return false;
  const n = parseInt(m[1], 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.55;
}
/** Marks + colours for the 3D viewer, derived from the current studio state. */
function spinOptsFromState() {
  const rank = state.ranked.on ? BELT_HEX[state.ranked.belt] : null;
  return {
    style: (state.style === 'ls' || state.style === 'ss') ? state.style : 'ls',
    baseColor: state.ranked.on ? (effectiveBody(state.ranked.belt, state.ranked.body) === 'white' ? BASE_PRESETS.white : BASE_PRESETS.black) : state.baseColor,
    sleeveColor: rank || null,
    // sleeve text must contrast the SLEEVE, which in ranked mode is the belt colour
    sleeveTextColor: rank ? (['white'].includes(state.ranked.belt) ? '#0B1220' : '#F5F3EE') : (toneLight(state.baseColor) ? '#0B1220' : '#F5F3EE'),
    chestMarkColor: state.ranked.on ? '#E8A33D' : (toneLight(state.baseColor) ? '#0B1220' : '#F5F3EE'),
    // Art and marks come from the BAKE — the flat render is the source of truth for what
    // is printed, and the studio's flat view carries no brand marks, so neither does this.
    art: null, artTile: 3,
    sleeveText: null, chestMark: null, backText: null,
    autoRotate: true, speed: 0.6, background: 'transparent', quality: 'auto',
  };
}
const SPIN_NOTE_CSS = 'position:absolute;left:50%;top:14px;transform:translateX(-50%);'
  + 'padding:5px 11px;border-radius:99px;background:rgba(11,18,32,.78);color:#E8A33D;'
  + 'font:500 11px/1 "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.12em;'
  + 'pointer-events:none;z-index:3';

async function renderSpinView() {
  overlayHostEl.innerHTML = '';
  dragLayerEl.classList.remove('draggable');
  cutsheetNotesEl.hidden = true;
  const mod = await loadSpinModule();
  if (state.canvasTab !== 'spin') return;
  if (!mod || (state.style !== 'ls' && state.style !== 'ss')) {
    disposeSpin();
    svgHostEl.innerHTML = `<div class="slot-empty-note" style="padding:24px;text-align:center;">${mod ? '360° view is available for rashguards (long or short sleeve).' : '360° view needs WebGL — showing the flat render instead.'}</div>`;
    if (!mod) renderGarmentCanvas({ overlays: false });
    return;
  }
  // Re-mount only when there is nothing to keep: swapping textures on a live viewer is
  // what lets a scale drag re-bake without rebuilding the geometry or losing the pose.
  const mounted = spin && spinHostEl && svgHostEl.contains(spinHostEl);
  if (!mounted) {
    disposeSpin();
    svgHostEl.innerHTML = '<div id="spinHost" style="position:absolute;inset:0"></div>'
      + `<div class="spin-baking" style="${SPIN_NOTE_CSS}" hidden>BUILDING 360…</div>`
      + '<div class="spin-hint">DRAG TO SPIN</div>';
    const host = document.getElementById('spinHost');
    spin = mod.mountSpin(host, spinOptsFromState());
    if (host.dataset.spinFallback === '1') {
      svgHostEl.innerHTML = ''; renderGarmentCanvas({ overlays: false }); spin = null; return;
    }
    spinHostEl = host;
    if (spin.onInteract) spin.onInteract(() => { const h = svgHostEl.querySelector('.spin-hint'); if (h) h.style.opacity = '0'; });
  } else {
    spin.update(spinOptsFromState());
  }
  scheduleSpinBake(!mounted);
}

let canvasRaf = null;
function scheduleCanvasOnly() {
  if (canvasRaf) cancelAnimationFrame(canvasRaf);
  canvasRaf = requestAnimationFrame(() => { canvasRaf = null; updateCanvas({ overlays: false }); });
}

// ───────────────────────────── continuous controls (no full re-render) ─────────────────────────────

function bindScaleControls(container) {
  const range = container.querySelector('#scaleRange');
  const num = container.querySelector('#scaleNum');
  if (!range || !num) return;
  const apply = (pct) => {
    pct = clamp(Math.round(pct), 10, 300);
    const entry = state.art[state.activeSlot];
    if (!entry) return;
    entry.transform.scale = pct / 100;
    range.value = String(pct);
    num.value = String(pct);
    scheduleCanvasOnly();
  };
  range.addEventListener('input', () => apply(Number(range.value)));
  // While typing: only push in-range values to the model, and never rewrite the
  // field under the user's cursor (typing "150" used to become "300").
  num.addEventListener('input', () => {
    const v = Number(num.value);
    if (num.value === '' || !Number.isFinite(v) || v < 10 || v > 300) return;
    const entry = state.art[state.activeSlot];
    if (!entry) return;
    entry.transform.scale = v / 100;
    range.value = String(Math.round(v));
    scheduleCanvasOnly();
  });
  // On commit (blur / Enter): clamp once and normalise the display.
  num.addEventListener('change', () => { apply(Number(num.value) || 100); invalidateGridSetCache(); });
  range.addEventListener('change', invalidateGridSetCache);
}

function bindRotateControls(container) {
  const dial = container.querySelector('#rotateDial');
  const knob = container.querySelector('#dialKnob');
  const num = container.querySelector('#rotateNum');
  const range = container.querySelector('#rotateRange');
  if (!dial || !num) return;
  const setDeg = (deg) => {
    deg = ((Math.round(deg) % 360) + 360) % 360;
    const entry = state.art[state.activeSlot];
    if (!entry) return;
    entry.transform.rotate = deg;
    num.value = String(deg);
    if (range) range.value = String(deg);
    if (knob) knob.style.transform = `rotate(${deg}deg)`;
    scheduleCanvasOnly();
  };
  if (range) { range.addEventListener('input', () => setDeg(Number(range.value))); range.addEventListener('change', invalidateGridSetCache); }
  num.addEventListener('input', () => { if (num.value !== '') setDeg(Number(num.value)); });
  num.addEventListener('change', invalidateGridSetCache);
  let dragging = false;
  const angleFromEvent = (e) => {
    const r = dial.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    return Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI + 90;
  };
  dial.addEventListener('pointerdown', (e) => {
    dragging = true;
    try { dial.setPointerCapture(e.pointerId); } catch { /* noop */ }
    dial.classList.add('dragging');
    setDeg(angleFromEvent(e));
  });
  dial.addEventListener('pointermove', (e) => { if (dragging) setDeg(angleFromEvent(e)); });
  const end = (e) => {
    if (!dragging) return;
    dragging = false;
    dial.classList.remove('dragging');
    try { dial.releasePointerCapture(e.pointerId); } catch { /* noop */ }
    invalidateGridSetCache();
  };
  dial.addEventListener('pointerup', end);
  dial.addEventListener('pointercancel', end);
}

function updateSwatchActiveClasses(container) {
  container.querySelectorAll('.swatch').forEach((sw) => {
    sw.classList.toggle('active', sw.dataset.color && sw.dataset.color.toLowerCase() === state.baseColor.toLowerCase());
  });
}

function bindColorControls(container) {
  const input = container.querySelector('#customColorInput');
  if (!input) return;
  input.addEventListener('input', () => {
    state.baseColor = input.value;
    updateSwatchActiveClasses(container);
    scheduleCanvasOnly();
  });
  input.addEventListener('change', invalidateGridSetCache);
}

function bindContinuousControls(container) {
  bindScaleControls(container);
  bindRotateControls(container);
  bindColorControls(container);
}

// ───────────────────────────── position drag on canvas (persistent element) ─────────────────────────────

function initDragLayer() {
  let dragging = false, startX = 0, startY = 0, startTX = 0, startTY = 0;
  dragLayerEl.addEventListener('pointerdown', (e) => {
    if (state.canvasTab === 'cutsheet') return;
    const entry = state.art[state.activeSlot];
    if (!entry || !entry.art) return;
    dragging = true;
    try { dragLayerEl.setPointerCapture(e.pointerId); } catch { /* noop */ }
    dragLayerEl.classList.add('dragging');
    startX = e.clientX; startY = e.clientY;
    startTX = entry.transform.x; startTY = entry.transform.y;
    e.preventDefault();
  });
  dragLayerEl.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const rect = canvasStageEl.getBoundingClientRect();
    const px = rect.width || 1;
    const entry = state.art[state.activeSlot];
    if (!entry) return;
    entry.transform.x = startTX + (e.clientX - startX) * 1000 / px;
    entry.transform.y = startTY + (e.clientY - startY) * 1000 / px;
    scheduleCanvasOnly();
  });
  const end = (e) => {
    if (!dragging) return;
    dragging = false;
    dragLayerEl.classList.remove('dragging');
    try { dragLayerEl.releasePointerCapture(e.pointerId); } catch { /* noop */ }
    invalidateGridSetCache();
  };
  dragLayerEl.addEventListener('pointerup', end);
  dragLayerEl.addEventListener('pointercancel', end);
}

// ───────────────────────────── crop modal ─────────────────────────────

let cropSession = null;
let cropLastFocus = null;
/** Everything behind the crop backdrop. Inerted while it is open. */
const behindModalEls = ['.topbar', '#tabStrip', '.studio-shell'].map((s) => document.querySelector(s)).filter(Boolean);
function setBehindModalInert(on) { behindModalEls.forEach((el) => { el.inert = on; }); }

function cropFocusables() {
  return [...cropModalEl.querySelectorAll('button, input, [href], [tabindex]:not([tabindex="-1"])')]
    .filter((el) => !el.disabled && el.offsetParent !== null);
}

function openCropModal(art) {
  cropSession = { art, box: { x: 0, y: 0, w: 10, h: 10 } };
  cropImgEl.src = art.dataUrl;
  cropModalEl.hidden = false;
  cropSquareEl.checked = true;
  // aria-modal is a promise to the user that the page behind is out of reach. Make it true:
  // park focus on the primary action, hold Tab inside, and inert the shell underneath.
  cropLastFocus = document.activeElement;
  setBehindModalInert(true);
  try { cropApplyEl.focus({ preventScroll: true }); } catch { cropApplyEl.focus(); }
  const onReady = () => { initCropBox(); updateCropPreview(); };
  if (cropImgEl.complete && cropImgEl.naturalWidth) onReady();
  else cropImgEl.onload = onReady;
}

function closeCropModal() {
  cropModalEl.hidden = true;
  cropSession = null;
  cropImgEl.removeAttribute('src');
  setBehindModalInert(false);
  const back = cropLastFocus;
  cropLastFocus = null;
  if (back && document.contains(back)) { try { back.focus({ preventScroll: true }); } catch { /* noop */ } }
}

function initCropBox() {
  const rect = cropStageEl.getBoundingClientRect();
  const w = rect.width || 300, h = rect.height || 300;
  const square = cropSquareEl.checked;
  const size = Math.min(w, h) * 0.8;
  const bw = square ? size : w * 0.7;
  const bh = square ? size : h * 0.7;
  cropSession.box = { x: (w - bw) / 2, y: (h - bh) / 2, w: bw, h: bh };
  paintCropBox();
}

function paintCropBox() {
  const { x, y, w, h } = cropSession.box;
  cropBoxEl.style.left = x + 'px';
  cropBoxEl.style.top = y + 'px';
  cropBoxEl.style.width = w + 'px';
  cropBoxEl.style.height = h + 'px';
}

function cropRectToImagePixels() {
  const rect = cropStageEl.getBoundingClientRect();
  const scaleX = cropSession.art.w / (rect.width || 1);
  const scaleY = cropSession.art.h / (rect.height || 1);
  const { x, y, w, h } = cropSession.box;
  return { sx: x * scaleX, sy: y * scaleY, sw: w * scaleX, sh: h * scaleY };
}

function cropToArt() {
  const { sx, sy, sw, sh } = cropRectToImagePixels();
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(sw));
  c.height = Math.max(1, Math.round(sh));
  const ctx = c.getContext('2d');
  ctx.drawImage(cropImgEl, sx, sy, sw, sh, 0, 0, c.width, c.height);
  const dataUrl = c.toDataURL('image/png');
  const result = { dataUrl, w: c.width, h: c.height, name: cropSession.art.name || 'cropped.png', type: 'image/png', warnings: [] };
  c.width = c.height = 0;
  return result;
}

function updateCropPreview() {
  if (!cropSession) return;
  const cropped = cropToArt();
  const uid = 'crop-preview';
  const slotDef = visibleSlots().find((s) => s.key === state.activeSlot) || slotsFor(state.style, state.view)[0];
  // Must match assignArtToActiveSlot's default, or the preview lies about the placement.
  const bucket = { ...state.art, [state.activeSlot]: { art: cropped, transform: { ...DEFAULT_TRANSFORM }, tile: isPanelSlot(slotDef) } };
  const { defs, slots } = buildDefsAndSlots(state.style, state.view, uid, bucket);
  const svg = state.ranked.on
    ? renderRanked({ style: state.style, view: state.view, belt: state.ranked.belt, body: state.ranked.body, uid, size: 260, detail: 'lite', defs, slots })
    : renderGarment({ style: state.style, view: state.view, baseColor: state.baseColor, slots, uid, size: 260, detail: 'lite', defs });
  cropPreviewEl.innerHTML = svg;
}

function initCropModal() {
  cropBoxEl.addEventListener('pointerdown', (e) => {
    if (e.target.classList.contains('crop-handle')) return;
    const rect = cropStageEl.getBoundingClientRect();
    const startX = e.clientX, startY = e.clientY;
    const orig = { ...cropSession.box };
    try { cropBoxEl.setPointerCapture(e.pointerId); } catch { /* noop */ }
    const move = (ev) => {
      const nx = clamp(orig.x + (ev.clientX - startX), 0, rect.width - orig.w);
      const ny = clamp(orig.y + (ev.clientY - startY), 0, rect.height - orig.h);
      cropSession.box.x = nx; cropSession.box.y = ny;
      paintCropBox(); updateCropPreview();
    };
    const up = (ev) => {
      cropBoxEl.removeEventListener('pointermove', move);
      cropBoxEl.removeEventListener('pointerup', up);
      try { cropBoxEl.releasePointerCapture(ev.pointerId); } catch { /* noop */ }
    };
    cropBoxEl.addEventListener('pointermove', move);
    cropBoxEl.addEventListener('pointerup', up);
  });

  cropBoxEl.querySelectorAll('.crop-handle').forEach((handle) => {
    handle.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      const corner = handle.dataset.corner;
      const rect = cropStageEl.getBoundingClientRect();
      const startX = e.clientX, startY = e.clientY;
      const orig = { ...cropSession.box };
      try { handle.setPointerCapture(e.pointerId); } catch { /* noop */ }
      const move = (ev) => {
        const dx = ev.clientX - startX, dy = ev.clientY - startY;
        const square = cropSquareEl.checked;
        let { x, y, w, h } = orig;
        if (corner === 'se') { w = orig.w + dx; h = square ? w : orig.h + dy; }
        else if (corner === 'ne') { w = orig.w + dx; h = square ? w : orig.h - dy; y = square ? orig.y + orig.h - h : orig.y + dy; }
        else if (corner === 'sw') { w = orig.w - dx; h = square ? w : orig.h + dy; x = orig.x + dx; }
        else { w = orig.w - dx; h = square ? w : orig.h - dy; x = orig.x + dx; y = square ? orig.y + orig.h - h : orig.y + dy; }
        w = clamp(w, 24, rect.width); h = clamp(h, 24, rect.height);
        x = clamp(x, 0, rect.width - w); y = clamp(y, 0, rect.height - h);
        cropSession.box = { x, y, w, h };
        paintCropBox(); updateCropPreview();
      };
      const up = (ev) => {
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', up);
        try { handle.releasePointerCapture(ev.pointerId); } catch { /* noop */ }
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', up);
    });
  });

  cropSquareEl.addEventListener('change', () => {
    if (!cropSession) return;
    if (cropSquareEl.checked) {
      const { x, y, w, h } = cropSession.box;
      const s = Math.min(w, h);
      cropSession.box = { x, y, w: s, h: s };
    }
    paintCropBox(); updateCropPreview();
  });

  // Tab cycles inside the dialog while it is open.
  cropModalEl.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || cropModalEl.hidden) return;
    const items = cropFocusables();
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    const cur = document.activeElement;
    if (e.shiftKey && (cur === first || !cropModalEl.contains(cur))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (cur === last || !cropModalEl.contains(cur))) { e.preventDefault(); first.focus(); }
  });

  cropCancelEl.addEventListener('click', closeCropModal);
  cropFullEl.addEventListener('click', () => {
    if (!cropSession) return;
    assignArtToActiveSlot(cropSession.art);
    closeCropModal();
  });
  cropApplyEl.addEventListener('click', () => {
    if (!cropSession) return;
    const cropped = cropToArt();
    assignArtToActiveSlot(cropped);
    closeCropModal();
  });
}

// ───────────────────────────── uploads ─────────────────────────────

async function handleUploadedFile(file) {
  try {
    const art = await fileToArt(file);
    if (art.warnings && art.warnings.length) showToast(art.warnings[0]);
    openCropModal(art);
  } catch (e) {
    console.error('upload failed:', e);
    showToast(e.message || 'Could not read that file.');
  }
}

let linkBusy = false;

/** Every link field on the page shares one value — the onboarding card and the Art panel box. */
let linkFieldValue = '';
function setLinkFieldValue(v, exceptEl = null) {
  linkFieldValue = v;
  document.querySelectorAll('input.link-input').forEach((el) => { if (el !== exceptEl) el.value = v; });
}

/**
 * Progress / error text for the link resolver. Mirrored into EVERY .link-status node —
 * the onboarding card and the Art panel box both show it while a fetch is running.
 */
function setLinkStatus(msg, kind = '') {
  state.linkStatus = { msg, kind };
  document.querySelectorAll('.link-status').forEach((el) => {
    el.textContent = msg;
    el.className = 'link-status' + (kind ? ' is-' + kind : '');
  });
}
async function ingestFromInput({ file = null, text = '', dataTransfer = null } = {}) {
  if (linkBusy) return;
  linkBusy = true;
  const btns = [...document.querySelectorAll('[data-action="fetch-link"]')];
  btns.forEach((b) => { b.disabled = true; });
  try {
    const art = await resolveArtInput({ file, text, dataTransfer }, (m) => setLinkStatus(m, 'busy'));
    setLinkStatus(art.warnings && art.warnings.length ? art.warnings[0] : 'Image loaded — crop or use as is.', 'ok');
    openCropModal(art);
  } catch (e) {
    console.warn('link ingest failed:', e);
    setLinkStatus(e.message || PIN_HELP, 'err');
  } finally {
    linkBusy = false;
    document.querySelectorAll('[data-action="fetch-link"]').forEach((b) => { b.disabled = false; });
  }
}
function initLinkHandlers() {
  // Ctrl+V anywhere in the studio: image data wins, then a URL.
  // A link field is NOT excluded — pasting an image while focused there still works.
  document.addEventListener('paste', (e) => {
    const t = e.target;
    const inOtherField = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') && !t.classList.contains('link-input');
    if (inOtherField) return;
    const dt = e.clipboardData; if (!dt) return;
    const img = [...(dt.files || [])].find(f => f.type.startsWith('image/'));
    const text = dt.getData('text/plain') || dt.getData('text/uri-list') || '';
    if (!img && !text) return;
    if (!img && classifyInput(text).kind === 'text') return;   // plain text — leave it alone
    e.preventDefault();
    if (!img && text) setLinkFieldValue(text.trim());
    if (!state.onboardDone && state.activePanel !== 'art') { state.activePanel = 'art'; render(); }
    ingestFromInput({ file: img || null, text: img ? '' : text });
  });
  // Enter in either link field (onboarding card or Art panel) — one shared handler
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const t = e.target;
    if (!t || !t.classList || !t.classList.contains('link-input')) return;
    e.preventDefault();
    setLinkFieldValue(t.value, t);
    ingestFromInput({ text: t.value });
  });
  // keep the two link fields in sync as the user types
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t && t.classList && t.classList.contains('link-input')) setLinkFieldValue(t.value, t);
  });
}

function initUploadHandlers() {
  initLinkHandlers();
  fileInputEl.addEventListener('change', () => {
    const file = fileInputEl.files && fileInputEl.files[0];
    if (file) handleUploadedFile(file);
    fileInputEl.value = '';
  });
  contextualPanelEl.addEventListener('dragover', (e) => {
    const zone = e.target.closest('#uploadZone');
    if (!zone) return;
    e.preventDefault();
    zone.classList.add('dragover');
  });
  contextualPanelEl.addEventListener('dragleave', (e) => {
    const zone = e.target.closest('#uploadZone');
    if (zone) zone.classList.remove('dragover');
  });
  contextualPanelEl.addEventListener('drop', (e) => {
    const zone = e.target.closest('#uploadZone');
    if (!zone) return;
    e.preventDefault();
    zone.classList.remove('dragover');
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handleUploadedFile(file);
    else ingestFromInput({ dataTransfer: e.dataTransfer });
  });
  // let the whole panel accept a drop of a dragged image/URL, not only the zone
  contextualPanelEl.addEventListener('dragover', (e) => { if (state.activePanel === 'art' && !e.target.closest('#uploadZone')) e.preventDefault(); });
  contextualPanelEl.addEventListener('drop', (e) => {
    if (e.target.closest('#uploadZone')) return;
    if (state.activePanel !== 'art') return;
    e.preventDefault();
    ingestFromInput({ dataTransfer: e.dataTransfer });
  });

  // "drop an image anywhere" — the document-level net. The handlers above run first
  // (they are on descendants) and call preventDefault, so this never double-fires.
  let dragDepth = 0;
  document.addEventListener('dragenter', (e) => {
    if (!e.dataTransfer) return;
    dragDepth++;
    document.body.classList.add('is-dragging-file');
  });
  document.addEventListener('dragleave', () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) document.body.classList.remove('is-dragging-file');
  });
  document.addEventListener('dragover', (e) => { if (!e.defaultPrevented) e.preventDefault(); });
  document.addEventListener('drop', (e) => {
    dragDepth = 0;
    document.body.classList.remove('is-dragging-file');
    if (e.defaultPrevented) return;      // already handled by the upload zone / panel
    e.preventDefault();
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handleUploadedFile(file);
    else if (e.dataTransfer) ingestFromInput({ dataTransfer: e.dataTransfer });
  });
}

// ───────────────────────────── rails + master render ─────────────────────────────

function renderIconRail() {
  iconRailEl.innerHTML = RAIL_ITEMS.map((it) => `<button type="button" class="rail-btn ${state.activePanel === it.key ? 'active' : ''}" data-action="set-panel" data-panel="${it.key}"><span class="rail-ico">${it.icon}</span>${esc(it.label)}</button>`).join('');
}
function renderTabStrip() {
  tabStripEl.innerHTML = TAB_ITEMS.map((it) => `<button type="button" class="tab-btn ${state.activePanel === it.key ? 'active' : ''}" data-action="set-panel" data-panel="${it.key}">${esc(it.label)}</button>`).join('');
  // innerHTML resets scrollLeft to 0, which parked the active gold pill off-screen and
  // left nothing on a phone saying which panel was open. Centre it. (Assigning
  // scrollLeft rather than scrollIntoView so this can never scroll the page itself.)
  const active = tabStripEl.querySelector('.tab-btn.active');
  if (active) {
    const target = active.offsetLeft - (tabStripEl.clientWidth - active.offsetWidth) / 2;
    tabStripEl.scrollLeft = Math.max(0, target);
  }
  updateTabStripFade();
}
/** The right-edge fade says "there is more" — drop it at the end so it never dims the pill. */
function updateTabStripFade() {
  const atEnd = tabStripEl.scrollLeft + tabStripEl.clientWidth >= tabStripEl.scrollWidth - 2;
  tabStripEl.classList.toggle('at-end', atEnd);
}
tabStripEl.addEventListener('scroll', updateTabStripFade, { passive: true });
function renderViewSwitcher() {
  const tabs = [['front', 'Front'], ['back', 'Back'], ['spin', '360°'], ['cutsheet', 'Cut sheet']];
  viewSwitcherEl.innerHTML = tabs.map(([k, l]) => `<button type="button" role="tab" aria-selected="${state.canvasTab === k}" class="${state.canvasTab === k ? 'active' : ''}" data-action="set-canvas-tab" data-tab="${k}">${l}</button>`).join('');
}
function renderScenesRailBody() { return renderScenesPickerHTML() + renderExportActionHTML(); }

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && state.sheetOpen) { state.sheetOpen = false; contextualPanelEl.classList.remove('sheet-open'); renderTabStrip(); }
});
document.addEventListener('pointerdown', (e) => {
  if (!state.sheetOpen || !matchMedia('(max-width: 1023px)').matches) return;
  if (e.target.closest('.contextual-panel, .tab-strip, .icon-rail')) return;
  state.sheetOpen = false; contextualPanelEl.classList.remove('sheet-open'); renderTabStrip();
}, { capture: true });

/** <details open> state for Art steps 2/3 has to survive the panel being re-rendered. */
function bindStepDetails(container) {
  container.querySelectorAll('details[data-step]').forEach((d) => {
    d.addEventListener('toggle', () => { state.artSteps[d.dataset.step] = d.open; });
  });
}

/**
 * The onboarding card is the headline input: it sits over the empty stage until the
 * first artwork lands, then never returns for the session. Hidden on the 360 and cut
 * sheet tabs, which have their own canvas content.
 */
function updateOnboardCard() {
  if (!onboardCardEl) return;
  const show = !state.onboardDone && (state.canvasTab === 'front' || state.canvasTab === 'back');
  onboardCardEl.hidden = !show;
  canvasStageEl.classList.toggle('is-onboarding', show);
}

/**
 * render() rewrites the panel and the scenes rail wholesale, which drops keyboard focus
 * to <body>. A keyboard user could not tick two export scenes in a row without tabbing
 * from the top of the document again. Capture a stable signature of the focused control
 * before the rewrite, find its replacement after, and put focus back.
 */
function focusSignature(el) {
  if (!el || el === document.body || !el.dataset) return null;
  const host = el.closest && el.closest('#contextualPanel, #scenesRail, #iconRail, #tabStrip, #viewSwitcher');
  if (!host) return null;                       // outside the rebuilt regions — leave it alone
  const d = { ...el.dataset };
  if (!Object.keys(d).length && !el.id) return null;
  return JSON.stringify([host.id, el.id || '', el.tagName, d]);
}
function restoreFocus(sig) {
  if (!sig) return;
  const hosts = [contextualPanelEl, scenesRailEl, iconRailEl, tabStripEl, viewSwitcherEl];
  for (const host of hosts) {
    if (!host) continue;
    for (const el of host.querySelectorAll('[data-action], [id]')) {
      if (focusSignature(el) === sig) {
        try { el.focus({ preventScroll: true }); } catch { el.focus(); }
        return;
      }
    }
  }
}

function render() {
  const sig = focusSignature(document.activeElement);
  ensureActiveSlot();
  renderIconRail();
  renderTabStrip();
  renderViewSwitcher();
  contextualPanelEl.innerHTML = `<button type="button" class="sheet-close" data-action="close-sheet" aria-label="Close panel"><span class="sheet-handle"></span><span class="sheet-close-x">&times;</span></button>` + renderPanelBody(state.activePanel);
  contextualPanelEl.classList.toggle('sheet-open', state.sheetOpen);
  bindContinuousControls(contextualPanelEl);
  bindStepDetails(contextualPanelEl);
  scenesRailEl.innerHTML = renderScenesRailBody();
  bindContinuousControls(scenesRailEl);
  restoreFocus(sig);
  updateOnboardCard();
  updateCanvas({ overlays: true });
  if (state.ranked.on) refreshCoverage();
}

// ───────────────────────────── event delegation ─────────────────────────────

function onGlobalClick(e) {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  switch (el.dataset.action) {
    case 'close-sheet': {
      state.sheetOpen = false;
      contextualPanelEl.classList.remove('sheet-open');
      renderTabStrip();
      return;
    }
    case 'set-panel': {
      const panel = el.dataset.panel;
      const wasOpenSame = state.activePanel === panel && state.sheetOpen;
      state.activePanel = panel;
      state.sheetOpen = !wasOpenSame;
      render();
      break;
    }
    case 'close-sheet':
      state.sheetOpen = false;
      render();
      break;
    case 'set-style':
      setStyle(el.dataset.style);
      break;
    case 'set-active-slot':
      state.activeSlot = el.dataset.key;
      render();
      break;
    case 'browse':
      fileInputEl.click();
      break;
    case 'use-demo':
      // Geo and Camo are generated to repeat; Mark is a single device and must not.
      assignArtToActiveSlot(demoArt(el.dataset.kind), { repeat: el.dataset.kind !== 'mark' });
      break;
    case 'recenter': {
      const entry = state.art[state.activeSlot];
      if (entry) { entry.transform.x = 0; entry.transform.y = 0; }
      invalidateGridSetCache();
      render();
      break;
    }
    case 'remove-art':
      delete state.art[state.activeSlot];
      invalidateGridSetCache();
      render();
      break;
    case 'set-basecolor':
      state.baseColor = el.dataset.color;
      invalidateGridSetCache();
      render();
      break;
    case 'set-belt':
      state.ranked.belt = el.dataset.belt;
      invalidateGridSetCache();
      render();
      break;
    case 'set-body':
      state.ranked.body = el.dataset.body;
      invalidateGridSetCache();
      render();
      break;
    case 'set-canvas-tab':
      setCanvasTab(el.dataset.tab);
      break;
    case 'export-selected':
      exportSelected();
      break;
    case 'fetch-link': {
      // one handler, both boxes: prefer the field this button sits with, else any of them
      const row = el.closest('.link-row');
      const li = (row && row.querySelector('input.link-input')) || document.querySelector('input.link-input');
      const text = li ? li.value : linkFieldValue;
      setLinkFieldValue(text);
      ingestFromInput({ text });
      return;
    }
    case 'load-sample-data':
      loadSampleData();
      break;
    default: break;
  }
}

function onGlobalChange(e) {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  switch (el.dataset.action) {
    case 'toggle-aop':
      state.aop = el.checked;
      render();
      break;
    case 'toggle-tile': {
      const entry = state.art[state.activeSlot];
      if (entry) entry.tile = el.checked;
      invalidateGridSetCache();
      render();
      break;
    }
    case 'toggle-ranked':
      state.ranked.on = el.checked;
      invalidateGridSetCache();
      render();
      break;
    case 'toggle-scene':
      state.scenesSelected[el.dataset.scene] = el.checked;
      syncSceneSelectionUI(el);   // no full render — keeps focus on the checkbox
      break;
    default: break;
  }
}

// ───────────────────────────── init ─────────────────────────────

document.addEventListener('click', onGlobalClick);
document.addEventListener('change', onGlobalChange);
// keyboard access for the upload zone (role="button")
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const z = e.target && e.target.closest && e.target.closest('#uploadZone');
  if (!z) return;
  e.preventDefault();
  fileInputEl.click();
});
// Escape closes the crop modal too
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !cropModalEl.hidden) closeCropModal();
});
initDragLayer();
initCropModal();
initUploadHandlers();
render();
setLinkStatus(LINK_NOTE, '');
// the headline input is pre-focused: paste-a-link is the first thing the studio asks for
const heroInput = document.getElementById('linkInputHero');
if (heroInput && !onboardCardEl.hidden) { try { heroInput.focus({ preventScroll: true }); } catch { heroInput.focus(); } }
