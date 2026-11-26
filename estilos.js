// Modelos de texto do Meu Editor.
// Cada modelo é um sistema tipográfico: uma fonte base (legenda corrida) e as fontes de destaque
// (display, script, serifa) com as cores e animações dele. O mesmo modelo serve para:
//   1) Modelo de legenda: fala corrida na fonte base; nos pontos altos (*palavra* no texto) entra a combinação.
//   2) Adicionar texto: layouts de título prontos, desenhados com as fontes e cores do modelo.
// Marcação: palavras entre asteriscos são destaque. Ex.: "isso muda *tudo*". Quebra de linha = nova linha.
// Combinação (modelo Elegante): *grande* + _manuscrito_. Ex.: "conteúdo é *profissão* _mais vida_".

import { makePlan, sliceState, applyState } from './animacoes.js?v=26';

const F = {
  poppins: "'Poppins', sans-serif",
  inter: "'Inter', sans-serif",
  anton: "'Anton', Impact, 'Arial Narrow', sans-serif",
  script: "'Great Vibes', 'Snell Roundhand', cursive",
  serif: "'Instrument Serif', 'Times New Roman', serif",
};

export const TEMPLATES = [
  {
    id: 'impacto', name: 'Impacto', desc: 'Bold condensada com marca-texto',
    base: { font: F.poppins, weight: 700, color: '#FFFFFF', active: '#D7FF3A' },
    disp: { font: F.anton, weight: 400, upper: true, scale: 1.0 },
    sans: { font: F.poppins, weight: 600 }, script: F.script, serif: F.serif,
    accent: '#D7FF3A', ink: '#101010', paper: '#FFFFFF', combo: 'box',
  },
  {
    id: 'elegante', name: 'Elegante', desc: 'Bold + script sobreposta',
    base: { font: F.poppins, weight: 600, color: '#FFFFFF', active: '#F1D3B0' },
    disp: { font: F.poppins, weight: 800, upper: false, scale: 0.86 },
    sans: { font: F.poppins, weight: 500 }, script: F.script, serif: F.serif,
    accent: '#F1D3B0', ink: '#3A1119', paper: '#FFFFFF', combo: 'script',
  },
  {
    id: 'editorial', name: 'Editorial', desc: 'Serifa itálica com brilho',
    base: { font: F.inter, weight: 600, color: '#FFFFFF', active: '#FF6A3D' },
    disp: { font: F.serif, weight: 400, upper: false, italic: true, scale: 1.12 },
    sans: { font: F.inter, weight: 600 }, script: F.script, serif: F.serif,
    accent: '#FF6A3D', ink: '#FFFFFF', paper: '#FFFFFF', combo: 'serif',
  },
];
export const tplById = (id) => TEMPLATES.find((t) => t.id === id) || null;

export const LAYOUTS = [
  { id: 'bloco', name: 'Bloco', sample: 'pare de\n*rolar* a tela' },
  { id: 'script', name: 'Script', sample: 'seu\ndestaque' },
  { id: 'etiqueta', name: 'Etiqueta', sample: 'novidade\nvídeo novo\nno ar' },
  { id: 'mix', name: 'Mistura', sample: 'isso muda *tudo*' },
  { id: 'eco', name: 'Eco', sample: 'legenda' },
  { id: 'espacado', name: 'Espaçado', sample: 'altere *aqui*...' },
];
export const layoutById = (id) => LAYOUTS.find((l) => l.id === id) || null;

// Fontes extras usadas pelos modelos (carregadas no index.html via Google Fonts)
const FONT_LOADS = ["400 40px 'Anton'", "400 40px 'Great Vibes'", "400 40px 'Instrument Serif'", "italic 400 40px 'Instrument Serif'",
  "500 40px 'Poppins'", "600 40px 'Poppins'", "800 40px 'Poppins'", "600 40px 'Inter'", "700 40px 'Inter'"];
export const loadTemplateFonts = () => Promise.all(FONT_LOADS.map((f) => document.fonts.load(f).catch(() => null)));

// ---------- utilitários ----------
const cl = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const eOut = (p) => 1 - Math.pow(1 - cl(p), 3);
const eBack = (p) => { p = cl(p); const c = 1.7; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
const fnt = (family, weight, px, italic) => `${italic ? 'italic ' : ''}${weight} ${Math.max(1, px).toFixed(1)}px ${family}`;
const up = (s, on) => (on ? s.toLocaleUpperCase('pt-BR') : s);
const shadowOn = (ctx, px, a = 0.5) => { ctx.shadowColor = `rgba(0,0,0,${a})`; ctx.shadowBlur = px * 0.18; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = px * 0.03; };
const shadowOff = (ctx) => { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; };

export const stripMarks = (s) => String(s || '').replace(/[*_]/g, '');
export function parseMarked(text) {
  // *palavra* = destaque (grande); _palavra_ = parte em manuscrito da combinação (também conta como destaque)
  const out = []; let on = false, sc = false;
  for (const raw of String(text || '').split(/\s+/).filter(Boolean)) {
    let w = raw, hl = on, isSc = sc;
    if (w.startsWith('*')) { on = true; hl = true; w = w.slice(1); }
    if (w.startsWith('_')) { sc = true; isSc = true; w = w.slice(1); }
    const ends = /\*[.,!?…:;"']*$/.test(w), endsSc = /_[.,!?…:;"']*$/.test(w);
    if (ends) w = w.replace(/\*([.,!?…:;"']*)$/, '$1');
    if (endsSc) w = w.replace(/_([.,!?…:;"']*)$/, '$1');
    w = w.replace(/[*_]/g, '');
    if (w) out.push(isSc ? { t: w, hl: true, sc: true } : { t: w, hl });
    if (ends) on = false;
    if (endsSc) sc = false;
  }
  return out;
}
const parseLines = (text) => String(text || '').split('\n').map(parseMarked).filter((l) => l.length);

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
}
// Rabisco feito à mão, desenhado progressivamente (p de 0 a 1)
function scribble(ctx, x0, x1, y, amp, p, color, lw) {
  if (p <= 0) return;
  const N = 48, n = Math.max(2, Math.round(N * cl(p)));
  ctx.save(); shadowOff(ctx); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const u = i / (N - 1), x = x0 + (x1 - x0) * u, yy = y + Math.sin(u * Math.PI * 5) * amp * (0.55 + 0.45 * Math.sin(u * 3.1));
    if (i) ctx.lineTo(x, yy); else ctx.moveTo(x, yy);
  }
  ctx.stroke(); ctx.restore();
}
// Texto com espaçamento entre letras (desenhado letra por letra; funciona em qualquer navegador)
function spacedWidth(ctx, s, sp) { let w = 0; for (const ch of s) w += ctx.measureText(ch).width + sp; return Math.max(0, w - sp); }

// ---------- Animação por pedaço (presets do VysmoText) ----------
// Quando FX está ativo, cada "unidade" desenhada por um layout (palavra, linha, letra, etiqueta, rabisco)
// recebe o estado da animação escolhida, com o escalonamento entre as unidades.
let FX = null;
function U(ctx, x, y, w, h, fn) {
  if (!FX) return fn();
  if (FX.counting) { FX.n++; return; }
  const i = FX.i++; if (i >= FX.P.n) return fn();
  ctx.save(); if (applyState(ctx, sliceState(FX.P, i, FX.t), { x, y, w, h }, FX.k, FX.P.pr.p)) fn(); ctx.restore();
}
const probeCtx = () => (probeCtx.c ??= document.createElement('canvas').getContext('2d'));
const counts = new Map();
export function countUnits(tpl, layoutId, text, B, maxW) {
  const key = [tpl.id, layoutId, text, Math.round(B), Math.round(maxW)].join('|');
  if (counts.has(key)) return counts.get(key);
  FX = { counting: true, n: 0 };
  try { drawLayout(probeCtx(), tpl, layoutId, text, 99, B, maxW); } finally { var n = FX.n; FX = null; }
  if (counts.size > 200) counts.clear(); counts.set(key, n); return n;
}
// phase = { P, t } de animacoes.layerPhase. k = escala dos deslocamentos (px da fonte / 48).
export function drawLayoutFx(ctx, tpl, layoutId, text, B, maxW, phase, k) {
  FX = { P: phase.P, t: phase.t, k, i: 0 };
  try { return drawLayout(ctx, tpl, layoutId, text, 99, B, maxW); } finally { FX = null; }
}
// Entrada das palavras na legenda: cada palavra anima a partir do instante em que é falada
function capWordFx(ctx, anim, n, i, dt, box, k, fn) {
  const P = makePlan(anim, n, 7, { noStagger: true });
  ctx.save(); if (applyState(ctx, sliceState(P, i, dt * 1000), box, k, anim.p)) fn(); ctx.restore();
}

// ---------- Modelo de legenda ----------
// Espaçamento escolhido na legenda: LS = px entre letras (já na escala do vídeo), LF = fator do espaço entre linhas (1 = padrão).
// Nada se sobrepõe: cada parte (linha pequena, destaque grande, manuscrito, linha de baixo) ganha a própria faixa,
// medida com folga para a inclinação e para as hastes da fonte manuscrita.
let LS = 0, LF = 1;
const setLS = (ctx) => { if ('letterSpacing' in ctx) ctx.letterSpacing = LS ? LS + 'px' : '0px'; };
// largura sem o espaço que o navegador acrescenta depois da última letra
const tw = (ctx, t) => Math.max(0, ctx.measureText(t).width - ('letterSpacing' in ctx ? LS : 0));
// fillText centralizado: compensa o espaço extra depois da última letra
const ftc = (ctx, t, x, y) => ctx.fillText(t, x + ('letterSpacing' in ctx ? LS / 2 : 0), y);
const SC_ROT = -4 * Math.PI / 180, BOX_ROT = -2.2 * Math.PI / 180;
// maior tamanho (até px) em que o texto cabe em room. O espaço entre letras é fixo em px, então só as letras encolhem.
function fitPx(ctx, mk, px, text, room) {
  ctx.font = mk(px); const w = tw(ctx, text); if (w <= room) return px;
  const lsTot = ('letterSpacing' in ctx ? LS : 0) * Math.max(0, [...text].length - 1), g = Math.max(1, w - lsTot);
  return px * Math.max(0.25, (room - lsTot) / g);
}

// ctx já está transladado para o centro do bloco. times[i] = instante (tempo de origem) em que a palavra i é falada.
// opt = { ls: px entre letras (escala 1080), lh: espaço entre linhas (1.2 = padrão), k: escala do vídeo }
export function drawCapTpl(ctx, W, tpl, toks, times, s, fs, upper, anim, opt = {}) {
  if (!toks.length) return;
  ctx.save();
  LS = (opt.ls || 0) * (opt.k || 1); LF = (opt.lh || 1.2) / 1.2; setLS(ctx);
  try { capTpl(ctx, W, tpl, toks, times, s, fs, upper, anim); } finally { LS = 0; LF = 1; ctx.restore(); }
}
// quebra uma fila de palavras em linhas que cabem em maxW
function wrapToks(ctx, toks, upper, maxW) {
  const sp = tw(ctx, ' ') + LS * 2, ws = toks.map((t) => tw(ctx, up(t.t, upper)));
  const lines = []; let cur = [], cw = 0;
  toks.forEach((t, i) => { const add = ws[i] + (cur.length ? sp : 0); if (cur.length && cw + add > maxW) { lines.push({ ids: cur, w: cw }); cur = []; cw = 0; } cw += ws[i] + (cur.length ? sp : 0); cur.push(i); });
  if (cur.length) lines.push({ ids: cur, w: cw });
  return { lines, ws, sp };
}
function capTpl(ctx, W, tpl, toks, times, s, fs, upper, anim) {
  const first = toks.findIndex((t) => t.hl);
  if (first < 0) return drawCapRun(ctx, W, tpl, toks, times, s, fs, upper, anim);
  let last = first; toks.forEach((t, i) => { if (t.hl) last = i; });
  const pre = toks.slice(0, first), mid = toks.slice(first, last + 1);
  let post = toks.slice(last + 1);
  const tPre = times.slice(0, first);
  let tPost = times.slice(last + 1);
  const small = fs * 0.62, maxW = W * 0.86;
  // combinação: *grande* + _manuscrito_ (palavras diferentes). Sem _manuscrito_, o destaque não se repete.
  const combo = tpl.combo === 'script';
  const scToks = combo ? mid.filter((t) => t.sc) : [];
  const bigToks = scToks.length ? mid.filter((t) => t.hl && !t.sc) : mid;
  if (scToks.length && bigToks.length) {   // palavras sem marcação entre as duas partes vão para a linha pequena de baixo
    const plain = mid.map((t, i) => [t, times[first + i]]).filter(([t]) => !t.hl);
    post = [...plain.map((x) => x[0]), ...post]; tPost = [...plain.map((x) => x[1]), ...tPost];
  }
  const bigTxt = (bigToks.length ? bigToks : mid).map((t) => t.t).join(' ');
  const scTxt = bigToks.length ? scToks.map((t) => t.t).join(' ').replace(/[.,;:…]+$/, '') : '';
  const tMid = times[first + (bigToks.length ? mid.indexOf(bigToks[0]) : 0)];
  const tSc = scToks.length ? times[first + mid.indexOf(scToks[0])] : tMid;
  // tamanho do destaque: grande, mas cabendo na largura (a caixa do Impacto e a inclinação também contam)
  const d = tpl.disp; let big = fs * 1.95 * d.scale;
  const label = up(bigTxt, d.upper), mkD = (px) => fnt(d.font, d.weight, px, d.italic);
  // Destaque numa linha só enquanto couber grande; se ficaria pequeno demais, quebra em 2 ou 3 linhas.
  // Na caixa do Impacto sobra a margem da caixa (0,32 × o tamanho) dentro da largura.
  const words = label.split(' '), big0 = big, minBig = Math.min(big0, fs * 1.15);
  let bl = [label];
  for (let n = 1; n <= Math.min(3, words.length); n++) {
    bl = splitBalanced(ctx, mkD(big0), words, n);
    big = big0;
    for (let it = 0; it < 3; it++) for (const ln of bl) big = Math.min(big, fitPx(ctx, mkD, big, ln, tpl.combo === 'box' ? maxW - big * 0.32 : maxW));
    if (big >= minBig) break;
  }
  ctx.font = mkD(big);
  const bws = bl.map((ln) => tw(ctx, ln));
  // altura de cada linha do destaque: letra (ou caixa) + o que a inclinação acrescenta nas pontas
  const lineH = tpl.combo === 'box' ? big * 1.02 + Math.abs(Math.sin(BOX_ROT)) * (Math.max(...bws) + big * 0.32) + big * 0.14 : big * 1.05;
  const bigH = lineH * bl.length;
  // manuscrito: logo abaixo do destaque, numa faixa própria
  let spx = 0, sw = 0, scH = 0;
  if (scTxt) {
    const mkS = (px) => fnt(tpl.script, 400, px);
    spx = fitPx(ctx, mkS, big * 0.95, scTxt, maxW); ctx.font = mkS(spx); sw = tw(ctx, scTxt);
    scH = spx * 1.25 + Math.abs(Math.sin(SC_ROT)) * sw;
  }
  ctx.font = fnt(tpl.base.font, tpl.base.weight, small);
  const wPre = pre.length ? wrapToks(ctx, pre, upper, maxW) : null, wPost = post.length ? wrapToks(ctx, post, upper, maxW) : null;
  const lineS = small * 1.2 * LF, gap = small * 0.3 * LF, rows = [];
  if (wPre) rows.push({ k: 'pre', h: lineS * wPre.lines.length });
  const bigF = Math.max(1, LF * 0.9 + 0.1);
  rows.push({ k: 'big', h: bigH * bigF });
  if (scTxt) rows.push({ k: 'sc', h: scH });
  if (wPost) rows.push({ k: 'post', h: lineS * wPost.lines.length });
  const totalH = rows.reduce((a, r) => a + r.h, 0) + gap * (rows.length - 1);
  let y = -totalH / 2;
  for (const r of rows) {
    const cy = y + r.h / 2;
    if (r.k === 'pre') smallRows(ctx, tpl, pre, tPre, s, small, y, lineS, wPre, upper, anim);
    else if (r.k === 'post') smallRows(ctx, tpl, post, tPost, s, small, y, lineS, wPost, upper, anim);
    else if (r.k === 'big') bl.forEach((ln, li) => bigCombo(ctx, tpl, ln, bws[li], tMid, s, big, cy + (li - (bl.length - 1) / 2) * lineH * bigF));
    else scriptPart(ctx, tpl, scTxt, sw, spx, Math.max(tMid, tSc), s, cy);
    y += r.h + gap;
  }
}
// divide as palavras em n linhas de largura parecida
function splitBalanced(ctx, font, words, n) {
  if (n <= 1) return [words.join(' ')];
  ctx.font = font;
  const target = tw(ctx, words.join(' ')) / n, out = []; let cur = [];
  for (let i = 0; i < words.length; i++) {
    const rest = words.length - i, left = n - out.length;
    if (cur.length && (rest < left || (out.length < n - 1 && tw(ctx, [...cur, words[i]].join(' ')) > target * 1.08))) { out.push(cur.join(' ')); cur = []; }
    cur.push(words[i]);
  }
  if (cur.length) out.push(cur.join(' '));
  return out;
}
function smallRows(ctx, tpl, toks, times, s, px, top, lineS, wr, upper, anim) {
  const b = tpl.base;
  ctx.font = fnt(b.font, b.weight, px); ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  wr.lines.forEach((ln, li) => {
    const cy = top + lineS * (li + 0.5); let x = -ln.w / 2;
    for (const i of ln.ids) {
      const t = toks[i], w = wr.ws[i], p = (s - times[i]) / 0.2;
      if (anim) capWordFx(ctx, anim, toks.length, i, s - times[i], { x, y: cy - px / 2, w, h: px }, px / 48, () => { shadowOn(ctx, px); ctx.fillStyle = b.color; ftc(ctx, up(t.t, upper), x + w / 2, cy); });
      else if (p > 0) {
        ctx.save(); ctx.globalAlpha *= eOut(p * 1.4); ctx.translate(x + w / 2, cy + (1 - eOut(p)) * px * 0.35);
        shadowOn(ctx, px); ctx.fillStyle = b.color; ftc(ctx, up(t.t, upper), 0, 0); ctx.restore();
      }
      x += w + wr.sp;
    }
  });
}
function bigCombo(ctx, tpl, label, w, t0, s, px, cy) {
  const p = (s - t0) / 0.28; if (p <= 0) return;
  const d = tpl.disp;
  ctx.save(); ctx.translate(0, cy); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = fnt(d.font, d.weight, px, d.italic);
  if (tpl.combo === 'box') {
    ctx.rotate(BOX_ROT);
    const padX = px * 0.16, bh = px * 1.02, pw = eOut(p * 1.3);
    shadowOff(ctx); ctx.fillStyle = tpl.accent; roundRect(ctx, -w / 2 - padX, -bh / 2, (w + padX * 2) * pw, bh, px * 0.08); ctx.fill();
    const q = cl((p - 0.35) / 0.65);
    if (q > 0) { const sc = 1.18 - 0.18 * eBack(q); ctx.scale(sc, sc); ctx.globalAlpha *= eOut(q * 1.5); ctx.fillStyle = tpl.ink; ftc(ctx, label, 0, px * 0.04); }
  } else if (tpl.combo === 'script') {
    const sc = 0.7 + 0.3 * eBack(p);
    ctx.scale(sc, sc); ctx.globalAlpha *= eOut(p * 1.5); shadowOn(ctx, px, 0.45); ctx.fillStyle = tpl.paper; ftc(ctx, label, 0, 0);
  } else {
    const sc = 0.85 + 0.15 * eOut(p);
    ctx.scale(sc, sc); ctx.globalAlpha *= eOut(p * 1.2);
    ctx.shadowColor = tpl.accent; ctx.shadowBlur = px * 0.45 * (1.4 - 0.6 * eOut(p)); ctx.fillStyle = tpl.accent;
    ftc(ctx, label, 0, 0); shadowOff(ctx); ftc(ctx, label, 0, 0);
  }
  ctx.restore();
}
// a outra parte da combinação em manuscrito, na faixa logo abaixo do destaque, levemente inclinada,
// revelada da esquerda para a direita
function scriptPart(ctx, tpl, txt, sw, spx, t0, s, cy) {
  const q = cl((s - t0 - 0.05) / 0.45); if (q <= 0) return;
  ctx.save(); ctx.translate(0, cy); ctx.rotate(SC_ROT); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = fnt(tpl.script, 400, spx);
  ctx.beginPath(); ctx.rect(-sw / 2 - spx, -spx * 1.5, (sw + spx * 2) * eOut(q), spx * 3); ctx.clip();
  shadowOn(ctx, spx, 0.55); ctx.fillStyle = tpl.accent; ftc(ctx, txt, 0, 0); ctx.restore();
}
// Legenda corrida: palavra por palavra, a palavra falada no momento ganha a cor de destaque do modelo
function drawCapRun(ctx, W, tpl, toks, times, s, fs, upper, anim) {
  const b = tpl.base, maxW = W * 0.86;
  ctx.font = fnt(b.font, b.weight, fs); ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  const { lines, ws, sp } = wrapToks(ctx, toks, upper, maxW);
  let active = -1; times.forEach((t, i) => { if (t <= s) active = i; });
  const lh = fs * 1.2 * LF; let y = -(lines.length - 1) * lh / 2;
  for (const ln of lines) {
    let x = -ln.w / 2;
    for (const i of ln.ids) {
      const p = (s - times[i]) / 0.22;
      if (anim) capWordFx(ctx, anim, toks.length, i, s - times[i], { x, y: y - fs / 2, w: ws[i], h: fs }, fs / 48, () => { shadowOn(ctx, fs, 0.6); ctx.fillStyle = i === active ? b.active : b.color; ftc(ctx, up(toks[i].t, upper), x + ws[i] / 2, y); });
      else if (p > 0) {
        // a palavra cresce até o tamanho final sem passar dele (passar faria encostar na vizinha)
        const sc = 0.62 + 0.38 * eOut(p);
        ctx.save(); ctx.translate(x + ws[i] / 2, y); ctx.scale(sc, sc); ctx.globalAlpha *= eOut(p * 1.6);
        shadowOn(ctx, fs, 0.6); ctx.fillStyle = i === active ? b.active : b.color; ftc(ctx, up(toks[i].t, upper), 0, 0); ctx.restore();
      }
      x += ws[i] + sp;
    }
    y += lh;
  }
}

// ---------- Adicionar texto: layouts de título ----------
// ctx transladado para o centro da camada. lt = segundos desde o início da camada. B = tamanho base em px.
// Devolve { w, h } da caixa ocupada (para seleção e arrasto na prévia).
export function drawLayout(ctx, tpl, layoutId, text, lt, B, maxW = 1e5) {
  const lines = parseLines(text);
  if (!lines.length) return { w: B, h: B };
  ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  const fn = DRAW[layoutId] || DRAW.bloco;
  return fn(ctx, tpl, lines, lt, B, maxW);
}
const lineStr = (ln, u) => up(ln.map((t) => t.t).join(' '), u);

const DRAW = {
  // Linhas empilhadas na fonte display; palavras marcadas ganham marca-texto
  bloco(ctx, tpl, lines, lt, B) {
    const d = tpl.disp, px = B * 1.3 * d.scale, lh = px * 1.06; let maxW = 0;
    ctx.font = fnt(d.font, d.weight, px, d.italic);
    const sp = ctx.measureText(' ').width;
    const rows = lines.map((ln) => { const ws = ln.map((t) => ctx.measureText(up(t.t, d.upper)).width); const w = ws.reduce((a, x) => a + x, 0) + sp * (ln.length - 1); maxW = Math.max(maxW, w); return { ln, ws, w }; });
    const H = rows.length * lh; let y = -H / 2 + lh / 2;
    rows.forEach((r, i) => {
      const p = (lt - i * 0.12) / 0.4;
      if (p > 0) {
        ctx.save(); ctx.translate(0, y + (1 - eOut(p)) * px * 0.45); ctx.globalAlpha *= eOut(p * 1.4);
        let x = -r.w / 2;
        r.ln.forEach((t, j) => {
          const label = up(t.t, d.upper), cx = x + r.ws[j] / 2;
          const wx = x, ww = r.ws[j];
          U(ctx, wx, -px / 2, ww, px, () => {
            if (t.hl) {
              const q = eOut((lt - i * 0.12 - 0.18) / 0.3), padX = px * 0.12, bh = px * 1.08;
              shadowOff(ctx); ctx.fillStyle = tpl.accent; roundRect(ctx, wx - padX, -bh / 2, (ww + padX * 2) * q, bh, px * 0.06); ctx.fill();
              ctx.fillStyle = q > 0.5 ? tpl.ink : tpl.paper; ctx.fillText(label, cx, px * 0.03);
            } else { shadowOn(ctx, px, 0.45); ctx.fillStyle = tpl.paper; ctx.fillText(label, cx, px * 0.03); }
          });
          x += r.ws[j] + sp;
        });
        ctx.restore();
      }
      y += lh;
    });
    return { w: maxW + px * 0.3, h: H };
  },
  // Primeira linha em script, sobreposta ao título em display
  script(ctx, tpl, lines, lt, B) {
    const d = tpl.disp, px = B * 1.35 * d.scale, lh = px * 1.02, spx = B * 1.9;
    const head = lines[0], rest = lines.length > 1 ? lines.slice(1) : [head];
    const scriptTxt = lines.length > 1 ? head.map((t) => t.t).join(' ') : '';
    ctx.font = fnt(d.font, d.weight, px, d.italic);
    const ws = rest.map((ln) => ctx.measureText(lineStr(ln, d.upper)).width);
    const H = rest.length * lh; let y = -H / 2 + lh / 2 + (scriptTxt ? spx * 0.3 : 0);
    rest.forEach((ln, i) => {
      const p = (lt - i * 0.1) / 0.4;
      if (p > 0) {
        const sc = 0.8 + 0.2 * eBack(p);
        ctx.save(); ctx.translate(0, y); ctx.scale(sc, sc); ctx.globalAlpha *= eOut(p * 1.4); ctx.font = fnt(d.font, d.weight, px, d.italic);
        U(ctx, -ws[i] / 2, -px / 2, ws[i], px, () => { shadowOn(ctx, px, 0.45); ctx.fillStyle = ln.some((t) => t.hl) ? tpl.accent : tpl.paper; ctx.fillText(lineStr(ln, d.upper), 0, 0); }); ctx.restore();
      }
      y += lh;
    });
    let sw = 0;
    if (scriptTxt) {
      const q = cl((lt - 0.25) / 0.55);
      ctx.font = fnt(tpl.script, 400, spx); sw = ctx.measureText(scriptTxt).width;
      if (q > 0) {
        const top = -H / 2 + spx * 0.3;
        ctx.save(); ctx.translate(-ws[0] * 0.12, top - spx * 0.05); ctx.rotate(-7 * Math.PI / 180);
        ctx.beginPath(); ctx.rect(-sw / 2 - spx, -spx * 1.5, (sw + spx * 2) * eOut(q), spx * 3); ctx.clip();
        U(ctx, -sw / 2, -spx / 2, sw, spx, () => { shadowOn(ctx, spx, 0.55); ctx.fillStyle = tpl.accent; ctx.fillText(scriptTxt, 0, 0); }); ctx.restore();
      }
    }
    return { w: Math.max(sw, ...ws) + px * 0.3, h: H + (scriptTxt ? spx * 0.6 : 0) };
  },
  // Etiqueta pequena + título + rabisco por baixo
  etiqueta(ctx, tpl, lines, lt, B) {
    const d = tpl.disp, tag = lines.length > 1 ? lines[0] : null, rest = lines.length > 1 ? lines.slice(1) : lines;
    const px = B * 1.15 * d.scale, lh = px * 1.04, tpx = B * 0.38, th = tpx * 2;
    ctx.font = fnt(d.font, d.weight, px, d.italic);
    const ws = rest.map((ln) => ctx.measureText(lineStr(ln, d.upper)).width), maxW = Math.max(...ws);
    const H = (tag ? th + tpx * 0.7 : 0) + rest.length * lh + px * 0.35;
    let y = -H / 2;
    if (tag) {
      const p = eOut(lt / 0.3);
      ctx.font = fnt(tpl.sans.font, 700, tpx); const label = up(tag.map((t) => t.t).join(' '), true), sp = tpx * 0.14;
      const tw = spacedWidth(ctx, label, sp) + tpx * 1.4;
      ctx.save(); ctx.globalAlpha *= p; ctx.translate(0, y + th / 2); ctx.scale(0.6 + 0.4 * p, 0.6 + 0.4 * p);
      U(ctx, -tw / 2, -th / 2, tw, th, () => {
        shadowOff(ctx); ctx.fillStyle = tpl.accent; roundRect(ctx, -tw / 2, -th / 2, tw, th, th / 2); ctx.fill();
        ctx.fillStyle = tpl.combo === 'serif' ? '#FFFFFF' : tpl.ink; ctx.textAlign = 'left';
        let x = -tw / 2 + tpx * 0.7; for (const ch of label) { ctx.fillText(ch, x, tpx * 0.05); x += ctx.measureText(ch).width + sp; }
      });
      ctx.restore(); y += th + tpx * 0.7;
    }
    y += lh / 2;
    rest.forEach((ln, i) => {
      const p = (lt - 0.12 - i * 0.1) / 0.4;
      if (p > 0) {
        ctx.save(); ctx.translate(0, y + (1 - eOut(p)) * px * 0.4); ctx.globalAlpha *= eOut(p * 1.4); ctx.font = fnt(d.font, d.weight, px, d.italic);
        U(ctx, -ws[i] / 2, -px / 2, ws[i], px, () => { shadowOn(ctx, px, 0.45); ctx.fillStyle = ln.some((t) => t.hl) ? tpl.accent : tpl.paper; ctx.fillText(lineStr(ln, d.upper), 0, 0); }); ctx.restore();
      }
      y += lh;
    });
    const lw = ws[ws.length - 1], sy = y - lh / 2 + px * 0.05;
    U(ctx, -lw / 2, sy - px * 0.1, lw, px * 0.2, () => scribble(ctx, -lw / 2, lw / 2, sy, px * 0.07, (lt - 0.45) / 0.45, tpl.accent, Math.max(2, B * 0.08)));
    return { w: Math.max(maxW, tag ? 0 : 0) + px * 0.3, h: H };
  },
  // Sans bold + palavras marcadas em serifa itálica na cor de destaque, palavra por palavra
  mix(ctx, tpl, lines, lt, B, maxW) {
    const sx = B * 0.95, hx = B * 1.3;
    const toks = []; lines.forEach((ln, li) => ln.forEach((t, j) => toks.push({ ...t, br: li > 0 && j === 0 })));
    const fontOf = (t) => (t.hl ? fnt(tpl.serif, 400, hx, true) : fnt(tpl.sans.font, 700, sx));
    ctx.font = fnt(tpl.sans.font, 700, sx); const sp = ctx.measureText(' ').width;
    toks.forEach((t) => { ctx.font = fontOf(t); t.w = ctx.measureText(t.t).width; });
    const rows = []; let cur = [], cw = 0;
    toks.forEach((t) => { const add = t.w + (cur.length ? sp : 0); if (cur.length && (t.br || cw + add > maxW)) { rows.push({ ts: cur, w: cw }); cur = []; cw = 0; } cw += t.w + (cur.length ? sp : 0); cur.push(t); });
    if (cur.length) rows.push({ ts: cur, w: cw });
    const lh = hx * 1.05, H = rows.length * lh; let y = -H / 2 + lh / 2, k = 0, mw = 0;
    for (const r of rows) {
      let x = -r.w / 2; mw = Math.max(mw, r.w);
      for (const t of r.ts) {
        const p = (lt - k * 0.07) / 0.3; k++;
        if (p > 0) {
          const sc = 0.6 + 0.4 * eBack(p);
          ctx.save(); ctx.translate(x + t.w / 2, y); ctx.scale(sc, sc); ctx.globalAlpha *= eOut(p * 1.5); ctx.font = fontOf(t);
          if (t.hl && tpl.combo === 'serif') { ctx.shadowColor = tpl.accent; ctx.shadowBlur = hx * 0.35; } else shadowOn(ctx, sx, 0.5);
          ctx.fillStyle = t.hl ? tpl.accent : tpl.paper; U(ctx, -t.w / 2, -hx / 2, t.w, hx, () => ctx.fillText(t.t, 0, t.hl ? hx * 0.02 : 0)); ctx.restore();
        }
        x += t.w + sp;
      }
      y += lh;
    }
    return { w: mw + sx * 0.4, h: H };
  },
  // Título grande com cópias em contorno descendo atrás (efeito eco)
  eco(ctx, tpl, lines, lt, B) {
    const d = tpl.disp, px = B * 1.55 * d.scale, lh = px * 1.0, label = lines.map((ln) => lineStr(ln, d.upper));
    const hl = lines.map((ln) => ln.some((t) => t.hl));
    ctx.font = fnt(d.font, d.weight, px, d.italic);
    const ws = label.map((s) => ctx.measureText(s).width), maxW = Math.max(...ws);
    const H = label.length * lh, off = px * 0.42, echoes = 2;
    for (let e = echoes; e >= 0; e--) {
      const p = (lt - e * 0.12) / 0.4; if (p <= 0) continue;
      let y = -H / 2 + lh / 2 - off * echoes / 2;
      ctx.save(); ctx.globalAlpha *= eOut(p * 1.4) * (e ? (e === 1 ? 0.6 : 0.3) : 1);
      ctx.translate(0, e * off * eOut(p));
      label.forEach((s, i) => {
        const yy = y;
        U(ctx, -ws[i] / 2, yy - px / 2, ws[i], px, () => {
          if (e) { shadowOff(ctx); ctx.lineWidth = Math.max(1.5, px * 0.025); ctx.strokeStyle = hl[i] ? tpl.accent : tpl.paper; ctx.strokeText(s, 0, yy); }
          else { shadowOn(ctx, px, 0.45); ctx.fillStyle = hl[i] ? tpl.accent : tpl.paper; ctx.fillText(s, 0, yy); }
        });
        y += lh;
      });
      ctx.restore();
    }
    return { w: maxW + px * 0.3, h: H + off * echoes };
  },
  // Texto fino e espaçado, digitado letra por letra
  espacado(ctx, tpl, lines, lt, B) {
    const px = B * 0.72, sp = px * 0.2, lh = px * 1.5;
    ctx.font = fnt(tpl.sans.font, 400, px);
    const rows = lines.map((ln) => { const chars = []; ln.forEach((t, j) => { if (j) chars.push({ c: ' ', hl: false }); for (const c of t.t) chars.push({ c, hl: t.hl }); }); return chars; });
    const ws = rows.map((r) => spacedWidth(ctx, r.map((x) => x.c).join(''), sp)), maxW = Math.max(...ws);
    const H = rows.length * lh; let y = -H / 2 + lh / 2, k = 0;
    ctx.textAlign = 'left';
    rows.forEach((r, i) => {
      let x = -ws[i] / 2;
      for (const ch of r) {
        const p = (lt - k * 0.035) / 0.12; k++;
        const w = ctx.measureText(ch.c).width;
        if (p > 0 && ch.c.trim()) { const cx0 = x; ctx.save(); ctx.globalAlpha *= eOut(p); shadowOn(ctx, px, 0.55); ctx.fillStyle = ch.hl ? tpl.accent : tpl.paper; U(ctx, cx0, y - px / 2, w, px, () => ctx.fillText(ch.c, cx0, y + (1 - eOut(p)) * px * 0.3)); ctx.restore(); }
        x += w + sp;
      }
      y += lh;
    });
    ctx.textAlign = 'center';
    return { w: maxW + px, h: H };
  },
};
// ---------- Miniaturas para os botões ----------
export function drawPreview(cv, tpl, kind, id) {
  const dpr = window.devicePixelRatio || 1, W = cv.clientWidth || 150, H = cv.clientHeight || 96;
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#16111f'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(W / 2, H / 2);
  if (kind === 'cap') {
    const toks = parseMarked(id || 'é *profissão* _e vida_');
    drawCapTpl(ctx, W * 1.05, tpl, toks, toks.map(() => 0), 10, H * 0.17, false);
  } else {
    const L = layoutById(id) || LAYOUTS[0];
    // mede primeiro e encaixa a miniatura na caixa
    const probe = document.createElement('canvas').getContext('2d');
    const box = drawLayout(probe, tpl, L.id, L.sample, 10, 40);
    const k = Math.min((W * 0.86) / box.w, (H * 0.8) / box.h, 1.2) * 40;
    drawLayout(ctx, tpl, L.id, L.sample, 10, k);
  }
  ctx.restore();
}
