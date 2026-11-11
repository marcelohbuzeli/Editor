// Corte — editor de vídeo simples para iPhone (PWA)
// Tudo roda no aparelho: nada é enviado para servidores (exceto se usar a transcrição via Groq).

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
  unlink: '<path d="m18.84 12.25 1.72-1.71a5 5 0 0 0-7.07-7.07l-1.72 1.71M5.17 11.75l-1.71 1.71a5 5 0 0 0 7.07 7.07l1.71-1.71M8 2v3M2 8h3M16 22v-3M22 16h-3"/>',
};
const ic = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[n]}</svg>`;

// ---------- Estado ----------
const FONTS = [
  { id: 'Poppins', css: "'Poppins', sans-serif" },
  { id: 'Montserrat', css: "'Montserrat', sans-serif" },
  { id: 'Times New Roman', css: "'Times New Roman', Times, serif" },
];
const COLORS = ['#FFFFFF', '#F7E8B0', '#FFD84D', '#000000'];
const fontCss = (id) => (FONTS.find((f) => f.id === id) || FONTS[0]).css;

const DEFAULT_CAP = { font: 'Poppins', weight: 700, size: 60, color: '#FFFFFF', shadow: 60, blur: 12, y: 0.75, upper: false };
const DEFAULT_FX = {
  fadeIn: { on: false, dur: 0.5 }, fadeOut: { on: false, dur: 1.0 }, fadeAudio: true,
  flashDur: 0.3, click: true, clickDb: -10, autoTr: 'flash',
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
  zooms: [],     // efeitos de zoom: { id, clipId, off (s desde o início do clipe), dur, type: 'in'|'out', amount }
  t: 0,
  sel: null,      // { type: 'clip'|'audio'|'caption', id }
};
// v3: novos padrões de legenda (60 / 75%) e fades desligados por padrão
if ((prefs.v || 0) < 3) { S.cap.size = 60; S.cap.y = 0.75; S.fx.fadeOut.on = false; S.fx.fadeIn.on = false; }
if (prefs.fx && prefs.fx.autoTr == null) S.fx.autoTr = prefs.fx.autoFlash === false ? 'none' : 'flash';
// Cada clipe tem o áudio original vinculado: aOn (ligado), volume, afi/afo (fade in/out em segundos)
const normClip = (c) => { c.aOn ??= true; c.volume ??= 1; c.afi ??= 0; c.afo ??= 0; c.transition ??= 'none'; return c; };
const media = new Map();    // id -> { id, name, url, duration, w, h, bufferId, thumb }
const buffers = new Map();  // id -> { buffer, peaks, name, fileKey }

function loadPrefs() { try { return JSON.parse(localStorage.getItem('corte-prefs') || '{}'); } catch { return {}; } }
function savePrefs() {
  try { localStorage.setItem('corte-prefs', JSON.stringify({ v: 3, cap: S.cap, fx: S.fx, groqKey: prefs.groqKey, res: prefs.res, zoomDef: prefs.zoomDef })); } catch {}
}

// ---------- Histórico (desfazer/refazer) ----------
const hist = { past: [], future: [] };
const snap = () => JSON.stringify({ clips: S.clips, audios: S.audios, captions: S.captions, zooms: S.zooms, fx: S.fx, cap: S.cap, origVolume: S.origVolume });
function pushHist(s) { hist.past.push(s); if (hist.past.length > 80) hist.past.shift(); hist.future = []; updUndo(); savePrefs(); saveSoon(); }
const commit = () => pushHist(snap());
function restore(str) { Object.assign(S, { zooms: [] }, JSON.parse(str)); S.clips.forEach(normClip); S.sel = null; refresh(); saveSoon(); }
function undo() { if (!hist.past.length) return; hist.future.push(snap()); restore(hist.past.pop()); updUndo(); }
function redo() { if (!hist.future.length) return; hist.past.push(snap()); restore(hist.future.pop()); updUndo(); }
function updUndo() { $('#btn-undo').disabled = !hist.past.length; $('#btn-redo').disabled = !hist.future.length; }

// ---------- Linha do tempo: cálculos ----------
function layout() {
  let t = 0;
  return S.clips.map((clip, i) => { const d = clip.out - clip.in; const r = { clip, i, start: t, end: t + d }; t += d; return r; });
}
const total = () => S.clips.reduce((a, c) => a + (c.out - c.in), 0);
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
      if (b - a > 0.02) out.push({ cap: c, start: r.start + a - r.clip.in, end: r.start + b - r.clip.in });
    }
  }
  return out.sort((x, y) => x.start - y.start);
}
function captionAt(t, r) {
  if (!r) return null;
  const s = r.clip.in + (t - r.start);
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
function scheduleAudio(fromT, dest) {
  const ctx = ac(), now = ctx.currentTime + 0.06, T = total(), L = layout(), nodes = [];
  const master = ctx.createGain(); master.connect(dest);
  const fin = S.fx.fadeAudio && S.fx.fadeIn.on, fout = S.fx.fadeAudio && S.fx.fadeOut.on;
  const mp = [[0, fin ? 0 : 1]];
  if (fin) mp.push([Math.min(S.fx.fadeIn.dur, T), 1]);
  if (fout) mp.push([Math.max(0, T - S.fx.fadeOut.dur), 1], [T, 0]); else mp.push([T, 1]);
  envelope(master.gain, mp, fromT, now);

  const add = (buffer, gainVal, tlStart, srcOffset, dur, pts) => {
    if (dur <= 0.005) return;
    const src = ctx.createBufferSource(); src.buffer = buffer;
    const g = ctx.createGain(); g.gain.value = gainVal;
    if (pts) envelope(g.gain, pts, fromT, now);
    src.connect(g).connect(master);
    src.start(now + Math.max(0, tlStart - fromT), Math.max(0, srcOffset), dur);
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
    const pts = (fi || fo) ? [[r.start, fi ? 0 : v], [r.start + fi, v], [r.end - fo, v], [r.end, fo ? 0 : v]] : null;
    add(b.buffer, v, r.start + off, c.in + off, len - off, pts);
  }
  // efeitos sonoros das transições (podem começar antes do corte)
  const sfx = (buf, gain, tlStart) => {
    if (!buf) return;
    const off = Math.max(0, fromT - tlStart); if (off >= buf.duration) return;
    add(buf, gain, tlStart + off, off, buf.duration - off);
  };
  for (const ct of cuts(L)) {
    if (ct.type === 'flash' && S.fx.click) sfx(clickBuf, dbToGain(S.fx.clickDb), ct.t);
    if (ct.type === 'burn' && S.fx.burnSound) sfx(burnBuf, dbToGain(S.fx.burnDb), ct.t - BURN_PEAK);
  }
  // trilhas de áudio extraídas
  for (const a of S.audios) {
    const b = buffers.get(a.bufferId); if (!b) continue;
    const aEnd = a.start + (a.out - a.in);
    if (aEnd <= fromT || a.start >= T) continue;
    const s0 = Math.max(a.start, fromT), e0 = Math.min(aEnd, T);
    const len = aEnd - a.start, fi = Math.min(a.fadeIn || 0, len / 2), fo = Math.min(a.fadeOut || 0, len / 2), v = a.volume ?? 1;
    const pts = [[a.start, fi > 0 ? 0 : v], [a.start + fi, v], [aEnd - fo, v], [aEnd, fo > 0 ? 0 : v]];
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
  const s = clamp(r.clip.in + (t - r.start), r.clip.in, Math.max(r.clip.in, r.clip.out - 0.02));
  let v = pool.find((x) => x._clipId === r.clip.id);
  if (!v) { v = pool.find((x) => x !== activeV) || pool[0]; assign(v, r.clip, s); }
  if (v !== activeV) { if (activeV) activeV.pause(); activeV = v; }
  if (E.playing && !E.stalled) {
    if (v.paused) v.play().catch(() => {});
    if (!v.seeking && Math.abs(v.currentTime - s) > 0.25) v.currentTime = s;
  } else {
    if (!v.paused) v.pause();
    if (!v.seeking && v._pending == null && Math.abs(v.currentTime - s) > 0.04) v.currentTime = s;
  }
  const nr = L[idx + 1], other = pool.find((x) => x !== v);
  if (nr && other._clipId !== nr.clip.id) { other.pause(); assign(other, nr.clip, nr.clip.in); }
  return { r, s, v };
}
const isReady = (st) => st && st.v._clipId === st.r.clip.id && !st.v.seeking && st.v._pending == null && st.v.readyState >= 2;

// ---------- Renderização ----------
const pv = $('#preview'), pctx = pv.getContext('2d');
function render(ctx, W, H, t, st) {
  if (!isReady(st)) return false; // mantém o último quadro enquanto carrega
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const v = st.v, vw = v.videoWidth, vh = v.videoHeight;
  if (vw && vh) {
    const k = Math.min(W / vw, H / vh) * zoomAt(t, st.r), w = vw * k, h = vh * k;
    ctx.drawImage(v, (W - w) / 2, (H - h) / 2, w, h);
  }
  const cap = captionAt(t, st.r);
  if (cap && cap.text.trim()) drawCaption(ctx, W, H, cap.text);
  overlays(ctx, W, H, t);
  return true;
}
function overlays(ctx, W, H, t) {
  const T = total(), fx = S.fx;
  let fa = 0;
  for (const ct of cuts()) {
    if (ct.type === 'flash') { const half = fx.flashDur / 2, d = Math.abs(t - ct.t); if (d < half) fa = Math.max(fa, 1 - d / half); }
    else if (ct.type === 'burn') { const p = (t - ct.t) / fx.burnDur + 0.5; if (p > 0 && p < 1) drawFilmBurn(ctx, W, H, p, ct.seed); }
  }
  if (fa > 0) { ctx.fillStyle = `rgba(255,255,255,${fa})`; ctx.fillRect(0, 0, W, H); }
  let ba = 0;
  if (fx.fadeIn.on && t < fx.fadeIn.dur) ba = Math.max(ba, 1 - t / fx.fadeIn.dur);
  if (fx.fadeOut.on && T - t < fx.fadeOut.dur) ba = Math.max(ba, 1 - (T - t) / fx.fadeOut.dur);
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
function drawCaption(ctx, W, H, text) {
  const c = S.cap, k = Math.min(W, H) / 1080, fs = c.size * k;
  ctx.save();
  ctx.font = `${c.weight} ${fs}px ${fontCss(c.font)}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const lines = wrapLines(ctx, c.upper ? text.toUpperCase() : text, W * 0.86);
  const lh = fs * 1.2; let y = c.y * H - (lines.length - 1) * lh / 2;
  ctx.fillStyle = c.color;
  const passes = c.shadow > 0 ? 1 + (c.shadow > 60) + (c.shadow > 85) : 1;
  ctx.shadowColor = `rgba(0,0,0,${c.shadow / 100})`; ctx.shadowBlur = c.blur * k; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
  for (const ln of lines) { for (let p = 0; p < passes; p++) ctx.fillText(ln, W / 2, y); y += lh; }
  ctx.restore();
}
function draw() {
  if (!S.clips.length) { pctx.fillStyle = '#000'; pctx.fillRect(0, 0, pv.width, pv.height); return; }
  render(pctx, pv.width, pv.height, S.t, syncVideos(S.t));
}
function sizePreview() {
  const a = S.aspect || 9 / 16;
  const W = a < 1 ? 540 : Math.round(540 * a), H = a < 1 ? Math.round(540 / a) : 540;
  if (pv.width !== W || pv.height !== H) { pv.width = W; pv.height = H; }
}
function outSize(res) {
  const a = S.aspect || 9 / 16, short = res === '4k' ? 2160 : 1080;
  const even = (x) => Math.round(x / 2) * 2;
  return a < 1 ? [short, even(short / a)] : [even(short * a), short];
}

// ---------- Motor de reprodução ----------
const E = { playing: false, exporting: false, stalled: false, stallSince: 0, sched: null, raf: 0, rec: null, exp: null };
function clock() { return E.sched ? Math.max(E.sched.fromT, E.sched.fromT + (actx.currentTime - E.sched.startCtx)) : S.t; }
async function play() {
  if (!S.clips.length || E.playing) return;
  ac(); await actx.resume();
  if (S.t >= total() - 0.05) S.t = 0;
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
  const st = syncVideos(t), ready = isReady(st);
  if (!ready && !E.stalled) {
    E.stalled = true; E.stallSince = performance.now();
    actx.suspend(); if (E.rec && E.rec.state === 'recording') E.rec.pause(); st && st.v.pause();
  } else if (E.stalled && (ready || performance.now() - E.stallSince > 1500)) {
    E.stalled = false; st && st.v.play().catch(() => {});
    actx.resume(); if (E.rec && E.rec.state === 'paused') E.rec.resume();
  }
  S.t = t;
  render(pctx, pv.width, pv.height, t, st);
  if (E.exporting) {
    render(E.exp.cx, E.exp.W, E.exp.H, t, st);
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
  const audioEnd = S.audios.reduce((m, a) => Math.max(m, a.start + a.out - a.in), 0);
  inner.style.width = (Math.max(T, audioEnd) * pps + sc.clientWidth) + 'px';

  // régua
  const ruler = $('#ruler'); ruler.innerHTML = '';
  const step = pps >= 80 ? 1 : pps >= 30 ? 2 : pps >= 12 ? 5 : 10;
  for (let s = 0; s <= Math.max(T, audioEnd) + 0.001; s += step) {
    const d = document.createElement('div'); d.className = 'tick'; d.style.left = (h + s * pps) + 'px';
    d.innerHTML = `<span>${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}</span>`; ruler.appendChild(d);
  }

  // vídeo
  const tv = $('#track-video'); tv.innerHTML = '';
  for (const r of L) {
    const el = document.createElement('div');
    const isSel = S.sel?.type === 'clip' && S.sel.id === r.clip.id;
    el.className = 'clip' + (isSel ? ' sel' : '');
    el.style.left = (h + r.start * pps) + 'px'; el.style.width = Math.max(3, (r.end - r.start) * pps - 2) + 'px';
    const m = media.get(r.clip.mediaId); if (m?.thumb) el.style.backgroundImage = `url(${m.thumb})`;
    el.innerHTML = `<span class="dur">${(r.end - r.start).toFixed(1)}s</span>`;
    el.onclick = (e) => { e.stopPropagation(); select('clip', r.clip.id); };
    tv.appendChild(el);
    for (const z of S.zooms.filter((x) => x.clipId === r.clip.id)) {
      const zb = document.createElement('button'); zb.className = 'zm'; zb.style.left = (h + (r.start + z.off) * pps + 3) + 'px';
      zb.innerHTML = ic(z.type === 'in' ? 'zoomIn' : 'zoomOut'); zb.setAttribute('aria-label', 'Zoom');
      zb.onclick = (e) => { e.stopPropagation(); openZoomSheet(r.clip.id, z.id); }; tv.appendChild(zb);
    }
    if (r.i > 0) {
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
    if (has) { const cv = document.createElement('canvas'); el.appendChild(cv); drawWave(cv, m.bufferId, c.in, c.out, (c.volume ?? 1) * S.origVolume, c.afi, c.afo, w); }
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = has ? '🔗 Áudio original' : 'sem áudio'; el.appendChild(nm);
    el.onclick = (e) => { e.stopPropagation(); has ? select('clipaudio', c.id) : toast('Não consegui ler o áudio deste vídeo', 2500); };
    to.appendChild(el);
  }

  // legendas
  const tc = $('#track-caps'); tc.innerHTML = '';
  for (const sp of capSpans(L)) {
    const el = document.createElement('div');
    el.className = 'capb' + (S.sel?.type === 'caption' && S.sel.id === sp.cap.id ? ' sel' : '');
    el.style.left = (h + sp.start * pps) + 'px'; el.style.width = Math.max(3, (sp.end - sp.start) * pps - 1) + 'px';
    el.textContent = sp.cap.text;
    el.onclick = (e) => { e.stopPropagation(); seekTo(sp.start + 0.01); select('caption', sp.cap.id); };
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
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = '♪ ' + (a.name || 'Áudio'); el.appendChild(nm);
    el.onclick = (e) => { e.stopPropagation(); select('audio', a.id); };
    ta.appendChild(el);
    drawWave(cv, a.bufferId, a.in, a.out, a.volume ?? 1, a.fadeIn, a.fadeOut, w);
  }
  followScroll(true);
}
function drawWave(cv, bufferId, inP, outP, vol, fi, fo, w) {
  const b = buffers.get(bufferId); if (!b) return;
  const H = 30, dpr = Math.min(2, window.devicePixelRatio || 1), W = Math.min(4000, Math.ceil(w));
  cv.width = W * dpr; cv.height = H * dpr;
  const c = cv.getContext('2d'); c.scale(dpr, dpr); c.fillStyle = 'rgba(255,226,110,.85)';
  const p = b.peaks, rate = 50, len = outP - inP;
  for (let x = 0; x < W; x++) {
    const tt = inP + (x / W) * len, i = Math.floor(tt * rate);
    const tl = x / W * len;
    let env = 1;
    if (fi && tl < fi) env = tl / fi;
    if (fo && len - tl < fo) env = Math.min(env, (len - tl) / fo);
    const amp = Math.min(1, (p[i] || 0) * vol * env) * (H - 6);
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
      ['left', 'Mover', () => moveClip(sel.id, -1)], ['right', 'Mover', () => moveClip(sel.id, 1)],
      ['trimL', 'Aparar início', () => trimClip(sel.id, 'start')], ['trimR', 'Aparar fim', () => trimClip(sel.id, 'end')],
      ['zoomIn', 'Zoom', () => openZoomSheet(sel.id)], ['zap', 'Transição', () => openCutSheet(sel.id)], ['volume', 'Áudio', () => openClipAudioSheet(sel.id)],
      ['x', 'Fechar', () => select(null)],
    ];
  } else if (sel?.type === 'clipaudio') {
    items = [
      ['scissors', 'Dividir', splitAtPlayhead], ['sliders', 'Volume e fade', () => openClipAudioSheet(sel.id)],
      ['unlink', 'Desvincular', () => unlinkAudio(sel.id)], ['trash', 'Apagar áudio', () => deleteClipAudio(sel.id), 'danger'],
      ['x', 'Fechar', () => select(null)],
    ];
  } else if (sel?.type === 'audio') {
    items = [
      ['scissors', 'Dividir', splitAtPlayhead], ['trash', 'Apagar', () => deleteAudio(sel.id), 'danger'],
      ['sliders', 'Volume e fade', () => openAudioSheet(sel.id)], ['target', 'Início aqui', () => audioToPlayhead(sel.id)],
      ['trimL', 'Aparar início', () => trimAudio(sel.id, 'start')], ['trimR', 'Aparar fim', () => trimAudio(sel.id, 'end')],
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
      ['video', 'Vídeo', () => $('#file-video').click()], ['music', 'Áudio de vídeo', () => $('#file-audio').click()],
      ['wave', 'SFX', openSfx], ['type', 'Legendas', () => openCaptions()], ['zap', 'Transições', openTransitions],
      ['fade', 'Fade', openFades], ['zoomIn', 'Zoom', zoomFromToolbar],
      ['volume', 'Som original', openOrigVolume], ['scissors', 'Dividir', splitAtPlayhead],
    ];
  }
  tb.innerHTML = '';
  for (const [icon, label, fn, cls] of items) {
    const b = document.createElement('button'); b.className = 'tool ' + (cls || '');
    b.innerHTML = `${ic(icon)}<span>${label}</span>`; b.onclick = fn; tb.appendChild(b);
  }
}

// ---------- Ações de edição ----------
function newClipTransition() { return S.fx.autoTr || 'none'; }
function splitAtPlayhead() {
  if (S.sel?.type === 'audio') return splitAudio(S.sel.id);
  if (!S.clips.length) return toast('Adicione um vídeo primeiro');
  const r = clipAt(S.t), s = r.clip.in + (S.t - r.start);
  if (s - r.clip.in < 0.1 || r.clip.out - s < 0.1) return toast('Mova o cursor para o meio do clipe');
  commit();
  // o áudio vinculado é cortado junto: o fade in fica na parte da esquerda, o fade out na da direita
  const nc = { ...r.clip, id: uid(), in: s, transition: newClipTransition(), afi: 0 };
  r.clip.out = s; r.clip.afo = 0; S.clips.splice(r.i + 1, 0, nc);
  const cut = s - r.clip.in;
  S.zooms.forEach((z) => { if (z.clipId === r.clip.id && z.off >= cut) { z.clipId = nc.id; z.off -= cut; } });
  if (S.sel?.type === 'clipaudio' && S.sel.id === r.clip.id) S.sel = null;
  refresh();
}
function unlinkAudio(clipId) {
  const r = layout().find((x) => x.clip.id === clipId); if (!r) return;
  const m = media.get(r.clip.mediaId);
  if (!m?.bufferId || r.clip.aOn === false) return toast('Este clipe não tem áudio vinculado');
  commit();
  const a = { id: uid(), bufferId: m.bufferId, name: 'Áudio de ' + m.name.replace(/\.[^.]+$/, ''), start: r.start, in: r.clip.in, out: r.clip.out,
    volume: (r.clip.volume ?? 1) * S.origVolume, fadeIn: r.clip.afi || 0, fadeOut: r.clip.afo || 0 };
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
    r.clip.in += d; S.t = r.start;
    S.zooms.forEach((z) => { if (z.clipId === id) z.off -= d; });
    S.zooms = S.zooms.filter((z) => z.clipId !== id || z.off >= -0.01).map((z) => (z.clipId === id && z.off < 0 ? { ...z, off: 0 } : z));
  } else { r.clip.out = r.clip.in + d; S.zooms = S.zooms.filter((z) => z.clipId !== id || z.off < d); }
  refresh();
}
function splitAudio(id) {
  const a = S.audios.find((x) => x.id === id); if (!a) return;
  const off = S.t - a.start;
  if (off < 0.1 || off > a.out - a.in - 0.1) return toast('Coloque o cursor dentro do áudio selecionado');
  commit();
  const na = { ...a, id: uid(), start: S.t, in: a.in + off, fadeIn: 0 };
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
async function importVideos(files) {
  ac(); let warned = false;
  for (const f of files) {
    toast(`Carregando ${f.name}…`, 60000);
    try {
      const m = await loadMedia(f);
      commit();
      media.set(m.id, m);
      if (!S.aspect) S.aspect = m.w / m.h;
      S.clips.push(normClip({ id: uid(), mediaId: m.id, in: 0, out: m.duration, transition: S.clips.length ? newClipTransition() : 'none', volume: 1 }));
      if (!m.bufferId) { warned = true; toast('Vídeo adicionado, mas não consegui ler o áudio dele', 4000); }
      dbPut('file:' + m.id, f);
    } catch (e) { console.error(e); warned = true; toast('Não consegui abrir ' + f.name + ': ' + e.message, 4000); }
  }
  if (!warned) toast('Vídeo adicionado', 1200);
  refresh();
}
async function loadMedia(file, id = uid()) {
  const url = URL.createObjectURL(file);
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
async function addAudioFromFile(f, label) {
  toast(label ? 'Adicionando…' : 'Extraindo áudio…', 60000);
  try {
    const buf = await extractAudio(f);
    const bid = uid();
    buffers.set(bid, { buffer: buf, peaks: computePeaks(buf), name: f.name, fileKey: 'file:' + bid });
    dbPut('file:' + bid, f);
    commit();
    const a = { id: uid(), bufferId: bid, name: label || f.name.replace(/\.[^.]+$/, ''), start: S.clips.length ? S.t : 0, in: 0, out: buf.duration, volume: 1, fadeIn: 0, fadeOut: 0 };
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
function rangeRow(key, label, min, max, step, val, fmtv) {
  return `<div class="row"><label>${label}</label><input type="range" data-k="${key}" min="${min}" max="${max}" step="${step}" value="${val}"><span class="val" data-v="${key}">${fmtv(val)}</span></div>`;
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
  });
}
const sec = (s) => `${(+s).toFixed(1)}s`;
const pctf = (v) => `${Math.round(v)}%`;

const inlineIc = (n, s = 14) => ic(n).replace('<svg', `<svg style="width:${s}px;height:${s}px;display:inline;vertical-align:-2px"`);
function playSfx(buf, db) { if (!buf) return toast('Som ainda carregando…'); const c = ac(); c.resume(); const s = c.createBufferSource(); s.buffer = buf; const g = c.createGain(); g.gain.value = dbToGain(db); s.connect(g).connect(c.destination); s.start(); }
function openTransitions() {
  const fx = new Proxy({}, { get: (_, k) => S.fx[k], set: (_, k, v) => ((S.fx[k] = v), true) });
  openSheet('trans', 'Transições', `
    <div class="sec">Aplicar em todos os cortes</div>
    <div class="chips">
      <button class="chip" data-all="flash">${inlineIc('zap')} Flash</button>
      <button class="chip" data-all="burn">${inlineIc('flame')} Film burn</button>
      <button class="chip" data-all="none">Remover</button>
    </div>
    <div class="sec">Automática em cortes novos</div>
    <div class="chips">${['none', 'flash', 'burn'].map((k) => `<button class="chip ${fx.autoTr === k ? 'on' : ''}" data-auto="${k}">${TR_LABEL[k]}</button>`).join('')}</div>
    <div class="sec">${inlineIc('zap')} Flash</div>
    ${rangeRow('flashDur', 'Duração', 0.1, 0.8, 0.05, fx.flashDur, sec)}
    <div class="row"><label>Som de clique</label><span class="spacer"></span><input type="checkbox" class="tg" id="clk" ${fx.click ? 'checked' : ''}></div>
    ${rangeRow('clickDb', 'Volume', -30, 0, 1, fx.clickDb, (v) => `${v} dB`)}
    <button class="chip" id="clk-test">${inlineIc('play', 12)} Ouvir clique</button>
    <div class="sec">${inlineIc('flame')} Film burn</div>
    ${rangeRow('burnDur', 'Duração', 0.4, 2, 0.1, fx.burnDur, sec)}
    <div class="row"><label>Som</label><span class="spacer"></span><input type="checkbox" class="tg" id="brn" ${fx.burnSound ? 'checked' : ''}></div>
    ${rangeRow('burnDb', 'Volume', -30, 0, 1, fx.burnDb, (v) => `${v} dB`)}
    <button class="chip" id="brn-test">${inlineIc('play', 12)} Ouvir som</button>
    <p class="note">O fade do começo e do final do vídeo fica no botão Fade. Dica: toque no ícone entre dois clipes, na linha do tempo, para escolher a transição só daquele corte.</p>
  `, (b) => {
    const tog = (id, fn) => $(id, b).addEventListener('change', (e) => { commit(); fn(e.target.checked); draw(); renderTimeline(); });
    tog('#clk', (v) => (fx.click = v));
    tog('#brn', (v) => (fx.burnSound = v));
    b.querySelectorAll('[data-all]').forEach((el) => el.onclick = () => {
      const k = el.dataset.all; commit();
      S.clips.forEach((c, i) => (c.transition = i ? k : 'none')); renderTimeline(); draw();
      toast(k === 'none' ? 'Transições removidas' : `${TR_LABEL[k]} aplicado em todos os cortes`);
    });
    b.querySelectorAll('[data-auto]').forEach((el) => el.onclick = () => {
      commit(); fx.autoTr = el.dataset.auto; b.querySelectorAll('[data-auto]').forEach((x) => x.classList.toggle('on', x === el));
    });
    $('#clk-test', b).onclick = () => playSfx(clickBuf, fx.clickDb);
    $('#brn-test', b).onclick = () => playSfx(burnBuf, fx.burnDb);
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
      <button class="chip ${c.transition === 'flash' ? 'on' : ''}" data-tr="flash">${inlineIc('zap')} Flash${S.fx.click ? ' + clique' : ''}</button>
      <button class="chip ${c.transition === 'burn' ? 'on' : ''}" data-tr="burn">${inlineIc('flame')} Film burn${S.fx.burnSound ? ' + som' : ''}</button>
    </div>
    <button class="btn" id="tr-all">Aplicar esta transição a todos os cortes</button>
    <button class="btn" id="tr-prev">${inlineIc('play', 12)} Ver o corte</button>
    <p class="note">Duração e volume dos sons ficam em Transições.</p>
  `, (b) => {
    b.querySelectorAll('[data-tr]').forEach((el) => el.onclick = () => {
      commit(); c.transition = el.dataset.tr;
      b.querySelectorAll('[data-tr]').forEach((x) => x.classList.toggle('on', x === el)); renderTimeline(); draw();
    });
    $('#tr-all', b).onclick = () => { commit(); S.clips.forEach((x, k) => (x.transition = k ? c.transition : 'none')); renderTimeline(); toast('Aplicado a todos os cortes'); };
    $('#tr-prev', b).onclick = () => { seekTo(Math.max(0, layout()[i].start - 1.2)); play(); };
  });
}
function openClipAudioSheet(id) {
  const c = S.clips.find((x) => x.id === id); if (!c) return;
  const m = media.get(c.mediaId);
  if (!m?.bufferId) return toast('Não consegui ler o áudio deste vídeo', 2500);
  if (c.aOn === false) return toast('O áudio deste clipe foi apagado ou desvinculado (use Desfazer para voltar)', 3000);
  const len = c.out - c.in, maxF = Math.min(10, len / 2).toFixed(1);
  openSheet('clipaudio', 'Áudio original do clipe', `
    ${rangeRow('v', 'Volume', 0, 200, 1, Math.round((c.volume ?? 1) * 100), pctf)}
    ${rangeRow('fi', 'Fade in', 0, maxF, 0.1, c.afi || 0, sec)}
    ${rangeRow('fo', 'Fade out', 0, maxF, 0.1, c.afo || 0, sec)}
    <p class="note">Este áudio está vinculado ao clipe: cortar ou apagar o clipe corta/apaga o áudio junto.</p>
    <button class="btn" id="ca-unlink">${inlineIc('unlink')} Desvincular do clipe</button>
    <button class="btn" id="ca-del" style="color:#ff6b6b">${inlineIc('trash')} Apagar este áudio</button>
  `, (b) => {
    bindRanges(b, {
      v: { set: (v) => (c.volume = v / 100), fmt: pctf, after: renderTimeline },
      fi: { set: (v) => (c.afi = v), fmt: sec, after: renderTimeline },
      fo: { set: (v) => (c.afo = v), fmt: sec, after: renderTimeline },
    });
    $('#ca-unlink', b).onclick = () => unlinkAudio(c.id);
    $('#ca-del', b).onclick = () => deleteClipAudio(c.id);
  });
}
function openOrigVolume() {
  openSheet('vol', 'Som original do vídeo', rangeRow('v', 'Volume', 0, 200, 1, Math.round(S.origVolume * 100), pctf) + `
    <p class="note">Afeta o áudio gravado nos vídeos (não mexe nas músicas/áudios adicionados).</p>
    <button class="btn" id="o-del" style="color:#ff6b6b">Apagar o áudio original de todos os clipes</button>
    <button class="btn" id="o-back">Restaurar o áudio original em todos</button>
    <p class="note">Para trocar a trilha: apague o áudio original e adicione outro em "Áudio de vídeo".</p>`,
  (b) => {
    bindRanges(b, { v: { set: (v) => (S.origVolume = v / 100), fmt: pctf, after: renderTimeline } });
    $('#o-del', b).onclick = () => { commit(); S.clips.forEach((c) => (c.aOn = false)); refresh(); toast('Áudio original removido'); };
    $('#o-back', b).onclick = () => { commit(); S.clips.forEach((c) => (c.aOn = true)); refresh(); toast('Áudio original restaurado'); };
  });
}
function openAudioSheet(id) {
  const a = S.audios.find((x) => x.id === id); if (!a) return;
  const len = a.out - a.in;
  openSheet('audio', a.name || 'Áudio', `
    ${rangeRow('v', 'Volume', 0, 200, 1, Math.round((a.volume ?? 1) * 100), pctf)}
    ${rangeRow('fi', 'Fade in', 0, Math.min(10, len / 2).toFixed(1), 0.1, a.fadeIn || 0, sec)}
    ${rangeRow('fo', 'Fade out', 0, Math.min(10, len / 2).toFixed(1), 0.1, a.fadeOut || 0, sec)}
    <p class="note">Para recortar: coloque o cursor no ponto desejado e use "Aparar início", "Aparar fim" ou "Dividir" + "Apagar". "Início aqui" move o áudio para começar no cursor.</p>
  `, (b) => bindRanges(b, {
    v: { set: (v) => (a.volume = v / 100), fmt: pctf, after: renderTimeline },
    fi: { set: (v) => (a.fadeIn = v), fmt: sec, after: renderTimeline },
    fo: { set: (v) => (a.fadeOut = v), fmt: sec, after: renderTimeline },
  }));
}


// ---------- Zoom in / zoom out (efeito dentro do clipe) ----------
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
function zoomFromToolbar() {
  if (!S.clips.length) return toast('Adicione um vídeo primeiro');
  openZoomSheet(clipAt(S.t).clip.id);
}

// ---------- Fade do vídeo (início e final) ----------
function openFades() {
  if (!S.clips.length) return toast('Adicione um vídeo primeiro');
  const f = () => S.fx;
  openSheet('fade', 'Fade do vídeo', `
    <div class="sec">Início do vídeo</div>
    <div class="row"><label>Fade in</label><span class="spacer note">surge do preto</span><input type="checkbox" class="tg" id="fi" ${f().fadeIn.on ? 'checked' : ''}></div>
    ${rangeRow('fiDur', 'Duração', 0.1, 5, 0.1, f().fadeIn.dur, sec)}
    <button class="chip" id="fi-prev">${inlineIc('play', 12)} Ver o início</button>
    <div class="sec">Final do vídeo</div>
    <div class="row"><label>Fade out</label><span class="spacer note">some para o preto</span><input type="checkbox" class="tg" id="fo" ${f().fadeOut.on ? 'checked' : ''}></div>
    ${rangeRow('foDur', 'Duração', 0.1, 5, 0.1, f().fadeOut.dur, sec)}
    <button class="chip" id="fo-prev">${inlineIc('play', 12)} Ver o final</button>
    <div class="sec">Som</div>
    <div class="row"><label>Áudio junto</label><span class="spacer note">o som também faz o fade</span><input type="checkbox" class="tg" id="fa" ${f().fadeAudio ? 'checked' : ''}></div>
  `, (b) => {
    const showIn = () => seekTo(Math.min(total(), f().fadeIn.dur * 0.4));
    const showOut = () => seekTo(Math.max(0, total() - f().fadeOut.dur * 0.6));
    const tog = (id, fn, after) => $(id, b).addEventListener('change', (e) => { commit(); fn(e.target.checked); draw(); if (e.target.checked && after) after(); });
    tog('#fi', (v) => (f().fadeIn.on = v), showIn);
    tog('#fo', (v) => (f().fadeOut.on = v), showOut);
    tog('#fa', (v) => (f().fadeAudio = v));
    $('#fi-prev', b).onclick = () => { seekTo(0); play(); };
    $('#fo-prev', b).onclick = () => { seekTo(Math.max(0, total() - f().fadeOut.dur - 1)); play(); };
    bindRanges(b, {
      fiDur: { set: (v) => (f().fadeIn.dur = v), fmt: sec, after: () => f().fadeIn.on && showIn() },
      foDur: { set: (v) => (f().fadeOut.dur = v), fmt: sec, after: () => f().fadeOut.on && showOut() },
    });
  });
}

// ---------- Biblioteca de SFX ----------
let sfxIndex = null, sfxPrev = null;
const sfxCache = new Map();
async function sfxBuffer(s) {
  if (!sfxCache.has(s.file)) {
    const ab = await (await fetch('sfx/lib/' + encodeURIComponent(s.file))).arrayBuffer();
    sfxCache.set(s.file, await new Promise((res, rej) => ac().decodeAudioData(ab, res, rej)));
  }
  return sfxCache.get(s.file);
}
function stopSfxPrev() { try { sfxPrev?.stop(); } catch {} sfxPrev = null; }
async function openSfx() {
  if (!sfxIndex) { try { sfxIndex = await (await fetch('sfx/lib/index.json')).json(); } catch { return toast('Não consegui carregar a lista de SFX'); } }
  openSheet('sfx', 'SFX', `<p class="note">▶ ouve · ＋ coloca na linha do tempo, no cursor (${fmt(S.t)}).</p>` +
    sfxIndex.map((s, i) => `<div class="sfx-row">
      <button class="mini" data-play="${i}" aria-label="Ouvir">${ic('play')}</button>
      <span class="sfx-name">${esc(s.name)}</span><span class="sfx-dur">${s.dur.toFixed(1)}s</span>
      <button class="mini add" data-add="${i}" aria-label="Adicionar">${ic('plus')}</button></div>`).join(''),
  (b) => {
    b.querySelectorAll('[data-play]').forEach((el) => el.onclick = async () => {
      stopSfxPrev(); const c = ac(); await c.resume();
      try { const src = c.createBufferSource(); src.buffer = await sfxBuffer(sfxIndex[+el.dataset.play]); src.connect(c.destination); src.start(); sfxPrev = src; }
      catch { toast('Não consegui tocar este som'); }
    });
    b.querySelectorAll('[data-add]').forEach((el) => el.onclick = async () => {
      const s = sfxIndex[+el.dataset.add]; stopSfxPrev();
      try {
        const blob = await (await fetch('sfx/lib/' + encodeURIComponent(s.file))).blob();
        await addAudioFromFile(new File([blob], s.file, { type: 'audio/mpeg' }), s.name);
      } catch { toast('Não consegui adicionar este som'); }
    });
  });
}

// ---------- Legendas ----------
let capTab = 'texto';
function openCaptions(tab, focusId) {
  if (!S.clips.length) return toast('Adicione um vídeo primeiro');
  capTab = tab || (S.captions.length ? 'texto' : 'gerar');
  const tabs = [['texto', 'Texto'], ['estilo', 'Estilo'], ['gerar', 'Gerar']];
  const head = `<div class="tabs">${tabs.map(([k, l]) => `<button class="tab ${capTab === k ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>`;
  const body = capTab === 'texto' ? capTextHTML() : capTab === 'estilo' ? capStyleHTML() : capGenHTML();
  openSheet('captions', 'Legendas', head + body, (b) => {
    b.querySelectorAll('[data-tab]').forEach((el) => el.onclick = () => openCaptions(el.dataset.tab));
    if (capTab === 'texto') bindCapText(b, focusId);
    else if (capTab === 'estilo') bindCapStyle(b);
    else bindCapGen(b);
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
  return `<p class="note">Toque no tempo para ir até o bloco. ✂ divide, ⤓ junta com o próximo.</p>` + rows.join('');
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
  const c = S.cap;
  return `
    <div class="sec">Fonte</div>
    <div class="chips">${FONTS.map((f) => `<button class="chip ${c.font === f.id ? 'on' : ''}" data-font="${f.id}" style="font-family:${f.css}">${f.id}</button>`).join('')}</div>
    <div class="sec">Peso</div>
    <div class="chips">${[[400, 'Normal'], [600, 'Médio'], [700, 'Negrito'], [800, 'Extra']].map(([w, l]) => `<button class="chip ${c.weight === w ? 'on' : ''}" data-weight="${w}">${l}</button>`).join('')}</div>
    <div class="sec">Cor</div>
    <div class="chips">${COLORS.map((x) => `<button class="sw ${c.color.toUpperCase() === x ? 'on' : ''}" data-color="${x}" style="background:${x}" aria-label="Cor ${x}"></button>`).join('')}<input type="color" id="cap-color" value="${c.color}" aria-label="Outra cor"></div>
    ${rangeRow('size', 'Tamanho', 24, 160, 1, c.size, (v) => v)}
    ${rangeRow('y', 'Posição', 8, 92, 1, Math.round(c.y * 100), pctf)}
    <div class="sec">Sombra</div>
    ${rangeRow('shadow', 'Intensidade', 0, 100, 1, c.shadow, pctf)}
    ${rangeRow('blur', 'Desfoque', 0, 40, 1, c.blur, (v) => v)}
    <div class="row"><label>Maiúsculas</label><span class="spacer"></span><input type="checkbox" class="tg" id="cap-upper" ${c.upper ? 'checked' : ''}></div>
    <p class="note">O estilo fica salvo como padrão para os próximos vídeos.</p>`;
}
function bindCapStyle(b) {
  const c = S.cap;
  const pick = (attr, fn) => b.querySelectorAll(`[data-${attr}]`).forEach((el) => el.onclick = () => {
    commit(); fn(el.dataset[attr]); b.querySelectorAll(`[data-${attr}]`).forEach((x) => x.classList.toggle('on', x === el)); draw();
  });
  pick('font', (v) => { c.font = v; document.fonts.load(`${c.weight} 40px ${fontCss(v)}`).then(draw); });
  pick('weight', (v) => { c.weight = +v; document.fonts.load(`${c.weight} 40px ${fontCss(c.font)}`).then(draw); });
  pick('color', (v) => { c.color = v; $('#cap-color', b).value = v; });
  let pend = null;
  $('#cap-color', b).addEventListener('input', (e) => { if (!pend) pend = snap(); c.color = e.target.value.toUpperCase(); b.querySelectorAll('[data-color]').forEach((x) => x.classList.remove('on')); draw(); });
  $('#cap-color', b).addEventListener('change', () => { if (pend) pushHist(pend); pend = null; });
  $('#cap-upper', b).addEventListener('change', (e) => { commit(); c.upper = e.target.checked; draw(); });
  bindRanges(b, {
    size: { set: (v) => (c.size = v), fmt: (v) => v },
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
function capGenHTML() {
  if (prefs.groqKey) return `
    <p class="note">Usa o modelo mais preciso (Whisper large v3), com 4 palavras por bloco. É só tocar no botão.</p>
    <button class="btn primary" id="gen">Gerar legendas</button>
    <div class="progress"><div id="gen-bar"></div></div><p class="note" id="gen-st"></p>
    <button class="btn" id="key-change" style="font-weight:400;font-size:13px;background:none;color:var(--muted)">Trocar chave da Groq</button>`;
  return `
    <div class="sec">Configuração (só na primeira vez)</div>
    <p class="note">Cole aqui sua chave da Groq (começa com <b>gsk_</b>). Ela fica salva só neste aparelho.</p>
    <div class="row"><input type="password" id="groq-key" placeholder="gsk_…" autocomplete="off" autocapitalize="off" spellcheck="false"></div>
    <button class="btn primary" id="key-save">Salvar e gerar legendas</button>
    <div class="progress"><div id="gen-bar"></div></div><p class="note" id="gen-st"></p>`;
}
function bindCapGen(b) {
  const st = (msg, pct) => { const e = $('#gen-st'); if (e) e.textContent = msg; if (pct != null) { const bar = $('#gen-bar'); if (bar) bar.style.width = pct + '%'; } };
  const run = async (btn) => {
    btn.disabled = true;
    try { await transcribeAll(st); st('Pronto! Confira e edite o texto na aba Texto.', 100); setTimeout(() => sheetKind === 'captions' && openCaptions('texto'), 900); }
    catch (e) {
      console.error(e);
      if (/401|invalid_api_key/i.test(e.message)) { prefs.groqKey = ''; savePrefs(); openCaptions('gerar'); st('Essa chave não foi aceita pela Groq. Confira e cole de novo.', 0); return; }
      st('Erro: ' + e.message, 0);
    } finally { btn.disabled = false; }
  };
  const gen = $('#gen', b); if (gen) gen.onclick = (e) => run(e.currentTarget);
  const save = $('#key-save', b);
  if (save) save.onclick = (e) => {
    const k = $('#groq-key', b).value.trim();
    if (!/^gsk_\w{20,}$/.test(k)) return st('A chave deve começar com gsk_ (copie ela inteira).', 0);
    prefs.groqKey = k; savePrefs(); run(e.currentTarget);
  };
  const ch = $('#key-change', b); if (ch) ch.onclick = () => { prefs.groqKey = ''; savePrefs(); openCaptions('gerar'); };
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
async function groqTranscribe(pcm, key) {
  if (!key) throw new Error('falta a chave da Groq');
  const fd = new FormData();
  fd.append('file', new Blob([encodeWav(pcm, 16000)], { type: 'audio/wav' }), 'audio.wav');
  fd.append('model', 'whisper-large-v3'); fd.append('language', 'pt'); fd.append('response_format', 'verbose_json');
  fd.append('timestamp_granularities[]', 'word'); fd.append('timestamp_granularities[]', 'segment');
  let r;
  try { r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: 'Bearer ' + key }, body: fd }); }
  catch { throw new Error('sem conexão com a internet'); }
  if (r.status === 429) throw new Error('limite gratuito da Groq atingido; tente de novo em alguns minutos');
  if (!r.ok) throw new Error('Groq respondeu ' + r.status + ': ' + (await r.text()).slice(0, 160));
  const j = await r.json();
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

// ---------- Exportação ----------
function pickMime() {
  const opts = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'];
  return opts.find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';
}
let lastExport = null;
function openExport() {
  if (!S.clips.length) return toast('Adicione um vídeo primeiro');
  if (E.playing) pause();
  const res = prefs.res || '1080';
  openSheet('export', 'Exportar', `
    <div class="chips">
      <button class="chip ${res === '1080' ? 'on' : ''}" data-res="1080">Full HD (1080p)</button>
      <button class="chip ${res === '4k' ? 'on' : ''}" data-res="4k">4K</button>
    </div>
    <p class="note">Duração: ${fmt(total())}. A exportação leva o mesmo tempo do vídeo. Deixe o app aberto e a tela ligada até terminar.</p>
    <button class="btn primary" id="exp-go">Exportar vídeo</button>
    <div id="exp-run" style="display:none">
      <div class="progress"><div id="exp-bar"></div></div><p class="note" id="exp-st"></p>
      <button class="btn" id="exp-cancel">Cancelar</button>
    </div>
    <div id="exp-done"></div>
  `, (b) => {
    b.querySelectorAll('[data-res]').forEach((el) => el.onclick = () => { prefs.res = el.dataset.res; savePrefs(); b.querySelectorAll('[data-res]').forEach((x) => x.classList.toggle('on', x === el)); });
    $('#exp-go', b).onclick = () => startExport(prefs.res || '1080');
    $('#exp-cancel', b).onclick = () => cancelExport();
    if (lastExport) showExportResult(lastExport);
  });
}
async function startExport(res) {
  const mime = pickMime();
  if (!mime || !HTMLCanvasElement.prototype.captureStream) return toast('Este navegador não consegue exportar vídeo', 3000);
  $('#exp-go').style.display = 'none'; $('#exp-run').style.display = 'block'; $('#exp-done').innerHTML = '';
  $('#exp-st').textContent = 'Preparando…';
  await ensureFonts();
  const [W, H] = outSize(res);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const cx = cv.getContext('2d'); cx.fillStyle = '#000'; cx.fillRect(0, 0, W, H);
  ac(); await actx.resume();
  const dest = actx.createMediaStreamDestination();
  const stream = new MediaStream([...cv.captureStream(30).getVideoTracks(), ...dest.stream.getAudioTracks()]);
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: res === '4k' ? 40_000_000 : 14_000_000, audioBitsPerSecond: 192_000 });
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
      if (ex.cancelled) { $('#exp-go') && ($('#exp-go').style.display = 'block'); $('#exp-run') && ($('#exp-run').style.display = 'none'); return; }
      const type = ex.mime.split(';')[0], ext = type.includes('mp4') ? 'mp4' : 'webm';
      const blob = new Blob(ex.chunks, { type });
      if (lastExport) URL.revokeObjectURL(lastExport.url);
      lastExport = { blob, url: URL.createObjectURL(blob), name: `corte-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.${ext}`, type };
      if (sheetKind === 'export') { $('#exp-run').style.display = 'none'; $('#exp-go').style.display = 'block'; showExportResult(lastExport); }
      toast('Vídeo exportado!');
    };
    ex.rec.stop();
  }, 200);
}
function cancelExport() { if (!E.exp) return; E.exp.cancelled = true; finishExport(); }
function showExportResult(x) {
  const box = $('#exp-done'); if (!box) return;
  const mb = (x.blob.size / 1048576).toFixed(1);
  box.innerHTML = `<video class="result" src="${x.url}" controls playsinline></video>
    <p class="note">${x.name} · ${mb} MB</p>
    <button class="btn primary" id="exp-share">Salvar ou postar</button>
    <a class="btn" href="${x.url}" download="${x.name}">Baixar arquivo</a>`;
  $('#exp-share').onclick = async () => {
    const file = new File([x.blob], x.name, { type: x.type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file] }); } catch (e) { if (e.name !== 'AbortError') toast('Não foi possível compartilhar'); }
    } else toast('Use "Baixar arquivo" neste navegador');
  };
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
function saveProject() {
  const used = new Set(S.clips.map((c) => c.mediaId));
  const usedBuf = new Set(S.audios.map((a) => a.bufferId));
  dbPut('project', {
    v: 1, snap: snap(), words: S.words, aspect: S.aspect, t: S.t,
    media: [...media.values()].filter((m) => used.has(m.id)).map(({ url, ...m }) => m),
    buffers: [...buffers.entries()].filter(([id]) => usedBuf.has(id)).map(([id, b]) => ({ id, name: b.name, fileKey: b.fileKey })),
  });
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
    Object.assign(S, { zooms: [] }, JSON.parse(p.snap)); S.clips.forEach(normClip);
    S.clips = S.clips.filter((c) => media.has(c.mediaId));
    S.audios = S.audios.filter((a) => buffers.has(a.bufferId));
    S.words = p.words || {}; S.aspect = p.aspect; S.t = clamp(p.t || 0, 0, total());
    toast('Projeto restaurado', 1200);
  } catch (e) { console.error(e); toast('Não consegui restaurar o projeto anterior', 2500); }
  refresh();
}
async function newProject() {
  if (S.clips.length && !confirm('Começar um projeto novo? O atual será apagado.')) return;
  pause(); S.clips = []; S.audios = []; S.captions = []; S.words = {}; S.aspect = null; S.t = 0; S.sel = null; S.origVolume = 1;
  media.forEach((m) => URL.revokeObjectURL(m.url)); media.clear(); buffers.clear(); hist.past = []; hist.future = [];
  pool.forEach((v) => { v._clipId = null; v._url = null; v.removeAttribute('src'); v.load(); });
  try { await dbOp('readwrite', (s) => s.clear()); } catch {}
  updUndo(); refresh();
}

// ---------- Geral ----------
function updTime() { $('#time').textContent = `${fmt(S.t)} / ${fmt(total())}`; }
function updPlay() { $('#btn-play').innerHTML = ic(E.playing ? 'pause' : 'play'); $('#btn-export').disabled = E.exporting || !S.clips.length; }
let toastT = 0;
function toast(msg, ms = 1800) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms); }
function refresh() {
  $('#empty').classList.toggle('hide', S.clips.length > 0);
  if (S.sel && !(S.sel.type === 'clip' || S.sel.type === 'clipaudio' ? S.clips : S.sel.type === 'audio' ? S.audios : S.captions).some((x) => x.id === S.sel.id)) S.sel = null;
  sizePreview(); renderTimeline(); renderToolbar(); updTime(); updPlay(); draw(); saveSoon();
}

$('#btn-new').innerHTML = ic('file');
$('#btn-undo').innerHTML = ic('undo');
$('#btn-redo').innerHTML = ic('redo');
$('#sheet-close').innerHTML = ic('x');
$('#btn-new').onclick = newProject;
$('#btn-undo').onclick = undo;
$('#btn-redo').onclick = redo;
$('#btn-play').onclick = () => (E.playing ? (E.exporting ? null : pause()) : play());
$('#btn-export').onclick = openExport;
$('#btn-add-first').onclick = () => $('#file-video').click();
$('#sheet-close').onclick = closeSheet;
$('#file-video').onchange = (e) => { const f = [...e.target.files]; e.target.value = ''; if (f.length) importVideos(f); };
$('#file-audio').onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) addAudioFromFile(f); };
window.addEventListener('resize', () => renderTimeline());
document.addEventListener('visibilitychange', () => { if (document.hidden && E.playing && !E.exporting) pause(); if (document.hidden) saveProject(); });
document.fonts.ready.then(draw);
ensureFonts().then(draw);
try { navigator.storage?.persist?.(); } catch {}
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});

updUndo(); refresh(); restoreProject();

// para testes
window.__corte = { S, importVideos, addAudioFromFile, play, pause, seekTo, transcribeAll, startExport, media, buffers, extractAudio, decodeMp4Aac, decodeAudio };
