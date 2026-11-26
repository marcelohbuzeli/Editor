// Meu Editor — editor de vídeo simples para iPhone (PWA)
// Os vídeos ficam no aparelho. Vão para a nuvem só: a galeria de projetos (dados leves), a transcrição via Groq
// (se usada) e, no "Editar com IA", a TRANSCRIÇÃO em texto (nunca o vídeo).

import { TEMPLATES, LAYOUTS, tplById, layoutById, parseMarked, stripMarks, drawCapTpl, drawLayout, drawLayoutFx, countUnits, drawPreview, loadTemplateFonts } from './estilos.js?v=31';
import { ANIM_GROUPS, presetsOf, presetByName, animLabel, SPLIT_LABEL, layerPhase, hasAnim, splitSlices, sliceState, applyState, makePlan, emphasisTime } from './animacoes.js?v=26';
import * as conta from './conta.js?v=25b';
import { criarAgente } from './agente.js?v=26';
import * as RT from './textorico.js?v=28';
const seedOf = (id) => { let h = 7; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 100000; };

const $ = (s, el = document) => el.querySelector(s);
const uid = () => Math.random().toString(36).slice(2, 10);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const fmt = (t) => {
  t = Math.max(0, t || 0);
  const m = Math.floor(t / 60), s = Math.floor(t % 60), d = Math.floor((t % 1) * 10);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${d}`;
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- Ícones ----------
const ICONS = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  video: '<rect x="2" y="6" width="14" height="12" rx="2"/><path d="m22 8-6 4 6 4z"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  type: '<path d="M4 7V4h16v3M9 20h6M12 4v16"/>',
  zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  volume: '<path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>',
  scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12"/>',
  trash: '<path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  target: '<path d="M12 3v18M5 9l-3 3 3 3M19 9l3 3-3 3"/>',
  trimL: '<path d="M7 4v16M11 12h10M15 8l-4 4 4 4"/>',
  trimR: '<path d="M17 4v16M3 12h10M9 8l4 4-4 4"/>',
  play: '<path d="M7 4v16l13-8z" fill="currentColor"/>',
  pause: '<rect x="6" y="4" width="4" height="16" fill="currentColor"/><rect x="14" y="4" width="4" height="16" fill="currentColor"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
  file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M12 12v6M9 15h6"/>',
  merge: '<path d="M12 4v10M7 9l5 5 5-5M5 20h14"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  zoomIn: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3M11 8v6M8 11h6"/>',
  zoomOut: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3M8 11h6"/>',
  fade: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 21 21 3M3 15l12-12M3 9l6-6"/>',
  wave: '<path d="M2 12h2M6 8v8M10 4v16M14 7v10M18 10v4M22 12h0"/>',
  layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  contrast: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
  key: '<path d="M12 2.5 21.5 12 12 21.5 2.5 12z"/>',
  keyFill: '<path d="M12 2.5 21.5 12 12 21.5 2.5 12z" fill="currentColor"/>',
  expand: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
  textbox: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M8 9h8M12 9v7"/>',
  sparkle: '<path d="M12 3l1.8 4.9L19 9.7l-5.2 1.8L12 16.4l-1.8-4.9L5 9.7l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  gauge: '<path d="M12 14 16 9"/><path d="M3.3 17a10 10 0 1 1 17.4 0"/><circle cx="12" cy="14" r="1.6" fill="currentColor"/>',
  font: '<path d="M4 20 9.5 5h1L16 20M6.2 14h7.6"/><path d="M19 8v8M15 12h8"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  unlink: '<path d="m18.84 12.25 1.72-1.71a5 5 0 0 0-7.07-7.07l-1.72 1.71M5.17 11.75l-1.71 1.71a5 5 0 0 0 7.07 7.07l1.71-1.71M8 2v3M2 8h3M16 22v-3M22 16h-3"/>',
};
const ic = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[n]}</svg>`;

// ---------- Estado ----------
const FONTS = [
  { id: 'Poppins', css: "'Poppins', sans-serif" },
  { id: 'Montserrat', css: "'Montserrat', sans-serif" },
  { id: 'Times New Roman', css: "'Times New Roman', Times, serif" },
  { id: 'Inter', css: "'Inter', sans-serif" },
  { id: 'Anton', css: "'Anton', sans-serif" },
];
const COLORS = ['#FFFFFF', '#F7E8B0', '#FFD84D', '#000000'];
const TPL_COLORS = ['#FFFFFF', '#EEF2F8', '#F1D3B0', '#F7E8B0', '#FFD84D', '#D7FF3A', '#FF6A3D', '#9DB4DE', '#2453C6', '#000000'];
const fontCss = (id) => (FONTS.find((f) => f.id === id) || FONTS[0]).css;

let galeria = null;   // dados do projeto aberto na galeria: { id, titulo, cliente, taskId, video, pasta, ... }
const DEFAULT_CAP = { font: 'Poppins', weight: 700, size: 60, color: '#FFFFFF', shadow: 60, blur: 12, y: 0.75, upper: false, ls: 0, lh: 1.2 };
const DEFAULT_FX = {
  fadeIn: { on: false, dur: 0.5 }, fadeOut: { on: false, dur: 1.0 }, fadeAudio: true,
  flashDur: 0.3, click: true, clickDb: -10,
  burnDur: 1.0, burnSound: true, burnDb: -12,
};
const TR_LABEL = { none: 'Nenhuma', flash: 'Flash', burn: 'Film burn' };

const prefs = loadPrefs();
const S = {
  clips: [],      // trilha principal: { id, mediaId, in, out, transition: 'none'|'flash', volume }
  audios: [],     // { id, bufferId, name, start, in, out, volume, fadeIn, fadeOut }
  captions: [],   // tempos no arquivo de origem: { id, mediaId, start, end, text }
  words: {},      // mediaId -> [{ text, start, end }]
  cap: { ...DEFAULT_CAP, ...(prefs.cap || {}) },
  fx: { ...structuredClone(DEFAULT_FX), ...(prefs.fx || {}) },
  origVolume: 1,
  aspect: null,
  pps: 50,        // pixels por segundo na linha do tempo
  layers: [],    // camadas por cima do vídeo: { id, kind: 'video'|'image', srcId, start, in, out, x, y, scale, volume }
  zooms: [],     // efeitos de zoom: { id, clipId, off (s desde o início do clipe), dur, type: 'in'|'out', amount }
  t: 0,
  sel: null,      // { type: 'clip'|'audio'|'caption', id }
};
// v3: novos padrões de legenda (60 / 75%) e fades desligados por padrão
if ((prefs.v || 0) < 3) { S.cap.size = 60; S.cap.y = 0.75; S.fx.fadeOut.on = false; S.fx.fadeIn.on = false; }
// v27: nada entra sozinho. Corte e vídeo novo nunca recebem transição; ela só existe se a pessoa colocar.
delete S.fx.autoTr; delete S.fx.autoFlash;
// Cada clipe tem o áudio original vinculado: aOn (ligado), volume, afi/afo (fade in/out em segundos)
const normClip = (c) => { c.aOn ??= true; c.volume ??= 1; c.afi ??= 0; c.afo ??= 0; c.vfi ??= 0; c.vfo ??= 0; c.vfa ??= true; c.transition ??= 'none'; return c; };
const media = new Map();    // id -> { id, name, url, duration, w, h, bufferId, thumb }
const buffers = new Map();  // id -> { buffer, peaks, name, fileKey }

function loadPrefs() { try { return JSON.parse(localStorage.getItem('corte-prefs') || '{}'); } catch { return {}; } }
function savePrefs() {
  try { localStorage.setItem('corte-prefs', JSON.stringify({ v: 3, cap: S.cap, fx: S.fx, groqKey: prefs.groqKey, res: prefs.res, br: prefs.br, zoomDef: prefs.zoomDef, fadeDef: prefs.fadeDef, sfxTrim: prefs.sfxTrim, textTpl: prefs.textTpl })); } catch {}
}

// ---------- Histórico (desfazer/refazer) ----------
const hist = { past: [], future: [] };
const snap = () => JSON.stringify({ clips: S.clips, audios: S.audios, captions: S.captions, zooms: S.zooms, layers: S.layers, fx: S.fx, cap: S.cap, origVolume: S.origVolume });
function pushHist(s) { hist.past.push(s); if (hist.past.length > 80) hist.past.shift(); hist.future = []; updUndo(); savePrefs(); saveSoon(); }
const commit = () => pushHist(snap());
function restore(str) { Object.assign(S, { zooms: [], layers: [] }, JSON.parse(str)); S.clips.forEach(normClip); S.sel = null; refresh(); saveSoon(); }
function undo() { if (!hist.past.length) return; hist.future.push(snap()); restore(hist.past.pop()); updUndo(); }
function redo() { if (!hist.future.length) return; hist.past.push(snap()); restore(hist.future.pop()); updUndo(); }
function updUndo() { $('#btn-undo').disabled = !hist.past.length; $('#btn-redo').disabled = !hist.future.length; }

// ---------- Linha do tempo: cálculos ----------
// velocidade do clipe: 2 = duas vezes mais rápido (o clipe ocupa metade do tempo na linha do tempo)
const spd = (c) => c.speed || 1;
const clipLen = (c) => (c.out - c.in) / spd(c);
const srcAt = (r, t) => r.clip.in + (t - r.start) * spd(r.clip);   // tempo na linha do tempo -> tempo no arquivo
const tlAt = (r, s) => r.start + (s - r.clip.in) / spd(r.clip);    // tempo no arquivo -> tempo na linha do tempo
function layout() {
  let t = 0;
  return S.clips.map((clip, i) => { const d = clipLen(clip); const r = { clip, i, start: t, end: t + d }; t += d; return r; });
}
const total = () => S.clips.reduce((a, c) => a + clipLen(c), 0);
function clipAt(t, L = layout()) {
  if (!L.length) return null;
  for (const r of L) if (t >= r.start && t < r.end) return r;
  return t >= L[L.length - 1].end ? L[L.length - 1] : L[0];
}
const cuts = (L = layout()) => L.filter((r) => r.i > 0 && r.clip.transition && r.clip.transition !== 'none').map((r) => ({ t: r.start, type: r.clip.transition, seed: r.i }));
function capSpans(L = layout()) {
  const out = [];
  for (const c of S.captions) {
    for (const r of L) {
      if (r.clip.mediaId !== c.mediaId) continue;
      const a = Math.max(c.start, r.clip.in), b = Math.min(c.end, r.clip.out);
      if (b - a > 0.02) out.push({ cap: c, a, k: spd(r.clip), start: tlAt(r, a), end: tlAt(r, b) });
    }
  }
  return out.sort((x, y) => x.start - y.start);
}
function captionAt(t, r) {
  if (!r) return null;
  const s = srcAt(r, t);
  return S.captions.find((c) => c.mediaId === r.clip.mediaId && s >= c.start && s < c.end);
}
function audioLanes() {
  const lanes = [];
  const sorted = [...S.audios].sort((a, b) => a.start - b.start);
  const res = new Map();
  for (const a of sorted) {
    const end = a.start + (a.out - a.in);
    let li = lanes.findIndex((e) => e <= a.start + 0.001);
    if (li < 0) { li = lanes.length; lanes.push(0); }
    lanes[li] = end; res.set(a.id, li);
  }
  return { map: res, count: Math.max(1, lanes.length) };
}

// ---------- Áudio ----------
let actx = null, clickBuf = null, burnBuf = null;
const BURN_PEAK = 0.7; // segundo em que o som do film burn atinge o pico (alinhado com o corte)
function ac() {
  if (!actx) {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch {}
    clickBuf = makeClick();
    // som do film burn: "red whoosh gladiator 04" por martian (freesound.org, CC0)
    [S.fx.flashSnd, S.fx.burnSnd].filter(Boolean).forEach((f) => sfxBuffer(f).catch(() => {}));
    fetch('sfx/filmburn.mp3').then((r) => r.arrayBuffer()).then((ab) => new Promise((res, rej) => actx.decodeAudioData(ab, res, rej))).then((b) => (burnBuf = b)).catch((e) => console.warn('som do film burn', e));
  }
  return actx;
}
function makeClick() {
  const sr = actx.sampleRate, n = Math.floor(sr * 0.05);
  const b = actx.createBuffer(1, n, sr), d = b.getChannelData(0);
  let peak = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    d[i] = (Math.sin(2 * Math.PI * 1900 * t) * 0.7 * Math.exp(-t * 110)) + (Math.random() * 2 - 1) * 0.6 * Math.exp(-t * 400);
    peak = Math.max(peak, Math.abs(d[i]));
  }
  for (let i = 0; i < n; i++) d[i] /= peak; // pico em 0 dBFS; o volume (ex.: -10 dB) é aplicado no ganho
  return b;
}
const dbToGain = (db) => Math.pow(10, db / 20);
function decodeAudio(file) {
  return file.arrayBuffer().then((ab) => new Promise((res, rej) => ac().decodeAudioData(ab, res, rej)));
}
const decodeBytes = (u8) => new Promise((res, rej) => ac().decodeAudioData(u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength), res, rej));

// Extrai o áudio de qualquer vídeo/áudio. Para .mov/.mp4 (iPhone) lê a faixa AAC direto do arquivo,
// sem carregar o vídeo inteiro na memória, porque o Safari não decodifica o .mov inteiro.
async function extractAudio(file) {
  const errs = [];
  const isMp4 = /\.(mov|mp4|m4v|m4a|3gp)$/i.test(file.name) || /mp4|quicktime/.test(file.type);
  if (isMp4) { try { return await decodeMp4Aac(file); } catch (e) { errs.push('aac: ' + e.message); } }
  try { return await decodeAudio(file); } catch (e) { errs.push('decode: ' + (e?.message || e)); }
  console.warn('extractAudio falhou', errs);
  throw new Error(errs.join(' | '));
}
let mp4boxP = null;
function loadMp4box() {
  return mp4boxP || (mp4boxP = new Promise((res, rej) => {
    if (window.MP4Box) return res(window.MP4Box);
    const s = document.createElement('script'); s.src = 'vendor/mp4box.all.min.js';
    s.onload = () => res(window.MP4Box); s.onerror = () => { mp4boxP = null; rej(new Error('não carregou o leitor de MP4')); };
    document.head.appendChild(s);
  }));
}
async function topBoxes(file) {
  const out = []; let off = 0;
  while (off + 8 <= file.size && out.length < 200) {
    const v = new DataView(await file.slice(off, off + 16).arrayBuffer());
    let size = v.getUint32(0);
    const type = String.fromCharCode(v.getUint8(4), v.getUint8(5), v.getUint8(6), v.getUint8(7));
    if (size === 1) size = Number(v.getBigUint64(8)); else if (size === 0) size = file.size - off;
    if (size < 8) break;
    out.push({ type, off, size }); off += size;
  }
  return out;
}
const SR_TABLE = [96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000, 7350];
function aacConfig(trak, track) {
  let data = null;
  const find = (d, depth = 0) => {
    if (!d || typeof d !== 'object' || depth > 6 || data) return;
    if (d.tag === 5 && d.data && d.data.length >= 2) { data = d.data; return; }
    for (const k of ['esd', 'descs']) { const v = d[k]; if (Array.isArray(v)) v.forEach((x) => find(x, depth + 1)); else if (v) find(v, depth + 1); }
  };
  try { find(trak.mdia.minf.stbl.stsd.entries[0].esds); } catch {}
  if (data) return { aot: data[0] >> 3, fi: ((data[0] & 7) << 1) | (data[1] >> 7), ch: (data[1] >> 3) & 15 };
  const sr = track.audio?.sample_rate || 44100;
  return { aot: 2, fi: Math.max(0, SR_TABLE.indexOf(sr)), ch: track.audio?.channel_count || 2 };
}
function adtsHeader(len, c) {
  const L = len + 7, prof = (c.aot > 4 ? 2 : c.aot || 2) - 1, ch = c.ch || 2;
  return [0xff, 0xf1, (prof << 6) | (c.fi << 2) | (ch >> 2), ((ch & 3) << 6) | (L >> 11), (L >> 3) & 0xff, ((L & 7) << 5) | 0x1f, 0xfc];
}
async function decodeMp4Aac(file) {
  const MP4Box = await loadMp4box();
  const boxes = await topBoxes(file);
  if (!boxes.some((b) => b.type === 'moov')) throw new Error('arquivo sem moov');
  const mp4 = MP4Box.createFile();
  let info = null; mp4.onReady = (i) => { info = i; }; mp4.onError = (e) => console.warn('mp4box', e);
  for (const b of boxes) {
    // dos boxes grandes de dados (mdat) só o cabeçalho é necessário para o leitor pular até o moov
    const big = b.type === 'mdat' || (b.type === 'free' && b.size > 1e6);
    const ab = await file.slice(b.off, b.off + (big ? 16 : b.size)).arrayBuffer(); ab.fileStart = b.off; mp4.appendBuffer(ab);
  }
  mp4.flush();
  if (!info) throw new Error('não consegui ler a estrutura do vídeo');
  const tracks = info.tracks.filter((t) => /^mp4a/.test(t.codec));
  if (!tracks.length) throw new Error('sem faixa AAC (' + info.tracks.map((t) => t.codec).join(', ') + ')');
  const track = tracks[0], trak = mp4.getTrackById(track.id), samples = trak.samples || [];
  if (!samples.length) throw new Error('faixa de áudio vazia');
  const cfg = aacConfig(trak, track);
  // lê as amostras em blocos contíguos
  let total = 0; for (const s of samples) total += s.size + 7;
  const out = new Uint8Array(total); let o = 0, i = 0;
  while (i < samples.length) {
    let j = i, end = samples[i].offset + samples[i].size;
    while (j + 1 < samples.length && samples[j + 1].offset === end && end - samples[i].offset < 4e6) { j++; end += samples[j].size; }
    const chunk = new Uint8Array(await file.slice(samples[i].offset, end).arrayBuffer());
    let p = 0;
    for (let k = i; k <= j; k++) { out.set(adtsHeader(samples[k].size, cfg), o); o += 7; out.set(chunk.subarray(p, p + samples[k].size), o); o += samples[k].size; p += samples[k].size; }
    i = j + 1;
  }
  const buf = await decodeBytes(out.subarray(0, o));
  // remove o "priming" do codificador AAC indicado na lista de edição (mantém o áudio sincronizado)
  let prim = 0;
  try { const el = trak.edts?.elst?.entries?.[0]; if (el && el.media_time > 0) prim = el.media_time / trak.mdia.mdhd.timescale; } catch {}
  return trimStart(buf, prim);
}
function trimStart(buf, sec) {
  const n = Math.round(sec * buf.sampleRate);
  if (n <= 0 || n >= buf.length) return buf;
  const nb = ac().createBuffer(buf.numberOfChannels, buf.length - n, buf.sampleRate);
  for (let c = 0; c < buf.numberOfChannels; c++) nb.copyToChannel(buf.getChannelData(c).subarray(n), c);
  return nb;
}
function computePeaks(buf, rate = 50) {
  const ch = buf.getChannelData(0), step = Math.max(1, Math.floor(buf.sampleRate / rate));
  const n = Math.ceil(ch.length / step), p = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let mx = 0; const e = Math.min((i + 1) * step, ch.length);
    for (let j = i * step; j < e; j += 8) { const a = Math.abs(ch[j]); if (a > mx) mx = a; }
    p[i] = mx;
  }
  return p;
}
// Curva de ganho linear por pontos [[tempoTimeline, valor]] agendada a partir de fromT
function envelope(param, pts, fromT, now) {
  pts = pts.slice().sort((a, b) => a[0] - b[0]);
  const val = (x) => {
    if (x <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      if (x <= pts[i][0]) { const [t0, v0] = pts[i - 1], [t1, v1] = pts[i]; return t1 === t0 ? v1 : v0 + (v1 - v0) * (x - t0) / (t1 - t0); }
    }
    return pts[pts.length - 1][1];
  };
  param.cancelScheduledValues(0);
  param.setValueAtTime(val(fromT), now);
  for (const [t, v] of pts) if (t > fromT) param.linearRampToValueAtTime(v, now + (t - fromT));
}
function scheduleAudio(fromT, dest, ctx = ac()) {
  const now = ctx.currentTime + (ctx === actx ? 0.06 : 0), T = total(), L = layout(), nodes = [];
  const master = ctx.createGain(); master.connect(dest);
  const mp = masterFadePoints(L); // fades dos clipes com "som junto"
  if (mp.length) envelope(master.gain, mp, fromT, now);

  const add = (buffer, gainVal, tlStart, srcOffset, dur, pts, rate = 1) => {
    if (dur <= 0.005) return;
    const src = ctx.createBufferSource(); src.buffer = buffer;
    if (rate !== 1) src.playbackRate.value = rate;
    const g = ctx.createGain(); g.gain.value = gainVal;
    if (pts) envelope(g.gain, pts, fromT, now);
    src.connect(g).connect(master);
    src.start(now + Math.max(0, tlStart - fromT), Math.max(0, srcOffset), dur * rate);
    nodes.push(src);
  };
  // áudio original vinculado aos clipes
  for (const r of L) {
    const c = r.clip;
    if (r.end <= fromT || c.aOn === false) continue;
    const m = media.get(c.mediaId), b = m && buffers.get(m.bufferId);
    if (!b) continue;
    const off = Math.max(0, fromT - r.start), len = r.end - r.start, v = S.origVolume * (c.volume ?? 1);
    const fi = Math.min(c.afi || 0, len / 2), fo = Math.min(c.afo || 0, len / 2);
    const pts = hasKf(c, 'vol') ? gainPts(r.start, r.end, (x) => S.origVolume * kfVal(c, 'vol', srcAt(r, x), c.volume ?? 1) * fadeMul(x - r.start, len, fi, fo))
      : (fi || fo) ? [[r.start, fi ? 0 : v], [r.start + fi, v], [r.end - fo, v], [r.end, fo ? 0 : v]] : null;
    const k = spd(c);
    if (k === 1) add(b.buffer, v, r.start + off, c.in + off, len - off, pts);
    else {
      // com velocidade: usa o áudio esticado sem mudar o tom da voz (se ainda não ficou pronto, toca acelerado)
      const st = stretchCache.get(stretchKey(m.bufferId, c));
      if (st) add(st, v, r.start + off, off, len - off, pts);
      else add(b.buffer, v, r.start + off, c.in + off * k, len - off, pts, k);
    }
  }
  // efeitos sonoros das transições (podem começar antes do corte)
  const sfx = (snd, gain, cutT) => {
    if (!snd) return;
    const tlStart = cutT - (snd.peak - snd.in), len = snd.out - snd.in;
    const off = Math.max(0, fromT - tlStart); if (off >= len) return;
    add(snd.buf, gain, tlStart + off, snd.in + off, len - off);
  };
  for (const ct of cuts(L)) {
    if (ct.type === 'flash' && S.fx.click) sfx(transSound('flash'), dbToGain(S.fx.clickDb), ct.t);
    if (ct.type === 'burn' && S.fx.burnSound) sfx(transSound('burn'), dbToGain(S.fx.burnDb), ct.t);
  }
  // som das camadas de vídeo (se o volume for maior que 0)
  for (const ly of S.layers) {
    if (ly.kind !== 'video' || !(ly.volume > 0 || hasKf(ly, 'vol'))) continue;
    const m = media.get(ly.srcId), b = m && buffers.get(m.bufferId); if (!b) continue;
    const e = ly.start + ly.out - ly.in; if (e <= fromT || ly.start >= T) continue;
    const s0 = Math.max(ly.start, fromT), e0 = Math.min(e, T);
    const lpts = hasKf(ly, 'vol') ? gainPts(ly.start, e0, (x) => kfVal(ly, 'vol', ly.in + x - ly.start, ly.volume || 0)) : null;
    add(b.buffer, ly.volume || 0, s0, ly.in + (s0 - ly.start), e0 - s0, lpts);
  }
  // trilhas de áudio extraídas
  for (const a of S.audios) {
    const b = buffers.get(a.bufferId); if (!b) continue;
    const aEnd = a.start + (a.out - a.in);
    if (aEnd <= fromT || a.start >= T) continue;
    const s0 = Math.max(a.start, fromT), e0 = Math.min(aEnd, T);
    const len = aEnd - a.start, fi = Math.min(a.fadeIn || 0, len / 2), fo = Math.min(a.fadeOut || 0, len / 2), v = a.volume ?? 1;
    const pts = hasKf(a, 'vol') ? gainPts(a.start, aEnd, (x) => kfVal(a, 'vol', a.in + x - a.start, v) * fadeMul(x - a.start, len, fi, fo))
      : [[a.start, fi > 0 ? 0 : v], [a.start + fi, v], [aEnd - fo, v], [aEnd, fo > 0 ? 0 : v]];
    add(b.buffer, v, s0, a.in + (s0 - a.start), e0 - s0, pts);
  }
  return { fromT, startCtx: now, nodes, master };
}

// ---------- Vídeo (pool de 2 players, com pré-carregamento do próximo clipe) ----------
const pool = [mkVid(), mkVid()];
let activeV = null;
function mkVid() {
  const v = document.createElement('video');
  v.muted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', ''); v.preload = 'auto';
  v._clipId = null; v._url = null; v._pending = null;
  v.addEventListener('loadedmetadata', () => { if (v._pending != null) { v.currentTime = v._pending; v._pending = null; } });
  v.addEventListener('seeked', () => { if (!E.playing) draw(); });
  v.addEventListener('loadeddata', () => { if (!E.playing) draw(); });
  $('#vpool').appendChild(v);
  return v;
}
function assign(v, clip, s) {
  const m = media.get(clip.mediaId);
  v._clipId = clip.id;
  if (v._url !== m.url) { v._url = m.url; v._pending = s; v.src = m.url; v.load(); }
  else if (Math.abs(v.currentTime - s) > 0.04) v.currentTime = s;
}
function syncVideos(t) {
  const L = layout(); if (!L.length) return null;
  const r = clipAt(t, L), idx = r.i;
  const s = clamp(srcAt(r, t), r.clip.in, Math.max(r.clip.in, r.clip.out - 0.02));
  const still = stills.get(r.clip.mediaId);
  let v = still || pool.find((x) => x._clipId === r.clip.id);
  if (still) still._clipId = r.clip.id;
  else if (!v) { v = pool.find((x) => x !== activeV) || pool[0]; assign(v, r.clip, s); }
  if (v !== activeV) { if (activeV) activeV.pause(); activeV = v; }
  const pr = spd(r.clip) * (E.rate || 1); if (v.playbackRate !== pr) v.playbackRate = pr;
  if (E.playing && !E.stalled) {
    if (v.paused) v.play().catch(() => {});
    if (!v.seeking && Math.abs(v.currentTime - s) > 0.25) v.currentTime = s;
  } else {
    if (!v.paused) v.pause();
    if (!v.seeking && v._pending == null && Math.abs(v.currentTime - s) > 0.04) v.currentTime = s;
  }
  const nr = L[idx + 1], other = pool.find((x) => x !== v && x !== activeV) || pool.find((x) => x !== v);
  if (nr && !stills.has(nr.clip.mediaId) && other._clipId !== nr.clip.id) { other.pause(); assign(other, nr.clip, nr.clip.in); }
  return { r, s, v };
}
const isReady = (st) => st && st.v._clipId === st.r.clip.id && !st.v.seeking && st.v._pending == null && st.v.readyState >= 2;

// ---------- Renderização ----------
const pv = $('#preview'), pctx = pv.getContext('2d');
function render(ctx, W, H, t, st, pre = false) {
  if (!isReady(st)) return false; // mantém o último quadro enquanto carrega
  renderFrame(ctx, W, H, t, st.r, st.v, pre);
  return true;
}
let stillPreview = false; // prévia parada: textos de modelo aparecem completos para editar
function renderFrame(ctx, W, H, t, r, v, pre = false) {
  stillPreview = pre && !E.playing;
  ctx.fillStyle = v.isStill ? '#fff' : '#000'; ctx.fillRect(0, 0, W, H);
  const vw = v.videoWidth, vh = v.videoHeight;
  if (vw && vh) {
    // keyframes do clipe: posição, escala, rotação e opacidade (somados ao zoom)
    const c = r.clip, s = srcAt(r, t);
    const sc = kfVal(c, 'scale', s, c.sc ?? 1), cx = kfVal(c, 'x', s, c.tx ?? 0.5) * W, cy = kfVal(c, 'y', s, c.ty ?? 0.5) * H;
    const rot = kfVal(c, 'rot', s, c.rot ?? 0), op = clamp(kfVal(c, 'op', s, c.op ?? 1), 0, 1), col = hasColor(c.color);
    const k = Math.min(W / vw, H / vh) * zoomAt(t, r) * sc, w = vw * k, h = vh * k;
    if (!rot && op >= 1) {
      // ajuste de cor só deste clipe
      if (!col || !colorPass(ctx, W, H, v, cx - w / 2, cy - h / 2, w, h, c.color)) ctx.drawImage(v, cx - w / 2, cy - h / 2, w, h);
    } else if (op > 0) {
      ctx.save(); ctx.globalAlpha = op; ctx.translate(cx, cy); ctx.rotate(rot * Math.PI / 180);
      const tmp = col ? scratch(W, H) : null;
      if (tmp && colorPass(tmp.getContext('2d'), W, H, v, (W - w) / 2, (H - h) / 2, w, h, c.color)) ctx.drawImage(tmp, -W / 2, -H / 2, W, H);
      else ctx.drawImage(v, -w / 2, -h / 2, w, h);
      ctx.restore();
    }
  }
  drawLayers(ctx, W, H, t, pre); // camadas: acima do vídeo, abaixo da legenda
  // camadas de ajuste: acima do vídeo e das camadas, abaixo da legenda
  for (const L of S.layers) if (L.kind === 'adjust' && t >= L.start && t < L.start + L.out - L.in && hasColor(L.color)) colorPass(ctx, W, H, ctx.canvas, 0, 0, W, H, L.color);
  const cap = captionAt(t, r);
  if (cap && cap.text.trim()) drawCaption(ctx, W, H, cap.text, cap, srcAt(r, t));
  overlays(ctx, W, H, t);
}
function overlays(ctx, W, H, t) {
  const T = total(), fx = S.fx;
  let fa = 0;
  for (const ct of cuts()) {
    if (ct.type === 'flash') { const half = fx.flashDur / 2, d = Math.abs(t - ct.t); if (d < half) fa = Math.max(fa, 1 - d / half); }
    else if (ct.type === 'burn') { const p = (t - ct.t) / fx.burnDur + 0.5; if (p > 0 && p < 1) drawFilmBurn(ctx, W, H, p, ct.seed); }
  }
  if (fa > 0) { ctx.fillStyle = `rgba(255,255,255,${fa})`; ctx.fillRect(0, 0, W, H); }
  const ba = clipFadeAlpha(t);
  if (ba > 0) { ctx.fillStyle = `rgba(0,0,0,${clamp(ba, 0, 1)})`; ctx.fillRect(0, 0, W, H); }
}
// Film burn feito por código: manchas de luz quente que atravessam a tela e "queimam" até quase branco no corte
function rng(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function drawFilmBurn(ctx, W, H, p, seed) {
  const a = Math.sin(Math.PI * clamp(p, 0, 1)); if (a <= 0.002) return;
  const R = rng(seed + 11), M = Math.max(W, H);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = `rgba(255,80,10,${0.32 * a})`; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 6; i++) {
    const x0 = R(), y0 = R(), dx = (R() - 0.5) * 1.1, dy = (R() - 0.5) * 0.7, rr = 0.22 + R() * 0.45, warm = R() < 0.5;
    const x = (x0 + dx * (p - 0.5) * 2) * W, y = (y0 + dy * (p - 0.5) * 2) * H, r = rr * M * (0.45 + 0.85 * a);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${warm ? '255,238,190' : '255,205,130'},${a})`);
    g.addColorStop(0.35, `rgba(255,135,35,${0.85 * a})`);
    g.addColorStop(0.7, `rgba(205,40,12,${0.45 * a})`);
    g.addColorStop(1, 'rgba(120,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  const hot = Math.pow(a, 5);
  if (hot > 0.01) { ctx.fillStyle = `rgba(255,246,228,${0.92 * hot})`; ctx.fillRect(0, 0, W, H); }
  ctx.restore();
}
function wrapLines(ctx, text, maxW) {
  const out = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const w of para.split(/\s+/).filter(Boolean)) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) { out.push(line); line = w; } else line = test;
    }
    if (line) out.push(line);
  }
  return out;
}
// Instante em que cada palavra do bloco é falada (tempo no arquivo de origem).
// Usa os tempos da transcrição quando o número de palavras bate; senão distribui no bloco.
function capTimes(cap, n) {
  if (!cap || !n) return [];
  const ws = (S.words[cap.mediaId] || []).filter((w) => w.start >= cap.start - 0.05 && w.start < cap.end - 0.01);
  if (ws.length === n) return ws.map((w) => Math.max(cap.start, w.start));
  const span = Math.max(0.2, Math.min(cap.end - cap.start, n * 0.45));
  return Array.from({ length: n }, (_, i) => cap.start + (span * i) / n);
}
// Modelo de legenda com as cores escolhidas por cima das do modelo (Cor do texto / Cor do destaque).
function capTplOf(c) {
  const t = tplById(c.tpl); if (!t || (!c.tcolor && !c.tacc && !c.tfont)) return t;
  return { ...t, base: { ...t.base, color: c.tcolor || t.base.color, active: c.tacc || t.base.active, ...(c.tfont ? { font: fontCss(c.tfont) } : {}) },
    paper: c.tcolor || t.paper, accent: c.tacc || t.accent };
}
function drawCaption(ctx, W, H, text, cap, s) {
  const c = S.cap, k = Math.min(W, H) / 1080, fs = c.size * k;
  // keyframes do bloco de legenda (posição, escala, rotação, opacidade)
  const op = cap ? clamp(kfVal(cap, 'op', s, cap.op ?? 1), 0, 1) : 1; if (op <= 0) return;
  const px = cap ? kfVal(cap, 'x', s, cap.x ?? 0.5) : 0.5, py = cap ? kfVal(cap, 'y', s, cap.y ?? c.y) : c.y;
  const sc = cap ? kfVal(cap, 'scale', s, cap.sc ?? 1) : 1, rot = cap ? kfVal(cap, 'rot', s, cap.rot ?? 0) : 0;
  ctx.save();
  ctx.globalAlpha = op; ctx.translate(px * W, py * H); if (rot) ctx.rotate(rot * Math.PI / 180); if (sc !== 1) ctx.scale(sc, sc);
  const tpl = capTplOf(c);
  if (tpl) {
    // modelo de legenda: palavra por palavra, com a combinação de fontes nos destaques (*palavra*)
    const toks = parseMarked(text);
    drawCapTpl(ctx, W, tpl, toks, capTimes(cap, toks.length), stillPreview ? 1e9 : (s ?? 1e9), fs, c.upper, presetByName(c.anim), { ls: c.ls || 0, lh: c.lh || 1.2, k });
    ctx.restore(); return;
  }
  text = stripMarks(text);
  ctx.font = `${c.weight} ${fs}px ${fontCss(c.font)}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const ls = (c.ls || 0) * k, hasLS = 'letterSpacing' in ctx; if (hasLS) ctx.letterSpacing = ls + 'px';
  const lines = wrapLines(ctx, c.upper ? text.toUpperCase() : text, W * 0.86);
  const lh = fs * (c.lh || 1.2); let y = -(lines.length - 1) * lh / 2;
  ctx.fillStyle = c.color;
  const passes = c.shadow > 0 ? 1 + (c.shadow > 60) + (c.shadow > 85) : 1;
  ctx.shadowColor = `rgba(0,0,0,${c.shadow / 100})`; ctx.shadowBlur = c.blur * k * sc; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
  const dx = hasLS ? ls / 2 : 0; // compensa o espaço que sobra depois da última letra
  for (const ln of lines) { for (let p = 0; p < passes; p++) ctx.fillText(ln, dx, y); y += lh; }
  ctx.restore();
}
let scr = null;
function scratch(W, H) { scr ??= document.createElement('canvas'); if (scr.width !== W || scr.height !== H) { scr.width = W; scr.height = H; } return scr; }
function draw() {
  if (!S.clips.length) { pctx.fillStyle = '#000'; pctx.fillRect(0, 0, pv.width, pv.height); return; }
  const st = syncVideos(S.t); syncLayers(S.t);
  render(pctx, pv.width, pv.height, S.t, st, true);
}
function sizePreview() {
  const a = S.aspect || 9 / 16;
  // em tela cheia a prévia fica com mais resolução (até 1080 no lado menor)
  const B = FSP.on ? Math.min(1080, Math.round(540 * clamp(window.devicePixelRatio || 1, 1, 2))) : 540;
  const W = a < 1 ? B : Math.round(B * a), H = a < 1 ? Math.round(B / a) : B;
  if (pv.width !== W || pv.height !== H) { pv.width = W; pv.height = H; }
}
function outSize(res) {
  const a = S.aspect || 9 / 16, short = res === '4k' ? 2160 : 1080;
  const even = (x) => Math.round(x / 2) * 2;
  return a < 1 ? [short, even(short / a)] : [even(short * a), short];
}

// ---------- Motor de reprodução ----------
const E = { playing: false, exporting: false, stalled: false, stallSince: 0, sched: null, raf: 0, rec: null, exp: null };
const FSP = { on: false, hideT: 0, scrub: null }; // player em tela cheia
function clock() { return E.sched ? Math.max(E.sched.fromT, E.sched.fromT + (actx.currentTime - E.sched.startCtx)) : S.t; }
async function play() {
  if (!S.clips.length || E.playing) return;
  ac(); await actx.resume();
  if (S.t >= total() - 0.05) S.t = 0;
  if (speedPending()) { toast('Preparando o áudio na nova velocidade…'); await prepareSpeeds(); if (E.playing) return; }
  E.sched = scheduleAudio(S.t, actx.destination);
  E.playing = true; E.stalled = false; updPlay(); loop();
}
function pause() {
  if (!E.playing) return;
  E.playing = false; stopSched(); pool.forEach((v) => v.pause()); cancelAnimationFrame(E.raf);
  if (actx && actx.state === 'suspended') actx.resume();
  updPlay(); draw();
}
function stopSched() {
  if (!E.sched) return;
  E.sched.nodes.forEach((n) => { try { n.stop(); } catch {} });
  try { E.sched.master.disconnect(); } catch {}
  E.sched = null;
}
function loop() {
  E.raf = requestAnimationFrame(loop);
  const T = total(), t = clock();
  if (t >= T) { S.t = T; if (E.exporting) finishExport(); else { pause(); S.t = T; followScroll(); updTime(); } return; }
  const st = syncVideos(t), ready = isReady(st); syncLayers(t);
  if (!ready && !E.stalled) {
    E.stalled = true; E.stallSince = performance.now();
    actx.suspend(); if (E.rec && E.rec.state === 'recording') E.rec.pause(); st && st.v.pause();
  } else if (E.stalled && (ready || performance.now() - E.stallSince > 1500)) {
    E.stalled = false; st && st.v.play().catch(() => {});
    actx.resume(); if (E.rec && E.rec.state === 'paused') E.rec.resume();
  }
  S.t = t;
  if (!E.exporting) render(pctx, pv.width, pv.height, t, st, true);
  if (E.exporting) {
    if (render(E.exp.cx, E.exp.W, E.exp.H, t, st) && (E.exp.n = (E.exp.n || 0) + 1) % 6 === 0) pctx.drawImage(E.exp.cv, 0, 0, pv.width, pv.height);
    const pct = Math.round(100 * t / T); const bar = $('#exp-bar'); if (bar) bar.style.width = pct + '%';
    const lab = $('#exp-st'); if (lab) lab.textContent = `Exportando… ${pct}%`;
  } else { followScroll(); updTime(); }
}

// ---------- Interface: linha do tempo ----------
const sc = $('#tl-scroll'), inner = $('#tl-inner');
let progScroll = false;
const half = () => sc.clientWidth / 2;
function renderTimeline() {
  const pps = S.pps, T = total(), L = layout(), h = half();
  const audioEnd = [...S.audios, ...S.layers].reduce((m, a) => Math.max(m, a.start + a.out - a.in), 0);
  inner.style.width = (Math.max(T, audioEnd) * pps + sc.clientWidth) + 'px';

  // régua
  const ruler = $('#ruler'); ruler.innerHTML = '';
  const step = pps >= 80 ? 1 : pps >= 30 ? 2 : pps >= 12 ? 5 : 10;
  for (let s = 0; s <= Math.max(T, audioEnd) + 0.001; s += step) {
    const d = document.createElement('div'); d.className = 'tick'; d.style.left = (h + s * pps) + 'px';
    d.innerHTML = `<span>${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}</span>`; ruler.appendChild(d);
  }

  // camadas (acima do vídeo principal)
  const tl = $('#track-layer'); tl.innerHTML = '';
  const ll = layerLanes(); tl.style.height = (ll.count * 40) + 'px'; tl.style.marginTop = ll.count ? '4px' : '0';
  for (const L of S.layers) {
    const el = document.createElement('div');
    el.className = 'lay' + (L.kind === 'adjust' ? ' adj' : L.kind === 'text' ? ' txt' : '') + (S.sel?.type === 'layer' && S.sel.id === L.id ? ' sel' : '');
    el.style.left = (h + L.start * pps) + 'px'; el.style.width = Math.max(3, (L.out - L.in) * pps - 2) + 'px'; el.style.top = (ll.map.get(L.id) * 40) + 'px';
    const th = L.kind === 'image' ? images.get(L.srcId)?.url : media.get(L.srcId)?.thumb; if (th) el.style.backgroundImage = `url(${th})`;
    el.innerHTML = (L.kind === 'adjust' ? '<span class="nm">Ajuste</span>' : L.kind === 'text' ? `<span class="nm">${L.layout ? 'Modelo' : 'Texto'}</span><span class="tx">${esc(stripMarks(L.text))}</span>` : `<span class="nm">${L.kind === 'image' ? 'Imagem' : 'Vídeo'}</span>`) + kfMarks(L, L.in, L.out, pps);
    el.onclick = (e) => { e.stopPropagation(); if (el._dragged) { el._dragged = false; return; } select('layer', L.id); };
    if (S.sel?.type === 'layer' && S.sel.id === L.id) addHandles(el);
    bindDrag(el, 'layer', L.id, spanOps(el, L, h, { free: L.kind !== 'video', maxOut: L.kind === 'video' ? (media.get(L.srcId)?.duration ?? Infinity) : Infinity }));
    tl.appendChild(el);
  }

  // vídeo
  const tv = $('#track-video'); tv.innerHTML = '';
  for (const r of L) {
    const el = document.createElement('div');
    const isSel = S.sel?.type === 'clip' && S.sel.id === r.clip.id;
    el.className = 'clip' + (isSel ? ' sel' : '');
    el.style.left = (h + r.start * pps) + 'px'; el.style.width = Math.max(3, (r.end - r.start) * pps - 2) + 'px';
    const m = media.get(r.clip.mediaId); if (m?.thumb) el.style.backgroundImage = `url(${m.thumb})`;
    el.innerHTML = `<span class="dur">${(r.end - r.start).toFixed(1)}s${spd(r.clip) !== 1 ? ` · ${fmtSpd(spd(r.clip))}` : ''}</span>` +
      (r.clip.vfi ? `<i class="vf in" style="width:${r.clip.vfi * pps}px"></i>` : '') + (r.clip.vfo ? `<i class="vf out" style="width:${r.clip.vfo * pps}px"></i>` : '') +
      kfMarks(r.clip, r.clip.in, r.clip.out, pps / spd(r.clip), KF_VIS);
    el.onclick = (e) => { e.stopPropagation(); if (el._dragged) return; select('clip', r.clip.id); };
    if (isSel) addHandles(el);
    bindDrag(el, 'clip', r.clip.id, clipOps(el, r, h));
    tv.appendChild(el);
    for (const z of S.zooms.filter((x) => x.clipId === r.clip.id)) {
      const zb = document.createElement('button'); zb.className = 'zm'; zb.style.left = (h + (r.start + z.off) * pps + 3) + 'px';
      zb.innerHTML = ic(z.type === 'in' ? 'zoomIn' : 'zoomOut'); zb.setAttribute('aria-label', 'Zoom');
      zb.onclick = (e) => { e.stopPropagation(); openZoomSheet(r.clip.id, z.id); }; tv.appendChild(zb);
    }
    const selC = (S.sel?.type === 'clip' || S.sel?.type === 'clipaudio') ? S.sel.id : null;
    if (r.i > 0 && !(selC && (selC === r.clip.id || selC === L[r.i - 1].clip.id))) { // com o clipe selecionado, as alças ficam no lugar do ⚡
      const b = document.createElement('button'); const tr = r.clip.transition || 'none';
      b.className = 'tr ' + tr; b.style.left = (h + r.start * pps) + 'px';
      b.innerHTML = tr === 'flash' ? ic('zap') : tr === 'burn' ? ic('flame') : ic('plus'); b.setAttribute('aria-label', 'Transição deste corte');
      b.onclick = (e) => { e.stopPropagation(); openCutSheet(r.clip.id); };
      tv.appendChild(b);
    }
  }

  // áudio original vinculado (amarelo, logo abaixo do vídeo)
  const to = $('#track-orig'); to.innerHTML = '';
  for (const r of L) {
    const c = r.clip; if (c.aOn === false) continue;
    const m = media.get(c.mediaId), has = !!(m && buffers.get(m.bufferId));
    const el = document.createElement('div');
    el.className = 'aud linked' + (has ? '' : ' none') +
      (S.sel?.type === 'clipaudio' && S.sel.id === c.id ? ' sel' : '') + (S.sel?.type === 'clip' && S.sel.id === c.id ? ' soft' : '');
    const w = Math.max(3, (r.end - r.start) * pps - 2);
    el.style.left = (h + r.start * pps) + 'px'; el.style.width = w + 'px';
    if (has) {
      const cv = document.createElement('canvas'); el.appendChild(cv);
      drawWave(cv, m.bufferId, c.in, c.out, (c.volume ?? 1) * S.origVolume, c.afi, c.afo, w, hasKf(c, 'vol') ? (tt) => kfVal(c, 'vol', tt, c.volume ?? 1) * S.origVolume : null, WAVE_ORIG);
    }
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = has ? 'Áudio original' : 'sem áudio'; el.appendChild(nm);
    if (has) el.insertAdjacentHTML('beforeend', kfMarks(c, c.in, c.out, pps / spd(c), ['vol']));
    el.onclick = (e) => { e.stopPropagation(); if (el._dragged) return; has ? select('clipaudio', c.id) : toast('Não consegui ler o áudio deste vídeo', 2500); };
    if (S.sel?.type === 'clipaudio' && S.sel.id === c.id) addHandles(el);
    if (has) bindDrag(el, 'clipaudio', c.id, clipOps(el, r, h));
    to.appendChild(el);
  }

  // legendas
  const tc = $('#track-caps'); tc.innerHTML = '';
  for (const sp of capSpans(L)) {
    const el = document.createElement('div');
    el.className = 'capb' + (S.sel?.type === 'caption' && S.sel.id === sp.cap.id ? ' sel' : '');
    el.style.left = (h + sp.start * pps) + 'px'; el.style.width = Math.max(3, (sp.end - sp.start) * pps - 1) + 'px';
    el.textContent = stripMarks(sp.cap.text);
    if (anyKf(sp.cap)) el.insertAdjacentHTML('beforeend', kfMarks(sp.cap, sp.a, sp.a + (sp.end - sp.start) * sp.k, pps / sp.k));
    el.onclick = (e) => { e.stopPropagation(); if (el._dragged) return; seekTo(sp.start + 0.01); select('caption', sp.cap.id); };
    if (S.sel?.type === 'caption' && S.sel.id === sp.cap.id) addHandles(el);
    bindDrag(el, 'caption', sp.cap.id, capOps(el, sp, h));
    tc.appendChild(el);
  }

  // áudio
  const ta = $('#track-audio'); ta.innerHTML = '';
  const lanes = audioLanes(); ta.style.height = (lanes.count * 34) + 'px';
  for (const a of S.audios) {
    const el = document.createElement('div');
    el.className = 'aud' + (S.sel?.type === 'audio' && S.sel.id === a.id ? ' sel' : '');
    const w = Math.max(3, (a.out - a.in) * pps - 2);
    el.style.left = (h + a.start * pps) + 'px'; el.style.width = w + 'px'; el.style.top = (lanes.map.get(a.id) * 34) + 'px';
    const cv = document.createElement('canvas'); el.appendChild(cv);
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = a.name || 'Áudio'; el.appendChild(nm);
    el.insertAdjacentHTML('beforeend', kfMarks(a, a.in, a.out, pps));
    el.onclick = (e) => { e.stopPropagation(); if (el._dragged) { el._dragged = false; return; } select('audio', a.id); };
    if (S.sel?.type === 'audio' && S.sel.id === a.id) addHandles(el);
    bindDrag(el, 'audio', a.id, spanOps(el, a, h, { free: false, maxOut: buffers.get(a.bufferId)?.buffer.duration ?? Infinity }));
    ta.appendChild(el);
    drawWave(cv, a.bufferId, a.in, a.out, a.volume ?? 1, a.fadeIn, a.fadeOut, w, hasKf(a, 'vol') ? (tt) => kfVal(a, 'vol', tt, a.volume ?? 1) : null, WAVE_AUDIO);
  }
  followScroll(true);
}
const WAVE_ORIG = 'rgba(255,184,107,.9)', WAVE_AUDIO = 'rgba(92,240,196,.85)';
function drawWave(cv, bufferId, inP, outP, vol, fi, fo, w, volFn, color = WAVE_ORIG) {
  const b = buffers.get(bufferId); if (!b) return;
  const H = 30, dpr = Math.min(2, window.devicePixelRatio || 1), W = Math.min(4000, Math.ceil(w));
  cv.width = W * dpr; cv.height = H * dpr;
  const c = cv.getContext('2d'); c.scale(dpr, dpr); c.fillStyle = color;
  const p = b.peaks, rate = 50, len = outP - inP;
  for (let x = 0; x < W; x++) {
    const tt = inP + (x / W) * len, i = Math.floor(tt * rate);
    const tl = x / W * len;
    let env = 1;
    if (fi && tl < fi) env = tl / fi;
    if (fo && len - tl < fo) env = Math.min(env, (len - tl) / fo);
    const amp = Math.min(1, (p[i] || 0) * (volFn ? volFn(tt) : vol) * env) * (H - 6);
    c.fillRect(x, (H - amp) / 2, 1, Math.max(1, amp));
  }
}
function followScroll(force) {
  const x = S.t * S.pps;
  if (force || Math.abs(sc.scrollLeft - x) > 0.5) { progScroll = true; sc.scrollLeft = x; }
}
sc.addEventListener('scroll', () => {
  if (progScroll) { progScroll = false; return; }
  if (E.exporting) return;
  if (E.playing) pause();
  S.t = clamp(sc.scrollLeft / S.pps, 0, total());
  draw(); updTime();
}, { passive: true });
sc.addEventListener('touchstart', () => { if (E.playing && !E.exporting) pause(); }, { passive: true });
sc.addEventListener('wheel', () => { if (E.playing && !E.exporting) pause(); }, { passive: true });
inner.addEventListener('click', () => { if (S.sel) select(null); });
function seekTo(t) { if (E.playing) pause(); S.t = clamp(t, 0, total()); followScroll(true); draw(); updTime(); }
function zoom(f) { S.pps = clamp(S.pps * f, 8, 400); renderTimeline(); }

// ---------- Interface: barra de ferramentas ----------
function select(type, id) { S.sel = type ? { type, id } : null; renderTimeline(); renderToolbar(); }
function renderToolbar() {
  const tb = $('#toolbar'); let items;
  const sel = S.sel;
  if (sel?.type === 'clip') {
    items = [
      ['scissors', 'Dividir', splitAtPlayhead], ['trash', 'Apagar', () => deleteClip(sel.id), 'danger'],
      ['fade', 'Fade', () => openClipFade(sel.id)], ['zoomIn', 'Zoom', () => openZoomSheet(sel.id)], ['gauge', 'Velocidade', () => openSpeedSheet(sel.id)],
      ['zap', 'Transições', () => openTransitionFor(sel.id)], ['contrast', 'Ajustes', () => openColor('clip', sel.id)], ['volume', 'Som', openAudioHub],
      ['x', 'Fechar', () => select(null)],
    ];
  } else if (sel?.type === 'clipaudio') {
    items = [
      ['scissors', 'Dividir', splitAtPlayhead], ['volume', 'Som', openAudioHub],
      ['unlink', 'Desvincular', () => unlinkAudio(sel.id)], ['trash', 'Apagar áudio', () => deleteClipAudio(sel.id), 'danger'],
      ['x', 'Fechar', () => select(null)],
    ];
  } else if (sel?.type === 'audio') {
    items = [
      ['scissors', 'Dividir', splitAtPlayhead], ['trash', 'Apagar', () => deleteAudio(sel.id), 'danger'],
      ['volume', 'Som', openAudioHub], ['target', 'Início aqui', () => audioToPlayhead(sel.id)],
      ['x', 'Fechar', () => select(null)],
    ];
  } else if (sel?.type === 'layer') {
    const lk = S.layers.find((x) => x.id === sel.id)?.kind;
    items = [
      lk === 'adjust' ? ['contrast', 'Ajustes', () => openColor('layer', sel.id)] : lk === 'text' ? ['edit', 'Editar texto', () => openTextSheet(sel.id)] : ['sliders', 'Ajustar', () => openLayerSheet(sel.id)],
      ['scissors', 'Dividir', () => splitLayer(sel.id)], ['trimL', 'Cortar início', () => trimLayer(sel.id, 'start')], ['trimR', 'Cortar fim', () => trimLayer(sel.id, 'end')],
      ['target', 'Início aqui', () => { const L = S.layers.find((x) => x.id === sel.id); commit(); L.start = S.t; refresh(); }],
      ['trash', 'Apagar', () => { commit(); S.layers = S.layers.filter((x) => x.id !== sel.id); S.sel = null; refresh(); }, 'danger'],
      ['x', 'Fechar', () => select(null)],
    ];
  } else if (sel?.type === 'caption') {
    items = [
      ['edit', 'Editar texto', () => openCaptions('texto', sel.id)], ['scissors', 'Dividir', () => splitCaption(sel.id)],
      ['trash', 'Apagar', () => deleteCaption(sel.id), 'danger'], ['type', 'Estilo', () => openCaptions('estilo')],
      ['x', 'Fechar', () => select(null)],
    ];
  } else {
    items = [
      ['plus', 'Novo', () => $('#file-video').click()], ...(S.clips.length ? [['scissors', 'Dividir', splitAtPlayhead]] : []), ['music', 'Áudio', openAudioHub],
      ['type', 'Texto', () => openCaptions('livre')], ['layers', 'Camada', () => $('#file-layer').click()],
      ['contrast', 'Ajustes', addAdjustLayer],
    ];
  }
  $('#btn-kf').classList.toggle('ready', !!kfTarget());
  tb.innerHTML = '';
  for (const [icon, label, fn, cls] of items) {
    const b = document.createElement('button'); b.className = 'tool ' + (cls || '');
    b.innerHTML = `${ic(icon)}<span>${label}</span>`; b.onclick = fn; tb.appendChild(b);
  }
}

// ---------- Ações de edição ----------
function newClipTransition() { return 'none'; }
function splitAtPlayhead() {
  if (S.sel?.type === 'audio') return splitAudio(S.sel.id);
  if (S.sel?.type === 'layer') return splitLayer(S.sel.id);
  if (!S.clips.length) return toast('Adicione um vídeo primeiro');
  const r = clipAt(S.t), s = srcAt(r, S.t);
  if (s - r.clip.in < 0.1 || r.clip.out - s < 0.1) return toast('Mova o cursor para o meio do clipe');
  commit();
  // o áudio vinculado é cortado junto: o fade in fica na parte da esquerda, o fade out na da direita
  const nc = { ...r.clip, id: uid(), in: s, transition: newClipTransition(), afi: 0, vfi: 0 };
  if (r.clip.kf) nc.kf = structuredClone(r.clip.kf); // keyframes ficam iguais nas duas partes (tempo de origem)
  r.clip.out = s; r.clip.afo = 0; r.clip.vfo = 0; S.clips.splice(r.i + 1, 0, nc);
  const cut = S.t - r.start; // zooms ficam no tempo da linha do tempo
  S.zooms.forEach((z) => { if (z.clipId === r.clip.id && z.off >= cut) { z.clipId = nc.id; z.off -= cut; } });
  if (S.sel?.type === 'clipaudio' && S.sel.id === r.clip.id) S.sel = null;
  refresh();
}
function unlinkAudio(clipId) {
  const r = layout().find((x) => x.clip.id === clipId); if (!r) return;
  const m = media.get(r.clip.mediaId);
  if (!m?.bufferId || r.clip.aOn === false) return toast('Este clipe não tem áudio vinculado');
  if (spd(r.clip) !== 1) return toast('Volte a velocidade deste clipe para 1x antes de desvincular o áudio', 2600);
  commit();
  const a = { id: uid(), bufferId: m.bufferId, name: 'Áudio de ' + m.name.replace(/\.[^.]+$/, ''), start: r.start, in: r.clip.in, out: r.clip.out,
    volume: (r.clip.volume ?? 1) * S.origVolume, fadeIn: r.clip.afi || 0, fadeOut: r.clip.afo || 0 };
  if (hasKf(r.clip, 'vol')) { a.kf = { vol: r.clip.kf.vol.map((k) => ({ ...k, v: k.v * S.origVolume })) }; delete r.clip.kf.vol; }
  r.clip.aOn = false; S.audios.push(a);
  S.sel = { type: 'audio', id: a.id };
  if (sheetKind) closeSheet();
  toast('Áudio desvinculado: agora clipe e áudio são independentes', 2200);
  refresh();
}
function deleteClipAudio(clipId) {
  const c = S.clips.find((x) => x.id === clipId); if (!c) return;
  commit(); c.aOn = false; S.sel = null; if (sheetKind) closeSheet(); refresh();
}
function deleteClip(id) {
  commit(); S.clips = S.clips.filter((c) => c.id !== id); S.zooms = S.zooms.filter((z) => z.clipId !== id); S.sel = null;
  if (S.clips[0]) S.clips[0].transition = S.clips[0].transition; // primeiro clipe não usa transição
  S.t = clamp(S.t, 0, total()); refresh();
}
function moveClip(id, dir) {
  const i = S.clips.findIndex((c) => c.id === id), j = i + dir;
  if (j < 0 || j >= S.clips.length) return;
  commit(); [S.clips[i], S.clips[j]] = [S.clips[j], S.clips[i]];
  const L = layout(); seekTo(L[j].start + 0.01); refresh();
}
function trimClip(id, side) {
  const L = layout(), r = L.find((x) => x.clip.id === id);
  if (!r || S.t <= r.start + 0.05 || S.t >= r.end - 0.05) return toast('Coloque o cursor dentro do clipe selecionado');
  commit();
  const d = S.t - r.start;
  if (side === 'start') {
    r.clip.in += d * spd(r.clip); S.t = r.start;
    S.zooms.forEach((z) => { if (z.clipId === id) z.off -= d; });
    S.zooms = S.zooms.filter((z) => z.clipId !== id || z.off >= -0.01).map((z) => (z.clipId === id && z.off < 0 ? { ...z, off: 0 } : z));
  } else { r.clip.out = r.clip.in + d * spd(r.clip); S.zooms = S.zooms.filter((z) => z.clipId !== id || z.off < d); }
  refresh();
}
function splitAudio(id) {
  const a = S.audios.find((x) => x.id === id); if (!a) return;
  const off = S.t - a.start;
  if (off < 0.1 || off > a.out - a.in - 0.1) return toast('Coloque o cursor dentro do áudio selecionado');
  commit();
  const na = { ...a, id: uid(), start: S.t, in: a.in + off, fadeIn: 0 };
  if (a.kf) na.kf = structuredClone(a.kf);
  a.out = a.in + off; a.fadeOut = 0; S.audios.push(na); refresh();
}
function deleteAudio(id) { commit(); S.audios = S.audios.filter((a) => a.id !== id); S.sel = null; refresh(); }
function audioToPlayhead(id) { const a = S.audios.find((x) => x.id === id); commit(); a.start = S.t; refresh(); }
function trimAudio(id, side) {
  const a = S.audios.find((x) => x.id === id), off = S.t - a.start;
  if (off < 0.05 || off > a.out - a.in - 0.05) return toast('Coloque o cursor dentro do áudio selecionado');
  commit();
  if (side === 'start') { a.in += off; a.start = S.t; } else a.out = a.in + off;
  refresh();
}
function deleteCaption(id) { commit(); S.captions = S.captions.filter((c) => c.id !== id); S.sel = null; refresh(); }
function splitCaption(id) {
  const c = S.captions.find((x) => x.id === id); if (!c) return;
  const w = c.text.trim().split(/\s+/);
  if (w.length < 2) return toast('O bloco precisa ter 2 palavras ou mais');
  commit();
  const mid = Math.ceil(w.length / 2), a = w.slice(0, mid).join(' '), b = w.slice(mid).join(' ');
  const tm = c.start + (c.end - c.start) * (a.length / (a.length + b.length));
  const nc = { id: uid(), mediaId: c.mediaId, start: tm, end: c.end, text: b };
  c.end = tm; c.text = a;
  S.captions.splice(S.captions.indexOf(c) + 1, 0, nc);
  refresh(); if (sheetKind === 'captions') openCaptions('texto', c.id);
}
function mergeCaption(id) {
  const c = S.captions.find((x) => x.id === id);
  const next = S.captions.filter((x) => x.mediaId === c.mediaId && x.start >= c.start && x !== c).sort((a, b) => a.start - b.start)[0];
  if (!next) return toast('Não há bloco depois deste');
  commit();
  c.text = (c.text.trim() + ' ' + next.text.trim()).trim(); c.end = Math.max(c.end, next.end);
  S.captions = S.captions.filter((x) => x !== next);
  refresh(); openCaptions('texto', c.id);
}

// ---------- Importação ----------
const isImgFile = (f) => /^image\//.test(f.type) || /\.(png|jpe?g|gif|webp|heic|heif|avif|bmp)$/i.test(f.name);
const IMG_DUR = 3;      // duração inicial de uma foto na trilha principal (s)
const IMG_MAX = 600;    // dá para esticar a foto até 10 min
async function importVideos(files) {
  ac(); let warned = false, nImg = 0, nVid = 0;
  for (const f of files) {
    toast(`Carregando ${f.name}…`, 60000);
    try {
      const m = await loadMedia(f);
      commit();
      media.set(m.id, m);
      if (!S.aspect) S.aspect = m.isImg ? 9 / 16 : m.w / m.h;
      S.clips.push(normClip({ id: uid(), mediaId: m.id, in: 0, out: m.isImg ? IMG_DUR : m.duration, transition: S.clips.length ? newClipTransition() : 'none', volume: 1 }));
      if (m.isImg) nImg++; else nVid++;
      if (!m.bufferId && !m.isImg) { warned = true; toast('Vídeo adicionado, mas não consegui ler o áudio dele', 4000); }
      dbPut('file:' + m.id, f);
    } catch (e) { console.error(e); warned = true; toast('Não consegui abrir ' + f.name + ': ' + e.message, 4000); }
  }
  if (!warned) toast(nImg && !nVid ? (nImg > 1 ? 'Fotos adicionadas' : 'Foto adicionada') + ' (3 s cada; arraste a borda para mudar)' : nImg ? 'Vídeos e fotos adicionados' : 'Vídeo adicionado', 2200);
  refresh();
}
// ---------- Fotos na trilha principal ----------
// Uma foto (JPG, PNG…) vira um "player" parado: um canvas já com fundo branco (PNG transparente fica sobre branco)
// que se comporta como um <video> pronto, então prévia, keyframes, zoom, cor e exportação funcionam igual.
const stills = new Map(); // mediaId -> canvas
function makeStill(id, img, w, h) {
  const k = Math.min(1, 4096 / Math.max(w, h)), cw = Math.max(1, Math.round(w * k)), ch = Math.max(1, Math.round(h * k));
  const c = document.createElement('canvas'); c.width = cw; c.height = ch;
  const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, cw, ch); x.drawImage(img, 0, 0, cw, ch);
  Object.assign(c, { videoWidth: cw, videoHeight: ch, readyState: 4, seeking: false, paused: true, _pending: null, _clipId: null, playbackRate: 1, currentTime: 0, isStill: true });
  c.play = () => Promise.resolve(); c.pause = () => {}; c.requestVideoFrameCallback = () => 0;
  stills.set(id, c); return c;
}
async function loadMedia(file, id = uid()) {
  const url = URL.createObjectURL(file);
  if (isImgFile(file)) {
    const img = new Image(); img.src = url;
    await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('imagem não suportada')); });
    const w = img.naturalWidth || 1080, h = img.naturalHeight || 1920, st = makeStill(id, img, w, h);
    const tc = document.createElement('canvas'), th = 112; tc.height = th; tc.width = Math.round(th * w / h); tc.getContext('2d').drawImage(st, 0, 0, tc.width, th);
    return { id, name: file.name, url, duration: IMG_MAX, w, h, bufferId: null, thumb: tc.toDataURL('image/jpeg', 0.7), isImg: true };
  }
  const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
  await new Promise((res, rej) => { v.onloadedmetadata = res; v.onerror = () => rej(new Error('formato não suportado')); });
  const m = { id, name: file.name, url, duration: v.duration, w: v.videoWidth || 1080, h: v.videoHeight || 1920, bufferId: null, thumb: null };
  m.thumb = await grabThumb(v, Math.min(0.2, m.duration / 2)).catch(() => null);
  try {
    const buf = await extractAudio(file);
    const bid = 'm' + id; buffers.set(bid, { buffer: buf, peaks: computePeaks(buf), name: file.name, fileKey: 'file:' + id });
    m.bufferId = bid;
  } catch (e) { console.warn('Vídeo sem áudio legível', e); }
  return m;
}
function grabThumb(v, t) {
  return new Promise((res, rej) => {
    const to = setTimeout(() => rej(new Error('timeout')), 4000);
    v.onseeked = () => {
      clearTimeout(to);
      try {
        const c = document.createElement('canvas'), h = 112, w = Math.round(h * (v.videoWidth / v.videoHeight || 0.56));
        c.width = w; c.height = h; c.getContext('2d').drawImage(v, 0, 0, w, h); res(c.toDataURL('image/jpeg', 0.7));
      } catch (e) { rej(e); }
    };
    v.currentTime = t;
  });
}
async function addAudioFromFile(f, label, range) {
  toast(label ? 'Adicionando…' : 'Extraindo áudio…', 60000);
  try {
    const buf = await extractAudio(f);
    const bid = uid();
    buffers.set(bid, { buffer: buf, peaks: computePeaks(buf), name: f.name, fileKey: 'file:' + bid });
    dbPut('file:' + bid, f);
    commit();
    const a = { id: uid(), bufferId: bid, name: label || f.name.replace(/\.[^.]+$/, ''), start: S.clips.length ? S.t : 0, in: range ? range[0] : 0, out: range ? range[1] : buf.duration, volume: 1, fadeIn: 0, fadeOut: 0 };
    S.audios.push(a); S.sel = { type: 'audio', id: a.id };
    toast(label ? `${label} adicionado em ${fmt(a.start)}` : 'Áudio extraído e adicionado à linha do tempo', 2000);
    refresh();
  } catch (e) { console.error(e); toast('Não consegui extrair o áudio deste arquivo', 3000); }
}

// ---------- Folhas (painéis) ----------
let sheetKind = null;
function openSheet(kind, title, html, bind) {
  sheetKind = kind;
  $('#sheet-title').textContent = title;
  const body = $('#sheet-body'); body.innerHTML = html; body.scrollTop = 0;
  $('#sheet').classList.add('open'); $('#sheet').setAttribute('aria-hidden', 'false');
  document.body.classList.add('sheet-open'); syncSheetH();
  bind && bind(body);
}
function syncSheetH() { document.documentElement.style.setProperty('--sheet-h', $('#sheet').offsetHeight + 'px'); }
new ResizeObserver(() => { if (sheetKind) syncSheetH(); }).observe($('#sheet'));
function closeSheet() {
  if (E.exporting) return toast('Aguarde a exportação terminar');
  $('#sheet').classList.remove('open'); $('#sheet').setAttribute('aria-hidden', 'true'); sheetKind = null;
  document.body.classList.remove('sheet-open');
  renderTimeline(); savePrefs();
}
const RANGE_DEF = { flashDur: 0.3, clickDb: -10, burnDur: 1, burnDb: -12, ls: 100, lx: 50, ly: 50, lv: 0, cv: 100, cfi: 0, cfo: 0, tv: 100, tfi: 0, tfo: 0, ov: 100, v: 100, fi: 0, fo: 0, size: 60, y: 75, shadow: 60, blur: 12 };
function rangeRow(key, label, min, max, step, val, fmtv, def = RANGE_DEF[key]) {
  return `<div class="row"><label>${label}</label><input type="range" data-k="${key}" min="${min}" max="${max}" step="${step}" value="${val}"${def != null ? ` data-def="${def}"` : ''}><span class="val" data-v="${key}">${fmtv(val)}</span></div>`;
}
function bindRanges(root, handlers) {
  root.querySelectorAll('input[type=range]').forEach((el) => {
    const h = handlers[el.dataset.k]; if (!h) return;
    let pend = null;
    const begin = () => { if (!pend) pend = snap(); };
    el.addEventListener('pointerdown', begin); el.addEventListener('touchstart', begin, { passive: true }); el.addEventListener('keydown', begin);
    el.addEventListener('input', () => {
      begin(); const v = parseFloat(el.value); h.set(v);
      const out = root.querySelector(`[data-v="${el.dataset.k}"]`); if (out) out.textContent = h.fmt(v);
      if (!E.playing) draw();
    });
    el.addEventListener('change', () => { if (pend) { pushHist(pend); pend = null; } if (h.after) h.after(); });
    // toque duplo no controle volta para o valor padrão (data-def)
    if (el.dataset.def != null) {
      let lastUp = 0;
      const reset = () => {
        const old = parseFloat(el.value); el.value = el.dataset.def; const d = parseFloat(el.value); if (old === d) return;
        begin(); h.set(d);
        const out = root.querySelector(`[data-v="${el.dataset.k}"]`); if (out) out.textContent = h.fmt(d);
        if (!E.playing) draw();
        if (pend) { pushHist(pend); pend = null; } if (h.after) h.after();
      };
      el.addEventListener('pointerup', () => { const n = performance.now(); if (n - lastUp < 350) { lastUp = 0; setTimeout(reset, 0); } else lastUp = n; });
      el.addEventListener('dblclick', reset);
    }
  });
}
const sec = (s) => `${(+s).toFixed(1)}s`;
const pctf = (v) => `${Math.round(v)}%`;

const inlineIc = (n, s = 14) => ic(n).replace('<svg', `<svg style="width:${s}px;height:${s}px;display:inline;vertical-align:-2px"`);
function playSfx(buf, db) { if (!buf) return toast('Som ainda carregando…'); const c = ac(); c.resume(); const s = c.createBufferSource(); s.buffer = buf; const g = c.createGain(); g.gain.value = dbToGain(db); s.connect(g).connect(c.destination); s.start(); }
async function openTransitions() {
  await loadSfxIndex();
  const sndOpts = (cur, def) => `<option value="">${def}</option>` + sfxIndex.map((s) => `<option value="${esc(s.file)}" ${cur === s.file ? 'selected' : ''}>${esc(s.name)}</option>`).join('');
  const fx = new Proxy({}, { get: (_, k) => S.fx[k], set: (_, k, v) => ((S.fx[k] = v), true) });
  openSheet('trans', 'Transições', `
    <div class="sec">Aplicar em todos os cortes</div>
    <div class="chips">
      <button class="chip" data-all="flash">${inlineIc('zap')} Flash</button>
      <button class="chip" data-all="burn">${inlineIc('flame')} Film burn</button>
      <button class="chip" data-all="none">Remover</button>
    </div>
    <div class="sec">${inlineIc('zap')} Flash</div>
    ${rangeRow('flashDur', 'Duração', 0.1, 0.8, 0.05, fx.flashDur, sec)}
    <div class="row"><label>Som</label><span class="spacer"></span><input type="checkbox" class="tg" id="clk" ${fx.click ? 'checked' : ''}></div>
    <div class="row"><label>Qual som</label><select id="snd-flash">${sndOpts(fx.flashSnd, 'Clique (padrão)')}</select></div>
    ${rangeRow('clickDb', 'Volume', -30, 0, 1, fx.clickDb, (v) => `${v} dB`)}
    <button class="chip" id="clk-test">${inlineIc('play', 12)} Ouvir</button>
    <div class="sec">${inlineIc('flame')} Film burn</div>
    ${rangeRow('burnDur', 'Duração', 0.4, 2, 0.1, fx.burnDur, sec)}
    <div class="row"><label>Som</label><span class="spacer"></span><input type="checkbox" class="tg" id="brn" ${fx.burnSound ? 'checked' : ''}></div>
    <div class="row"><label>Qual som</label><select id="snd-burn">${sndOpts(fx.burnSnd, 'Queima (padrão)')}</select></div>
    ${rangeRow('burnDb', 'Volume', -30, 0, 1, fx.burnDb, (v) => `${v} dB`)}
    <button class="chip" id="brn-test">${inlineIc('play', 12)} Ouvir</button>
    <p class="note">Os sons vêm da biblioteca de SFX (com o trecho que você cortou lá). O ponto mais forte do som fica exatamente no corte.</p>
    <p class="note">O fade fica no botão Fade do clipe. Dica: toque no ícone entre dois clipes, na linha do tempo, para escolher a transição só daquele corte.</p>
  `, (b) => {
    const tog = (id, fn) => $(id, b).addEventListener('change', (e) => { commit(); fn(e.target.checked); draw(); renderTimeline(); });
    tog('#clk', (v) => (fx.click = v));
    tog('#brn', (v) => (fx.burnSound = v));
    b.querySelectorAll('[data-all]').forEach((el) => el.onclick = () => {
      const k = el.dataset.all; commit();
      S.clips.forEach((c, i) => (c.transition = i ? k : 'none')); renderTimeline(); draw();
      toast(k === 'none' ? 'Transições removidas' : `${TR_LABEL[k]} aplicado em todos os cortes`);
    });
    const test = async (type, db) => {
      const file = type === 'flash' ? fx.flashSnd : fx.burnSnd; if (file) { try { await sfxBuffer(file); } catch {} }
      const s = transSound(type); if (!s) return toast('Som ainda carregando…'); playRange(s.buf, s.in, s.out, db);
    };
    $('#clk-test', b).onclick = () => test('flash', fx.clickDb);
    $('#brn-test', b).onclick = () => test('burn', fx.burnDb);
    const pick = (id, key) => $(id, b).onchange = async (e) => {
      commit(); fx[key] = e.target.value || null;
      if (fx[key]) { try { await sfxBuffer(fx[key]); } catch { toast('Não consegui carregar este som'); } }
    };
    pick('#snd-flash', 'flashSnd'); pick('#snd-burn', 'burnSnd');
    bindRanges(b, {
      flashDur: { set: (v) => (fx.flashDur = v), fmt: sec },
      clickDb: { set: (v) => (fx.clickDb = v), fmt: (v) => `${v} dB` },
      burnDur: { set: (v) => (fx.burnDur = v), fmt: sec },
      burnDb: { set: (v) => (fx.burnDb = v), fmt: (v) => `${v} dB` },
    });
  });
}
function openCutSheet(clipId) {
  const i = S.clips.findIndex((c) => c.id === clipId);
  if (i <= 0) return toast('O primeiro clipe não tem corte antes dele');
  const c = S.clips[i];
  const L = layout(); seekTo(L[i].start - 0.6);
  openSheet('cut', 'Transição do corte', `
    <div class="chips">
      <button class="chip ${c.transition === 'none' ? 'on' : ''}" data-tr="none">Nenhuma</button>
      <button class="chip ${c.transition === 'flash' ? 'on' : ''}" data-tr="flash">${inlineIc('zap')} Flash${S.fx.click ? ' + som' : ''}</button>
      <button class="chip ${c.transition === 'burn' ? 'on' : ''}" data-tr="burn">${inlineIc('flame')} Film burn${S.fx.burnSound ? ' + som' : ''}</button>
    </div>
    <button class="btn" id="tr-all">Aplicar esta transição a todos os cortes</button>
    <button class="btn" id="tr-prev">${inlineIc('play', 12)} Ver o corte</button>
    <button class="btn" id="tr-more">${inlineIc('sliders')} Ajustes das transições (duração, som, todos os cortes)</button>
  `, (b) => {
    $('#tr-more', b).onclick = () => openTransitions();
    b.querySelectorAll('[data-tr]').forEach((el) => el.onclick = () => {
      commit(); c.transition = el.dataset.tr;
      b.querySelectorAll('[data-tr]').forEach((x) => x.classList.toggle('on', x === el)); renderTimeline(); draw();
    });
    $('#tr-all', b).onclick = () => { commit(); S.clips.forEach((x, k) => (x.transition = k ? c.transition : 'none')); renderTimeline(); toast('Aplicado a todos os cortes'); };
    $('#tr-prev', b).onclick = () => { seekTo(Math.max(0, layout()[i].start - 1.2)); play(); };
  });
}
// ---------- Zoom in / zoom out (efeito dentro do clipe) ----------
// ---------- Velocidade do clipe ----------
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];
const fmtSpd = (k) => `${(+k).toFixed(2).replace(/\.?0+$/, '')}x`;
const stretchCache = new Map(); // "bufferId|in|out|speed" -> AudioBuffer já esticado (tom da voz preservado)
const stretchKey = (bufferId, c) => `${bufferId}|${c.in.toFixed(3)}|${c.out.toFixed(3)}|${spd(c)}`;
function speedJobs() {
  const jobs = [];
  for (const c of S.clips) {
    if (spd(c) === 1 || c.aOn === false) continue;
    const m = media.get(c.mediaId), b = m && buffers.get(m.bufferId); if (!b) continue;
    const key = stretchKey(m.bufferId, c); if (!stretchCache.has(key)) jobs.push({ key, buf: b.buffer, a: c.in, b: c.out, k: spd(c) });
  }
  return jobs;
}
const speedPending = () => speedJobs().length > 0;
let speedRun = null;
function prepareSpeeds() {
  if (speedRun) return speedRun.then(() => (speedPending() ? prepareSpeeds() : null));
  const jobs = speedJobs(); if (!jobs.length) return Promise.resolve();
  speedRun = (async () => {
    for (const j of jobs) { if (!stretchCache.has(j.key)) stretchCache.set(j.key, await timeStretch(j.buf, j.a, j.b, j.k)); }
    if (stretchCache.size > 40) [...stretchCache.keys()].slice(0, stretchCache.size - 40).forEach((k) => stretchCache.delete(k));
  })().finally(() => { speedRun = null; });
  return speedRun;
}
// WSOLA: muda a duração do áudio sem mudar o tom (a voz não fica fina nem grossa)
async function timeStretch(buf, a, b, k) {
  const sr = buf.sampleRate, nCh = buf.numberOfChannels;
  const i0 = Math.max(0, Math.floor(a * sr)), i1 = Math.min(buf.length, Math.ceil(b * sr)), N = i1 - i0;
  const outLen = Math.max(1, Math.round(N / k));
  const W = Math.round(sr * 0.04) & ~1, Hs = W / 2, Ha = Hs * k, tol = Math.round(sr * 0.012), step = 4;
  const ins = [], outs = [];
  for (let ch = 0; ch < nCh; ch++) { ins.push(buf.getChannelData(ch).subarray(i0, i1)); outs.push(new Float32Array(outLen + W)); }
  const mono = nCh > 1 ? ins[0].map((v, i) => (v + ins[1][i]) * 0.5) : ins[0];
  const win = new Float32Array(W); for (let i = 0; i < W; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / W);
  const wsum = new Float32Array(outLen + W);
  let prev = 0;
  for (let f = 0, o = 0; o < outLen; f++, o += Hs) {
    let pos = 0;
    if (f > 0) {
      const nominal = Math.round(f * Ha), nat = prev + Hs;
      let best = -Infinity; pos = clamp(nominal, 0, Math.max(0, N - W));
      const lo = Math.max(0, nominal - tol), hi = Math.min(N - W, nominal + tol);
      if (nat + Hs <= N) for (let p = lo; p <= hi; p += step) {
        let sum = 0; for (let i = 0; i < Hs; i += step) sum += mono[p + i] * mono[nat + i];
        if (sum > best) { best = sum; pos = p; }
      }
    }
    if (pos + W > N) pos = Math.max(0, N - W);
    for (let ch = 0; ch < nCh; ch++) { const src = ins[ch], dst = outs[ch]; for (let i = 0; i < W && pos + i < N; i++) dst[o + i] += src[pos + i] * win[i]; }
    for (let i = 0; i < W; i++) wsum[o + i] += win[i];
    prev = pos;
    if (f % 400 === 399) await new Promise((r) => setTimeout(r, 0)); // não trava a tela
  }
  const res = new AudioBuffer({ length: outLen, numberOfChannels: nCh, sampleRate: sr });
  for (let ch = 0; ch < nCh; ch++) { const d = outs[ch]; for (let i = 0; i < outLen; i++) d[i] = wsum[i] > 1e-3 ? d[i] / wsum[i] : d[i]; res.copyToChannel(d.subarray(0, outLen), ch); }
  return res;
}
function setClipSpeed(c, k) {
  k = clamp(Math.round(k * 100) / 100, 0.25, 4);
  const old = spd(c); if (old === k) return;
  // zooms ficam no mesmo momento da fala
  S.zooms.forEach((z) => { if (z.clipId === c.id) { z.off *= old / k; z.dur *= old / k; } });
  if (k === 1) delete c.speed; else c.speed = k;
  S.t = clamp(S.t, 0, total());
  prepareSpeeds().catch((e) => console.warn('velocidade', e));
}
function openSpeedSheet(id) {
  const c = S.clips.find((x) => x.id === id); if (!c) return;
  const html = () => `<div class="sec">Velocidade do clipe</div>
    <div class="chips" id="spd-chips">${SPEEDS.map((k) => `<button class="chip ${spd(c) === k ? 'on' : ''}" data-spd="${k}">${fmtSpd(k)}</button>`).join('')}</div>
    ${rangeRow('spd', 'Ajuste fino', 0.25, 4, 0.05, spd(c), fmtSpd, 1)}
    <p class="note" id="spd-info">Duração: ${clipLen(c).toFixed(1)}s (original ${(c.out - c.in).toFixed(1)}s). O tom da voz é mantido. Toque duplo no controle volta para 1x.</p>
    <div class="chips"><button class="chip" id="spd-all">Aplicar ${fmtSpd(spd(c))} em todos os clipes</button></div>`;
  const upd = (b) => {
    b.querySelectorAll('[data-spd]').forEach((el) => el.classList.toggle('on', +el.dataset.spd === spd(c)));
    $('#spd-info', b).textContent = `Duração: ${clipLen(c).toFixed(1)}s (original ${(c.out - c.in).toFixed(1)}s). O tom da voz é mantido. Toque duplo no controle volta para 1x.`;
    $('#spd-all', b).textContent = `Aplicar ${fmtSpd(spd(c))} em todos os clipes`;
    const r = $('[data-k="spd"]', b); if (r) { r.value = spd(c); $('[data-v="spd"]', b).textContent = fmtSpd(spd(c)); }
    updTime();
  };
  openSheet('speed', 'Velocidade', html(), (b) => {
    bindRanges(b, { spd: { set: (v) => { setClipSpeed(c, v); upd(b); }, fmt: fmtSpd, after: () => { renderTimeline(); saveSoon(); } } });
    b.querySelectorAll('[data-spd]').forEach((el) => el.onclick = () => { commit(); setClipSpeed(c, +el.dataset.spd); upd(b); renderTimeline(); draw(); });
    $('#spd-all', b).onclick = () => { commit(); const k = spd(c); S.clips.forEach((x) => setClipSpeed(x, k)); upd(b); renderTimeline(); draw(); toast(`Todos os clipes em ${fmtSpd(k)}`); };
  });
}

const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
function zoomAt(t, r) {
  if (!r || !S.zooms.length) return 1;
  const local = t - r.start; let val = 1;
  for (const z of S.zooms.filter((x) => x.clipId === r.clip.id).sort((a, b) => a.off - b.off)) {
    if (local < z.off) break;
    const e = ease(clamp((local - z.off) / z.dur, 0, 1)), Z = z.amount;
    val = z.type === 'in' ? 1 + (Z - 1) * e : Z - (Z - 1) * e;
  }
  return val;
}
function openZoomSheet(clipId, editId) {
  const r = layout().find((x) => x.clip.id === clipId); if (!r) return;
  const len = r.end - r.start;
  const list = S.zooms.filter((z) => z.clipId === clipId).sort((a, b) => a.off - b.off);
  const z = editId ? S.zooms.find((x) => x.id === editId) : null;
  const def = prefs.zoomDef || {};
  const d = z || { type: def.type || 'in', dur: def.dur ?? 0.6, amount: def.amount ?? 1.2 };
  const maxDur = Math.max(0.3, Math.min(5, len)).toFixed(1);
  openSheet('zoom', z ? `Zoom ${z.type === 'in' ? 'in' : 'out'} em ${z.off.toFixed(1)}s do clipe` : 'Zoom', `
    <div class="chips">
      <button class="chip ${d.type === 'in' ? 'on' : ''}" data-zt="in">${inlineIc('zoomIn')} Zoom in</button>
      <button class="chip ${d.type === 'out' ? 'on' : ''}" data-zt="out">${inlineIc('zoomOut')} Zoom out</button>
    </div>
    ${rangeRow('zd', 'Duração', 0.2, maxDur, 0.1, Math.min(d.dur, maxDur), sec)}
    ${rangeRow('za', 'Intensidade', 105, 160, 1, Math.round(d.amount * 100), pctf)}
    ${z ? `<button class="btn" id="z-prev">${inlineIc('play', 12)} Ver o zoom</button>
           <button class="btn" id="z-del" style="color:#ff6b6b">${inlineIc('trash')} Apagar este zoom</button>
           <button class="btn" id="z-new">Adicionar outro zoom neste clipe</button>`
        : `<button class="btn primary" id="z-start">Adicionar no início do clipe</button>
           <button class="btn" id="z-here">Adicionar no cursor (${fmt(S.t)})</button>`}
    ${list.length && !z ? `<div class="sec">Zooms deste clipe</div><div class="chips">${list.map((x) => `<button class="chip" data-ze="${x.id}">${x.type === 'in' ? 'In' : 'Out'} em ${x.off.toFixed(1)}s</button>`).join('')}</div>` : ''}
    <p class="note">O zoom acontece dentro do clipe, não entre clipes. Zoom in aproxima e fica aproximado; zoom out começa aproximado e volta ao normal.</p>`,
  (b) => {
    const keepDef = () => { if (!z) { prefs.zoomDef = { type: d.type, dur: d.dur, amount: d.amount }; savePrefs(); } };
    b.querySelectorAll('[data-zt]').forEach((el) => el.onclick = () => {
      if (z) commit(); d.type = el.dataset.zt; keepDef();
      b.querySelectorAll('[data-zt]').forEach((x) => x.classList.toggle('on', x === el)); renderTimeline(); draw();
    });
    bindRanges(b, {
      zd: { set: (v) => { d.dur = v; keepDef(); }, fmt: sec, after: renderTimeline },
      za: { set: (v) => { d.amount = v / 100; keepDef(); }, fmt: pctf },
    });
    const add = (off) => {
      commit();
      const nz = { id: uid(), clipId, off: clamp(off, 0, Math.max(0, len - 0.1)), dur: d.dur, type: d.type, amount: d.amount };
      S.zooms.push(nz); renderTimeline(); seekTo(r.start + nz.off + Math.min(nz.dur, 0.3));
      toast('Zoom adicionado'); openZoomSheet(clipId, nz.id);
    };
    $('#z-start', b)?.addEventListener('click', () => add(0));
    $('#z-here', b)?.addEventListener('click', () => {
      const rr = clipAt(S.t); if (!rr || rr.clip.id !== clipId) return toast('O cursor não está sobre este clipe');
      add(S.t - r.start);
    });
    $('#z-del', b)?.addEventListener('click', () => { commit(); S.zooms = S.zooms.filter((x) => x !== z); renderTimeline(); draw(); openZoomSheet(clipId); });
    $('#z-new', b)?.addEventListener('click', () => openZoomSheet(clipId));
    $('#z-prev', b)?.addEventListener('click', () => { seekTo(Math.max(0, r.start + z.off - 0.4)); play(); });
    b.querySelectorAll('[data-ze]').forEach((el) => el.onclick = () => openZoomSheet(clipId, el.dataset.ze));
  });
}

// ---------- Biblioteca de SFX ----------
// ---------- Keyframes: posição, escala, rotação, opacidade e volume em todas as camadas ----------
// Cada item guarda kf = { prop: [{ t, v, e }] }. t é o tempo NO ARQUIVO DE ORIGEM (como in/out), então
// cortar, aparar e dividir não desloca os keyframes. e = curva do trecho que sai deste keyframe.
const kfPct = { ui: (v) => Math.round(v * 100), from: (u) => u / 100, fmt: (u) => `${Math.round(u)}%` };
const KF_PROPS = {
  x: { label: 'Horizontal', min: -50, max: 150, def: 50, ...kfPct },
  y: { label: 'Vertical', min: -50, max: 150, def: 50, ...kfPct },
  scale: { label: 'Escala', min: 5, max: 300, def: 100, ...kfPct },
  rot: { label: 'Rotação', min: -180, max: 180, def: 0, ui: (v) => Math.round(v), from: (u) => u, fmt: (u) => `${Math.round(u)}°` },
  op: { label: 'Opacidade', min: 0, max: 100, def: 100, ...kfPct },
  vol: { label: 'Volume', min: 0, max: 200, def: 100, ...kfPct },
};
const KF_VIS = ['x', 'y', 'scale', 'rot', 'op'];
const KF_EASE = { linear: (p) => p, in: (p) => p * p * p, out: (p) => 1 - Math.pow(1 - p, 3), inout: ease };
const KF_EASE_LABEL = { linear: 'Linear', in: 'Entrada suave', out: 'Saída suave', inout: 'Suave' };
const KF_TOL = 0.02;
// campo do valor-base de cada propriedade (vale quando ela não tem keyframes)
const KF_BASE = {
  clip: { x: ['tx', 0.5], y: ['ty', 0.5], scale: ['sc', 1], rot: ['rot', 0], op: ['op', 1], vol: ['volume', 1] },
  layer: { x: ['x', 0.5], y: ['y', 0.5], scale: ['scale', 1], rot: ['rot', 0], op: ['op', 1], vol: ['volume', 0] },
  audio: { vol: ['volume', 1] },
  caption: { x: ['x', 0.5], y: ['y', () => S.cap.y], scale: ['sc', 1], rot: ['rot', 0], op: ['op', 1] },
};
function kfVal(o, p, src, base) {
  const ks = o && o.kf && o.kf[p];
  if (!ks || !ks.length) return base;
  if (src <= ks[0].t) return ks[0].v;
  for (let i = 1; i < ks.length; i++) {
    const b = ks[i];
    if (src <= b.t) { const a = ks[i - 1], q = b.t === a.t ? 1 : (src - a.t) / (b.t - a.t); return a.v + (b.v - a.v) * (KF_EASE[a.e] || KF_EASE.linear)(q); }
  }
  return ks[ks.length - 1].v;
}
const hasKf = (o, p) => !!(o && o.kf && o.kf[p] && o.kf[p].length);
const anyKf = (o, props) => !!(o && o.kf && Object.entries(o.kf).some(([p, a]) => a.length && (!props || props.includes(p))));
const kfKeyAt = (o, p, src) => o.kf?.[p]?.find((k) => Math.abs(k.t - src) < KF_TOL) || null;
function kfSet(o, p, src, v) {
  o.kf ??= {}; const ks = (o.kf[p] ??= []);
  const k = ks.find((x) => Math.abs(x.t - src) < KF_TOL);
  if (k) k.v = v; else { ks.push({ t: src, v, e: prefs.kfEase || 'inout' }); ks.sort((a, b) => a.t - b.t); }
}
function kfDel(o, p, src) {
  if (!o.kf?.[p]) return;
  o.kf[p] = o.kf[p].filter((k) => Math.abs(k.t - src) >= KF_TOL); if (!o.kf[p].length) delete o.kf[p];
}
// volume com keyframes: vira uma curva de pontos para o Web Audio (também vale na exportação)
const fadeMul = (tl, len, fi, fo) => { let e = 1; if (fi && tl < fi) e = tl / fi; if (fo && len - tl < fo) e = Math.min(e, (len - tl) / fo); return Math.max(0, e); };
function gainPts(a, b, fn) { const pts = []; for (let t = a; t < b; t += 1 / 25) pts.push([t, fn(t)]); pts.push([b, fn(b)]); return pts; }
// marcas ◆ no bloco da linha do tempo
function kfMarks(o, inP, outP, pps, props) {
  if (!anyKf(o, props)) return '';
  const ts = [...new Set(Object.entries(o.kf).filter(([p]) => !props || props.includes(p)).flatMap(([, a]) => a.map((k) => Math.round(k.t * 100) / 100)))];
  return ts.filter((t) => t >= inP - 0.001 && t <= outP + 0.001).map((t) => `<i class="kfd" style="left:${(t - inP) * pps}px"></i>`).join('');
}
// o que está selecionado, com o trecho que ocupa na linha do tempo
function kfTarget(sel = S.sel) {
  if (!sel) return null;
  if (sel.type === 'clip' || sel.type === 'clipaudio') {
    const r = layout().find((x) => x.clip.id === sel.id); if (!r) return null;
    const c = r.clip, hasA = c.aOn !== false && !!buffers.get(media.get(c.mediaId)?.bufferId);
    return { kind: 'clip', o: c, name: sel.type === 'clip' ? 'Clipe de vídeo' : 'Áudio do clipe', props: sel.type === 'clip' ? [...KF_VIS, ...(hasA ? ['vol'] : [])] : ['vol'],
      a: r.start, b: r.end, src: (t) => srcAt(r, t), tl: (s) => tlAt(r, s) };
  }
  if (sel.type === 'layer') {
    const o = S.layers.find((x) => x.id === sel.id); if (!o || o.kind === 'adjust') return null;
    return { kind: 'layer', o, name: o.kind === 'image' ? 'Camada de imagem' : o.kind === 'text' ? 'Texto' : 'Camada de vídeo', props: [...KF_VIS, ...(o.kind === 'video' ? ['vol'] : [])],
      a: o.start, b: o.start + o.out - o.in, src: (t) => o.in + (t - o.start), tl: (s) => o.start + (s - o.in) };
  }
  if (sel.type === 'audio') {
    const o = S.audios.find((x) => x.id === sel.id); if (!o) return null;
    return { kind: 'audio', o, name: 'Trilha de áudio', props: ['vol'], a: o.start, b: o.start + o.out - o.in, src: (t) => o.in + (t - o.start), tl: (s) => o.start + (s - o.in) };
  }
  if (sel.type === 'caption') {
    const o = S.captions.find((x) => x.id === sel.id); if (!o) return null;
    const sps = capSpans().filter((x) => x.cap === o); if (!sps.length) return null;
    const sp = sps.find((x) => S.t >= x.start && S.t < x.end) || sps[0];
    return { kind: 'caption', o, name: 'Bloco de legenda', props: KF_VIS, a: sp.start, b: sp.end, src: (t) => sp.a + (t - sp.start), tl: (s) => sp.start + (s - sp.a) };
  }
  return null;
}
const kfSrcNow = (T) => T.src(clamp(S.t, T.a, Math.max(T.a, T.b - 0.001)));
function kfBase(T, p) { const [f, d] = KF_BASE[T.kind][p]; return T.o[f] ?? (typeof d === 'function' ? d() : d); }
const kfGet = (T, p) => kfVal(T.o, p, kfSrcNow(T), kfBase(T, p));
// muda o valor: com keyframes, cria/atualiza o keyframe no cursor; sem keyframes, muda o valor fixo
function kfPut(T, p, v) {
  if (hasKf(T.o, p)) kfSet(T.o, p, kfSrcNow(T), v);
  else T.o[KF_BASE[T.kind][p][0]] = v;
}
function kfTimes(T) {
  const ts = new Set();
  for (const p of T.props) for (const k of T.o.kf?.[p] || []) { const t = T.tl(k.t); if (t >= T.a - 0.001 && t <= T.b + 0.001) ts.add(Math.round(t * 1000) / 1000); }
  return [...ts].sort((a, b) => a - b);
}
function openKfSheet() {
  const T = kfTarget(); if (!T) return toast('Selecione um item da linha do tempo');
  if (S.t < T.a || S.t >= T.b - 0.005) seekTo(T.a + 0.001);
  const rows = T.props.map((p) => {
    const P = KF_PROPS[p];
    return `<div class="row kf-row"><button class="kfb" data-kb="${p}" aria-label="Keyframe de ${P.label}"></button><label>${P.label}</label>
      <input type="range" data-k="kf_${p}" min="${P.min}" max="${P.max}" step="1" value="${P.ui(kfGet(T, p))}" data-def="${p === 'y' && T.kind === 'caption' ? Math.round(S.cap.y * 100) : p === 'vol' && T.kind === 'layer' ? 0 : P.def}">
      <span class="val" data-v="kf_${p}">${P.fmt(P.ui(kfGet(T, p)))}</span></div>`;
  }).join('');
  openSheet('kf', `Keyframes · ${T.name}`, `
    <div class="kf-nav">
      <button class="mini" id="kf-prev" aria-label="Keyframe anterior">${ic('left')}</button>
      <div class="kf-time"><b id="kf-now"></b><span id="kf-loc"></span></div>
      <button class="mini" id="kf-next" aria-label="Próximo keyframe">${ic('right')}</button>
    </div>
    <input type="range" id="kf-scrub" class="scrub" min="${T.a}" max="${Math.max(T.a, T.b - 0.01)}" step="0.01" value="${S.t}" aria-label="Cursor">
    ${rows}
    <div class="sec">Curva até o próximo keyframe</div>
    <div class="chips" id="kf-ease">${Object.entries(KF_EASE_LABEL).map(([k, l]) => `<button class="chip" data-ke="${k}">${l}</button>`).join('')}</div>
    <div class="chips kf-acts"><button class="chip" id="kf-delhere">Apagar deste ponto</button><button class="chip danger" id="kf-clear">Limpar todos</button></div>
    <p class="note">Toque no ◆ para marcar o valor no cursor. Depois do primeiro ◆, mover o controle em outro ponto cria o próximo sozinho e o Editor anima entre eles. ${T.kind === 'layer' || T.kind === 'clip' ? 'Também dá para arrastar na prévia.' : ''}</p>`,
  (b) => {
    const handlers = {};
    for (const p of T.props) handlers['kf_' + p] = { set: (u) => kfPut(kfTarget() || T, p, KF_PROPS[p].from(u)), fmt: KF_PROPS[p].fmt, after: () => { renderTimeline(); kfSync(); } };
    bindRanges(b, handlers);
    b.querySelectorAll('input[type=range]').forEach((el) => {
      const on = () => (el._busy = true), off = () => (el._busy = false);
      el.addEventListener('pointerdown', on); el.addEventListener('touchstart', on, { passive: true });
      el.addEventListener('pointerup', off); el.addEventListener('touchend', off); el.addEventListener('change', off);
    });
    b.querySelectorAll('[data-kb]').forEach((el) => el.onclick = () => {
      const t = kfTarget(); if (!t) return; const p = el.dataset.kb, s = kfSrcNow(t);
      commit();
      if (kfKeyAt(t.o, p, s)) kfDel(t.o, p, s); else kfSet(t.o, p, s, kfGet(t, p));
      renderTimeline(); kfSync(); draw();
    });
    $('#kf-scrub', b).addEventListener('input', (e) => seekTo(parseFloat(e.target.value)));
    const jump = (dir) => {
      const t = kfTarget(); if (!t) return; const ts = kfTimes(t);
      const n = dir < 0 ? ts.filter((x) => x < S.t - 0.01).pop() : ts.find((x) => x > S.t + 0.01);
      if (n == null) return toast(dir < 0 ? 'Não há keyframe antes' : 'Não há keyframe depois');
      seekTo(clamp(n, t.a, t.b - 0.002));
    };
    $('#kf-prev', b).onclick = () => jump(-1); $('#kf-next', b).onclick = () => jump(1);
    b.querySelectorAll('[data-ke]').forEach((el) => el.onclick = () => {
      const t = kfTarget(); if (!t) return; const s = kfSrcNow(t), keys = t.props.map((p) => kfKeyAt(t.o, p, s)).filter(Boolean);
      if (keys.length) { commit(); keys.forEach((k) => (k.e = el.dataset.ke)); toast(`Curva: ${KF_EASE_LABEL[el.dataset.ke]}`); }
      else toast(`Novos keyframes vão usar a curva ${KF_EASE_LABEL[el.dataset.ke]}`);
      prefs.kfEase = el.dataset.ke; savePrefs(); kfSync(); draw();
    });
    $('#kf-delhere', b).onclick = () => {
      const t = kfTarget(); if (!t) return; const s = kfSrcNow(t);
      if (!t.props.some((p) => kfKeyAt(t.o, p, s))) return toast('Não há keyframe neste ponto');
      commit(); t.props.forEach((p) => kfDel(t.o, p, s)); renderTimeline(); kfSync(); draw();
    };
    $('#kf-clear', b).onclick = () => {
      const t = kfTarget(); if (!t || !anyKf(t.o, t.props)) return toast('Este item não tem keyframes');
      commit(); for (const p of t.props) { const v = kfGet(t, p); delete t.o.kf[p]; t.o[KF_BASE[t.kind][p][0]] = v; }
      renderTimeline(); kfSync(); draw(); toast('Keyframes apagados (ficou o valor do cursor)');
    };
    kfSync();
  });
}
// atualiza o painel de keyframes quando o cursor anda
function kfSync() {
  if (sheetKind !== 'kf') return;
  const T = kfTarget(), b = $('#sheet-body'); if (!T) return closeSheet();
  const s = kfSrcNow(T);
  $('#kf-now', b).textContent = fmt(S.t);
  $('#kf-loc', b).textContent = `${(S.t - T.a).toFixed(2)}s dentro do item`;
  const sc = $('#kf-scrub', b); if (sc && !sc._busy) sc.value = S.t;
  for (const p of T.props) {
    const el = b.querySelector(`[data-k="kf_${p}"]`), P = KF_PROPS[p];
    if (el && !el._busy) { const u = P.ui(kfGet(T, p)); el.value = u; b.querySelector(`[data-v="kf_${p}"]`).textContent = P.fmt(u); }
    const kb = b.querySelector(`[data-kb="${p}"]`), at = kfKeyAt(T.o, p, s);
    if (kb) { kb.className = 'kfb' + (at ? ' on' : hasKf(T.o, p) ? ' has' : ''); kb.innerHTML = ic(at ? 'keyFill' : 'key'); }
  }
  const keys = T.props.map((p) => kfKeyAt(T.o, p, s)).filter(Boolean), cur = keys[0]?.e || prefs.kfEase || 'inout';
  b.querySelectorAll('[data-ke]').forEach((el) => el.classList.toggle('on', el.dataset.ke === cur));
}

let sfxIndex = null, sfxPrev = null;
const sfxCache = new Map();
async function sfxBuffer(file) {
  if (!sfxCache.has(file)) {
    const ab = await (await fetch('sfx/lib/' + encodeURIComponent(file))).arrayBuffer();
    sfxCache.set(file, await new Promise((res, rej) => ac().decodeAudioData(ab, res, rej)));
  }
  return sfxCache.get(file);
}
function stopSfxPrev() { try { sfxPrev?.stop(); } catch {} sfxPrev = null; }
async function openSfx() {
  await loadSfxIndex();
  if (!sfxIndex.length) return toast('Não consegui carregar a lista de SFX');
  const lenTxt = (s) => { const t = prefs.sfxTrim?.[s.file]; return (t ? t[1] - t[0] : s.dur).toFixed(1) + 's' + (t ? ' ✂' : ''); };
  openSheet('sfx', 'SFX', `<p class="note">▶ ouve · ✂ escolhe o trecho · ＋ coloca na linha do tempo, no cursor (${fmt(S.t)}).</p>` +
    sfxIndex.map((s, i) => `<div class="sfx-item"><div class="sfx-row">
      <button class="mini" data-play="${i}" aria-label="Ouvir">${ic('play')}</button>
      <span class="sfx-name">${esc(s.name)}</span><span class="sfx-dur" data-len="${i}">${lenTxt(s)}</span>
      <button class="mini" data-edit="${i}" aria-label="Editar trecho">${ic('scissors')}</button>
      <button class="mini add" data-add="${i}" aria-label="Adicionar">${ic('plus')}</button></div>
      <div class="sfx-edit" data-box="${i}" hidden></div></div>`).join(''),
  (b) => {
    b.querySelectorAll('[data-play]').forEach((el) => el.onclick = async () => {
      const s = sfxIndex[+el.dataset.play];
      try { const buf = await sfxBuffer(s.file); const [a, z] = sfxTrim(s.file, buf.duration); playRange(buf, a, z); }
      catch { toast('Não consegui tocar este som'); }
    });
    b.querySelectorAll('[data-edit]').forEach((el) => el.onclick = async () => {
      const i = +el.dataset.edit, s = sfxIndex[i], box = b.querySelector(`[data-box="${i}"]`);
      if (!box.hidden) { box.hidden = true; el.classList.remove('on'); return; }
      b.querySelectorAll('.sfx-edit').forEach((x) => (x.hidden = true)); b.querySelectorAll('[data-edit]').forEach((x) => x.classList.remove('on'));
      box.hidden = false; el.classList.add('on');
      const buf = await sfxBuffer(s.file), [a, z] = sfxTrim(s.file, buf.duration), sel = { in: a, out: z };
      makeTrimmer(box, buf, sel, {
        onChange: () => { b.querySelector(`[data-len="${i}"]`).textContent = (sel.out - sel.in).toFixed(1) + 's ✂'; },
        onDone: () => { prefs.sfxTrim = { ...(prefs.sfxTrim || {}), [s.file]: [sel.in, sel.out] }; savePrefs(); },
      });
    });
    b.querySelectorAll('[data-add]').forEach((el) => el.onclick = async () => {
      const s = sfxIndex[+el.dataset.add]; stopSfxPrev();
      try {
        const buf = await sfxBuffer(s.file), [a, z] = sfxTrim(s.file, buf.duration);
        const blob = await (await fetch('sfx/lib/' + encodeURIComponent(s.file))).blob();
        await addAudioFromFile(new File([blob], s.file, { type: 'audio/mpeg' }), s.name, [a, z]);
      } catch { toast('Não consegui adicionar este som'); }
    });
  });
}

// ---------- Fade do clipe (do preto / para o preto) ----------
function clipFadeAlpha(t, L = layout()) {
  let a = 0;
  for (const r of L) {
    const c = r.clip; if (!c.vfi && !c.vfo) continue;
    if (t < r.start || t > r.end) continue;
    const len = r.end - r.start, fi = Math.min(c.vfi || 0, len / 2), fo = Math.min(c.vfo || 0, len / 2);
    if (fi && t < r.start + fi) a = Math.max(a, 1 - (t - r.start) / fi);
    if (fo && t > r.end - fo) a = Math.max(a, 1 - (r.end - t) / fo);
  }
  return clamp(a, 0, 1);
}
function masterFadePoints(L) {
  const pts = [];
  for (const r of L) {
    const c = r.clip; if (!c.vfa) continue;
    const len = r.end - r.start, fi = Math.min(c.vfi || 0, len / 2), fo = Math.min(c.vfo || 0, len / 2);
    if (fi) pts.push([r.start - 0.001, 1], [r.start, 0], [r.start + fi, 1]);
    if (fo) pts.push([r.end - fo, 1], [r.end, 0], [r.end + 0.001, 1]);
  }
  return pts;
}
function openClipFade(id) {
  const c = S.clips.find((x) => x.id === id); if (!c) return;
  const r = layout().find((x) => x.clip.id === id), len = r.end - r.start, maxF = Math.max(0.2, Math.min(5, len / 2)).toFixed(1);
  const last = prefs.fadeDef || 0.6;
  openSheet('clipfade', 'Fade do clipe', `
    <div class="row"><label>Fade in</label><span class="spacer note">surge do preto</span><input type="checkbox" class="tg" id="cf-in" ${c.vfi ? 'checked' : ''}></div>
    ${rangeRow('vfi', 'Duração', 0.1, maxF, 0.1, Math.min(c.vfi || last, maxF), sec)}
    <div class="row"><label>Fade out</label><span class="spacer note">some para o preto</span><input type="checkbox" class="tg" id="cf-out" ${c.vfo ? 'checked' : ''}></div>
    ${rangeRow('vfo', 'Duração', 0.1, maxF, 0.1, Math.min(c.vfo || last, maxF), sec)}
    <div class="row"><label>Som junto</label><span class="spacer note">todo o áudio acompanha o fade</span><input type="checkbox" class="tg" id="cf-a" ${c.vfa ? 'checked' : ''}></div>
    <div class="chips"><button class="chip" id="cf-pin">${inlineIc('play', 12)} Ver o início</button><button class="chip" id="cf-pout">${inlineIc('play', 12)} Ver o final</button></div>
    <p class="note">Para o vídeo começar do preto, use o Fade in no primeiro clipe. Para terminar no preto, o Fade out no último.</p>`,
  (b) => {
    const rng = (k) => parseFloat(b.querySelector(`[data-k="${k}"]`).value);
    const show = (which) => { const rr = layout().find((x) => x.clip.id === id); if (rr) seekTo(which === 'in' ? rr.start + (c.vfi || 0) * 0.4 : rr.end - (c.vfo || 0) * 0.6); };
    $('#cf-in', b).onchange = (e) => { commit(); c.vfi = e.target.checked ? rng('vfi') : 0; renderTimeline(); if (c.vfi) show('in'); else draw(); };
    $('#cf-out', b).onchange = (e) => { commit(); c.vfo = e.target.checked ? rng('vfo') : 0; renderTimeline(); if (c.vfo) show('out'); else draw(); };
    $('#cf-a', b).onchange = (e) => { commit(); c.vfa = e.target.checked; };
    bindRanges(b, {
      vfi: { set: (v) => { if (c.vfi) c.vfi = v; prefs.fadeDef = v; }, fmt: sec, after: () => { savePrefs(); renderTimeline(); if (c.vfi) show('in'); } },
      vfo: { set: (v) => { if (c.vfo) c.vfo = v; prefs.fadeDef = v; }, fmt: sec, after: () => { savePrefs(); renderTimeline(); if (c.vfo) show('out'); } },
    });
    $('#cf-pin', b).onclick = () => { const rr = layout().find((x) => x.clip.id === id); seekTo(Math.max(0, rr.start - 0.5)); play(); };
    $('#cf-pout', b).onclick = () => { const rr = layout().find((x) => x.clip.id === id); seekTo(Math.max(0, rr.end - (c.vfo || 0) - 1)); play(); };
  });
}

// ---------- Som das transições (padrão ou um SFX da biblioteca) ----------
const peakCache = new Map();
function peakOf(key, buf, a, b) {
  const k = `${key}|${a.toFixed(3)}|${b.toFixed(3)}`;
  if (peakCache.has(k)) return peakCache.get(k);
  const sr = buf.sampleRate, d = buf.getChannelData(0), win = Math.floor(sr * 0.02);
  let best = 0, bestT = a;
  for (let i = Math.floor(a * sr); i < Math.floor(b * sr) - win; i += win) {
    let s = 0; for (let j = i; j < i + win; j += 4) s += d[j] * d[j];
    if (s > best) { best = s; bestT = i / sr; }
  }
  peakCache.set(k, bestT); return bestT;
}
function sfxTrim(file, dur) {
  const t = prefs.sfxTrim?.[file];
  return t ? [clamp(t[0], 0, dur), clamp(t[1], 0, dur)] : [0, dur];
}
// devolve { buf, in, out, peak } — o pico do som é alinhado com o corte
function transSound(type) {
  const file = type === 'flash' ? S.fx.flashSnd : S.fx.burnSnd;
  if (file) {
    const buf = sfxCache.get(file);
    if (buf) { const [a, b] = sfxTrim(file, buf.duration); return { buf, in: a, out: b, peak: peakOf(file, buf, a, b) }; }
    sfxBuffer(file).catch(() => {});
  }
  if (type === 'flash') return clickBuf ? { buf: clickBuf, in: 0, out: clickBuf.duration, peak: 0 } : null;
  return burnBuf ? { buf: burnBuf, in: 0, out: burnBuf.duration, peak: BURN_PEAK } : null;
}
function playRange(buf, a, b, db = 0) {
  stopSfxPrev(); const c = ac(); c.resume();
  const s = c.createBufferSource(); s.buffer = buf; const g = c.createGain(); g.gain.value = dbToGain(db);
  s.connect(g).connect(c.destination); s.start(0, a, Math.max(0.05, b - a)); sfxPrev = s; return { src: s, t0: c.currentTime };
}
async function loadSfxIndex() {
  if (!sfxIndex) { try { sfxIndex = await (await fetch('sfx/lib/index.json')).json(); } catch { sfxIndex = []; } }
  return sfxIndex;
}

// ---------- Seletor de trecho (arrastar início e fim) ----------
function makeTrimmer(host, buf, sel, { onChange, onDone } = {}) {
  host.innerHTML = `<div class="trim"><canvas></canvas><div class="shade l"></div><div class="shade r"></div>
    <div class="hdl l" aria-label="Início"><i></i></div><div class="hdl r" aria-label="Fim"><i></i></div><div class="tph"></div></div>
    <div class="trim-info"><span class="ti-a"></span><button class="chip ti-play">${inlineIc('play', 12)} Ouvir trecho</button><span class="ti-b"></span></div>`;
  const box = $('.trim', host), cv = $('canvas', host), dur = buf.duration;
  const W = Math.max(200, box.clientWidth || 320), H = 56, dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = W * dpr; cv.height = H * dpr;
  const c = cv.getContext('2d'); c.scale(dpr, dpr); c.fillStyle = 'rgba(255,214,90,.95)';
  const ch = buf.getChannelData(0), step = Math.max(1, Math.floor(ch.length / W));
  for (let x = 0; x < W; x++) {
    let mx = 0; for (let j = x * step; j < Math.min((x + 1) * step, ch.length); j += 16) { const v = Math.abs(ch[j]); if (v > mx) mx = v; }
    const amp = Math.max(1, Math.min(1, mx * 1.2) * (H - 8)); c.fillRect(x, (H - amp) / 2, 1, amp);
  }
  const hl = $('.hdl.l', host), hr = $('.hdl.r', host), sl = $('.shade.l', host), sr = $('.shade.r', host), ph = $('.tph', host);
  const upd = () => {
    const a = (sel.in / dur) * 100, b = (sel.out / dur) * 100;
    hl.style.left = a + '%'; hr.style.left = b + '%'; sl.style.width = a + '%'; sr.style.left = b + '%'; sr.style.width = (100 - b) + '%';
    $('.ti-a', host).textContent = fmt(sel.in); $('.ti-b', host).textContent = `${fmt(sel.out)} · ${(sel.out - sel.in).toFixed(1)}s`;
  };
  const drag = (el, side) => el.addEventListener('pointerdown', (e) => {
    e.preventDefault(); e.stopPropagation(); el.setPointerCapture(e.pointerId);
    const move = (ev) => {
      const rect = box.getBoundingClientRect(), t = clamp((ev.clientX - rect.left) / rect.width, 0, 1) * dur;
      if (side === 'l') sel.in = clamp(t, 0, sel.out - 0.1); else sel.out = clamp(t, sel.in + 0.1, dur);
      upd(); onChange && onChange(sel);
    };
    const up = () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); onDone && onDone(sel); };
    el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  });
  drag(hl, 'l'); drag(hr, 'r');
  $('.ti-play', host).onclick = () => {
    const p = playRange(buf, sel.in, sel.out), a = sel.in, len = sel.out - sel.in;
    ph.style.display = 'block';
    const tick = () => {
      const el = actx.currentTime - p.t0; if (el > len || sfxPrev !== p.src) { ph.style.display = 'none'; return; }
      ph.style.left = ((a + el) / dur) * 100 + '%'; requestAnimationFrame(tick);
    };
    tick();
  };
  upd();
}

// ---------- Camadas (vídeo ou imagem por cima do vídeo principal) ----------
const images = new Map();   // id -> { id, name, url, img, w, h }
const layerEls = new Map(); // id da camada -> <video>
let layerRects = [];
async function loadImage(file, id = uid()) {
  const url = URL.createObjectURL(file), img = new Image();
  img.src = url;
  await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('imagem não suportada')); });
  return { id, name: file.name, url, img, w: img.naturalWidth, h: img.naturalHeight };
}
async function importLayers(files) {
  if (!S.clips.length) return toast('Adicione o vídeo principal primeiro');
  ac(); let added = 0;
  for (const f of files) {
    toast(`Carregando ${f.name}…`, 60000);
    try {
      let L;
      if (/^image\//.test(f.type) || /\.(png|jpe?g|gif|webp|heic)$/i.test(f.name)) {
        const im = await loadImage(f); images.set(im.id, im); dbPut('file:' + im.id, f);
        L = { id: uid(), kind: 'image', srcId: im.id, name: f.name, start: S.t, in: 0, out: 3, x: 0.5, y: 0.5, scale: 0.5, volume: 0 };
      } else {
        const m = await loadMedia(f); media.set(m.id, m); dbPut('file:' + m.id, f);
        L = { id: uid(), kind: 'video', srcId: m.id, name: f.name, start: S.t, in: 0, out: m.duration, x: 0.5, y: 0.5, scale: 1, volume: 0 };
      }
      commit(); S.layers.push(L); S.sel = { type: 'layer', id: L.id }; added++;
    } catch (e) { console.error(e); toast('Não consegui abrir ' + f.name, 3000); }
  }
  if (added) toast('Camada adicionada. Arraste na prévia para mover.', 2200);
  refresh();
}
function layerVideo(L) {
  let v = layerEls.get(L.id); const m = media.get(L.srcId); if (!m) return null;
  if (!v) {
    v = document.createElement('video'); v.muted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'auto';
    v.src = m.url; v.addEventListener('seeked', () => { if (!E.playing) draw(); }); v.addEventListener('loadeddata', () => { if (!E.playing) draw(); });
    $('#vpool').appendChild(v); layerEls.set(L.id, v);
  }
  return v;
}
function syncLayers(t) {
  for (const L of S.layers) {
    if (L.kind !== 'video') continue;
    const v = layerVideo(L); if (!v) continue;
    const len = L.out - L.in, active = t >= L.start && t < L.start + len, s = L.in + clamp(t - L.start, 0, Math.max(0, len - 0.02));
    if (active && E.playing && !E.stalled) {
      if (v.playbackRate !== (E.rate || 1)) v.playbackRate = E.rate || 1;
      if (v.paused) v.play().catch(() => {});
      if (!v.seeking && Math.abs(v.currentTime - s) > 0.25) v.currentTime = s;
    } else {
      if (!v.paused) v.pause();
      const target = active ? s : (t < L.start && L.start - t < 1.5 ? L.in : null);
      if (target != null && !v.seeking && v.readyState >= 1 && Math.abs(v.currentTime - target) > 0.04) v.currentTime = target;
    }
  }
  for (const [id, v] of layerEls) if (!S.layers.some((l) => l.id === id)) { v.pause(); v.removeAttribute('src'); v.load(); v.remove(); layerEls.delete(id); }
}
function drawLayers(ctx, W, H, t, pre) {
  if (pre) layerRects = [];
  for (const L of S.layers) {
    const len = L.out - L.in; if (t < L.start || t >= L.start + len) continue;
    let src, sw, sh;
    if (L.kind === 'adjust') continue;
    if (L.kind === 'text') { drawTextLayer(ctx, W, H, L, t, pre); continue; }
    if (L.kind === 'image') { const im = images.get(L.srcId); if (!im) continue; src = im.img; sw = im.w; sh = im.h; }
    else { const v = layerEls.get(L.id); if (!v || v.readyState < 2) continue; src = v; sw = v.videoWidth; sh = v.videoHeight; }
    if (!sw || !sh) continue;
    const s = L.in + (t - L.start);
    const sc = kfVal(L, 'scale', s, L.scale), lx = kfVal(L, 'x', s, L.x) * W, ly = kfVal(L, 'y', s, L.y) * H;
    const rot = kfVal(L, 'rot', s, L.rot ?? 0), op = clamp(kfVal(L, 'op', s, L.op ?? 1), 0, 1);
    const w = sc * W, h = w * sh / sw, x = lx - w / 2, y = ly - h / 2;
    const seld = pre && S.sel?.type === 'layer' && S.sel.id === L.id && !E.playing && !FSP.on;
    ctx.save(); ctx.translate(lx, ly); if (rot) ctx.rotate(rot * Math.PI / 180);
    if (op > 0) { ctx.globalAlpha = op; ctx.drawImage(src, -w / 2, -h / 2, w, h); }
    if (seld) { ctx.globalAlpha = 1; ctx.strokeStyle = '#b48cff'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.strokeRect(-w / 2, -h / 2, w, h); }
    ctx.restore();
    if (pre) layerRects.push({ id: L.id, x, y, w, h });
  }
}
// ---------- Camada de texto (texto livre, independente das legendas automáticas) ----------
const TEXT_BG = [['', 'Nenhum'], ['#000000', 'Preto'], ['#FFFFFF', 'Branco'], ['#FFD84D', 'Amarelo'], ['#7C4DFF', 'Roxo']];
function textMetrics(ctx, W, H, L) {
  // texto rico: cada trecho com fonte, cor, tamanho e espaçamento próprios (textorico.js)
  const m = RT.richLayout(ctx, L, W, H, fontCss, W * 0.86);
  m.fs = (L.size || 80) * m.k; return m;
}
function drawTextLayer(ctx, W, H, L, t, pre) {
  const s = L.in + (t - L.start);
  const sc = kfVal(L, 'scale', s, L.scale ?? 1), lx = kfVal(L, 'x', s, L.x ?? 0.5) * W, ly = kfVal(L, 'y', s, L.y ?? 0.5) * H;
  const rot = kfVal(L, 'rot', s, L.rot ?? 0), op = clamp(kfVal(L, 'op', s, L.op ?? 1), 0, 1);
  ctx.save(); ctx.translate(lx, ly); if (rot) ctx.rotate(rot * Math.PI / 180); if (sc !== 1) ctx.scale(sc, sc);
  const tpl = L.layout && capTplOf({ tpl: L.tpl, tcolor: L.tcolor, tacc: L.tacc });
  if (tpl) {
    // texto de modelo: layout pronto com as fontes, cores e animação do modelo
    const len = L.out - L.in, lt = stillPreview ? Math.max(t - L.start, 2) : t - L.start, B = (L.size || 80) * Math.min(W, H) / 1080;
    const anim = !stillPreview && hasAnim(L.anim) ? L.anim : null;
    ctx.globalAlpha = op * (stillPreview || anim?.out ? 1 : clamp((len - lt) / 0.25, 0, 1));
    const n = anim ? countUnits(tpl, L.layout, L.text, B, W * 0.86) : 0;
    const ph = anim && n ? layerPhase(anim, () => n, lt, len, seedOf(L.id)) : null;
    const box = ph ? drawLayoutFx(ctx, tpl, L.layout, L.text, B, W * 0.86, ph, B / 48)
      : drawLayout(ctx, tpl, L.layout, L.text, anim?.in ? 99 : lt, B, W * 0.86);
    const bw = box.w, bh = box.h, seld = pre && S.sel?.type === 'layer' && S.sel.id === L.id && !E.playing && !FSP.on;
    if (seld) { ctx.globalAlpha = 1; ctx.shadowColor = 'transparent'; ctx.strokeStyle = '#b48cff'; ctx.lineWidth = 2 / sc; ctx.setLineDash([6 / sc, 4 / sc]); ctx.strokeRect(-bw / 2 - 4, -bh / 2 - 4, bw + 8, bh + 8); }
    ctx.restore();
    if (pre) layerRects.push({ id: L.id, x: lx - (bw / 2 + 4) * sc, y: ly - (bh / 2 + 4) * sc, w: (bw + 8) * sc, h: (bh + 8) * sc });
    return;
  }
  const m = textMetrics(ctx, W, H, L), pad = m.fs * 0.35;
  const bw = m.w + (L.bg ? pad * 2 : 0), bh = m.h + (L.bg ? pad * 1.2 : 0);
  if (op > 0) {
    ctx.globalAlpha = op;
    if (L.bg) {
      ctx.fillStyle = L.bg; ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-bw / 2, -bh / 2, bw, bh, m.fs * 0.25); else ctx.rect(-bw / 2, -bh / 2, bw, bh);
      ctx.fill();
    }
    if (L.shadow && !L.bg) { ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 12 * m.k; }
    const placed = RT.placeLines(m, L.align || 'center');
    const anim = !stillPreview && hasAnim(L.anim) ? L.anim : null;
    if (anim) {
      // animação por pedaço (letra, palavra ou linha, conforme o preset); cada pedaço mantém o estilo do trecho
      const un = {}; const unitsOf = (pr) => (un[pr.s] ??= RT.richUnits(ctx, m, placed, pr.s, fontCss));
      const len = L.out - L.in, ph = layerPhase(anim, (pr) => unitsOf(pr).length, t - L.start, len, seedOf(L.id));
      if (ph) unitsOf(ph.P.pr).forEach((q, i) => {
        ctx.save(); if (applyState(ctx, sliceState(ph.P, i, ph.t), q, m.fs / 48, ph.P.pr.p)) q.draw(); ctx.restore();
      });
      else RT.drawRich(ctx, m, placed, fontCss);
    } else RT.drawRich(ctx, m, placed, fontCss);
  }
  const seld = pre && S.sel?.type === 'layer' && S.sel.id === L.id && !E.playing && !FSP.on;
  if (seld) { ctx.globalAlpha = 1; ctx.shadowColor = 'transparent'; ctx.strokeStyle = '#b48cff'; ctx.lineWidth = 2 / sc; ctx.setLineDash([6 / sc, 4 / sc]); ctx.strokeRect(-bw / 2 - 4, -bh / 2 - 4, bw + 8, bh + 8); }
  ctx.restore();
  if (pre) layerRects.push({ id: L.id, x: lx - (bw / 2 + 4) * sc, y: ly - (bh / 2 + 4) * sc, w: (bw + 8) * sc, h: (bh + 8) * sc });
}
function addTextLayer() {
  if (!S.clips.length) return toast('Adicione um vídeo primeiro');
  const T = total(), start = S.t >= T - 0.3 ? 0 : S.t;
  commit();
  const L = { id: uid(), kind: 'text', name: 'Texto', text: 'Seu texto', start, in: 0, out: Math.max(0.5, Math.min(3, T - start)),
    x: 0.5, y: 0.35, scale: 1, rot: 0, op: 1, font: S.cap.font, weight: 800, size: 80, color: '#FFFFFF', bg: '', shadow: true, upper: false };
  S.layers.push(L); S.sel = { type: 'layer', id: L.id }; refresh();
  openTextSheet(L.id, true);
}
// Seleção dentro do editor de texto rico: guardada aqui para continuar valendo quando o dedo vai para um botão ou controle
let richEd = null, richSel = null, richOnSel = null, richPaintAt = 0;
document.addEventListener('selectionchange', () => {
  if (!richEd || !richEd.isConnected) return;
  const o = RT.getOffsets(richEd); if (!o) return;
  // repintar o editor (depois de aplicar um estilo) mexe na seleção do navegador: isso não é a pessoa desmarcando
  if (o.a === o.b && richSel && (performance.now() - richPaintAt < 250 || document.activeElement !== richEd)) return;
  richSel = o.b > o.a ? o : null; richOnSel?.();
});
const lum = (hex) => { const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return 1; const n = parseInt(m[1], 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
function openTextSheet(id, fresh = false) {
  const L = S.layers.find((x) => x.id === id); if (!L || L.kind !== 'text') return;
  const T = kfTarget({ type: 'layer', id });
  if (L.layout) return openTplTextSheet(L, T, fresh);
  richSel = null;
  const fmtBtn = (k, label, icon) => `<button class="fmt" data-fmt="${k}" aria-label="${label}" title="${label}">${icon}</button>`;
  openSheet('layer', 'Texto', `
    <div id="tx-rich" class="tx-in rich" contenteditable="true" spellcheck="false" autocapitalize="sentences" role="textbox" aria-multiline="true" aria-label="Texto"></div>
    <div class="rich-scope" id="tx-scope"></div>
    <div class="fmt-row">
      ${fmtBtn('b', 'Negrito', '<b>B</b>')}${fmtBtn('i', 'Itálico', '<i style="font-family:Georgia,serif">I</i>')}${fmtBtn('u', 'Sublinhado', '<u>U</u>')}
      <span class="fmt-sep"></span>
      ${fmtBtn('al', 'Alinhar à esquerda', '<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h10M4 18h13"/></svg>')}${fmtBtn('ac', 'Centralizar', '<svg viewBox="0 0 24 24"><path d="M4 6h16M7 12h10M5.5 18h13"/></svg>')}${fmtBtn('ar', 'Alinhar à direita', '<svg viewBox="0 0 24 24"><path d="M4 6h16M10 12h10M7 18h13"/></svg>')}
    </div>
    <div class="sec">Fonte</div>
    <div class="chips" data-keep>${fontChips(L.font)}</div>
    <div class="sec">Peso</div>
    <div class="chips" data-keep>${[[400, 'Normal'], [600, 'Médio'], [700, 'Negrito'], [800, 'Extra']].map(([w, l]) => `<button class="chip" data-weight="${w}">${l}</button>`).join('')}</div>
    <div class="sec">Cor</div>
    <div class="chips" data-keep>${TPL_COLORS.map((x) => `<button class="sw" data-color="${x}" style="background:${x}" aria-label="Cor ${x}"></button>`).join('')}<input type="color" id="tx-color" value="${L.color || '#FFFFFF'}" aria-label="Outra cor"></div>
    ${rangeRow('ts', 'Tamanho', 24, 240, 1, L.size || 80, (v) => v, 80)}
    ${rangeRow('tls', 'Espaço entre letras', -10, 60, 1, L.ls || 0, (v) => v, 0)}
    ${rangeRow('tlh', 'Espaço entre linhas', 0.7, 2.4, 0.05, L.lh || 1.2, (v) => (+v).toFixed(2), 1.2)}
    <div class="sec">Fundo</div>
    <div class="chips">${TEXT_BG.map(([c, l]) => `<button class="chip ${(L.bg || '') === c ? 'on' : ''}" data-bg="${c}">${l}</button>`).join('')}</div>
    <div class="row"><label>Sombra</label><span class="spacer"></span><input type="checkbox" class="tg" id="tx-shadow" ${L.shadow ? 'checked' : ''}></div>
    <div class="row"><label>Maiúsculas</label><span class="spacer"></span><input type="checkbox" class="tg" id="tx-upper" ${L.upper ? 'checked' : ''}></div>
    <div class="sec">Posição e tempo</div>
    ${rangeRow('lx', 'Horizontal', 0, 100, 1, Math.round(kfGet(T, 'x') * 100), pctf)}
    ${rangeRow('ly', 'Vertical', 0, 100, 1, Math.round(kfGet(T, 'y') * 100), pctf, 35)}
    ${rangeRow('ld', 'Duração', 0.5, 60, 0.1, L.out - L.in, sec)}
    <button class="btn" id="l-anim">${inlineIc('zap')} Animação: ${esc(animSummary(L.anim))}</button>
    <button class="btn" id="l-kf">${inlineIc('key')} Animar com keyframes</button>
    <p class="note">Selecione uma parte do texto para mudar só ela (cor, fonte, tamanho, espaço entre letras). Sem seleção, a mudança vale para o texto todo. Na prévia: arraste para mover (o ímã centraliza e respeita as margens) e use dois dedos para aumentar.</p>`,
  (b) => {
    const ed = $('#tx-rich', b); richEd = ed;
    let pend = null, tlT = 0;
    const begin = () => { if (!pend) pend = snap(); };
    const endEdit = () => { if (pend) pushHist(pend); pend = null; renderTimeline(); };
    const changed = () => { draw(); clearTimeout(tlT); tlT = setTimeout(renderTimeline, 250); };
    const paint = () => {
      richPaintAt = performance.now();
      ed.innerHTML = RT.runsHTML(L, fontCss);
      ed.style.cssText = RT.editorCss(L, fontCss) + `color:${L.color || '#FFFFFF'};background:${lum(L.color) < 0.35 ? '#ece8f4' : ''}`;
      if (richSel && document.activeElement === ed) RT.setOffsets(ed, richSel.a, richSel.b);
    };
    const st = (k) => RT.styleIn(L, richSel?.a, richSel?.b, k);
    const ui = () => {
      const sc = $('#tx-scope', b);
      sc.innerHTML = richSel
        ? `<span>Mudando só <b>“${esc(L.text.slice(richSel.a, richSel.b).replace(/\n/g, ' ').slice(0, 28))}${richSel.b - richSel.a > 28 ? '…' : ''}”</b></span><button class="chip sm" id="tx-all">Aplicar no texto todo</button>`
        : '<span>Mudando <b>o texto todo</b>. Selecione uma parte para mudar só ela.</span>';
      sc.classList.toggle('on', !!richSel);
      const all = $('#tx-all', b); if (all) { all.onpointerdown = (e) => e.preventDefault(); all.onclick = () => { richSel = null; const s2 = document.getSelection(); if (ed.contains(s2.anchorNode)) s2.collapseToEnd(); ui(); }; }
      const w = st('w');
      b.querySelector('[data-fmt="b"]').classList.toggle('on', w != null && w >= 700);
      b.querySelector('[data-fmt="i"]').classList.toggle('on', !!st('i'));
      b.querySelector('[data-fmt="u"]').classList.toggle('on', !!st('u'));
      ['al', 'ac', 'ar'].forEach((k) => b.querySelector(`[data-fmt="${k}"]`).classList.toggle('on', (L.align || 'center') === { al: 'left', ac: 'center', ar: 'right' }[k]));
      const f = st('f'), c = (st('c') || '').toUpperCase();
      b.querySelectorAll('[data-font]').forEach((x) => x.classList.toggle('on', x.dataset.font === f));
      b.querySelectorAll('[data-weight]').forEach((x) => x.classList.toggle('on', +x.dataset.weight === w));
      b.querySelectorAll('[data-color]').forEach((x) => x.classList.toggle('on', x.dataset.color.toUpperCase() === c));
      if (c) $('#tx-color', b).value = c.length === 7 ? c : '#FFFFFF';
      const setR = (k, v, f2) => { const el = b.querySelector(`[data-k="${k}"]`), out = b.querySelector(`[data-v="${k}"]`); if (v != null && el) { el.value = v; out.textContent = f2(v); } else if (out) out.textContent = '—'; };
      setR('ts', st('sz'), (v) => v); setR('tls', st('ls'), (v) => v);
    };
    richOnSel = ui;
    // aplica um estilo no trecho selecionado (ou no texto todo) e repinta
    const apply = (k, v, hist = true) => {
      if (hist) commit();
      RT.applyStyle(L, richSel?.a, richSel?.b, k, v);
      paint();
      if (k === 'f' || k === 'w' || k === 'i') document.fonts.load(`${st('i') ? 'italic ' : ''}${st('w') || 700} 40px ${fontCss(st('f') || L.font)}`).then(draw).catch(() => {});
      ui(); draw();
    };
    paint(); ui();
    if (fresh) setTimeout(() => { ed.focus(); RT.setOffsets(ed, 0, L.text.length); }, 60);
    // digitação: o navegador edita o texto; lemos de volta para os trechos
    const readBack = () => {
      begin(); const o = RT.getOffsets(ed);
      RT.setRuns(L, RT.readEditor(ed));
      if (!RT.isClean(ed)) { paint(); if (o) RT.setOffsets(ed, o.a, o.b); }
      changed();
    };
    ed.addEventListener('input', (e) => { if (!e.isComposing) readBack(); });
    ed.addEventListener('compositionend', readBack);
    const putText = (txt) => {
      const o = RT.getOffsets(ed) || { a: L.text.length, b: L.text.length };
      begin(); RT.insertText(L, o.a, o.b, txt); paint(); RT.setOffsets(ed, o.a + txt.length, o.a + txt.length); changed();
    };
    ed.addEventListener('beforeinput', (e) => { if (e.inputType === 'insertParagraph' || e.inputType === 'insertLineBreak') { e.preventDefault(); putText('\n'); } });
    ed.addEventListener('paste', (e) => { e.preventDefault(); const t = (e.clipboardData || window.clipboardData)?.getData('text/plain') || ''; if (t) putText(t.replace(/\r\n?/g, '\n')); });
    ed.addEventListener('focusout', endEdit);
    // botões não roubam o foco (a seleção continua marcada no texto)
    b.querySelectorAll('.fmt, [data-keep] button').forEach((el) => el.addEventListener('pointerdown', (e) => e.preventDefault()));
    b.querySelectorAll('[data-fmt]').forEach((el) => el.onclick = () => {
      const k = el.dataset.fmt;
      if (k === 'b') { const w = st('w'); apply('w', w != null && w >= 700 ? 400 : 800); }
      else if (k === 'i') apply('i', !st('i'));
      else if (k === 'u') apply('u', !st('u'));
      else { commit(); L.align = { al: 'left', ac: 'center', ar: 'right' }[k]; paint(); ui(); draw(); }
    });
    b.querySelectorAll('[data-font]').forEach((el) => el.onclick = () => apply('f', el.dataset.font));
    bindAddFont(b, (fid) => { commit(); RT.applyStyle(L, richSel?.a, richSel?.b, 'f', fid); openTextSheet(L.id); });
    b.querySelectorAll('[data-weight]').forEach((el) => el.onclick = () => apply('w', +el.dataset.weight));
    b.querySelectorAll('[data-color]').forEach((el) => el.onclick = () => apply('c', el.dataset.color));
    let cp = null;
    $('#tx-color', b).addEventListener('input', (e) => { if (!cp) cp = snap(); apply('c', e.target.value.toUpperCase(), false); });
    $('#tx-color', b).addEventListener('change', () => { if (cp) pushHist(cp); cp = null; });
    b.querySelectorAll('[data-bg]').forEach((el) => el.onclick = () => { commit(); L.bg = el.dataset.bg; b.querySelectorAll('[data-bg]').forEach((x) => x.classList.toggle('on', x === el)); draw(); });
    $('#tx-shadow', b).addEventListener('change', (e) => { commit(); L.shadow = e.target.checked; draw(); });
    $('#tx-upper', b).addEventListener('change', (e) => { commit(); L.upper = e.target.checked; paint(); draw(); });
    bindRanges(b, {
      ts: { set: (v) => { RT.applyStyle(L, richSel?.a, richSel?.b, 'sz', v); paint(); }, fmt: (v) => v },
      tls: { set: (v) => { RT.applyStyle(L, richSel?.a, richSel?.b, 'ls', v); paint(); }, fmt: (v) => v },
      tlh: { set: (v) => (L.lh = v), fmt: (v) => (+v).toFixed(2) },
      lx: { set: (v) => kfPut(T, 'x', v / 100), fmt: pctf, after: renderTimeline }, ly: { set: (v) => kfPut(T, 'y', v / 100), fmt: pctf, after: renderTimeline },
      ld: { set: (v) => (L.out = L.in + v), fmt: sec, after: renderTimeline },
    });
    $('#l-kf', b).onclick = openKfSheet;
    $('#l-anim', b).onclick = () => openAnimSheet({ title: 'Animação do texto', sample: L.text.split('\n')[0].slice(0, 24) || 'Seu texto', get: () => L.anim, set: (a) => { L.anim = a; }, back: () => openTextSheet(L.id) });
    document.fonts.load(`${L.weight || 700} 40px ${fontCss(L.font)}`).then(draw).catch(() => {});
  });
}
// Painel do texto de modelo: texto, modelo, layout, tamanho, posição e duração
function openTplTextSheet(L, T, fresh) {
  openSheet('layer', 'Texto de modelo', `
    <textarea id="tx-text" class="tx-in" rows="3" placeholder="Digite o texto">${esc(L.text)}</textarea>
    <p class="note">*asteriscos* = destaque · nova linha = nova linha do título</p>
    <div class="sec">Modelo</div>
    <div class="chips">${TEMPLATES.map((t) => `<button class="chip ${L.tpl === t.id ? 'on' : ''}" data-tt="${t.id}">${t.name}</button>`).join('')}</div>
    <div class="sec">Layout</div>
    <div class="tpl-grid">${LAYOUTS.map((l) => `<button class="tpl-card ${L.layout === l.id ? 'on' : ''}" data-ll="${l.id}"><canvas data-prev-lay="${l.id}" data-tplid="${L.tpl}"></canvas><span>${l.name}</span></button>`).join('')}</div>
    ${tplById(L.tpl) ? capTplColorsHTML(L, tplById(L.tpl), 'l') : ''}
    ${rangeRow('ts', 'Tamanho', 24, 240, 1, L.size, (v) => v, 80)}
    ${rangeRow('lx', 'Horizontal', 0, 100, 1, Math.round(kfGet(T, 'x') * 100), pctf)}
    ${rangeRow('ly', 'Vertical', 0, 100, 1, Math.round(kfGet(T, 'y') * 100), pctf, 40)}
    ${rangeRow('ld', 'Duração', 0.5, 60, 0.1, L.out - L.in, sec)}
    <button class="btn" id="l-anim">${inlineIc('zap')} Animação: ${esc(animSummary(L.anim))}</button>
    <button class="btn" id="l-replay">${inlineIc('right')} Ver a animação</button>
    <button class="btn" id="l-kf">${inlineIc('key')} Animar com keyframes</button>`,
  (b) => {
    const ta = $('#tx-text', b); let pend = null, tlT = 0;
    ta.addEventListener('input', () => { if (!pend) pend = snap(); L.text = ta.value; draw(); clearTimeout(tlT); tlT = setTimeout(renderTimeline, 250); });
    ta.addEventListener('change', () => { if (pend) pushHist(pend); pend = null; renderTimeline(); });
    if (fresh) setTimeout(() => { ta.focus(); ta.select(); }, 60);
    b.querySelectorAll('[data-tt]').forEach((el) => el.onclick = () => { commit(); L.tpl = el.dataset.tt; prefs.textTpl = L.tpl; savePrefs(); draw(); openTplTextSheet(L, T); });
    b.querySelectorAll('[data-ll]').forEach((el) => el.onclick = () => {
      commit(); const was = layoutById(L.layout); if (!L.text.trim() || L.text === was?.sample) L.text = layoutById(el.dataset.ll).sample;
      L.layout = el.dataset.ll; draw(); renderTimeline(); openTplTextSheet(L, T);
    });
    bindTplColors(b, L, 'l', renderTimeline);
    bindRanges(b, {
      ts: { set: (v) => (L.size = v), fmt: (v) => v },
      lx: { set: (v) => kfPut(T, 'x', v / 100), fmt: pctf, after: renderTimeline }, ly: { set: (v) => kfPut(T, 'y', v / 100), fmt: pctf, after: renderTimeline },
      ld: { set: (v) => (L.out = L.in + v), fmt: sec, after: renderTimeline },
    });
    $('#l-replay', b).onclick = () => { seekTo(L.start + 0.001); play(); };
    $('#l-anim', b).onclick = () => openAnimSheet({ title: 'Animação do texto', sample: stripMarks(L.text).split('\n')[0].slice(0, 24) || 'Seu texto', get: () => L.anim, set: (a) => { L.anim = a; }, back: () => openTplTextSheet(L, T) });
    $('#l-kf', b).onclick = openKfSheet;
    paintPreviews(b);
  });
}
function layerLanes() {
  const lanes = [], res = new Map();
  for (const L of [...S.layers].sort((a, b) => a.start - b.start)) {
    let li = lanes.findIndex((e) => e <= L.start + 0.001); if (li < 0) { li = lanes.length; lanes.push(0); }
    lanes[li] = L.start + L.out - L.in; res.set(L.id, li);
  }
  return { map: res, count: lanes.length };
}
function openLayerSheet(id) {
  const L = S.layers.find((x) => x.id === id); if (!L) return;
  if (L.kind === 'text') return openTextSheet(id);
  const isImg = L.kind === 'image', T = kfTarget({ type: 'layer', id });
  openSheet('layer', isImg ? 'Camada de imagem' : 'Camada de vídeo', `
    ${rangeRow('ls', 'Tamanho', 5, 150, 1, Math.round(kfGet(T, 'scale') * 100), pctf, isImg ? 50 : 100)}
    ${rangeRow('lx', 'Horizontal', 0, 100, 1, Math.round(kfGet(T, 'x') * 100), pctf)}
    ${rangeRow('ly', 'Vertical', 0, 100, 1, Math.round(kfGet(T, 'y') * 100), pctf)}
    ${isImg ? rangeRow('ld', 'Duração', 0.5, 30, 0.1, L.out - L.in, sec) : rangeRow('lv', 'Volume', 0, 200, 1, Math.round(kfGet(T, 'vol') * 100), pctf)}
    <button class="btn" id="l-kf">${inlineIc('key')} Animar com keyframes</button>
    <div class="chips"><button class="chip" id="l-center">Centralizar</button><button class="chip" id="l-full">Tela cheia</button></div>
    <p class="note">Dica: arraste a camada na prévia para mover; com dois dedos, aumenta ou diminui.${isImg ? '' : ' O som deste vídeo começa em 0% (mudo).'}</p>`,
  (b) => {
    const sync = () => { [['ls', kfGet(T, 'scale')], ['lx', kfGet(T, 'x')], ['ly', kfGet(T, 'y')]].forEach(([k, v]) => { const el = b.querySelector(`[data-k="${k}"]`); el.value = Math.round(v * 100); b.querySelector(`[data-v="${k}"]`).textContent = Math.round(v * 100) + '%'; }); };
    bindRanges(b, {
      ls: { set: (v) => kfPut(T, 'scale', v / 100), fmt: pctf, after: renderTimeline }, lx: { set: (v) => kfPut(T, 'x', v / 100), fmt: pctf, after: renderTimeline }, ly: { set: (v) => kfPut(T, 'y', v / 100), fmt: pctf, after: renderTimeline },
      ld: { set: (v) => (L.out = L.in + v), fmt: sec, after: renderTimeline }, lv: { set: (v) => kfPut(T, 'vol', v / 100), fmt: pctf, after: renderTimeline },
    });
    $('#l-kf', b).onclick = openKfSheet;
    $('#l-center', b).onclick = () => { commit(); kfPut(T, 'x', 0.5); kfPut(T, 'y', 0.5); sync(); draw(); };
    $('#l-full', b).onclick = () => {
      commit(); kfPut(T, 'x', 0.5); kfPut(T, 'y', 0.5);
      const sw = isImg ? images.get(L.srcId)?.w : layerEls.get(L.id)?.videoWidth, sh = isImg ? images.get(L.srcId)?.h : layerEls.get(L.id)?.videoHeight;
      const a = S.aspect || 9 / 16; kfPut(T, 'scale', sw && sh ? Math.max(1, (sw / sh) / a) : 1); sync(); draw();
    };
  });
}
// ---------- Arrastar itens na linha do tempo ----------
// Item selecionado: arraste o meio para mover e as alças brancas para mudar começo/fim.
// Item não selecionado: segure um instante e arraste (no computador, arraste direto com o mouse).
function bindDrag(el, selType, selId, ops) {
  let st = null, lp = null, p0 = null;
  const isSel = () => S.sel?.type === selType && S.sel.id === selId;
  const begin = (x, target) => {
    if (E.playing || E.exporting) return false;
    const mode = target?.classList?.contains('lh') ? (target.classList.contains('l') ? 'l' : 'r') : 'm';
    st = { x0: x, mode, before: snap(), moved: false, pps: S.pps, T: total() };
    ops.start(st);
    return true;
  };
  const snapT = (t) => { for (const p of [0, st.T, S.t]) if (Math.abs(t - p) * st.pps < 10) return p; return t; };
  const mv = (x) => {
    if (!st) return;
    if (!st.moved && Math.abs(x - st.x0) < 3) return;
    st.moved = true; ops.move(st, (x - st.x0) / st.pps, snapT);
    if (!E.playing) draw();
  };
  const finish = () => {
    clearTimeout(lp); lp = null; el.classList.remove('lift');
    if (!st) return;
    const s0 = st; st = null;
    if (s0.moved) { el._dragged = true; ops.end?.(s0); pushHist(s0.before); refresh(); saveSoon(); setTimeout(() => (el._dragged = false), 120); }
  };
  const markSel = () => {
    if (isSel()) return;
    S.sel = { type: selType, id: selId };
    document.querySelectorAll('#tl-inner .sel').forEach((x) => x.classList.remove('sel'));
    el.classList.add('sel'); renderToolbar();
    try { navigator.vibrate?.(15); } catch {}
  };
  el.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) { finish(); return; }
    const t0 = e.touches[0];
    if (isSel()) { if (begin(t0.clientX, e.target)) e.preventDefault(); return; }
    p0 = [t0.clientX, t0.clientY]; clearTimeout(lp);
    lp = setTimeout(() => { lp = null; markSel(); if (begin(p0[0], el)) el.classList.add('lift'); }, 300);
  }, { passive: false });
  el.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    if (lp && p0 && Math.hypot(t.clientX - p0[0], t.clientY - p0[1]) > 8) { clearTimeout(lp); lp = null; } // é rolagem normal
    if (!st) return;
    e.preventDefault(); mv(t.clientX);
  }, { passive: false });
  el.addEventListener('touchend', (e) => { const had = !!st; finish(); if (had) e.preventDefault(); }, { passive: false });
  el.addEventListener('touchcancel', finish);
  el.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || !begin(e.clientX, e.target)) return;
    e.preventDefault();
    const mm = (ev) => { if (st && !st.moved && Math.abs(ev.clientX - st.x0) >= 3) markSel(); mv(ev.clientX); };
    const mu = () => { removeEventListener('mousemove', mm); removeEventListener('mouseup', mu); finish(); };
    addEventListener('mousemove', mm); addEventListener('mouseup', mu);
  });
}
const addHandles = (el) => el.insertAdjacentHTML('beforeend', '<i class="lh l"></i><i class="lh r"></i>');
// camadas, ajuste e trilhas de áudio (têm início próprio na linha do tempo)
function spanOps(el, L, h, opt) {
  return {
    start: (st) => { st.o = { start: L.start, in: L.in, out: L.out }; },
    move: (st, dt, snapT) => {
      const o = st.o, len = o.out - o.in, pps = st.pps;
      if (st.mode === 'm') {
        let ns = snapT(clamp(o.start + dt, 0, Math.max(0, st.T - 0.1)));
        const ne = snapT(ns + len); if (ne !== ns + len && ne - len >= 0) ns = ne - len;
        L.start = ns;
      } else if (st.mode === 'l') {
        const end = o.start + len, minS = opt.free ? 0 : Math.max(0, o.start - o.in);
        const ns = clamp(snapT(o.start + dt), minS, end - 0.2);
        if (opt.free) { L.start = ns; L.in = 0; L.out = end - ns; } else { L.in = o.in + (ns - o.start); L.start = ns; }
      } else {
        const ne = snapT(o.start + len + dt);
        L.out = clamp(o.in + (ne - o.start), o.in + 0.2, opt.maxOut);
      }
      el.style.left = (h + L.start * pps) + 'px'; el.style.width = Math.max(3, (L.out - L.in) * pps - 2) + 'px';
    },
  };
}
// clipes do vídeo principal: bordas aparam, o meio muda a ordem
function clipOps(el, r, h) {
  const c = r.clip, dur = media.get(c.mediaId)?.duration ?? Infinity;
  return {
    start: (st) => { st.o = { in: c.in, out: c.out }; },
    move: (st, dt) => {
      const pps = st.pps;
      const k = spd(c);
      if (st.mode === 'l') c.in = clamp(st.o.in + dt * k, 0, st.o.out - 0.2);
      else if (st.mode === 'r') c.out = clamp(st.o.out + dt * k, st.o.in + 0.2, dur);
      else { el.style.transform = `translateX(${dt * pps}px)`; el.style.zIndex = 6; st.dt = dt; return; }
      el.style.width = Math.max(3, clipLen(c) * pps - 2) + 'px';
    },
    end: (st) => {
      if (st.mode === 'l') {
        const d = (c.in - st.o.in) / spd(c);
        S.zooms = S.zooms.map((z) => (z.clipId === c.id ? { ...z, off: z.off - d } : z)).filter((z) => z.clipId !== c.id || z.off >= -0.01).map((z) => (z.clipId === c.id && z.off < 0 ? { ...z, off: 0 } : z));
      } else if (st.mode === 'r') {
        S.zooms = S.zooms.filter((z) => z.clipId !== c.id || z.off < clipLen(c));
      } else if (st.dt) {
        const lay = layout(), me = lay.find((x) => x.clip.id === c.id); if (!me) return;
        const center = me.start + st.dt + (me.end - me.start) / 2;
        const others = lay.filter((x) => x.clip.id !== c.id);
        const idx = others.filter((x) => (x.start + x.end) / 2 < center).length;
        S.clips = others.map((x) => x.clip); S.clips.splice(idx, 0, c);
      }
    },
  };
}
// blocos de legenda (tempo no vídeo de origem)
function capOps(el, sp, h) {
  const cap = sp.cap;
  return {
    start: (st) => { st.o = { start: cap.start, end: cap.end }; },
    move: (st, dt) => {
      const o = st.o, pps = st.pps, k = sp.k || 1; dt *= k; // dt chega em tempo de linha do tempo; a legenda guarda tempo do arquivo
      if (st.mode === 'l') cap.start = clamp(o.start + dt, 0, o.end - 0.1);
      else if (st.mode === 'r') cap.end = Math.max(o.start + 0.1, o.end + dt);
      else { const d = Math.max(-o.start, dt); cap.start = o.start + d; cap.end = o.end + d; }
      el.style.left = (h + (sp.start + (cap.start - o.start) / k) * pps) + 'px';
      el.style.width = Math.max(3, (sp.end - sp.start + ((cap.end - o.end) - (cap.start - o.start)) / k) * pps - 1) + 'px';
    },
  };
}

// ---------- Áudio da exportação (AAC), conferido antes de gravar o vídeo ----------
const ASC_48K_STEREO = new Uint8Array([0x11, 0x90]); // AAC-LC, 48 kHz, 2 canais
function peakOfBuf(buf) {
  let mx = 0;
  for (let ch = 0; ch < buf.numberOfChannels; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < d.length; i += 7) { const a = Math.abs(d[i]); if (a > mx) mx = a; } }
  return mx;
}
// AAC pelo codificador do navegador; remove cabeçalhos ADTS se vierem
async function aacWebCodecs(mix) {
  const frames = []; let err = null;
  const enc = new AudioEncoder({
    output: (c) => {
      let d = new Uint8Array(c.byteLength); c.copyTo(d);
      if (d.length > 9 && d[0] === 0xff && (d[1] & 0xf6) === 0xf0) d = d.slice((d[1] & 1) ? 7 : 9);
      if (d.length) frames.push(d);
    },
    error: (e) => (err = e),
  });
  enc.configure({ codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: 192000 });
  const L0 = mix.getChannelData(0), R0 = mix.numberOfChannels > 1 ? mix.getChannelData(1) : L0, N = mix.length, CH = 4800;
  for (let i = 0; i < N && !err; i += CH) {
    const n = Math.min(CH, N - i), data = new Float32Array(n * 2);
    data.set(L0.subarray(i, i + n), 0); data.set(R0.subarray(i, i + n), n);
    const ad = new AudioData({ format: 'f32-planar', sampleRate: 48000, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round(i / 48000 * 1e6), data });
    enc.encode(ad); ad.close();
    if (enc.encodeQueueSize > 50) await new Promise((r) => setTimeout(r, 5));
  }
  await enc.flush(); enc.close();
  if (err) throw err;
  return { frames, asc: ASC_48K_STEREO, sr: 48000, ch: 2, via: 'codificador' };
}
// confere se o AAC gerado toca (decodifica de volta e mede o volume)
async function aacSounds(a, wantPeak) {
  if (!a.frames.length) return false;
  if (wantPeak < 0.002) return true; // a linha do tempo é silenciosa mesmo
  const cfg = { aot: a.asc[0] >> 3, fi: ((a.asc[0] & 7) << 1) | (a.asc[1] >> 7), ch: (a.asc[1] >> 3) & 15 };
  const n = Math.min(a.frames.length, 400); let tot = 0;
  for (let i = 0; i < n; i++) tot += a.frames[i].length + 7;
  const out = new Uint8Array(tot); let o = 0;
  for (let i = 0; i < n; i++) { out.set(adtsHeader(a.frames[i].length, cfg), o); o += 7; out.set(a.frames[i], o); o += a.frames[i].length; }
  try { const b = await decodeBytes(out); return b.duration > 0.5 * n * 1024 / a.sr && peakOfBuf(b) > 0.002; } catch { return false; }
}
// plano B: grava o áudio em tempo real com o gravador do navegador e tira o AAC do arquivo
async function aacRecorder(mix) {
  const types = ['audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'video/mp4'];
  const mime = types.find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m));
  if (!mime) throw new Error('sem gravador de áudio');
  const ctx = ac(); await ctx.resume();
  const dest = ctx.createMediaStreamDestination(), src = ctx.createBufferSource();
  src.buffer = mix; src.connect(dest);
  const rec = new MediaRecorder(dest.stream, { mimeType: mime, audioBitsPerSecond: 192000 }), parts = [];
  rec.ondataavailable = (e) => { if (e.data?.size) parts.push(e.data); };
  const stopped = new Promise((r) => (rec.onstop = r));
  rec.start(1000); src.start(ctx.currentTime + 0.05);
  const t0 = performance.now(), D = mix.duration;
  while ((performance.now() - t0) / 1000 < D + 0.4) {
    if (E.exp?.cancelled) break;
    const lab = $('#exp-st'); if (lab) lab.textContent = `Gravando o áudio… ${Math.min(100, Math.round(100 * (performance.now() - t0) / 1000 / D))}%`;
    await new Promise((r) => setTimeout(r, 250));
  }
  rec.stop(); try { src.stop(); } catch {} await stopped;
  const file = new Blob(parts, { type: mime });
  const MP4Box = await loadMp4box();
  const ab = await file.arrayBuffer(); ab.fileStart = 0;
  const mp4 = MP4Box.createFile(); let info = null; mp4.onReady = (i) => (info = i); mp4.appendBuffer(ab); mp4.flush();
  const track = info?.tracks.find((t) => /^mp4a/.test(t.codec)); if (!track) throw new Error('gravação sem áudio AAC');
  const trak = mp4.getTrackById(track.id), cfg = aacConfig(trak, track), bytes = new Uint8Array(ab);
  const frames = (trak.samples || []).map((s) => bytes.slice(s.offset, s.offset + s.size));
  const sr = SR_TABLE[cfg.fi] || track.audio?.sample_rate || 48000;
  const asc = new Uint8Array([(cfg.aot << 3) | (cfg.fi >> 1), ((cfg.fi & 1) << 7) | (cfg.ch << 3)]);
  return { frames, asc, sr, ch: cfg.ch, via: 'gravador' };
}
async function buildExportAudio(T) {
  const mix = await renderMixdown(T, 48000), peak = peakOfBuf(mix);
  let a = null, why = '';
  try { a = await aacWebCodecs(mix); if (!(await aacSounds(a, peak))) { why = 'codificador sem som'; a = null; } } catch (e) { why = String(e.message || e); a = null; }
  if (!a) a = await aacRecorder(mix);
  expLog({ audio: a.via, peak: Math.round(peak * 100) / 100, why });
  return a;
}

// divide a camada no cursor: as duas partes mantêm posição, estilo e keyframes (tempo de origem)
function splitLayer(id) {
  const L = S.layers.find((x) => x.id === id); if (!L) return;
  const off = S.t - L.start;
  if (off < 0.1 || off > L.out - L.in - 0.1) return toast('Coloque o cursor dentro da camada selecionada');
  commit();
  const nl = { ...structuredClone(L), id: uid(), start: S.t, in: L.in + off };
  L.out = L.in + off;
  S.layers.splice(S.layers.indexOf(L) + 1, 0, nl);
  S.sel = { type: 'layer', id: nl.id };
  toast('Camada dividida', 1400);
  refresh();
}
function trimLayer(id, side) {
  const L = S.layers.find((x) => x.id === id), off = S.t - L.start;
  if (off < 0.05 || off > L.out - L.in - 0.05) return toast('Coloque o cursor dentro da camada selecionada');
  commit();
  if (side === 'start') { L.in += off; L.start = S.t; } else L.out = L.in + off;
  refresh();
}
// arrastar / pinçar a camada na prévia
const ptrs = new Map(); let ldrag = null;
pv.addEventListener('pointerdown', (e) => {
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (E.playing || FSP.on) return;
  if (ldrag && ptrs.size === 2) {
    const [p1, p2] = [...ptrs.values()]; ldrag.pinch = { d0: Math.hypot(p1.x - p2.x, p1.y - p2.y), s0: kfGet(ldrag.T, 'scale') };
    try { pv.setPointerCapture(e.pointerId); } catch {} return;
  }
  const rect = pv.getBoundingClientRect(), px = (e.clientX - rect.left) * pv.width / rect.width, py = (e.clientY - rect.top) * pv.height / rect.height;
  const hit = [...layerRects].reverse().find((r) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h);
  let T;
  if (hit) {
    const L = S.layers.find((l) => l.id === hit.id); if (!L) return;
    if (!(S.sel?.type === 'layer' && S.sel.id === L.id)) select('layer', L.id);
    T = kfTarget({ type: 'layer', id: L.id });
  } else if (S.sel?.type === 'clip' || S.sel?.type === 'caption') {
    // com um clipe (ou bloco de legenda) selecionado, arrastar a prévia move ele
    T = kfTarget(); if (!T || S.t < T.a || S.t >= T.b) return;
  } else return;
  if (!T) return;
  // tamanho da caixa (0..1 da tela) para o ímã alinhar bordas nas margens; os outros itens visíveis viram alvos também
  const bw = hit ? hit.w / pv.width : 0, bh = hit ? hit.h / pv.height : 0;
  const others = layerRects.filter((r) => !hit || r.id !== hit.id).map((r) => ({ cx: (r.x + r.w / 2) / pv.width, cy: (r.y + r.h / 2) / pv.height }));
  ldrag = { T, sx: e.clientX, sy: e.clientY, x0: kfGet(T, 'x'), y0: kfGet(T, 'y'), pend: snap(), rect, moved: false, bw, bh, others, snapped: '' };
  try { pv.setPointerCapture(e.pointerId); } catch {}
});
// ---------- Ímã de alinhamento: centro, margens e outros itens ----------
const SAFE = 0.05;     // margem de segurança (5% de cada lado)
const SNAP_PX = 9;     // distância na tela (px) em que o ímã puxa
let guides = null;     // { v: [x...], h: [y...] } linhas acesas durante o arrasto
function snapAxis(v, half, thr, targets) {
  // devolve [valor final, posição da linha acesa | null]; testa centro do item e as duas bordas
  let best = null;
  for (const t of targets) {
    for (const [off, kind] of [[0, 'c'], [-half, 'a'], [half, 'b']]) {
      if (kind !== 'c' && !half) continue;
      if (t.k && t.k !== kind) continue;
      const d = Math.abs(v + off - t.p);
      if (d < thr && (!best || d < best.d)) best = { d, v: t.p - off, line: t.p };
    }
  }
  return best ? [best.v, best.line] : [v, null];
}
function snapMove(x, y) {
  const g = { v: [], h: [] };
  const tx = [{ p: 0.5, k: 'c' }, { p: SAFE, k: 'a' }, { p: 1 - SAFE, k: 'b' }, ...ldrag.others.map((o) => ({ p: o.cx, k: 'c' }))];
  const ty = [{ p: 0.5, k: 'c' }, { p: SAFE, k: 'a' }, { p: 1 - SAFE, k: 'b' }, ...ldrag.others.map((o) => ({ p: o.cy, k: 'c' }))];
  const [nx, lx] = snapAxis(x, ldrag.bw / 2, SNAP_PX / ldrag.rect.width, tx);
  const [ny, ly] = snapAxis(y, ldrag.bh / 2, SNAP_PX / ldrag.rect.height, ty);
  if (lx != null) g.v.push(lx); if (ly != null) g.h.push(ly);
  const key = `${lx}|${ly}`;
  if (key !== ldrag.snapped && (lx != null || ly != null)) { try { navigator.vibrate?.(8); } catch {} }
  ldrag.snapped = key; guides = g;
  return [nx, ny];
}
function drawGuides() {
  if (!guides || !ldrag) return;
  const c = pctx, W = pv.width, H = pv.height;
  c.save();
  // margens de segurança: tracejado discreto enquanto arrasta
  c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = 1; c.setLineDash([4, 4]);
  c.strokeRect(SAFE * W, SAFE * H, (1 - 2 * SAFE) * W, (1 - 2 * SAFE) * H);
  c.setLineDash([]); c.strokeStyle = '#ff3ea5'; c.lineWidth = 1.5;
  for (const x of guides.v) { c.beginPath(); c.moveTo(x * W, 0); c.lineTo(x * W, H); c.stroke(); }
  for (const y of guides.h) { c.beginPath(); c.moveTo(0, y * H); c.lineTo(W, y * H); c.stroke(); }
  c.restore();
}
pv.addEventListener('pointermove', (e) => {
  if (!ptrs.has(e.pointerId)) return;
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (!ldrag) return;
  if (ldrag.pinch && ptrs.size >= 2) {
    const [p1, p2] = [...ptrs.values()]; kfPut(ldrag.T, 'scale', clamp(ldrag.pinch.s0 * Math.hypot(p1.x - p2.x, p1.y - p2.y) / (ldrag.pinch.d0 || 1), 0.05, 3));
  } else if (!ldrag.pinch) {
    const [nx, ny] = snapMove(ldrag.x0 + (e.clientX - ldrag.sx) / ldrag.rect.width, ldrag.y0 + (e.clientY - ldrag.sy) / ldrag.rect.height);
    kfPut(ldrag.T, 'x', clamp(nx, -0.5, 1.5));
    kfPut(ldrag.T, 'y', clamp(ny, -0.5, 1.5));
  }
  ldrag.moved = true; draw(); drawGuides();
});
const endPtr = (e) => {
  ptrs.delete(e.pointerId);
  if (ldrag && ptrs.size === 0) { guides = null; draw(); if (ldrag.moved) { pushHist(ldrag.pend); renderTimeline(); } ldrag = null; if (sheetKind === 'layer' && S.sel) openLayerSheet(S.sel.id); kfSync(); }
};
pv.addEventListener('pointerup', endPtr); pv.addEventListener('pointercancel', endPtr);

// ---------- Central de áudio (botão Áudio / Som) ----------
// Mostra o som do que estiver selecionado (clipe ou trilha), e as opções SFX e Extrair áudio.
function openAudioHub() {
  const sel = S.sel, parts = [];
  const clip = sel && (sel.type === 'clip' || sel.type === 'clipaudio') ? S.clips.find((x) => x.id === sel.id) : null;
  const track = sel?.type === 'audio' ? S.audios.find((x) => x.id === sel.id) : null;

  if (clip) {
    const m = media.get(clip.mediaId), has = !!(m && buffers.get(m.bufferId));
    if (has && clip.aOn !== false) {
      const len = clipLen(clip), maxF = Math.max(0.1, Math.min(10, len / 2)).toFixed(1);
      parts.push({
        html: `<div class="sec">Som deste clipe</div>
          ${rangeRow('cv', 'Volume', 0, 200, 1, Math.round((clip.volume ?? 1) * 100), pctf)}
          ${rangeRow('cfi', 'Fade in', 0, maxF, 0.1, Math.min(clip.afi || 0, maxF), sec)}
          ${rangeRow('cfo', 'Fade out', 0, maxF, 0.1, Math.min(clip.afo || 0, maxF), sec)}
          <div class="chips"><button class="chip" id="h-unlink">${inlineIc('unlink')} Desvincular</button><button class="chip" id="h-cdel" style="color:#ff6b6b">${inlineIc('trash')} Apagar som</button></div>
          <p class="note">Vinculado ao clipe: cortar ou apagar o clipe corta/apaga o som junto.</p>`,
        bind: (b) => {
          bindRanges(b, {
            cv: { set: (v) => (clip.volume = v / 100), fmt: pctf, after: renderTimeline },
            cfi: { set: (v) => (clip.afi = v), fmt: sec, after: renderTimeline },
            cfo: { set: (v) => (clip.afo = v), fmt: sec, after: renderTimeline },
          });
          $('#h-unlink', b).onclick = () => unlinkAudio(clip.id);
          $('#h-cdel', b).onclick = () => deleteClipAudio(clip.id);
        },
      });
    } else {
      parts.push({ html: `<div class="sec">Som deste clipe</div><p class="note">${has ? 'O som deste clipe foi apagado ou desvinculado. Use Desfazer, ou "Restaurar em todos" abaixo.' : 'Não consegui ler o áudio deste vídeo.'}</p>`, bind: () => {} });
    }
  }
  if (track) {
    const b0 = buffers.get(track.bufferId), len = track.out - track.in, maxF = Math.max(0.1, Math.min(10, len / 2)).toFixed(1);
    parts.push({
      html: `<div class="sec">Som da trilha: ${esc(track.name || 'Áudio')}</div>
        <div id="h-trim"></div>
        ${rangeRow('tv', 'Volume', 0, 200, 1, Math.round((track.volume ?? 1) * 100), pctf)}
        ${rangeRow('tfi', 'Fade in', 0, maxF, 0.1, Math.min(track.fadeIn || 0, maxF), sec)}
        ${rangeRow('tfo', 'Fade out', 0, maxF, 0.1, Math.min(track.fadeOut || 0, maxF), sec)}
        <p class="note">Arraste as alças amarelas para escolher o trecho do áudio.</p>`,
      bind: (b) => {
        bindRanges(b, {
          tv: { set: (v) => (track.volume = v / 100), fmt: pctf, after: renderTimeline },
          tfi: { set: (v) => (track.fadeIn = v), fmt: sec, after: renderTimeline },
          tfo: { set: (v) => (track.fadeOut = v), fmt: sec, after: renderTimeline },
        });
        if (b0) {
          let pend = null; const s = { in: track.in, out: track.out };
          makeTrimmer($('#h-trim', b), b0.buffer, s, {
            onChange: () => { if (!pend) pend = snap(); track.in = s.in; track.out = s.out; },
            onDone: () => { if (pend) { pushHist(pend); pend = null; } renderTimeline(); },
          });
        }
      },
    });
  }
  parts.push({
    html: `<div class="sec">Adicionar som</div>
      <button class="btn" id="h-sfx">${inlineIc('wave')} SFX</button>
      <button class="btn" id="h-extract">${inlineIc('music')} Extrair áudio de um vídeo</button>
      <p class="note">Entra na linha do tempo no cursor (${fmt(S.t)}).</p>`,
    bind: (b) => {
      $('#h-sfx', b).onclick = () => openSfx();
      $('#h-extract', b).onclick = () => $('#file-audio').click();
    },
  });
  if (S.clips.length && !track) {
    parts.push({
      html: `<div class="sec">Áudio original de todos os clipes</div>
        ${rangeRow('ov', 'Volume', 0, 200, 1, Math.round(S.origVolume * 100), pctf)}
        <div class="chips"><button class="chip" id="h-odel" style="color:#ff6b6b">Apagar em todos</button><button class="chip" id="h-oback">Restaurar em todos</button></div>`,
      bind: (b) => {
        bindRanges(b, { ov: { set: (v) => (S.origVolume = v / 100), fmt: pctf, after: renderTimeline } });
        $('#h-odel', b).onclick = () => { commit(); S.clips.forEach((c) => (c.aOn = false)); refresh(); openAudioHub(); toast('Áudio original removido'); };
        $('#h-oback', b).onclick = () => { commit(); S.clips.forEach((c) => (c.aOn = true)); refresh(); openAudioHub(); toast('Áudio original restaurado'); };
      },
    });
  }
  openSheet('audiohub', clip || track ? 'Som' : 'Áudio', parts.map((p) => p.html).join(''), (b) => parts.forEach((p) => p.bind(b)));
}
function openTransitionFor(clipId) {
  const i = S.clips.findIndex((c) => c.id === clipId);
  if (i > 0) openCutSheet(clipId); else openTransitions();
}

// ---------- Legendas ----------
let capTab = 'texto';
function openCaptions(tab, focusId) {
  if (!S.clips.length) return toast('Adicione um vídeo primeiro');
  capTab = tab || 'livre';
  // um lugar só para texto: texto livre (camadas) + legendas automáticas (editar, estilo, gerar)
  const tabs = [['livre', 'Texto'], ['texto', 'Legendas'], ['estilo', 'Estilo'], ['gerar', 'Gerar']];
  const head = `<div class="tabs">${tabs.map(([k, l]) => `<button class="tab ${capTab === k ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>`;
  const body = capTab === 'livre' ? freeTextHTML() : capTab === 'texto' ? capTextHTML() : capTab === 'estilo' ? capStyleHTML() : capGenHTML();
  openSheet('captions', 'Texto', head + body, (b) => {
    b.querySelectorAll('[data-tab]').forEach((el) => el.onclick = () => openCaptions(el.dataset.tab));
    if (capTab === 'livre') bindFreeText(b);
    else if (capTab === 'texto') bindCapText(b, focusId);
    else if (capTab === 'estilo') bindCapStyle(b);
    else bindCapGen(b);
  });
}
const textTpl = () => tplById(prefs.textTpl) || tplById(S.cap.tpl) || TEMPLATES[0];
const animSummary = (a, groups = ['in', 'out', 'emph']) => {
  const parts = groups.map((g) => a?.[g] ? animLabel(a[g]) : null).filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Nenhuma';
};
// Escolha de animação (presets do VysmoText): abas Entrada / Saída / Ênfase, busca e prévia ao vivo.
// cfg: { title, get() -> {in,out,emph}, set(obj), groups: ['enter','exit','emphasis'], sample, back() }
let animTab = 'enter', animQuery = '';
function openAnimSheet(cfg) {
  const groups = cfg.groups || ['enter', 'exit', 'emphasis'];
  if (!groups.includes(animTab)) animTab = groups[0];
  const key = { enter: 'in', exit: 'out', emphasis: 'emph' }[animTab];
  const cur = cfg.get()?.[key] || null;
  const q = animQuery.trim().toLowerCase();
  const list = presetsOf(animTab).filter((p) => !q || animLabel(p.n).toLowerCase().includes(q));
  const tabs = groups.length > 1 ? `<div class="tabs">${ANIM_GROUPS.filter(([g]) => groups.includes(g)).map(([g, l]) => `<button class="tab ${animTab === g ? 'on' : ''}" data-ag="${g}">${l}</button>`).join('')}</div>` : '';
  const pr = presetByName(cur);
  openSheet('anim', cfg.title || 'Animação', `
    <button class="btn" id="an-back">${inlineIc('left')} Voltar</button>
    ${tabs}
    <canvas id="an-prev" class="an-prev"></canvas>
    <p class="note" id="an-info">${pr ? `${esc(animLabel(cur))} · ${SPLIT_LABEL[pr.s] || ''}` : 'Sem animação nesta etapa.'}</p>
    <input id="an-q" class="tx-in" type="search" placeholder="Buscar animação (${presetsOf(animTab).length})" value="${esc(animQuery)}">
    <div class="chips an-list">
      <button class="chip ${!cur ? 'on' : ''}" data-an="">Nenhuma</button>
      ${list.map((p) => `<button class="chip ${cur === p.n ? 'on' : ''}" data-an="${p.n}">${esc(animLabel(p.n))}</button>`).join('')}
    </div>
    <p class="note">Animações do VysmoText (licença MIT). Toque para aplicar; a prévia mostra como fica.</p>`,
  (b) => {
    $('#an-back', b).onclick = () => cfg.back?.();
    b.querySelectorAll('[data-ag]').forEach((el) => el.onclick = () => { animTab = el.dataset.ag; animQuery = ''; openAnimSheet(cfg); });
    const qi = $('#an-q', b); let qt = 0;
    qi.addEventListener('input', () => { animQuery = qi.value; clearTimeout(qt); qt = setTimeout(() => { openAnimSheet(cfg); const n = $('#an-q'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 250); });
    let sel = cur;
    b.querySelectorAll('[data-an]').forEach((el) => el.onclick = () => {
      commit(); const a = { ...(cfg.get() || {}) }; a[key] = el.dataset.an || null; cfg.set(a); sel = a[key];
      b.querySelectorAll('[data-an]').forEach((x) => x.classList.toggle('on', x === el));
      const p2 = presetByName(sel); $('#an-info', b).textContent = p2 ? `${animLabel(sel)} · ${SPLIT_LABEL[p2.s] || ''}` : 'Sem animação nesta etapa.';
      t0 = performance.now(); draw(); saveSoon();
    });
    // prévia ao vivo, em loop
    const cv = $('#an-prev', b), dpr = window.devicePixelRatio || 1; let t0 = performance.now();
    const loop = () => {
      if (!cv.isConnected) return;
      const W = cv.clientWidth, H = cv.clientHeight; if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
      const x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.fillStyle = '#16111f'; x.fillRect(0, 0, W, H);
      const fs = H * 0.34; x.font = `800 ${fs}px ${fontCss('Poppins')}`; x.textBaseline = 'middle'; x.fillStyle = '#fff';
      const txt = cfg.sample || 'Seu texto aqui', w = x.measureText(txt).width, pos = [{ text: txt, x: (W - w) / 2, y: H / 2, w }];
      const p = presetByName(sel);
      if (!p) { x.textAlign = 'left'; x.fillText(txt, pos[0].x, pos[0].y); }
      else {
        const sl = splitSlices(x, pos, p.s, fs * 1.2), P = makePlan(p, sl.length, 3);
        const el = performance.now() - t0, cyc = P.dur + 900;
        let t = el % cyc; if (animTab === 'emphasis') t = emphasisTime(P, el % (P.cycle * ((p.r ?? 0) + 1) + 900));
        x.textAlign = 'left';
        sl.forEach((q, i) => { x.save(); if (applyState(x, sliceState(P, i, t), { x: q.x, y: q.y - q.h / 2, w: q.w, h: q.h }, fs / 48, p.p)) x.fillText(q.s, q.x, q.y); x.restore(); });
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
}
function paintPreviews(b) {
  loadTemplateFonts().then(() => requestAnimationFrame(() => {
    b.querySelectorAll('canvas[data-prev-cap]').forEach((cv) => drawPreview(cv, tplById(cv.dataset.prevCap), 'cap'));
    b.querySelectorAll('canvas[data-prev-lay]').forEach((cv) => drawPreview(cv, tplById(cv.dataset.tplid), 'lay', cv.dataset.prevLay));
    b.querySelectorAll('canvas[data-prev-plain]').forEach((cv) => {
      const dpr = window.devicePixelRatio || 1, W = cv.clientWidth || 150, H = cv.clientHeight || 96;
      cv.width = W * dpr; cv.height = H * dpr; const x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0);
      x.fillStyle = '#16111f'; x.fillRect(0, 0, W, H); x.font = `700 ${H * 0.13}px ${fontCss('Poppins')}`; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = 6; x.fillStyle = '#fff'; x.fillText('isso vai mudar tudo', W / 2, H / 2);
    });
  }));
}
function addTemplateText(layoutId, tplId) {
  if (!S.clips.length) return toast('Adicione um vídeo primeiro');
  const lay = layoutById(layoutId), tpl = tplById(tplId) || textTpl(); if (!lay) return;
  const T = total(), start = S.t >= T - 0.3 ? 0 : S.t;
  commit();
  const L = { id: uid(), kind: 'text', name: 'Texto', text: lay.sample, start, in: 0, out: Math.max(0.5, Math.min(3, T - start)),
    x: 0.5, y: 0.4, scale: 1, rot: 0, op: 1, font: S.cap.font, weight: 800, size: 80, color: '#FFFFFF', bg: '', shadow: true, upper: false,
    tpl: tpl.id, layout: lay.id };
  S.layers.push(L); S.sel = { type: 'layer', id: L.id }; refresh();
  loadTemplateFonts().then(draw);
  openTextSheet(L.id, true);
}
// Pontos altos automáticos: pede à Groq (mesma chave da transcrição) as palavras de maior impacto;
// sem chave ou sem resposta, usa uma regra simples (números, exclamações e palavras longas).
async function autoHighlight(btn) {
  const caps = capSpans().map((sp) => sp.cap).filter((c, i, a) => a.indexOf(c) === i && c.text.trim());
  if (!caps.length) return toast('Gere as legendas primeiro');
  const old = btn?.innerHTML; if (btn) { btn.disabled = true; btn.textContent = 'Escolhendo os pontos altos…'; }
  let picks = null;
  if (prefs.groqKey) { try { picks = await groqHighlights(caps.map((c) => stripMarks(c.text))); } catch (e) { console.warn('destaque via Groq falhou', e); } }
  if (!picks) picks = heuristicHighlights(caps.map((c) => stripMarks(c.text)));
  commit();
  let n = 0;
  caps.forEach((c, i) => {
    const plain = stripMarks(c.text), want = picks.get(i);
    if (!want) return; // sem sugestão: mantém o que já estava (inclusive destaques feitos à mão)
    const words = plain.split(/\s+/), norm = (w) => w.toLocaleLowerCase('pt-BR').replace(/[^\p{L}\p{N}]/gu, '');
    const target = want.split(/\s+/).map(norm).filter(Boolean);
    let at = -1;
    for (let j = 0; j + target.length <= words.length; j++) if (target.every((t, k) => norm(words[j + k]) === t)) { at = j; break; }
    if (at < 0) { c.text = plain; return; }
    words[at] = '*' + words[at]; const e = at + target.length - 1;
    words[e] = words[e].replace(/([.,!?…:;]*)$/, '*$1');
    c.text = words.join(' '); n++;
  });
  refresh(); saveSoon();
  if (btn) { btn.disabled = false; btn.innerHTML = old; }
  toast(n ? `${n} pontos altos destacados` : 'Não encontrei pontos altos');
}
function heuristicHighlights(texts) {
  const out = new Map(); let gap = 3;
  texts.forEach((t, i) => {
    gap++; if (gap < 3) return;
    const ws = t.split(/\s+/).map((w) => w.replace(/[^\p{L}\p{N}%$]/gu, '')).filter(Boolean);
    const num = ws.find((w) => /\d/.test(w)), long = [...ws].sort((a, b) => b.length - a.length)[0];
    const pick = num || (/[!?]$/.test(t.trim()) || (long && long.length >= 7) ? long : null);
    if (pick) { out.set(i, pick); gap = 0; }
  });
  return out;
}
async function groqHighlights(texts) {
  const list = texts.map((t, i) => `${i}: ${t}`).join('\n');
  const prompt = `Estas são as legendas de um vídeo curto para Instagram, um bloco por linha (índice: texto).\n${list}\n\nEscolha os pontos altos: em mais ou menos 1 a cada 3 blocos, a palavra (ou no máximo 2 palavras seguidas) de maior impacto, que mereça destaque visual. Copie as palavras exatamente como estão no bloco. Responda só com JSON no formato {"destaques":[{"i":0,"palavras":"..."}]}.`;
  for (const model of ['llama-3.3-70b-versatile', 'openai/gpt-oss-120b']) {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { Authorization: 'Bearer ' + prefs.groqKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, temperature: 0.2, response_format: { type: 'json_object' }, messages: [{ role: 'user', content: prompt }] }) });
    if (!r.ok) continue;
    const j = await r.json(), txt = j.choices?.[0]?.message?.content || '';
    const m = txt.match(/\{[\s\S]*\}/); if (!m) continue;
    const arr = JSON.parse(m[0]).destaques || [];
    const out = new Map(); arr.forEach((d) => { if (Number.isInteger(d.i) && d.i >= 0 && d.i < texts.length && d.palavras) out.set(d.i, String(d.palavras)); });
    if (out.size) return out;
  }
  return null;
}
function freeTextHTML() {
  const list = S.layers.filter((l) => l.kind === 'text').sort((a, b) => a.start - b.start);
  return `
    <button class="btn primary" id="ft-add">${inlineIc('plus')} Adicionar texto no cursor</button>
    <p class="note">Texto livre por cima do vídeo (título, chamada, destaque). Fica numa camada própria e não mexe nas legendas.</p>
    <div class="sec">Textos de modelo</div>
    <div class="chips">${TEMPLATES.map((t) => `<button class="chip ${textTpl().id === t.id ? 'on' : ''}" data-ftpl="${t.id}">${t.name}</button>`).join('')}</div>
    <div class="tpl-grid">${LAYOUTS.map((l) => `<button class="tpl-card" data-lay="${l.id}"><canvas data-prev-lay="${l.id}" data-tplid="${textTpl().id}"></canvas><span>${l.name}</span></button>`).join('')}</div>
    <p class="note">Toque num layout para colocar no cursor. Dentro do texto, *asteriscos* marcam o destaque e cada linha nova vira uma linha do título.</p>
    ${list.length ? `<div class="sec">Textos do vídeo</div>${list.map((l) => `<div class="cap-row" data-ft="${l.id}"><button class="cap-time">${fmt(l.start)}</button><button class="ft-name">${esc(stripMarks(l.text).trim() || 'Texto vazio')}</button></div>`).join('')}` : ''}
    <div class="sec">Legendas automáticas</div>
    <button class="btn" id="ft-gen">${inlineIc('type')} ${S.captions.length ? 'Editar legendas' : 'Gerar legendas automáticas'}</button>
    <p class="note">Transcreve a fala do vídeo e cria as legendas sozinho. O estilo delas fica na aba Estilo.</p>`;
}
function bindFreeText(b) {
  $('#ft-add', b).onclick = () => addTextLayer();
  b.querySelectorAll('[data-ftpl]').forEach((el) => el.onclick = () => { prefs.textTpl = el.dataset.ftpl; savePrefs(); openCaptions('livre'); });
  b.querySelectorAll('[data-lay]').forEach((el) => el.onclick = () => addTemplateText(el.dataset.lay));
  paintPreviews(b);
  $('#ft-gen', b).onclick = () => openCaptions(S.captions.length ? 'texto' : 'gerar');
  b.querySelectorAll('[data-ft]').forEach((row) => row.onclick = () => {
    const L = S.layers.find((x) => x.id === row.dataset.ft); if (!L) return;
    seekTo(L.start + 0.01); select('layer', L.id); openTextSheet(L.id);
  });
}
function capTextHTML() {
  const seen = new Set(), rows = [];
  for (const sp of capSpans()) {
    if (seen.has(sp.cap.id)) continue; seen.add(sp.cap.id);
    rows.push(`<div class="cap-row" data-id="${sp.cap.id}" data-t="${sp.start}">
      <button class="cap-time">${fmt(sp.start)}</button>
      <textarea rows="1">${esc(sp.cap.text)}</textarea>
      <div class="cap-acts">
        <button class="mini" data-act="split" aria-label="Dividir bloco">${ic('scissors')}</button>
        <button class="mini" data-act="merge" aria-label="Juntar com o próximo">${ic('merge')}</button>
        <button class="mini" data-act="del" aria-label="Apagar bloco">${ic('trash')}</button>
      </div></div>`);
  }
  if (!rows.length) return `<p class="note">Ainda não há legendas. Vá em <b>Gerar</b> para transcrever o áudio automaticamente.</p>`;
  return `<p class="note">Toque no tempo para ir até o bloco. ✂ divide, ⤓ junta com o próximo.${tplById(S.cap.tpl) ? ' Coloque *asteriscos* em volta das palavras de destaque.' : ''}</p>` + rows.join('');
}
function bindCapText(b, focusId) {
  const autosize = (ta) => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; };
  b.querySelectorAll('.cap-row').forEach((row) => {
    const id = row.dataset.id, t = parseFloat(row.dataset.t), c = S.captions.find((x) => x.id === id), ta = $('textarea', row);
    autosize(ta);
    let pend = null;
    ta.addEventListener('focus', () => { pend = snap(); seekTo(t + 0.01); b.querySelectorAll('.cap-row').forEach((r) => r.classList.toggle('cur', r === row)); });
    ta.addEventListener('input', () => { c.text = ta.value; autosize(ta); draw(); });
    ta.addEventListener('blur', () => { if (pend && pend !== snap()) pushHist(pend); pend = null; renderTimeline(); });
    $('.cap-time', row).onclick = () => seekTo(t + 0.01);
    row.querySelectorAll('[data-act]').forEach((btn) => btn.onclick = () => {
      const act = btn.dataset.act;
      if (act === 'split') splitCaption(id); else if (act === 'merge') mergeCaption(id);
      else { deleteCaption(id); openCaptions('texto'); }
    });
  });
  if (focusId) { const row = b.querySelector(`.cap-row[data-id="${focusId}"]`); if (row) { row.scrollIntoView({ block: 'center' }); row.classList.add('cur'); } }
}
function capStyleHTML() {
  const c = S.cap, tpl = tplById(c.tpl);
  return `
    <div class="sec">Modelo de legenda</div>
    <div class="tpl-grid">
      <button class="tpl-card ${!tpl ? 'on' : ''}" data-tpl=""><canvas data-prev-plain></canvas><span>Simples</span></button>
      ${TEMPLATES.map((t) => `<button class="tpl-card ${tpl?.id === t.id ? 'on' : ''}" data-tpl="${t.id}"><canvas data-prev-cap="${t.id}"></canvas><span>${t.name}</span></button>`).join('')}
    </div>
    ${tpl ? `<div class="sec">Fonte da fala corrida</div>
    <div class="chips"><button class="chip addfont" data-addfont>${inlineIc('plus')} Adicionar fonte</button><button class="chip ${!c.tfont ? 'on' : ''}" data-tfont="">Do modelo</button>${FONTS.map((f) => `<button class="chip ${c.tfont === f.id ? 'on' : ''}" data-tfont="${esc(f.id)}" style="font-family:${esc(f.css)}">${esc(f.id)}</button>`).join('')}</div>` : ''}
    ${tpl ? capTplColorsHTML(c, tpl) : ''}
    ${tpl ? `<button class="btn" id="cap-anim">${inlineIc('zap')} Entrada das palavras: ${esc(c.anim ? animLabel(c.anim) : 'Padrão do modelo')}</button>` : ''}
    ${tpl ? `<button class="btn primary" id="cap-auto">${inlineIc('zap')} Destacar pontos altos automaticamente</button>
    <p class="note">${esc(tpl.desc)}. A fala corrida sai palavra por palavra na fonte base; nos pontos altos entra a combinação do modelo. Os destaques ficam entre *asteriscos* no texto (aba Legendas): marque ou desmarque à mão quando quiser.${tpl.combo === 'script' ? ' Para a combinação, use duas partes diferentes: *grande* e _manuscrito_ (ex.: conteúdo é *profissão* _mais vida_).' : ''}</p>` : ''}
    ${tpl ? '' : `<div class="sec">Fonte</div>
    <div class="chips">${fontChips(c.font)}</div>
    <div class="sec">Peso</div>
    <div class="chips">${[[400, 'Normal'], [600, 'Médio'], [700, 'Negrito'], [800, 'Extra']].map(([w, l]) => `<button class="chip ${c.weight === w ? 'on' : ''}" data-weight="${w}">${l}</button>`).join('')}</div>
    <div class="sec">Cor</div>
    <div class="chips">${COLORS.map((x) => `<button class="sw ${c.color.toUpperCase() === x ? 'on' : ''}" data-color="${x}" style="background:${x}" aria-label="Cor ${x}"></button>`).join('')}<input type="color" id="cap-color" value="${c.color}" aria-label="Outra cor"></div>`}
    ${rangeRow('size', 'Tamanho', 24, 160, 1, c.size, (v) => v)}
    ${rangeRow('cls', 'Espaço entre letras', -10, 60, 1, c.ls || 0, (v) => v, 0)}
    ${rangeRow('clh', 'Espaço entre linhas', 0.9, 2.4, 0.05, c.lh || 1.2, (v) => (+v).toFixed(2), 1.2)}
    ${rangeRow('y', 'Posição', 8, 92, 1, Math.round(c.y * 100), pctf)}
    <div class="sec">Sombra</div>
    ${rangeRow('shadow', 'Intensidade', 0, 100, 1, c.shadow, pctf)}
    ${rangeRow('blur', 'Desfoque', 0, 40, 1, c.blur, (v) => v)}
    <div class="row"><label>Maiúsculas</label><span class="spacer"></span><input type="checkbox" class="tg" id="cap-upper" ${c.upper ? 'checked' : ''}></div>
    <p class="note">O estilo fica salvo como padrão para os próximos vídeos.</p>`;
}
// Cor do texto / Cor do destaque de um modelo. p = prefixo ('' legenda, 'l' texto de modelo).
function capTplColorsHTML(c, tpl, p = '') {
  const row = (key, label, cur, def) => `<div class="sec">${label}</div>
    <div class="chips"><button class="chip ${!cur ? 'on' : ''}" data-${p}${key}="">Do modelo</button>${TPL_COLORS.map((x) => `<button class="sw ${(cur || '').toUpperCase() === x ? 'on' : ''}" data-${p}${key}="${x}" style="background:${x}" aria-label="${label} ${x}"></button>`).join('')}<input type="color" id="cap-${p}${key}" value="${cur || def}" aria-label="${label}: outra cor"></div>`;
  return row('tcolor', 'Cor do texto', c.tcolor, tpl.base.color) + row('tacc', 'Cor do destaque', c.tacc, tpl.accent);
}
function bindTplColors(b, obj, p = '', after) {
  for (const key of ['tcolor', 'tacc']) {
    const attr = p + key, inp = $('#cap-' + attr, b); let pk = null;
    b.querySelectorAll(`[data-${attr}]`).forEach((el) => el.onclick = () => {
      commit(); const v = el.dataset[attr]; obj[key] = v || null; if (inp && v) inp.value = v;
      b.querySelectorAll(`[data-${attr}]`).forEach((x) => x.classList.toggle('on', x === el)); draw(); after?.();
    });
    if (inp) {
      inp.addEventListener('input', (e) => { if (!pk) pk = snap(); obj[key] = e.target.value.toUpperCase(); b.querySelectorAll(`[data-${attr}]`).forEach((x) => x.classList.remove('on')); draw(); });
      inp.addEventListener('change', () => { if (pk) pushHist(pk); pk = null; after?.(); });
    }
  }
}
function bindCapStyle(b) {
  const c = S.cap;
  const pick = (attr, fn) => b.querySelectorAll(`[data-${attr}]`).forEach((el) => el.onclick = () => {
    commit(); fn(el.dataset[attr]); b.querySelectorAll(`[data-${attr}]`).forEach((x) => x.classList.toggle('on', x === el)); draw();
  });
  pick('font', (v) => { c.font = v; document.fonts.load(`${c.weight} 40px ${fontCss(v)}`).then(draw); });
  pick('tfont', (v) => { c.tfont = v || null; savePrefs(); if (v) document.fonts.load(`700 40px ${fontCss(v)}`).then(draw); });
  bindAddFont(b, (id) => { commit(); if (tplById(c.tpl)) c.tfont = id; else c.font = id; savePrefs(); openCaptions('estilo'); document.fonts.load(`${c.weight} 40px ${fontCss(id)}`).then(draw); });
  pick('weight', (v) => { c.weight = +v; document.fonts.load(`${c.weight} 40px ${fontCss(c.font)}`).then(draw); });
  pick('color', (v) => { c.color = v; $('#cap-color', b).value = v; });
  let pend = null;
  const cc = $('#cap-color', b);
  if (cc) {
    cc.addEventListener('input', (e) => { if (!pend) pend = snap(); c.color = e.target.value.toUpperCase(); b.querySelectorAll('[data-color]').forEach((x) => x.classList.remove('on')); draw(); });
    cc.addEventListener('change', () => { if (pend) pushHist(pend); pend = null; });
  }
  bindTplColors(b, c, '', savePrefs);
  b.querySelectorAll('[data-tpl]').forEach((el) => el.onclick = () => { commit(); c.tpl = el.dataset.tpl || null; savePrefs(); loadTemplateFonts().then(draw); openCaptions('estilo'); });
  const au = $('#cap-auto', b); if (au) au.onclick = () => autoHighlight(au);
  const ca = $('#cap-anim', b);
  if (ca) ca.onclick = () => openAnimSheet({ title: 'Entrada das palavras', groups: ['enter'], sample: 'isso muda tudo', get: () => ({ in: c.anim || null }), set: (a) => { c.anim = a.in || null; savePrefs(); }, back: () => openCaptions('estilo') });
  paintPreviews(b);
  $('#cap-upper', b).addEventListener('change', (e) => { commit(); c.upper = e.target.checked; draw(); });
  bindRanges(b, {
    size: { set: (v) => (c.size = v), fmt: (v) => v },
    cls: { set: (v) => (c.ls = v), fmt: (v) => v },
    clh: { set: (v) => (c.lh = v), fmt: (v) => (+v).toFixed(2) },
    y: { set: (v) => (c.y = v / 100), fmt: pctf },
    shadow: { set: (v) => (c.shadow = v), fmt: pctf },
    blur: { set: (v) => (c.blur = v), fmt: (v) => v },
  });
  ensureCaptionVisible();
}
function ensureCaptionVisible() {
  // Se o cursor não está sobre uma legenda, pula para a primeira para ver o estilo
  const r = clipAt(S.t); if (captionAt(S.t, r)) return;
  const sp = capSpans()[0]; if (sp) seekTo(sp.start + 0.01);
}
// Transcrição padrão para todos: pelo servidor do Meu Editor (Groq, Whisper large v3). Ninguém precisa de chave.
function capGenHTML() {
  return `
    <p class="note">Transcreve a fala com o modelo mais preciso (Whisper large v3), 4 palavras por bloco. Só a voz sai do aparelho, nunca o vídeo.</p>
    <button class="btn primary" id="gen">Gerar legendas</button>
    <div class="progress"><div id="gen-bar"></div></div><p class="note" id="gen-st"></p>`;
}
function bindCapGen(b) {
  const st = (msg, pct) => { const e = $('#gen-st'); if (e) e.textContent = msg; if (pct != null) { const bar = $('#gen-bar'); if (bar) bar.style.width = pct + '%'; } };
  const run = async (btn) => {
    btn.disabled = true;
    try { await transcribeAll(st); st('Pronto! Confira e edite o texto na aba Texto.', 100); setTimeout(() => sheetKind === 'captions' && openCaptions('texto'), 900); }
    catch (e) {
      console.error(e);
      if (e.precisaChave) { st('As legendas automáticas estão em manutenção. Tente de novo em alguns minutos.', 0); return; }
      if (/^cancelado/.test(e.message)) { st(e.message[0].toUpperCase() + e.message.slice(1) + '.', 0); return; }
      if (/401|invalid_api_key/i.test(e.message) && prefs.groqKey) { prefs.groqKey = ''; savePrefs(); }
      st('Erro: ' + e.message, 0);
    } finally { btn.disabled = false; }
  };
  const gen = $('#gen', b); if (gen) gen.onclick = (e) => run(e.currentTarget);
}
const MAX_WORDS = 4;
function buildCaptions(mediaId, words, maxW = MAX_WORDS) {
  const blocks = []; let cur = [];
  const flush = () => { if (cur.length) blocks.push(cur); cur = []; };
  for (const w of words) {
    const prev = cur[cur.length - 1];
    if (prev && (cur.length >= maxW || w.start - prev.end > 0.7 || /[.!?…]$/.test(prev.text))) flush();
    cur.push(w);
  }
  flush();
  return blocks.map((bw, i) => {
    const next = blocks[i + 1];
    let end = bw[bw.length - 1].end + 0.3; // segura a legenda um pouco depois da última palavra
    if (next) end = Math.min(end, next[0].start);
    return { id: uid(), mediaId, start: bw[0].start, end: Math.max(end, bw[0].start + 0.2), text: bw.map((w) => w.text).join(' ') };
  });
}
async function to16k(buf) {
  const len = Math.ceil(buf.duration * 16000);
  const oc = new OfflineAudioContext(1, len, 16000);
  const src = oc.createBufferSource(); src.buffer = buf; src.connect(oc.destination); src.start();
  const r = await oc.startRendering();
  return new Float32Array(r.getChannelData(0));
}
const NOISE_TAG = /[\(\[][^\)\]]*[\)\]]/g; // marcações que o Whisper inventa: (música), [Aplausos]…
function chunksToWords(chunks, maxT) {
  const out = [];
  for (const ch of chunks || []) {
    const text = (ch.text || '').replace(NOISE_TAG, '').trim(); if (!text) continue;
    let [s, e] = ch.timestamp || [0, 0];
    if (s == null) s = out.length ? out[out.length - 1].end : 0;
    if (e == null) e = Math.min(maxT || s + 2, s + 2);
    const parts = text.split(/\s+/), totalLen = parts.join('').length || 1;
    let t = s;
    for (const p of parts) { const d = (e - s) * (p.length / totalLen); out.push({ text: p, start: t, end: t + d }); t += d; }
  }
  return out;
}
function encodeWav(pcm, sr) {
  const buf = new ArrayBuffer(44 + pcm.length * 2), v = new DataView(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + pcm.length * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true);
  v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, pcm.length * 2, true);
  for (let i = 0; i < pcm.length; i++) v.setInt16(44 + i * 2, clamp(pcm[i], -1, 1) * 0x7fff, true);
  return buf;
}
// Transcrição: sempre pelo servidor do Meu Editor (o comprador não precisa de chave nenhuma).
// Uma chave própria antiga, salva neste aparelho, só é usada se o servidor estiver fora do ar.
let servidorLegenda = true;
async function groqTranscribe(pcm, key) {
  const wav = new Blob([encodeWav(pcm, 16000)], { type: 'audio/wav' });
  let j = null;
  if (servidorLegenda) {
    const fd = new FormData(); fd.append('file', wav, 'audio.wav'); fd.append('language', 'pt');
    try { j = await (await sbReq('/functions/v1/transcrever', { method: 'POST', body: fd })).json(); }
    catch (e) {
      if (e.codigo === 'transcricao_em_configuracao' || e.status === 404) { if (!key) { const er = new Error('precisa_chave'); er.precisaChave = true; throw er; } }
      else if (e.status) throw new Error(e.message);
      else throw new Error('sem conexão com a internet');
    }
  }
  if (!j) {
    if (!key) { const e = new Error('precisa_chave'); e.precisaChave = true; throw e; }
    const fd = new FormData();
    fd.append('file', wav, 'audio.wav');
    fd.append('model', 'whisper-large-v3'); fd.append('language', 'pt'); fd.append('response_format', 'verbose_json');
    fd.append('timestamp_granularities[]', 'word'); fd.append('timestamp_granularities[]', 'segment');
    let r;
    try { r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: 'Bearer ' + key }, body: fd }); }
    catch { throw new Error('sem conexão com a internet'); }
    if (r.status === 429) throw new Error('limite gratuito da Groq atingido; tente de novo em alguns minutos');
    if (!r.ok) throw new Error('Groq respondeu ' + r.status + ': ' + (await r.text()).slice(0, 160));
    j = await r.json();
  }
  const words = (j.words || []).map((w) => ({ text: String(w.word).replace(NOISE_TAG, '').trim(), start: w.start, end: w.end })).filter((w) => w.text);
  if (!words.length) return chunksToWords((j.segments || []).map((s) => ({ text: s.text, timestamp: [s.start, s.end] })));
  // os tempos vêm por palavra, mas a pontuação e as maiúsculas vêm no texto de cada frase: junta os dois
  const used = new Set();
  for (const sg of j.segments || []) {
    const toks = String(sg.text).replace(NOISE_TAG, '').trim().split(/\s+/).filter(Boolean);
    const inSeg = words.filter((w) => !used.has(w) && w.start >= sg.start - 0.05 && w.start < sg.end + 0.05);
    if (toks.length && toks.length === inSeg.length) inSeg.forEach((w, i) => { w.text = toks[i]; used.add(w); });
  }
  return words;
}
async function transcribeAll(st) {
  const ids = [...new Set(S.clips.map((c) => c.mediaId))].filter((id) => media.get(id)?.bufferId);
  if (!ids.length) throw new Error('os vídeos não têm áudio');
  // nunca apaga legenda editada sem perguntar
  const editadas = S.captions.filter((c) => ids.includes(c.mediaId)).length;
  if (editadas && !confirm(`Gerar de novo troca as ${editadas} legendas atuais (e o que você editou nelas). Continuar?`)) throw new Error('cancelado: suas legendas continuam como estavam');
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i], tag = ids.length > 1 ? ` (vídeo ${i + 1}/${ids.length})` : '';
    st('Preparando áudio' + tag + '…', 5 + (90 * i) / ids.length);
    const pcm = await to16k(buffers.get(media.get(id).bufferId).buffer);
    st('Transcrevendo' + tag + '…', 15 + (90 * i) / ids.length);
    S.words[id] = await groqTranscribe(pcm, prefs.groqKey);
  }
  commit();
  S.captions = S.captions.filter((c) => !ids.includes(c.mediaId));
  for (const id of ids) S.captions.push(...buildCaptions(id, S.words[id]));
  if (!S.captions.length) throw new Error('não encontrei fala no áudio');
  refresh(); saveSoon();
}

// ---------- Ajuste de cor (brilho, contraste, saturação, matiz verde↔roxo) via WebGL ----------
function hasColor(c) { return !!c && !!(c.b || c.c || c.s || c.h); }
var glPool = new Map();
const VS = 'attribute vec2 p;uniform vec4 rect;varying vec2 uv;void main(){uv=p;vec2 q=rect.xy+p*rect.zw;gl_Position=vec4(q.x*2.0-1.0,1.0-q.y*2.0,0.0,1.0);}';
const FS = `precision mediump float;varying vec2 uv;uniform sampler2D tex;uniform vec4 adj;
void main(){
  vec3 c=texture2D(tex,uv).rgb;
  c=pow(max(c,vec3(0.0)),vec3(exp2(-adj.x*0.9)));
  float k=adj.y>=0.0?1.0+adj.y:1.0+adj.y*0.75;
  c=(c-0.5)*k+0.5;
  float l=dot(c,vec3(0.2126,0.7152,0.0722));
  c=mix(vec3(l),c,1.0+adj.z);
  c+=adj.w*vec3(0.08,-0.12,0.11);
  gl_FragColor=vec4(clamp(c,0.0,1.0),1.0);
}`;
function glFor(W, H) {
  const key = W + 'x' + H;
  if (glPool.has(key)) return glPool.get(key);
  let g = null;
  try {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const gl = cv.getContext('webgl', { alpha: false, premultipliedAlpha: false, preserveDrawingBuffer: true, antialias: false });
    if (gl) {
      const sh = (type, src) => { const o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
      const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
      gl.useProgram(pr);
      const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
      const ap = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(ap); gl.vertexAttribPointer(ap, 2, gl.FLOAT, false, 0, 0);
      const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
      [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]].forEach(([a, b]) => gl.texParameteri(gl.TEXTURE_2D, a, b));
      g = { gl, cv, uRect: gl.getUniformLocation(pr, 'rect'), uAdj: gl.getUniformLocation(pr, 'adj') };
    }
  } catch (e) { console.warn('ajuste de cor indisponível', e); g = null; }
  if (glPool.size >= 3) glPool.clear();
  glPool.set(key, g);
  return g;
}
// desenha `src` (vídeo ou o próprio canvas) no retângulo x,y,w,h com a cor ajustada; substitui o canvas inteiro
function colorPass(ctx, W, H, src, x, y, w, h, col) {
  const g = glFor(W, H); if (!g) return false;
  const { gl, cv } = g;
  try {
    gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.uniform4f(g.uRect, x / W, y / H, w / W, h / H);
    gl.uniform4f(g.uAdj, (col.b || 0) / 100, (col.c || 0) / 100, (col.s || 0) / 100, (col.h || 0) / 100);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    ctx.drawImage(cv, 0, 0, W, H);
    return true;
  } catch (e) { console.warn(e); return false; }
}
function addAdjustLayer() {
  if (!S.clips.length) return toast('Adicione um vídeo primeiro');
  const T = total(), start = S.t >= T - 0.3 ? 0 : S.t;
  commit();
  const L = { id: uid(), kind: 'adjust', name: 'Ajuste', start, in: 0, out: Math.max(0.5, T - start), color: { b: 0, c: 0, s: 0, h: 0 } };
  S.layers.push(L); S.sel = { type: 'layer', id: L.id }; refresh();
  openColor('layer', L.id);
}
function openColor(kind, id) {
  const tg = kind === 'clip' ? S.clips.find((c) => c.id === id) : S.layers.find((l) => l.id === id);
  if (!tg) return;
  if (!tg.color) tg.color = { b: 0, c: 0, s: 0, h: 0 };
  const col = tg.color, sg = (v) => (v > 0 ? '+' : '') + Math.round(v);
  const tint = (v) => (v < 0 ? 'verde ' : v > 0 ? 'roxo ' : '') + sg(v);
  openSheet('color', kind === 'clip' ? 'Ajustes do clipe' : 'Camada de ajuste', `
    ${rangeRow('cb', 'Brilho', -100, 100, 1, col.b || 0, sg, 0)}
    ${rangeRow('cc', 'Contraste', -100, 100, 1, col.c || 0, sg, 0)}
    ${rangeRow('cs', 'Saturação', -100, 100, 1, col.s || 0, sg, 0)}
    ${rangeRow('ch', 'Matiz', -100, 100, 1, col.h || 0, tint, 0)}
    <div class="tintbar"><span>verde</span><span>roxo</span></div>
    <div class="chips"><button class="chip" id="c-reset">Zerar ajustes</button></div>
    <p class="note">Toque duas vezes num controle para voltar a zero. ${kind === 'clip' ? 'Vale só para este clipe.' : 'Vale para tudo abaixo dela (vídeo e camadas), no trecho que ela ocupa na linha do tempo. A legenda não muda.'}</p>`,
  (b) => {
    bindRanges(b, {
      cb: { set: (v) => (col.b = v), fmt: sg }, cc: { set: (v) => (col.c = v), fmt: sg },
      cs: { set: (v) => (col.s = v), fmt: sg }, ch: { set: (v) => (col.h = v), fmt: tint },
    });
    $('#c-reset', b).onclick = () => { commit(); Object.assign(col, { b: 0, c: 0, s: 0, h: 0 }); refresh(); openColor(kind, id); };
  });
}

// ---------- Exportação quadro a quadro (WebCodecs): sem travadas, mesmo se o aparelho for lento ----------
let muxP = null;
function loadMuxer() {
  return muxP || (muxP = new Promise((res, rej) => {
    if (window.Mp4Muxer) return res(window.Mp4Muxer);
    const s = document.createElement('script'); s.src = 'vendor/mp4-muxer.min.js';
    s.onload = () => res(window.Mp4Muxer); s.onerror = () => { muxP = null; rej(new Error('não carregou o gravador MP4')); };
    document.head.appendChild(s);
  }));
}
async function pickCodecs(W, H, vbr) {
  if (!window.VideoEncoder || !window.VideoFrame || !('requestVideoFrameCallback' in HTMLVideoElement.prototype)) return null;
  const big = W * H > 1920 * 1088;
  const vlist = big ? ['avc1.640033', 'avc1.4d0033', 'avc1.420033', 'avc1.640034'] : ['avc1.640028', 'avc1.4d0028', 'avc1.42002a', 'avc1.640033'];
  let vcfg = null;
  for (const codec of vlist) {
    const c = { codec, width: W, height: H, bitrate: vbr, framerate: 30, avc: { format: 'avc' } };
    try { if ((await VideoEncoder.isConfigSupported(c)).supported) { vcfg = c; break; } } catch {}
  }
  if (!vcfg) return null;
  return { vcfg };
}
async function renderMixdown(T, sr) {
  ac(); await actx.resume().catch(() => {});
  // garante que os sons das transições já estão carregados
  for (let k = 0; k < 40 && cuts().some((c) => !transSound(c.type)); k++) await new Promise((r) => setTimeout(r, 50));
  await prepareSpeeds();
  const off = new OfflineAudioContext(2, Math.max(1, Math.ceil(T * sr)), sr);
  scheduleAudio(0, off.destination, off);
  return off.startRendering();
}
function expLog(o) {
  try { const cur = JSON.parse(localStorage.getItem('corte-exp') || '{}'); localStorage.setItem('corte-exp', JSON.stringify({ ...cur, ...o, at: Date.now() })); } catch {}
}
function lastExportProblem() {
  try {
    const x = JSON.parse(localStorage.getItem('corte-exp') || 'null'); if (!x || x.stage === 'pronto' || x.stage === 'erro-mostrado') return '';
    return `A última exportação parou (etapa: ${x.stage}${x.pct != null ? ', ' + x.pct + '%' : ''}${x.mode ? ', modo ' + x.mode : ''}${x.mb != null ? ', ' + x.mb + ' MB' : ''}${x.err ? ', erro: ' + x.err : ''}; ${x.res || ''} ${x.codec || ''}, ${x.dur || '?'}s).`;
  } catch { return ''; }
}
async function exportFrames(res, codecs) {
  const FPS = 30, T = total(), [W, H] = outSize(res), ex = E.exp;
  const Mux = await loadMuxer();
  // 1) áudio: mixagem completa fora do tempo real, convertida em AAC e conferida (tem que ter som)
  expLog({ stage: 'audio', res, codec: codecs.vcfg.codec, dur: Math.round(T), audio: '', why: '' });
  $('#exp-st').textContent = 'Preparando o áudio…';
  const aud = await buildExportAudio(T);
  if (ex.cancelled) return null;
  // grava o arquivo em pedaços (sem juntar tudo na memória no final — o iPhone fecha a página se a memória estourar)
  const parts = []; let written = 0;
  const target = new Mux.StreamTarget({
    chunked: true, chunkSize: 4 * 1024 * 1024,
    onData: (data, pos) => {
      if (pos === written) { parts.push({ pos, d: data.slice() }); written += data.byteLength; return; }
      // reescrita de um trecho já gravado (cabeçalho do arquivo)
      for (const p of parts) {
        const a = Math.max(pos, p.pos), b = Math.min(pos + data.byteLength, p.pos + p.d.byteLength);
        if (a < b) p.d.set(data.subarray(a - pos, b - pos), a - p.pos);
      }
      if (pos + data.byteLength > written) { const extra = data.subarray(written - pos); parts.push({ pos: written, d: extra.slice() }); written += extra.byteLength; }
    },
  });
  const muxer = new Mux.Muxer({ target, fastStart: false, firstTimestampBehavior: 'offset',
    video: { codec: 'avc', width: W, height: H, frameRate: FPS }, audio: { codec: 'aac', numberOfChannels: aud.ch, sampleRate: aud.sr } });
  let encErr = null;
  const venc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => (encErr = e) });
  venc.configure(codecs.vcfg);
  {
    const fd = Math.round(1024 / aud.sr * 1e6), meta = { decoderConfig: { codec: 'mp4a.40.2', sampleRate: aud.sr, numberOfChannels: aud.ch, description: aud.asc } };
    aud.frames.forEach((d, i) => muxer.addAudioChunkRaw(d, 'key', Math.round(i * 1024 / aud.sr * 1e6), fd, i === 0 ? meta : undefined));
    aud.frames = null;
  }

  // 2) vídeo: cada quadro do clipe é desenhado e gravado com o tempo exato
  const cv = ex.cv, cx = ex.cx, L = layout(), total_frames = Math.max(1, Math.round(T * FPS));
  let k = 0, rate = 1, dupHits = 0, seekMode = false;
  const seekVid = (v, s) => new Promise((ok) => {
    if (Math.abs(v.currentTime - s) < 0.001 && !v.seeking) return ok();
    const to = setTimeout(fin, 4000);
    function fin() { clearTimeout(to); v.removeEventListener('seeked', fin); ok(); }
    v.addEventListener('seeked', fin); v.currentTime = s;
  });
  // camadas de vídeo: antes de gravar cada quadro, a camada é levada (e esperada) até o quadro exato.
  // Sem isso, um vídeo pesado (4K/HEVC do iPhone) não acompanha e a camada congela ou pisca no arquivo final.
  const waitFrame = (v) => new Promise((ok) => {
    if (v.readyState >= 2 && !v.seeking) return ok();
    const to = setTimeout(fin, 3000);
    function fin() { clearTimeout(to); v.removeEventListener('loadeddata', fin); v.removeEventListener('canplay', fin); v.removeEventListener('seeked', fin); ok(); }
    v.addEventListener('loadeddata', fin); v.addEventListener('canplay', fin); v.addEventListener('seeked', fin);
  });
  const layerActive = (L, t) => t >= L.start && t < L.start + L.out - L.in;
  const layersAt = (t) => {
    let ps = null;
    for (const L of S.layers) {
      if (L.kind !== 'video') continue;
      const v = layerVideo(L); if (!v) continue;
      if (!v.paused) v.pause();
      if (!layerActive(L, t)) continue;
      const len = L.out - L.in, s = L.in + clamp(t - L.start, 0, Math.max(0, len - 0.02));
      if (!v.seeking && v.readyState >= 2 && Math.abs(v.currentTime - s) < 0.25 / FPS) continue;
      (ps ||= []).push(seekVid(v, s).then(() => waitFrame(v)));
    }
    return ps && Promise.all(ps);
  };
  const clipHasLayer = (r) => S.layers.some((L) => L.kind === 'video' && L.start < r.end && L.start + L.out - L.in > r.start);
  E.rate = 1;
  const progress = () => {
    const pct = Math.min(99, Math.round(100 * k / total_frames));
    if (k % 30 === 0) expLog({ stage: 'video', pct, mode: seekMode ? 'quadro a quadro' : 'tocando', rate, mb: Math.round(written / 1048576) }); const bar = $('#exp-bar'); if (bar) bar.style.width = pct + '%';
    const lab = $('#exp-st'); if (lab) lab.textContent = `Exportando… ${pct}%`;
  };
  const emitUpTo = async (tl, r, v) => {
    // grava todos os quadros da grade de 30 fps até o tempo tl, usando o quadro atual do vídeo
    let n = 0;
    while (k < total_frames && k / FPS <= tl + 1e-4) {
      const t = k / FPS; S.t = t;
      const lw = layersAt(t); if (lw) await lw;
      renderFrame(cx, W, H, t, r, v);
      const fr = new VideoFrame(cv, { timestamp: Math.round(t * 1e6), duration: Math.round(1e6 / FPS) });
      venc.encode(fr, { keyFrame: k % (FPS * 2) === 0 }); fr.close();
      if (k % 6 === 0) { pctx.drawImage(cv, 0, 0, pv.width, pv.height); progress(); }
      k++; n++;
    }
    return n;
  };
  const drain = async () => { while (venc.encodeQueueSize > 3) await new Promise((r) => setTimeout(r, 8)); };
  pool.forEach((v) => { v.pause(); v._clipId = null; }); activeV = null;

  for (let ci = 0; ci < L.length && !ex.cancelled; ci++) {
    const r = L[ci], c = r.clip;
    const still = stills.get(c.mediaId);
    if (still) {
      // foto: o mesmo quadro, gravado em partes para não lotar o codificador
      still._clipId = c.id; activeV = still;
      const nr = L[ci + 1];
      if (nr && !stills.has(nr.clip.mediaId)) { const o = pool[0]; o.pause(); assign(o, nr.clip, nr.clip.in); }
      while (k < total_frames && k / FPS < r.end - 1e-3 && !ex.cancelled && !encErr) { await emitUpTo(Math.min(r.end - 1e-3, k / FPS + 0.5), r, still); await drain(); }
      if (encErr) throw encErr;
      continue;
    }
    let v = pool.find((x) => x._clipId === c.id) || pool.find((x) => x !== activeV) || pool[0];
    if (v._clipId !== c.id) assign(v, c, c.in);
    activeV = v; v.pause();
    for (let w = 0; w < 200 && (v._pending != null || v.readyState < 1); w++) await new Promise((ok) => setTimeout(ok, 25));
    // pré-carrega o próximo clipe no outro player
    const nr = L[ci + 1], other = pool.find((x) => x !== v);
    if (nr) { other.pause(); assign(other, nr.clip, nr.clip.in); }
    const srcT = (kk) => Math.min(c.out - 0.001, Math.max(c.in, srcAt(r, kk / FPS)));
    const lastK = () => k >= total_frames || k / FPS >= r.end - 1e-3;
    let gaps = 0;
    while (!lastK() && !ex.cancelled && !encErr) {
      // quadro exato por busca (seek)
      E.stalled = true; v.pause();
      await seekVid(v, srcT(k));
      await emitUpTo(k / FPS, r, v); await drain();
      if (seekMode || lastK() || clipHasLayer(r)) continue; // com camada de vídeo: sempre quadro a quadro
      // depois, tenta tocar e capturar cada quadro novo (mais rápido). Se perder algum quadro, volta para a busca.
      const res = await new Promise((done) => {
        let fin = false, lastCb = performance.now();
        const end = (why) => { if (fin) return; fin = true; clearInterval(watch); v.pause(); done(why); };
        const onFrame = (now, meta) => {
          if (fin) return;
          lastCb = performance.now();
          const mt = meta.mediaTime;
          if (srcT(k) < mt - 1 / FPS - 0.004) return end('gap'); // pulou quadro: refaz por busca
          while (!lastK() && srcT(k) <= mt + 0.5 / FPS) emitUpTo(k / FPS, r, v);
          if (encErr || ex.cancelled || lastK()) return end('done');
          if (venc.encodeQueueSize > 3) { v.pause(); drain().then(() => { if (!fin) { v.play().catch(() => {}); v.requestVideoFrameCallback(onFrame); } }); return; }
          v.requestVideoFrameCallback(onFrame);
        };
        v.requestVideoFrameCallback(onFrame);
        v.onended = () => end('done');
        const watch = setInterval(() => {
          if (ex.cancelled || encErr) return end('done');
          if (performance.now() - lastCb > 1200 && venc.encodeQueueSize <= 3) end('stall');
        }, 250);
        E.stalled = false; v.playbackRate = rate * spd(c); E.rate = rate; v.play().catch(() => end('stall'));
      });
      v.onended = null;
      if (res === 'gap') { if (++gaps >= 6) seekMode = true; else { rate = Math.max(0.25, rate * 0.75); } }
      else if (res === 'stall') seekMode = true;
      await drain();
    }
    E.stalled = false;
    if (encErr) throw encErr;
  }
  E.rate = 1; pool.forEach((v) => { v.pause(); v.playbackRate = 1; });
  for (const [, lv] of layerEls) { lv.pause(); lv.playbackRate = 1; }
  if (ex.cancelled) { try { venc.close(); } catch {} return null; }
  if (k < total_frames) { const lr = L[L.length - 1]; await emitUpTo(T, lr, activeV); }
  await venc.flush(); muxer.finalize();
  venc.close();
  expLog({ stage: 'pronto' });
  return new Blob(parts.map((p) => p.d), { type: 'video/mp4' });
}

// ---------- Exportação ----------
function pickMime() {
  const opts = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'];
  return opts.find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';
}
let lastExport = null;
// taxa de bits do vídeo (bits/s): Leve deixa o arquivo bem menor, Máxima guarda mais detalhe
const BITRATES = { '1080': { leve: 4_000_000, normal: 10_000_000, max: 20_000_000 }, '4k': { leve: 12_000_000, normal: 30_000_000, max: 50_000_000 } };
const expBr = () => (BITRATES[prefs.res || '1080'] || BITRATES['1080'])[prefs.br || 'normal'] || 10_000_000;
function expTamanho() {
  const mb = total() * (expBr() + 192_000) / 8 / 1e6;
  return `${(expBr() / 1e6).toLocaleString('pt-BR')} Mbps · cerca de ${mb < 10 ? mb.toFixed(1).replace('.', ',') : Math.round(mb)} MB`;
}
function openExport() {
  if (!S.clips.length) return toast('Adicione um vídeo primeiro');
  if (E.playing) pause();
  const res = prefs.res || '1080';
  openSheet('export', 'Exportar', `
    <div class="chips">
      <button class="chip ${res === '1080' ? 'on' : ''}" data-res="1080">Full HD (1080p)</button>
      <button class="chip ${res === '4k' ? 'on' : ''}" data-res="4k">4K</button>
    </div>
    <p class="note" style="margin:14px 0 6px">Taxa de bits (tamanho do arquivo)</p>
    <div class="chips">
      ${[['leve', 'Leve'], ['normal', 'Normal'], ['max', 'Máxima']].map(([k, t]) => `<button class="chip ${(prefs.br || 'normal') === k ? 'on' : ''}" data-br="${k}">${t}</button>`).join('')}
    </div>
    <p class="note" id="exp-tam">${expTamanho()}</p>
    <div id="exp-run" style="display:none"><div class="progress"><div id="exp-bar"></div></div><p class="note" id="exp-st"></p></div>
    <button class="btn primary" id="exp-btn">Exportar vídeo</button>
  `, (b) => {
    b.querySelectorAll('[data-res]').forEach((el) => el.onclick = () => {
      if (E.exporting) return;
      prefs.res = el.dataset.res; savePrefs(); b.querySelectorAll('[data-res]').forEach((x) => x.classList.toggle('on', x === el)); expUI();
    });
    b.querySelectorAll('[data-br]').forEach((el) => el.onclick = () => {
      if (E.exporting) return;
      prefs.br = el.dataset.br; savePrefs(); b.querySelectorAll('[data-br]').forEach((x) => x.classList.toggle('on', x === el)); expUI();
    });
    // um único botão: Exportar vídeo → Cancelar (exportando) → Baixar (pronto)
    $('#exp-btn', b).onclick = () => {
      const st = expState();
      if (st === 'run') cancelExport();
      else if (st === 'done') saveExport(lastExport);
      else { expLog({ stage: 'erro-mostrado' }); startExport(prefs.res || '1080'); }
    };
    expUI();
  });
}
const expSig = () => snap() + '|' + (prefs.res || '1080') + '|' + (prefs.br || 'normal');
function expState() { return E.exporting ? 'run' : lastExport && lastExport.sig === expSig() ? 'done' : 'idle'; }
function expUI(st = expState()) {
  const btn = $('#exp-btn'), run = $('#exp-run'); if (!btn) return;
  btn.textContent = st === 'run' ? 'Cancelar' : st === 'done' ? 'Baixar' : 'Exportar vídeo';
  btn.classList.toggle('primary', st !== 'run');
  run.style.display = st === 'run' ? 'block' : 'none';
  const tam = $('#exp-tam'); if (tam) tam.textContent = expTamanho();
}
async function startExport(res) {
  const mime = pickMime();
  if (!mime || !HTMLCanvasElement.prototype.captureStream) { expFalhou('este navegador não consegue exportar vídeo'); return toast('Este navegador não consegue exportar vídeo', 3000); }
  E.expSig = expSig(); E.exporting = true; expUI('run');
  $('#exp-st').textContent = 'Preparando…'; $('#exp-bar').style.width = '0%';
  await ensureFonts();
  const [W, H] = outSize(res);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const cx = cv.getContext('2d'); cx.fillStyle = '#000'; cx.fillRect(0, 0, W, H);
  // sem um clique na página o Chrome não libera o áudio e resume() nunca termina: não espera para sempre
  ac(); await Promise.race([actx.resume(), new Promise((r) => setTimeout(r, 1500))]);
  const vbr = (BITRATES[res] || BITRATES['1080'])[prefs.br || 'normal'] || 10_000_000;
  const codecs = await pickCodecs(W, H, vbr);
  if (!codecs && actx.state !== 'running') {
    E.exporting = false; expUI(); expFalhou('o Chrome bloqueou o áudio: clique uma vez na página e exporte de novo');
    return toast('Clique uma vez na página e exporte de novo', 3500);
  }
  if (codecs) {
    const ex = { cv, cx, W, H, mime: 'video/mp4', res, cancelled: false, frames: true };
    E.exporting = true; E.exp = ex; E.playing = true; E.stalled = false; updPlay();
    try { E.wake = await navigator.wakeLock?.request('screen'); } catch {}
    let blob = null, err = null;
    try { blob = await exportFrames(res, codecs); } catch (e) { err = e; console.error('exportação', e); expLog({ stage: 'erro', err: String(e.message || e).slice(0, 120) }); }
    E.playing = false; E.exporting = false; E.exp = null; E.rate = 1; updPlay();
    try { E.wake?.release(); } catch {}
    if (ex.cancelled || !blob) {
      expFalhou(err || 'exportação cancelada');
      expUI();
      if (err) toast('Não consegui exportar: ' + (err.message || err), 4000);
      draw(); return;
    }
    exportReady(blob, 'video/mp4'); draw(); return;
  }
  const dest = actx.createMediaStreamDestination();
  const stream = new MediaStream([...cv.captureStream(30).getVideoTracks(), ...dest.stream.getAudioTracks()]);
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: Math.round(vbr * 1.4), audioBitsPerSecond: 192_000 });
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  try { E.wake = await navigator.wakeLock?.request('screen'); } catch {}
  E.exporting = true; E.exp = { cv, cx, W, H, rec, chunks, mime, res, cancelled: false }; E.rec = rec;
  S.t = 0; activeV = null; pool.forEach((v) => { v._clipId = null; });
  // espera o primeiro quadro
  for (let k = 0; k < 100 && !isReady(syncVideos(0)); k++) await new Promise((r) => setTimeout(r, 50));
  render(cx, W, H, 0, syncVideos(0));
  rec.start(1000);
  E.sched = scheduleAudio(0, dest);
  E.playing = true; E.stalled = false; updPlay(); loop();
}
function finishExport() {
  const ex = E.exp; if (!ex) return;
  E.playing = false; cancelAnimationFrame(E.raf); stopSched(); pool.forEach((v) => v.pause());
  if (actx.state === 'suspended') actx.resume();
  setTimeout(() => {
    ex.rec.onstop = () => {
      E.exporting = false; E.exp = null; E.rec = null; updPlay();
      try { E.wake?.release(); } catch {}
      if (ex.cancelled) { expFalhou('exportação cancelada'); expUI(); return; }
      const type = ex.mime.split(';')[0];
      exportReady(new Blob(ex.chunks, { type }), type);
    };
    ex.rec.stop();
  }, 200);
}
function cancelExport() { if (!E.exp) return; E.exp.cancelled = true; if (!E.exp.frames) finishExport(); }
let expEspera = null;   // exportarArquivo(): o agente recebe o vídeo pronto em vez de baixar
function expFalhou(e) { if (expEspera) { const w = expEspera; expEspera = null; w.reject(e instanceof Error ? e : new Error(String(e || 'exportação cancelada'))); } }
function exportarArquivo(res = '1080') {
  return new Promise((resolve, reject) => {
    if (E.exporting) return reject(new Error('já está exportando'));
    if (!S.clips.length) return reject(new Error('projeto sem vídeo'));
    expEspera = { resolve, reject };
    openExport(); startExport(res).catch(expFalhou);
  });
}
function exportReady(blob, type) {
  const ext = type.includes('mp4') ? 'mp4' : 'webm';
  if (lastExport) URL.revokeObjectURL(lastExport.url);
  lastExport = { blob, url: URL.createObjectURL(blob), name: `corte-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.${ext}`, type, sig: E.expSig };
  if (sheetKind === 'export') expUI();
  if (expEspera) { const w = expEspera; expEspera = null; w.resolve(new File([blob], lastExport.name, { type })); return; }
  // abre a janela de salvar/compartilhar sozinha; se o iPhone bloquear (sem toque recente), fica o botão Baixar
  saveExport(lastExport).then((ok) => { if (!ok) toast('Vídeo pronto! Toque em Baixar'); });
}
// celular/tablet: abre o compartilhar (Salvar vídeo). Computador: baixa direto, porque o compartilhar do Mac/Windows não tem "salvar".
const isMobile = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
async function saveExport(x) {
  const file = new File([x.blob], x.name, { type: x.type });
  if (isMobile() && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return true; } catch (e) { if (e.name === 'AbortError') return true; if (e.name === 'NotAllowedError') return false; }
  }
  const a = document.createElement('a'); a.href = x.url; a.download = x.name; document.body.appendChild(a); a.click(); a.remove();
  return true;
}
// ---------- Fontes adicionadas pela pessoa ----------
// Ficam SÓ no aparelho (IndexedDB): nada vai para o banco de dados. Vêm do Google Fonts (baixadas uma vez e guardadas)
// ou de um arquivo .ttf/.otf/.woff/.woff2 que a pessoa escolhe.
const GOOGLE_FONTS = ['Bebas Neue', 'Oswald', 'Archivo Black', 'Bricolage Grotesque', 'DM Sans', 'DM Serif Display', 'Playfair Display', 'Lora', 'Merriweather',
  'Raleway', 'Roboto', 'Open Sans', 'Lato', 'Nunito', 'Rubik', 'Work Sans', 'Space Grotesk', 'Sora', 'Outfit', 'Manrope', 'Plus Jakarta Sans', 'Urbanist',
  'League Spartan', 'Barlow Condensed', 'Fjalla One', 'Abril Fatface', 'Righteous', 'Lobster', 'Pacifico', 'Dancing Script', 'Caveat', 'Satisfy',
  'Sacramento', 'Allura', 'Parisienne', 'Great Vibes', 'Kaushan Script', 'Permanent Marker', 'Bangers', 'Luckiest Guy', 'Titan One', 'Alfa Slab One',
  'Cormorant Garamond', 'Cinzel', 'Josefin Sans', 'Syne', 'Unbounded', 'Kanit', 'Fredoka', 'Staatliches', 'Teko', 'Instrument Serif', 'Archivo',
  'Big Shoulders Display', 'Libre Baskerville', 'Yeseva One', 'Monoton', 'Shrikhand'];
const customFaces = new Map(); // id -> [FontFace]
const fontChips = (sel) => `<button class="chip addfont" data-addfont>${inlineIc('plus')} Adicionar fonte</button>` +
  FONTS.map((f) => `<button class="chip ${sel === f.id ? 'on' : ''}" data-font="${esc(f.id)}" style="font-family:${esc(f.css)}">${esc(f.id)}</button>`).join('');
function bindAddFont(b, onPick) { const el = b.querySelector('[data-addfont]'); if (el) el.onclick = () => openFontPicker(onPick); }
const fontCssFor = (id) => `'${id.replace(/'/g, '')}', sans-serif`;
function registerFont(rec) {
  const faces = rec.faces.map((f) => new FontFace(rec.id.replace(/'/g, ''), f.data, { weight: f.w || '100 900', style: 'normal', ...(f.ur ? { unicodeRange: f.ur } : {}) }));
  return Promise.all(faces.map((f) => f.load())).then(() => {
    faces.forEach((f) => document.fonts.add(f));
    customFaces.set(rec.id, faces);
    if (!FONTS.some((x) => x.id === rec.id)) FONTS.push({ id: rec.id, css: fontCssFor(rec.id), custom: rec.src || 'arquivo' });
  });
}
async function loadCustomFonts() {
  let list = []; try { list = (await dbGet('fontes')) || []; } catch {}
  for (const rec of list) { try { await registerFont(rec); } catch (e) { console.warn('fonte', rec.id, e); } }
}
async function saveFontRec(rec) { const list = ((await dbGet('fontes').catch(() => null)) || []).filter((x) => x.id !== rec.id); list.push(rec); await dbPut('fontes', list); }
async function removeFont(id) {
  const list = ((await dbGet('fontes').catch(() => null)) || []).filter((x) => x.id !== id); await dbPut('fontes', list);
  (customFaces.get(id) || []).forEach((f) => document.fonts.delete(f)); customFaces.delete(id);
  const i = FONTS.findIndex((x) => x.id === id && x.custom); if (i >= 0) FONTS.splice(i, 1);
  draw();
}
function uniqueFontId(name) {
  let id = name.replace(/['"\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40) || 'Minha fonte', n = 2;
  const base = id; while (FONTS.some((f) => f.id.toLowerCase() === id.toLowerCase())) id = `${base} ${n++}`;
  return id;
}
async function installFontFile(file) {
  if (/\.zip$/i.test(file.name)) throw new Error('Descompacte o .zip e escolha o arquivo .ttf ou .otf de dentro dele');
  if (file.size > 15 * 1048576) throw new Error('Arquivo grande demais para uma fonte');
  const data = await file.arrayBuffer();
  const name = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\s+(Regular|Normal|Book)$/i, '');
  const rec = { id: uniqueFontId(name), src: 'arquivo', faces: [{ w: '100 900', data }] };
  try { await registerFont(rec); } catch { throw new Error('Esse arquivo não é uma fonte válida (use .ttf, .otf, .woff ou .woff2)'); }
  await saveFontRec(rec);
  return rec.id;
}
async function installGoogleFont(family) {
  family = family.replace(/\s+/g, ' ').trim();
  const exist = FONTS.find((f) => f.id.toLowerCase() === family.toLowerCase()); if (exist) return exist.id;
  const base = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(family).replace(/%20/g, '+');
  let css = '';
  for (const u of [base + ':wght@400;700&display=swap', base + '&display=swap']) { const r = await fetch(u).catch(() => null); if (r && r.ok) { css = await r.text(); break; } }
  if (!css) throw new Error(`Não achei "${family}" no Google Fonts`);
  // só os blocos latinos (português); arquivos repetidos (fonte variável) viram uma face com faixa de peso
  const blocks = [...css.matchAll(/(?:\/\*\s*([\w-]+)\s*\*\/\s*)?@font-face\s*{([^}]*)}/g)].map((m) => ({ sub: m[1] || 'latin', body: m[2] }))
    .filter((x) => x.sub === 'latin' || x.sub === 'latin-ext');
  const byUrl = new Map();
  for (const bl of blocks) {
    const url = bl.body.match(/url\(([^)]+)\)/)?.[1], w = +(bl.body.match(/font-weight:\s*(\d+)/)?.[1] || 400), ur = bl.body.match(/unicode-range:\s*([^;]+);/)?.[1];
    if (!url || /font-style:\s*italic/.test(bl.body)) continue;
    const o = byUrl.get(url) || { url, ws: [], ur }; o.ws.push(w); byUrl.set(url, o);
  }
  if (!byUrl.size) throw new Error('Essa fonte não tem os caracteres do português');
  const faces = [];
  for (const o of byUrl.values()) {
    const r = await fetch(o.url); if (!r.ok) throw new Error('Falha ao baixar a fonte');
    const lo = Math.min(...o.ws), hi = Math.max(...o.ws);
    faces.push({ w: lo === hi ? String(lo) : `${lo} ${hi}`, ur: o.ur, data: await r.arrayBuffer() });
  }
  const rec = { id: family, src: 'google', faces };
  await registerFont(rec); await saveFontRec(rec);
  return rec.id;
}
function openFontPicker(onPick) {
  document.getElementById('fontpick')?.remove();
  const ov = document.createElement('div'); ov.id = 'fontpick';
  const iOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  ov.innerHTML = `<div class="fp-card" role="dialog" aria-label="Adicionar fonte">
    <div class="fp-head"><h3>Adicionar fonte</h3><button class="icon" data-close aria-label="Fechar">${ic('x')}</button></div>
    <button class="fp-import" data-import>${ic('upload')}<span><b>Importar arquivo de fonte</b><small>.ttf, .otf, .woff ou .woff2 que você baixou</small></span></button>
    <input type="file" hidden data-file ${iOS ? '' : 'accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2"'}>
    <div class="fp-mine"></div>
    <input class="tx-in fp-search" type="search" placeholder="Buscar no Google Fonts (ex.: Bebas Neue)" autocomplete="off">
    <div class="fp-list"></div>
    <p class="note">As fontes ficam guardadas só neste aparelho: funcionam sem internet e não ocupam espaço na sua conta.</p>
  </div>`;
  document.body.appendChild(ov);
  const close = () => ov.remove();
  ov.addEventListener('click', (e) => { if (e.target === ov || e.target.closest('[data-close]')) close(); });
  const done = (id) => { close(); toast(`Fonte "${id}" pronta`); onPick(id); };
  const busy = (el, txt) => { el.disabled = true; el.dataset.txt = el.innerHTML; el.innerHTML = txt; };
  const unbusy = (el) => { el.disabled = false; if (el.dataset.txt) el.innerHTML = el.dataset.txt; };
  // importar arquivo (fica no topo)
  const fi = $('[data-file]', ov), ib = $('[data-import]', ov);
  ib.onclick = () => fi.click();
  fi.onchange = async () => {
    const f = fi.files[0]; fi.value = ''; if (!f) return;
    busy(ib, `${ic('upload')}<span><b>Instalando…</b><small>${esc(f.name)}</small></span>`);
    try { done(await installFontFile(f)); } catch (e) { unbusy(ib); toast(e.message || 'Não consegui instalar essa fonte', 3200); }
  };
  // fontes já adicionadas
  const mine = $('.fp-mine', ov);
  const paintMine = () => {
    const cs = FONTS.filter((f) => f.custom);
    mine.innerHTML = cs.length ? `<div class="sec">Suas fontes</div>` + cs.map((f) => `<div class="fp-row"><button class="fp-name" data-use="${esc(f.id)}" style="font-family:${esc(f.css)}">${esc(f.id)}</button><button class="icon fp-del" data-del="${esc(f.id)}" aria-label="Remover ${esc(f.id)}">${ic('trash')}</button></div>`).join('') : '';
    mine.querySelectorAll('[data-use]').forEach((el) => el.onclick = () => done(el.dataset.use));
    mine.querySelectorAll('[data-del]').forEach((el) => el.onclick = async () => { if (!confirm(`Remover a fonte "${el.dataset.del}" deste aparelho?`)) return; await removeFont(el.dataset.del); paintMine(); paintList(); });
  };
  // Google Fonts: prévia leve (só as letras do nome) com um único pedido
  if (!document.getElementById('gf-prev')) {
    const lk = document.createElement('link'); lk.id = 'gf-prev'; lk.rel = 'stylesheet';
    const letters = [...new Set(GOOGLE_FONTS.join(''))].join('');
    lk.href = 'https://fonts.googleapis.com/css2?' + GOOGLE_FONTS.map((f) => 'family=' + f.replace(/ /g, '+')).join('&') + '&text=' + encodeURIComponent(letters) + '&display=swap';
    document.head.appendChild(lk);
  }
  const list = $('.fp-list', ov), search = $('.fp-search', ov);
  const paintList = () => {
    const q = search.value.trim(), ql = q.toLowerCase();
    const items = GOOGLE_FONTS.filter((f) => !ql || f.toLowerCase().includes(ql));
    const extra = q && !GOOGLE_FONTS.some((f) => f.toLowerCase() === ql) ? `<div class="fp-row"><button class="fp-name" data-g="${esc(q)}">Buscar "${esc(q)}" no Google Fonts</button><span class="fp-get">Baixar</span></div>` : '';
    list.innerHTML = extra + items.map((f) => { const has = FONTS.some((x) => x.id.toLowerCase() === f.toLowerCase());
      return `<div class="fp-row"><button class="fp-name" data-g="${esc(f)}" style="font-family:'${f}', sans-serif">${esc(f)}</button><span class="fp-get ${has ? 'ok' : ''}">${has ? 'Instalada' : 'Baixar'}</span></div>`; }).join('');
    list.querySelectorAll('[data-g]').forEach((el) => el.onclick = async () => {
      const row = el.parentElement, tag = $('.fp-get', row); if (row.classList.contains('busy')) return;
      row.classList.add('busy'); tag.textContent = 'Baixando…';
      try { done(await installGoogleFont(el.dataset.g)); } catch (e) { row.classList.remove('busy'); tag.textContent = 'Baixar'; toast(e.message || 'Sem internet para baixar a fonte', 3000); }
    });
  };
  search.addEventListener('input', paintList);
  paintMine(); paintList();
}

async function ensureFonts() {
  const loads = [];
  for (const f of ['Poppins', 'Montserrat']) for (const w of [400, 600, 700, 800]) loads.push(document.fonts.load(`${w} 40px "${f}"`));
  try { await Promise.all(loads); } catch {}
}

// ---------- Salvamento automático (IndexedDB) ----------
let dbp = null;
function db() {
  if (!dbp) dbp = new Promise((res, rej) => { const r = indexedDB.open('corte', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  return dbp;
}
async function dbOp(mode, fn) { const d = await db(); return new Promise((res, rej) => { const tx = d.transaction('kv', mode); const st = tx.objectStore('kv'); const r = fn(st); tx.oncomplete = () => res(r?.result); tx.onerror = () => rej(tx.error); }); }
const dbPut = (k, v) => dbOp('readwrite', (s) => s.put(v, k)).catch((e) => console.warn('db', e));
const dbGet = (k) => dbOp('readonly', (s) => s.get(k));
let saveTimer = 0;
function saveSoon() { clearTimeout(saveTimer); saveTimer = setTimeout(saveProject, 800); }
function saveProject() { dbPut('project', projetoObj()); if (galeria) galeriaSalvarSoon(); }
function projetoObj() {
  const used = new Set([...S.clips.map((c) => c.mediaId), ...S.layers.filter((l) => l.kind === 'video').map((l) => l.srcId)]);
  const usedBuf = new Set(S.audios.map((a) => a.bufferId));
  return {
    v: 1, snap: snap(), words: S.words, aspect: S.aspect, t: S.t,
    media: [...media.values()].filter((m) => used.has(m.id)).map(({ url, ...m }) => m),
    images: [...images.values()].filter((im) => S.layers.some((l) => l.srcId === im.id)).map(({ id, name, w, h }) => ({ id, name, w, h })),
    buffers: [...buffers.entries()].filter(([id]) => usedBuf.has(id)).map(([id, b]) => ({ id, name: b.name, fileKey: b.fileKey })),
    galeria,
  };
}
async function restoreProject() {
  let p; try { p = await dbGet('project'); } catch { return; }
  if (!p || !p.media?.length) return;
  toast('Restaurando seu projeto…', 60000);
  try {
    for (const m of p.media) {
      const file = await dbGet('file:' + m.id); if (!file) continue;
      const mm = await loadMedia(file, m.id); mm.thumb = m.thumb || mm.thumb; media.set(m.id, mm);
    }
    for (const b of p.buffers || []) {
      const file = await dbGet(b.fileKey); if (!file) continue;
      if (buffers.has(b.id)) continue; try { const buf = await extractAudio(file); buffers.set(b.id, { buffer: buf, peaks: computePeaks(buf), name: b.name, fileKey: b.fileKey }); } catch {}
    }
    Object.assign(S, { zooms: [], layers: [] }, JSON.parse(p.snap)); S.clips.forEach(normClip);
    // projetos antigos: o fade geral vira fade no primeiro/último clipe
    if (S.fx.fadeIn?.on && S.clips[0]) { S.clips[0].vfi = S.fx.fadeIn.dur; S.clips[0].vfa = S.fx.fadeAudio !== false; }
    if (S.fx.fadeOut?.on && S.clips.length) { const lc = S.clips[S.clips.length - 1]; lc.vfo = S.fx.fadeOut.dur; lc.vfa = S.fx.fadeAudio !== false; }
    S.fx.fadeIn.on = false; S.fx.fadeOut.on = false;
    for (const im of p.images || []) { const file = await dbGet('file:' + im.id); if (file) { try { images.set(im.id, await loadImage(file, im.id)); } catch {} } }
    S.layers = S.layers.filter((l) => (l.kind === 'adjust' || l.kind === 'text' ? true : l.kind === 'image' ? images.has(l.srcId) : media.has(l.srcId)));
    S.clips = S.clips.filter((c) => media.has(c.mediaId));
    S.audios = S.audios.filter((a) => buffers.has(a.bufferId));
    S.words = p.words || {}; S.aspect = p.aspect; S.t = clamp(p.t || 0, 0, total()); galeria = p.galeria || null;
    toast('Projeto restaurado', 1200);
  } catch (e) { console.error(e); toast('Não consegui restaurar o projeto anterior', 2500); }
  refresh();
}
async function newProject() {
  if (S.clips.length && !confirm('Começar um projeto novo? O atual será apagado.')) return;
  pause(); galeria = null; S.clips = []; S.audios = []; S.layers = []; S.zooms = []; images.forEach((im) => URL.revokeObjectURL(im.url)); images.clear(); stills.clear(); S.captions = []; S.words = {}; S.aspect = null; S.t = 0; S.sel = null; S.origVolume = 1;
  media.forEach((m) => URL.revokeObjectURL(m.url)); media.clear(); buffers.clear(); hist.past = []; hist.future = [];
  pool.forEach((v) => { v._clipId = null; v._url = null; v.removeAttribute('src'); v.load(); });
  try { await dbOp('readwrite', (s) => s.clear()); } catch {}
  updUndo(); refresh();
}

// ---------- Geral ----------
function updTime() { $('#time').innerHTML = `<b>${fmt(S.t)}</b> / ${fmt(total())}`; fsSync(); if (!E.playing) kfSync(); }
function updPlay() { $('#btn-play').innerHTML = ic(E.playing ? 'pause' : 'play'); $('#btn-export').disabled = E.exporting || !S.clips.length; $('#btn-fs').disabled = !S.clips.length; fsSync(); if (FSP.on) fsPoke(); if (!E.playing) kfSync(); }
let toastT = 0;
function toast(msg, ms = 1800) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms); }
function refresh() {
  $('#empty').classList.toggle('hide', S.clips.length > 0);
  if (S.sel && !(S.sel.type === 'clip' || S.sel.type === 'clipaudio' ? S.clips : S.sel.type === 'audio' ? S.audios : S.sel.type === 'layer' ? S.layers : S.captions).some((x) => x.id === S.sel.id)) S.sel = null;
  sizePreview(); renderTimeline(); renderToolbar(); updTime(); updPlay(); draw(); saveSoon();
}

// ---------- Tela cheia: assistir o vídeo em edição com play/pausa, tempo e barra de progresso ----------
function openFs() {
  if (!S.clips.length) return toast('Adicione um vídeo primeiro');
  if (E.exporting) return toast('Aguarde a exportação terminar');
  if (sheetKind) closeSheet();
  FSP.on = true; $('#fs').hidden = false; document.body.classList.add('fs-open');
  $('#fs-stage').appendChild(pv); sizePreview(); draw(); fsSync(); fsPoke();
  const el = $('#fs'), req = el.requestFullscreen || el.webkitRequestFullscreen;
  try { const p = req && req.call(el); p && p.catch && p.catch(() => {}); } catch {}
}
function closeFs() {
  if (!FSP.on) return;
  FSP.on = false; clearTimeout(FSP.hideT); $('#fs').hidden = true; $('#fs').classList.remove('idle'); document.body.classList.remove('fs-open');
  $('#stage').insertBefore(pv, $('#empty')); sizePreview(); draw(); followScroll(true);
  const fe = document.fullscreenElement || document.webkitFullscreenElement, ex = document.exitFullscreen || document.webkitExitFullscreen;
  if (fe && ex) { try { const p = ex.call(document); p && p.catch && p.catch(() => {}); } catch {} }
}
function fsSync() {
  if (!FSP.on) return;
  const T = total(), p = T ? clamp(S.t / T, 0, 1) : 0;
  $('#fs-cur').textContent = fmt(S.t); $('#fs-tot').textContent = fmt(T);
  $('#fs-fill').style.width = (p * 100) + '%'; $('#fs-knob').style.left = (p * 100) + '%';
  const want = E.playing ? 'pause' : 'play'; const b = $('#fs-play'); if (b.dataset.st !== want) { b.dataset.st = want; b.innerHTML = ic(want); b.setAttribute('aria-label', E.playing ? 'Pausar' : 'Reproduzir'); }
}
// mostra os controles e, se estiver tocando, esconde depois de 2,5 s
function fsPoke() {
  if (!FSP.on) return;
  $('#fs').classList.remove('idle'); clearTimeout(FSP.hideT);
  if (E.playing) FSP.hideT = setTimeout(() => { if (E.playing && !FSP.scrub) $('#fs').classList.add('idle'); }, 2500);
}
const fsToggle = () => (E.playing ? pause() : play());
{
  const bar = $('#fs-bar');
  const at = (x) => { const r = bar.getBoundingClientRect(); return clamp((x - r.left) / r.width, 0, 1) * total(); };
  bar.addEventListener('pointerdown', (e) => {
    FSP.scrub = { was: E.playing }; bar.setPointerCapture(e.pointerId); seekTo(at(e.clientX)); fsPoke(); e.stopPropagation();
  });
  bar.addEventListener('pointermove', (e) => { if (FSP.scrub) { S.t = at(e.clientX); draw(); updTime(); } });
  const end = () => { if (!FSP.scrub) return; const w = FSP.scrub.was; FSP.scrub = null; seekTo(S.t); if (w) play(); fsPoke(); };
  bar.addEventListener('pointerup', end); bar.addEventListener('pointercancel', end);
  $('#fs-play').onclick = (e) => { e.stopPropagation(); fsToggle(); };
  $('#fs-close').onclick = (e) => { e.stopPropagation(); closeFs(); };
  $('#fs-back').onclick = (e) => { e.stopPropagation(); seekTo(Math.max(0, S.t - 5)); fsPoke(); };
  $('#fs-fwd').onclick = (e) => { e.stopPropagation(); seekTo(Math.min(total(), S.t + 5)); fsPoke(); };
  // tocar no vídeo: mostra/esconde os controles; toque duplo: play/pausa
  let lastTap = 0;
  $('#fs-stage').addEventListener('click', () => {
    const n = performance.now();
    if (n - lastTap < 300) { lastTap = 0; fsToggle(); return; }
    lastTap = n;
    const fs = $('#fs');
    setTimeout(() => { if (!lastTap) return; if (fs.classList.contains('idle') || !E.playing) fsPoke(); else { clearTimeout(FSP.hideT); fs.classList.add('idle'); } }, 300);
  });
  $('#fs').addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') fsPoke(); });
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && FSP.on) closeFs(); });
  document.addEventListener('webkitfullscreenchange', () => { if (!document.webkitFullscreenElement && FSP.on) closeFs(); });
  document.addEventListener('keydown', (e) => {
    if (!FSP.on) return;
    if (e.key === 'Escape') closeFs();
    else if (e.key === ' ' || e.key === 'k') { e.preventDefault(); fsToggle(); fsPoke(); }
    else if (e.key === 'ArrowLeft') { seekTo(Math.max(0, S.t - 5)); fsPoke(); }
    else if (e.key === 'ArrowRight') { seekTo(Math.min(total(), S.t + 5)); fsPoke(); }
  });
}

$('#btn-fs').innerHTML = ic('expand');
$('#btn-fs').onclick = openFs;
$('#btn-kf').innerHTML = ic('key');
$('#btn-kf').onclick = () => (sheetKind === 'kf' ? closeSheet() : openKfSheet());
$('#fs-close').innerHTML = ic('x');
$('#fs-back').innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><text x="12" y="15.5" font-size="7" text-anchor="middle" fill="currentColor" stroke="none" font-weight="700">5</text></svg>';
$('#fs-fwd').innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/><text x="12" y="15.5" font-size="7" text-anchor="middle" fill="currentColor" stroke="none" font-weight="700">5</text></svg>';
$('#btn-new').innerHTML = ic('file');
$('#btn-galeria').innerHTML = ic('grid');
$('#btn-undo').innerHTML = ic('undo');
$('#btn-redo').innerHTML = ic('redo');
$('#sheet-close').innerHTML = ic('x');
$('#btn-new').onclick = newProject;
$('#btn-galeria').onclick = openGaleria;
$('#btn-undo').onclick = undo;
$('#btn-redo').onclick = redo;
$('#btn-play').onclick = () => (E.playing ? (E.exporting ? null : pause()) : play());
$('#btn-export').onclick = openExport;
$('#btn-add-first').onclick = () => $('#file-video').click();
$('#sheet-close').onclick = closeSheet;
$('#file-video').onchange = (e) => { const f = [...e.target.files]; e.target.value = ''; if (f.length) importVideos(f); };
$('#file-layer').onchange = (e) => { const f = [...e.target.files]; e.target.value = ''; if (f.length) importLayers(f); };
$('#file-audio').onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) addAudioFromFile(f); };
window.addEventListener('resize', () => renderTimeline());
document.addEventListener('visibilitychange', () => { if (document.hidden && E.playing && !E.exporting) pause(); if (document.hidden) saveProject(); });
document.fonts.ready.then(draw);
ensureFonts().then(draw);
loadCustomFonts().then(() => { try { draw(); } catch {} });
try { navigator.storage?.persist?.(); } catch {}
// versão do app: aparece pequena ao lado do nome, para conferir se atualizou
const APP_VERSION = 31;
loadTemplateFonts().then(() => { try { draw(); } catch {} });
{ const b = document.querySelector('.brand-ver'); if (b) b.textContent = 'v' + APP_VERSION; }
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  // sempre procura a versão nova (sem usar cache) e recarrega sozinho quando ela chega
  const hadCtrl = !!navigator.serviceWorker.controller; let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadCtrl && !reloaded && !E.exporting) { reloaded = true; location.reload(); } });
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((reg) => {
    reg.update().catch(() => {});
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
  }).catch(() => {});
}

const contaPronta = conta.iniciar();
updUndo(); refresh(); restoreProject().then(() => contaPronta).then(abrirDoLink);

// para testes

// ---------- Galeria de projetos ----------
// Cada comprador tem a própria galeria no Supabase do Editor (conta.js): a lista na tabela "projetos" (só dados leves)
// e o projeto inteiro (+ miniatura) na pasta dele no espaço privado "projetos". Os vídeos brutos ficam no aparelho;
// ao abrir num aparelho que não tem os vídeos, o Editor pede para escolher os arquivos (pelo nome).
const SB = conta.SB;
const sbSessao = conta.sessao;
const sbReq = conta.sbReq;
const linkProjeto = (id) => location.origin + location.pathname.replace(/index\.html$/, '') + '?projeto=' + encodeURIComponent(id);
function miniatura() {
  if (!S.clips.length) return Promise.resolve(null);
  const c = document.createElement('canvas'); c.width = 270; c.height = Math.round(270 * pv.height / pv.width);
  c.getContext('2d').drawImage(pv, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob(res, 'image/jpeg', 0.75));
}
async function galeriaSalvar(meta = {}) {
  const ses = await sbSessao(); if (!ses) { conta.mostrarLogin(); throw new Error('Entre na sua conta para usar a galeria.'); }
  if (!S.clips.length) throw new Error('projeto sem vídeo');
  const id = galeria?.id || meta.id || ('p' + Date.now().toString(36) + uid().slice(0, 4));
  const agora = new Date().toISOString();
  galeria = { criadoEm: agora, ...(galeria || {}), ...meta, id, atualizadoEm: agora, duracao: +total().toFixed(1),
    brutos: [...new Set(S.clips.map((c) => media.get(c.mediaId)?.name).filter(Boolean))] };
  const base = `${ses.user.id}/${id}`;
  galeria.arquivo = base + '.json';
  try { const th = await miniatura(); if (th) { await sbReq(`/storage/v1/object/projetos/${base}.jpg`, { method: 'POST', headers: { 'Content-Type': 'image/jpeg', 'x-upsert': 'true' }, body: th }); galeria.thumb = base + '.jpg'; } } catch (e) { console.warn('miniatura', e); }
  const obj = projetoObj();
  await sbReq(`/storage/v1/object/projetos/${base}.json`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-upsert': 'true' }, body: JSON.stringify(obj) });
  await sbReq('/rest/v1/projetos?on_conflict=owner,id', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ id, data: galeria }) });
  dbPut('project', obj);
  return { id, link: linkProjeto(id) };
}
let galT = 0;
function galeriaSalvarSoon() { clearTimeout(galT); galT = setTimeout(() => galeriaSalvar().catch((e) => console.warn('galeria', e.message)), 5000); }
async function galeriaListar() {
  const itens = (await (await sbReq('/rest/v1/projetos?select=data&order=atualizado_em.desc')).json()).map((x) => x.data).filter(Boolean);
  const th = itens.filter((i) => i.thumb).map((i) => i.thumb);
  if (th.length) {
    try {
      const arr = await (await sbReq('/storage/v1/object/sign/projetos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn: 3600, paths: th }) })).json();
      const m = new Map(arr.filter((a) => a.signedURL).map((a) => [a.path, SB.url + '/storage/v1' + a.signedURL]));
      itens.forEach((i) => { i.thumbUrl = m.get(i.thumb) || null; });
    } catch (e) { console.warn('miniaturas', e); }
  }
  return itens;
}
function pedirArquivos(faltam, titulo) {
  return new Promise((resolve) => {
    const pend = new Map(faltam.map((m) => [m.name, m]));
    const lista = () => [...pend.keys()].map((n) => `<div class="cap-row"><span>${esc(n)}</span></div>`).join('');
    openSheet('galeria', 'Reconectar vídeos', `
      <p class="note">Para abrir “${esc(titulo || 'projeto')}” neste navegador, escolha estes arquivos (ficam na pasta do vídeo no Drive):</p>
      <div id="gl-falta">${lista()}</div>
      <input type="file" id="gl-arq" multiple accept="video/*,audio/*,image/*" style="display:none">
      <button class="btn primary" id="gl-esc">Escolher arquivos</button><button class="btn" id="gl-canc">Cancelar</button>`, (b) => {
      const inp = $('#gl-arq', b);
      $('#gl-esc', b).onclick = () => inp.click();
      $('#gl-canc', b).onclick = () => { closeSheet(); resolve(false); };
      inp.onchange = async () => {
        for (const f of inp.files) { const m = pend.get(f.name); if (m) { await dbPut('file:' + m.id, f); pend.delete(f.name); } }
        $('#gl-falta', b).innerHTML = lista();
        if (!pend.size) { closeSheet(); resolve(true); } else toast('Ainda falta(m) ' + pend.size + ' arquivo(s)', 2500);
      };
    });
  });
}
async function galeriaAbrir(id) {
  const it = (await (await sbReq(`/rest/v1/projetos?id=eq.${encodeURIComponent(id)}&select=data`)).json())[0]?.data;
  if (!it) throw new Error('Projeto não encontrado na galeria.');
  const p = await (await sbReq(`/storage/v1/object/projetos/${it.arquivo}`)).json();
  p.galeria = { ...(p.galeria || {}), ...it };
  const faltam = [];
  for (const m of [...(p.media || []), ...(p.images || [])]) if (!(await dbGet('file:' + m.id))) faltam.push(m);
  for (const b of p.buffers || []) if (b.fileKey && !(await dbGet(b.fileKey))) faltam.push({ id: b.fileKey.replace(/^file:/, ''), name: b.name });
  if (faltam.length && !(await pedirArquivos(faltam, it.titulo))) return false;
  if (galeria) { try { clearTimeout(galT); await galeriaSalvar(); } catch {} }
  const atual = await dbGet('project');   // projeto aberto que não está na galeria: guarda uma cópia antes de trocar
  if (atual?.media?.length && !atual.galeria) await dbPut('backup-' + new Date().toISOString().replace(/[:.]/g, '-'), atual);
  await dbPut('project', p);
  const u = new URL(location.href); u.searchParams.delete('projeto'); history.replaceState(null, '', u);
  location.reload(); return true;
}
async function openGaleria() {
  openSheet('galeria', 'Projetos', `
    <button class="btn primary" id="gl-salvar">${inlineIc('plus')} ${galeria ? 'Salvar agora na galeria' : 'Salvar este projeto na galeria'}</button>
    ${galeria ? `<p class="note">Aberto: <b>${esc(galeria.titulo || 'Sem título')}</b>. As mudanças vão para a galeria sozinhas.${galeria.video ? ` <a href="${esc(galeria.video)}" target="_blank" rel="noopener">Ver vídeo exportado</a>` : ''}</p>` : ''}
    <div id="gl-lista"><p class="note">Carregando…</p></div>`, async (b) => {
    $('#gl-salvar', b).onclick = async () => {
      if (!S.clips.length) return toast('Abra um vídeo primeiro');
      let titulo = galeria?.titulo; if (!titulo) { titulo = prompt('Nome do projeto:', 'Projeto ' + new Date().toLocaleDateString('pt-BR')); if (!titulo) return; }
      try { toast('Salvando…', 30000); await galeriaSalvar({ titulo }); toast('Salvo na galeria', 1500); openGaleria(); } catch (e) { toast(e.message, 4000); }
    };
    try {
      const itens = await galeriaListar();
      $('#gl-lista', b).innerHTML = itens.length ? `<div class="gl-grid">${itens.map((i) => `<button class="gl-card ${galeria?.id === i.id ? 'on' : ''}" data-gl="${esc(i.id)}">${i.thumbUrl ? `<img src="${esc(i.thumbUrl)}" alt="">` : '<div class="gl-sem"></div>'}<b>${esc(i.titulo || 'Sem título')}</b><span>${esc(i.cliente || '')}${i.atualizadoEm ? ' · ' + new Date(i.atualizadoEm).toLocaleDateString('pt-BR') : ''}</span></button>`).join('')}</div>` : '<p class="note">Nenhum projeto na galeria ainda.</p>';
      b.querySelectorAll('[data-gl]').forEach((el) => el.onclick = async () => {
        if (el.dataset.gl === galeria?.id) return closeSheet();
        toast('Abrindo projeto…', 60000);
        try { await galeriaAbrir(el.dataset.gl); } catch (e) { toast(e.message, 4000); }
      });
    } catch (e) { $('#gl-lista', b).innerHTML = `<p class="note">${esc(e.message)}</p>`; }
  });
}
async function abrirDoLink() {
  const id = new URLSearchParams(location.search).get('projeto'); if (!id || galeria?.id === id) return;
  toast('Abrindo projeto da galeria…', 60000);
  try { await galeriaAbrir(id); } catch (e) { toast(e.message, 5000); }
}

// ---------- Configurações: conta e kit da marca ----------
const KIT_PADRAO = { nome: '', logo: '', cores: { primaria: '#FFFFFF', secundaria: '#000000', destaque: '#FFD84D' }, fontes: { titulo: 'Poppins', texto: 'Poppins' }, briefing: '', referencias: [] };
const kitDe = (p) => { const k = p?.kit || {}; return { ...KIT_PADRAO, ...k, cores: { ...KIT_PADRAO.cores, ...(k.cores || {}) }, fontes: { ...KIT_PADRAO.fontes, ...(k.fontes || {}) }, referencias: Array.isArray(k.referencias) ? k.referencias : [] }; };
async function urlAssinada(path) {
  if (!path) return null;
  try { const j = await (await sbReq('/storage/v1/object/sign/projetos/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn: 3600 }) })).json(); return j.signedURL ? SB.url + '/storage/v1' + j.signedURL : null; } catch { return null; }
}
async function openConfig() {
  let p = null; try { p = await conta.perfil(true); } catch (e) { return toast(e.message, 3000); }
  if (!p) return conta.mostrarLogin();
  const kit = kitDe(p);
  const fontOpts = (sel) => FONTS.map((f) => `<option value="${esc(f.id)}" ${sel === f.id ? 'selected' : ''}>${esc(f.id)}</option>`).join('');
  const refRow = (r = {}, i) => `<div class="kit-ref" data-ref="${i}"><input class="tx-in kit-in" data-k="link" placeholder="Link do vídeo (Instagram, YouTube, Drive…)" value="${esc(r.link || '')}"><input class="tx-in kit-in" data-k="nota" placeholder="O que você gosta nele (ritmo, legenda, cortes…)" value="${esc(r.nota || '')}"><button class="mini" data-rm="${i}" aria-label="Remover">${ic('x')}</button></div>`;
  openSheet('config', 'Configurações', `
    <div class="sec">Sua conta</div>
    <p class="note"><b>${esc(p.email || '')}</b><br>Plano: ${esc(p.plano || '—')} · Créditos de IA: <b>${p.creditos ?? 0}</b></p>
    <div class="chips"><button class="chip" id="cf-senha">Trocar senha</button><a class="chip" href="instalar.html">${inlineIc('expand', 12)} Instalar no iPhone</a><button class="chip" id="cf-sair">Sair</button></div>
    <div class="sec">Kit da marca</div>
    <p class="note">A IA usa este kit para editar no seu estilo. Fica salvo na sua conta.</p>
    <div class="kit-logo"><div id="kit-logo-img" class="kit-logo-img">${kit.logo ? '' : 'Logo'}</div><div><button class="btn" id="kit-logo-btn" style="margin:0">${kit.logo ? 'Trocar logo' : 'Enviar logo'}</button><input type="file" id="kit-logo-f" accept="image/png,image/jpeg,image/svg+xml,image/webp" hidden></div></div>
    <label class="kit-lb">Nome da marca</label><input class="tx-in kit-in" id="kit-nome" value="${esc(kit.nome)}" placeholder="Ex.: Clínica Bella">
    <label class="kit-lb">Cores</label>
    <div class="kit-cores">${[['primaria', 'Principal'], ['secundaria', 'Secundária'], ['destaque', 'Destaque']].map(([k, l]) => `<label class="kit-cor"><input type="color" data-cor="${k}" value="${esc(kit.cores[k])}"><span>${l}</span></label>`).join('')}</div>
    <label class="kit-lb">Fontes</label>
    <div class="kit-cores"><label class="kit-cor"><select class="tx-in kit-in" id="kit-ft">${fontOpts(kit.fontes.titulo)}</select><span>Títulos</span></label><label class="kit-cor"><select class="tx-in kit-in" id="kit-fx">${fontOpts(kit.fontes.texto)}</select><span>Legenda</span></label></div>
    <label class="kit-lb">Mini briefing</label><textarea class="tx-in" id="kit-brief" rows="4" placeholder="Quem é a marca, o público, o tom de voz, palavras que usa e que evita.">${esc(kit.briefing)}</textarea>
    <label class="kit-lb">Vídeos de referência de estilo</label>
    <p class="note">Cole links de vídeos que mostram o estilo que você quer. O vídeo não é enviado: a IA lê o link e a sua nota.</p>
    <div id="kit-refs">${kit.referencias.map(refRow).join('')}</div>
    <button class="btn" id="kit-ref-add">${inlineIc('plus')} Adicionar referência</button>
    <button class="btn primary" id="kit-salvar">Salvar kit da marca</button>`, async (b) => {
    $('#cf-sair', b).onclick = () => conta.sair();
    $('#cf-senha', b).onclick = async () => {
      const n = prompt('Senha nova (mínimo 8 caracteres):'); if (!n) return;
      if (n.length < 8) return toast('Use pelo menos 8 caracteres', 2500);
      try { await conta.trocarSenha(n); toast('Senha trocada', 2000); } catch (e) { toast(e.message, 3500); }
    };
    const logoBox = $('#kit-logo-img', b);
    if (kit.logo) urlAssinada(kit.logo).then((u) => { if (u && logoBox.isConnected) logoBox.innerHTML = `<img src="${esc(u)}" alt="Logo">`; });
    $('#kit-logo-btn', b).onclick = () => $('#kit-logo-f', b).click();
    $('#kit-logo-f', b).onchange = async (e) => {
      const f = e.target.files[0]; e.target.value = ''; if (!f) return;
      if (f.size > 3 * 1048576) return toast('Logo grande demais (máx. 3 MB)', 3000);
      try {
        toast('Enviando logo…', 20000);
        const ext = (f.name.match(/\.(png|jpe?g|svg|webp)$/i)?.[1] || 'png').toLowerCase();
        const path = `${(await sbSessao()).user.id}/kit/logo.${ext}`;
        await sbReq('/storage/v1/object/projetos/' + path, { method: 'POST', headers: { 'Content-Type': f.type || 'image/png', 'x-upsert': 'true' }, body: f });
        kit.logo = path; logoBox.innerHTML = `<img src="${URL.createObjectURL(f)}" alt="Logo">`; toast('Logo enviada. Toque em Salvar.', 2200);
      } catch (er) { toast(er.message, 3500); }
    };
    const refs = $('#kit-refs', b);
    const lerRefs = () => [...refs.querySelectorAll('.kit-ref')].map((el) => ({ link: el.querySelector('[data-k="link"]').value.trim(), nota: el.querySelector('[data-k="nota"]').value.trim() })).filter((r) => r.link || r.nota);
    const ligarRm = () => refs.querySelectorAll('[data-rm]').forEach((x) => x.onclick = () => x.closest('.kit-ref').remove());
    ligarRm();
    $('#kit-ref-add', b).onclick = () => { if (refs.children.length >= 6) return toast('Até 6 referências'); refs.insertAdjacentHTML('beforeend', refRow({}, refs.children.length)); ligarRm(); };
    $('#kit-salvar', b).onclick = async (e) => {
      const novo = { ...kit, nome: $('#kit-nome', b).value.trim().slice(0, 80), briefing: $('#kit-brief', b).value.trim().slice(0, 2000),
        cores: Object.fromEntries([...b.querySelectorAll('[data-cor]')].map((x) => [x.dataset.cor, x.value.toUpperCase()])),
        fontes: { titulo: $('#kit-ft', b).value, texto: $('#kit-fx', b).value }, referencias: lerRefs().slice(0, 6) };
      e.currentTarget.disabled = true;
      try { await conta.salvarKit(novo); toast('Kit da marca salvo', 1800); closeSheet(); } catch (er) { toast(er.message, 3500); e.currentTarget.disabled = false; }
    };
  });
}

// ---------- Editar com IA ----------
// Fluxo barato: o vídeo nunca sai do aparelho. Vai só a transcrição (texto) + formulário + kit da marca.
// A função editar-ia (Claude) devolve uma receita; o app aplica com as funções do agente (window.__agente).
const IA_OBJ = { reels: [['venda', 'Venda'], ['crescimento', 'Crescimento'], ['seguidores', 'Seguidores'], ['autoridade', 'Autoridade']],
  anuncio: [['venda', 'Venda'], ['alcance', 'Alcance'], ['leads', 'Leads'], ['trafego', 'Tráfego']] };
const IA_DUR = [15, 30, 45, 60, 90, 0];
let iaRef = null;   // { nome, b64 } referência visual (só um JPEG pequeno sai do aparelho)
function iaForm() { const f = prefs.iaForm || {}; return { formato: f.formato || 'reels', objetivo: f.objetivo || 'venda', ideia: f.ideia || '', roteiro: f.roteiro || '', motion: f.motion ?? true, duracao: f.duracao ?? 30 }; }
function jpegPequeno(src, w0, h0) {
  const k = Math.min(1, 768 / Math.max(w0, h0)); const c = document.createElement('canvas'); c.width = Math.round(w0 * k); c.height = Math.round(h0 * k);
  c.getContext('2d').drawImage(src, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.75).split(',')[1];
}
async function lerReferencia(f) {
  const url = URL.createObjectURL(f);
  try {
    if (f.type.startsWith('image/')) { const img = new Image(); img.src = url; await img.decode(); return jpegPequeno(img, img.naturalWidth, img.naturalHeight); }
    const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
    await new Promise((res, rej) => { v.onloadeddata = res; v.onerror = () => rej(new Error('não consegui ler este vídeo')); });
    v.currentTime = Math.min(1.5, (v.duration || 2) / 3); await new Promise((res) => { v.onseeked = res; setTimeout(res, 3000); });
    return jpegPequeno(v, v.videoWidth, v.videoHeight);
  } finally { URL.revokeObjectURL(url); }
}
const semTranscricao = () => [...new Set(S.clips.map((c) => c.mediaId))].filter((m) => !(S.words[m] || []).length);
async function openIA() {
  if (!S.clips.length) return toast('Adicione um vídeo primeiro', 2500);
  const F = iaForm();
  const objChips = () => IA_OBJ[F.formato].map(([k, l]) => `<button class="chip ${F.objetivo === k ? 'on' : ''}" data-obj="${k}">${l}</button>`).join('');
  const falta = semTranscricao();
  openSheet('ia', 'Editar com IA', `
    <div id="ia-estado" class="ia-estado">Verificando a IA…</div>
    ${falta.length ? `<p class="note">Antes, gere a legenda: a IA edita a partir da transcrição da fala.</p><button class="btn" id="ia-leg">${inlineIc('type')} Gerar legenda primeiro</button>` : ''}
    <div class="sec">Formato</div>
    <div class="chips"><button class="chip ${F.formato === 'reels' ? 'on' : ''}" data-fmt="reels">Reels</button><button class="chip ${F.formato === 'anuncio' ? 'on' : ''}" data-fmt="anuncio">Anúncio</button></div>
    <div class="sec">Objetivo</div><div class="chips" id="ia-obj">${objChips()}</div>
    <div class="sec">Ideia do vídeo</div><textarea class="tx-in" id="ia-ideia" rows="2" placeholder="Ex.: mostrar 3 erros de quem começa a treinar">${esc(F.ideia)}</textarea>
    <div class="sec">Roteiro (opcional)</div><textarea class="tx-in" id="ia-rot" rows="3" placeholder="Cole o roteiro para a IA seguir a ordem e cortar o que estiver fora">${esc(F.roteiro)}</textarea>
    <div class="sec">Referência (opcional)</div>
    <div class="chips"><button class="chip" id="ia-ref-b">${inlineIc('plus', 12)} Imagem ou vídeo</button><span class="note" id="ia-ref-n">${iaRef ? esc(iaRef.nome) : 'Só um quadro pequeno é enviado.'}</span>${iaRef ? '<button class="chip" id="ia-ref-x">Tirar</button>' : ''}</div>
    <input type="file" id="ia-ref-f" accept="image/*,video/*" hidden>
    <div class="row"><label>Motion (textos animados)</label><span class="spacer"></span><input type="checkbox" class="tg" id="ia-motion" ${F.motion ? 'checked' : ''}></div>
    <div class="sec">Duração alvo</div>
    <div class="chips">${IA_DUR.map((d) => `<button class="chip ${F.duracao === d ? 'on' : ''}" data-dur="${d}">${d ? d + ' s' : 'Livre'}</button>`).join('')}</div>
    <button class="btn primary" id="ia-ir" disabled>Editar com IA</button>
    <p class="note">O vídeo não sai do seu aparelho: vai só o texto da fala. O crédito só é descontado quando a edição chega. Dá para desfazer.</p>`, async (b) => {
    const salvarF = () => { prefs.iaForm = { ...F }; savePrefs(); };
    b.querySelectorAll('[data-fmt]').forEach((el) => el.onclick = () => {
      F.formato = el.dataset.fmt; if (!IA_OBJ[F.formato].some(([k]) => k === F.objetivo)) F.objetivo = 'venda';
      b.querySelectorAll('[data-fmt]').forEach((x) => x.classList.toggle('on', x === el)); $('#ia-obj', b).innerHTML = objChips(); ligarObj(); salvarF();
    });
    const ligarObj = () => b.querySelectorAll('[data-obj]').forEach((el) => el.onclick = () => { F.objetivo = el.dataset.obj; b.querySelectorAll('[data-obj]').forEach((x) => x.classList.toggle('on', x === el)); salvarF(); });
    ligarObj();
    b.querySelectorAll('[data-dur]').forEach((el) => el.onclick = () => { F.duracao = +el.dataset.dur; b.querySelectorAll('[data-dur]').forEach((x) => x.classList.toggle('on', x === el)); salvarF(); });
    $('#ia-motion', b).onchange = (e) => { F.motion = e.target.checked; salvarF(); };
    $('#ia-ideia', b).oninput = (e) => { F.ideia = e.target.value; salvarF(); };
    $('#ia-rot', b).oninput = (e) => { F.roteiro = e.target.value; salvarF(); };
    const leg = $('#ia-leg', b); if (leg) leg.onclick = () => openCaptions('gerar');
    $('#ia-ref-b', b).onclick = () => $('#ia-ref-f', b).click();
    const rx = $('#ia-ref-x', b); if (rx) rx.onclick = () => { iaRef = null; openIA(); };
    $('#ia-ref-f', b).onchange = async (e) => {
      const f = e.target.files[0]; e.target.value = ''; if (!f) return;
      try { iaRef = { nome: f.name, b64: await lerReferencia(f) }; openIA(); } catch (er) { toast(er.message, 3000); }
    };
    // estado da IA (sem chave = "IA em configuração") e créditos
    const est = $('#ia-estado', b), btn = $('#ia-ir', b);
    let info = null;
    try { info = await (await sbReq('/functions/v1/editar-ia')).json(); }
    catch (e) { est.className = 'ia-estado erro'; est.textContent = e.codigo === 'bloqueado' ? 'Seu acesso está bloqueado.' : 'Não consegui falar com a IA: ' + e.message; return; }
    if (!est.isConnected) return;
    if (!info.ativa) { est.className = 'ia-estado config'; est.innerHTML = `<b>IA em configuração.</b> O botão será liberado em breve. Seus créditos: ${info.creditos}.`; btn.textContent = 'IA em configuração'; return; }
    if (info.creditos < info.custo) { est.className = 'ia-estado erro'; est.textContent = `Sem créditos de IA (você tem ${info.creditos}, precisa de ${info.custo}).`; btn.textContent = 'Sem créditos'; return; }
    est.className = 'ia-estado ok'; est.textContent = `IA pronta · você tem ${info.creditos} crédito(s) · cada edição usa ${info.custo}.`;
    btn.textContent = `Editar com IA (${info.custo} crédito${info.custo > 1 ? 's' : ''})`; btn.disabled = !!falta.length;
    btn.onclick = async () => {
      if (semTranscricao().length) return toast('Gere a legenda primeiro', 2500);
      btn.disabled = true; btn.textContent = 'A IA está editando… (até 1 min)';
      try {
        const r = await pedirReceita(F);
        const resumo = await aplicarReceita(r.receita, F);
        conta.perfil(true).catch(() => {});
        closeSheet(); toast(`Pronto! ${resumo} · ${r.creditos} crédito(s) restante(s)`, 5000);
      } catch (e) {
        btn.disabled = false; btn.textContent = 'Tentar de novo';
        est.className = 'ia-estado ' + (e.codigo === 'ia_em_configuracao' ? 'config' : 'erro'); est.textContent = e.message;
      }
    };
  });
}
async function pedirReceita(F) {
  const A = window.__agente, P = A.palavras();
  const nome = (m) => media.get(m)?.name || m;
  const transcricao = P.map((w) => `${w.i}|${w.t}|${w.s}|${nome(w.m)}`).join('\n');
  await loadSfxIndex();
  const kit = kitDe(await conta.perfil().catch(() => null)); delete kit.logo;
  const corpo = {
    formulario: { formato: F.formato, objetivo: F.objetivo, ideia: F.ideia, roteiro: F.roteiro, motion: F.motion, duracao_alvo_s: F.duracao || null },
    kit, transcricao, duracao_bruta: +[...new Set(S.clips.map((c) => c.mediaId))].reduce((t, m) => t + (media.get(m)?.isImg ? 0 : media.get(m)?.duration || 0), 0).toFixed(1),
    opcoes: {
      modelos_legenda: ['impacto', 'elegante', 'editorial', 'simples'], fontes: FONTS.map((f) => f.id),
      sons: (sfxIndex || []).map((x) => x.name),
      animacoes_entrada: presetsOf('enter').slice(0, 16).map((p) => p.n), animacoes_saida: presetsOf('exit').slice(0, 10).map((p) => p.n),
    },
    referencia_imagem: iaRef?.b64 || null,
  };
  return (await sbReq('/functions/v1/editar-ia', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) })).json();
}
async function addSfxEm(nomeSom, t) {
  const s = (sfxIndex || []).find((x) => x.name.toLowerCase() === String(nomeSom).toLowerCase()); if (!s) return false;
  const blob = await (await fetch('sfx/lib/' + encodeURIComponent(s.file))).blob();
  const f = new File([blob], s.file, { type: 'audio/mpeg' });
  const buf = await extractAudio(f), [a, z] = sfxTrim(s.file, buf.duration), bid = uid();
  buffers.set(bid, { buffer: buf, peaks: computePeaks(buf), name: f.name, fileKey: 'file:' + bid }); dbPut('file:' + bid, f);
  S.audios.push({ id: uid(), bufferId: bid, name: s.name, start: Math.max(0, t - 0.05), in: a, out: z, volume: 0.8, fadeIn: 0, fadeOut: 0 });
  return true;
}
// Aplica a receita da IA com as funções do agente. Tudo num passo só de desfazer.
async function aplicarReceita(r, F = {}) {
  const A = window.__agente; if (!A) throw new Error('agente indisponível');
  const P = A.palavras(), n = P.length; if (!n) throw new Error('sem transcrição');
  const ok = (i) => Number.isInteger(i) && i >= 0 && i < n;
  const trechos = (r.trechos || []).map((t) => [Math.max(0, t.de | 0), Math.min(n - 1, t.ate | 0)]).filter(([a, b]) => b >= a);
  if (!trechos.length) throw new Error('A IA não devolveu trechos para manter.');
  commit();
  // tem transcrição mas ainda não tem legenda: monta os blocos (até 4 palavras, quebra em pausa ou fim de frase)
  for (const mid of [...new Set(S.clips.map((c) => c.mediaId))]) {
    if (S.captions.some((c) => c.mediaId === mid) || !(S.words[mid] || []).length) continue;
    const blocos = []; let cur = [];
    for (const w of S.words[mid]) { const p = cur[cur.length - 1]; if (p && (cur.length >= 4 || w.start - p.end > 0.7 || /[.!?…]$/.test(p.text))) { blocos.push(cur); cur = []; } cur.push(w); }
    if (cur.length) blocos.push(cur);
    blocos.forEach((bw, i) => { const nx = blocos[i + 1]; let fim = bw[bw.length - 1].end + 0.3; if (nx) fim = Math.min(fim, nx[0].start);
      S.captions.push({ id: uid(), mediaId: mid, start: bw[0].start, end: Math.max(fim, bw[0].start + 0.2), text: bw.map((w) => w.text).join(' ') }); });
  }
  A.montar(trechos, { pausa: clamp(+r.pausa_max || 0.35, 0.2, 0.6) });
  // legenda
  const L = r.legenda || {}, kitP = (await conta.perfil().catch(() => null))?.kit || {}, cores = kitP.cores || {};
  const fonteTit = FONTS.some((f) => f.id === kitP.fontes?.titulo) ? kitP.fontes.titulo : null;
  const hex = (c, d) => (/^#[0-9a-f]{6}$/i.test(c || '') ? c.toUpperCase() : d);
  const tpl = L.modelo && L.modelo !== 'simples' && tplById(L.modelo) ? L.modelo : null;
  Object.assign(S.cap, { tpl, upper: !!L.maiusculas, y: { alto: 0.25, meio: 0.5, baixo: 0.75 }[L.posicao] ?? S.cap.y });
  if (FONTS.some((f) => f.id === L.fonte)) S.cap.font = L.fonte;
  if (tpl) { S.cap.tcolor = hex(L.cor, null); S.cap.tacc = hex(L.cor_destaque, hex(cores.destaque, null)); } else S.cap.color = hex(L.cor, S.cap.color);
  let comb = 0, ruins = 0;
  if (tpl && (r.destaques || []).length) A.destacar(r.destaques.slice(0, 30));
  if (r.zoom_nos_cortes) A.zooms(); else S.zooms = [];
  if (tpl === 'elegante') for (const c of (r.combinacoes || []).slice(0, 4)) { try { A.combinar(c.grande, c.manuscrito); comb++; } catch { ruins++; } }
  const tl = (i) => (ok(i) ? A.tempoNaTimeline(P[i].m, P[i].s) : null);
  for (const z of (r.zooms_pontos || []).slice(0, 6)) { const t = tl(z.palavra); if (t != null) { try { A.zoomNaFrase(t, { forca: clamp(+z.forca || 1.2, 1.05, 1.35) }); } catch { ruins++; } } }
  // transições
  const tp = ['none', 'flash', 'burn'].includes(r.transicao_padrao) ? r.transicao_padrao : 'none';
  S.clips.forEach((c, i) => (c.transition = i ? tp : 'none'));
  for (const x of r.transicoes || []) {
    const t = tl(x.palavra); if (t == null || !['none', 'flash', 'burn'].includes(x.tipo)) continue;
    let acc = 0; for (let i = 0; i < S.clips.length; i++) { const len = S.clips[i].out - S.clips[i].in; if (t < acc + len) { if (i) S.clips[i].transition = x.tipo; break; } acc += len; }
  }
  // efeitos sonoros
  await loadSfxIndex(); let sons = 0;
  for (const x of (r.sons || []).slice(0, 20)) { const t = tl(x.palavra); if (t != null) { try { if (await addSfxEm(x.som, t)) sons++; } catch {} } }
  // textos / motion
  let textos = 0;
  if (F.motion !== false) for (const x of (r.textos || []).slice(0, 12)) {
    const t = tl(x.palavra); if (t == null || !String(x.texto || '').trim()) continue;
    A.titulo(String(x.texto).slice(0, 60), +t.toFixed(2), clamp(+x.duracao || 2.2, 0.8, 5), { layout: LAYOUTS.some((l) => l.id === x.layout) ? x.layout : 'mix', tcolor: S.cap.tcolor || null, tacc: S.cap.tacc || null, font: fonteTit || S.cap.font });
    const Ly = S.layers[S.layers.length - 1];
    const an = { in: presetByName(x.animacao_entrada) ? x.animacao_entrada : null, out: presetByName(x.animacao_saida) ? x.animacao_saida : null };
    if (an.in || an.out) Ly.anim = an;
    textos++;
  }
  A.aplicar(); savePrefs();
  const dur = total();
  return `${S.clips.length} cortes, ${dur.toFixed(0)} s` + (comb ? `, ${comb} frase(s) de efeito` : '') + (sons ? `, ${sons} som(ns)` : '') + (textos ? `, ${textos} texto(s)` : '') + (r.resumo ? ` — ${r.resumo}` : '');
}

// ---------- Aviso no iPhone: abrir pelo app instalado ----------
function avisoInstalar() {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const instalado = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
  if (!ios || instalado) return;
  try { if (Date.now() - (+localStorage.getItem('aviso-instalar') || 0) < 3 * 86400000) return; } catch {}
  const d = document.createElement('div'); d.id = 'aviso-instalar';
  d.innerHTML = `<span>Instale o Meu Editor na Tela de Início para usar como app.</span><a href="instalar.html">Como instalar</a><button aria-label="Fechar">${ic('x')}</button>`;
  d.querySelector('button').onclick = () => { d.remove(); try { localStorage.setItem('aviso-instalar', String(Date.now())); } catch {} };
  document.body.appendChild(d);
}
contaPronta.then(avisoInstalar);

$('#btn-ia').innerHTML = ic('sparkle') + '<span>IA</span>';
$('#btn-ia').onclick = openIA;
$('#btn-config').innerHTML = ic('gear');
$('#btn-config').onclick = openConfig;

// aplicarEstado: o agente do Marcelo mexe em S direto e chama isto para redesenhar e salvar o projeto.
const aplicarEstado = () => { S.clips.forEach(normClip); refresh(); saveSoon(); return S.clips.length; };
window.__corte = { S, aplicarEstado, aplicarReceita, avisoInstalar, conta, exportarArquivo, galeriaSalvar, galeriaListar, linkProjeto, galeria: () => galeria, renderMixdown, openFs, closeFs, importVideos, addAudioFromFile, play, pause, seekTo, transcribeAll, startExport, media, buffers, transSound, sfxBuffer, extractAudio, decodeMp4Aac, decodeAudio };
window.__agente = criarAgente(window.__corte);
