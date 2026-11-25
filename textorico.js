// Texto rico do Meu Editor: cada trecho do texto pode ter fonte, peso, cor, itálico, sublinhado, tamanho e
// espaço entre letras próprios. O texto da camada fica em L.runs = [{ t: 'Marcelo ', s: { c: '#fff' } }, ...]
// e L.text guarda o mesmo texto sem estilo (para a linha do tempo, animações e buscas).
// Estilo do trecho (s): f fonte · w peso · i itálico · u sublinhado · c cor · sz tamanho · ls espaço entre letras
// Estilo da camada (padrão de tudo): L.font, L.weight, L.italic, L.under, L.color, L.size, L.ls, L.lh, L.align

const KEYS = ['f', 'w', 'i', 'u', 'c', 'sz', 'ls'];
const sameStyle = (a = {}, b = {}) => KEYS.every((k) => (a[k] ?? null) === (b[k] ?? null));
const graphemes = (t) => (typeof Intl !== 'undefined' && Intl.Segmenter
  ? [...new Intl.Segmenter('pt-BR', { granularity: 'grapheme' }).segment(t)].map((g) => g.segment) : [...t]);

export const plainOf = (runs) => runs.map((r) => r.t).join('');
export function runsOf(L) {
  if (Array.isArray(L.runs) && L.runs.length && plainOf(L.runs) === (L.text ?? '')) return L.runs;
  return [{ t: L.text ?? '', s: {} }];
}
export function normRuns(runs) {
  const out = [];
  for (const r of runs) {
    if (!r.t) continue;
    const s = {}; for (const k of KEYS) if (r.s?.[k] != null && r.s[k] !== '') s[k] = r.s[k];
    const last = out[out.length - 1];
    if (last && sameStyle(last.s, s)) last.t += r.t; else out.push({ t: r.t, s });
  }
  return out.length ? out : [{ t: '', s: {} }];
}
export function setRuns(L, runs) {
  const n = normRuns(runs);
  L.text = plainOf(n);
  // sem nenhum estilo por trecho, não guarda runs (o projeto fica igual ao formato antigo)
  if (n.every((r) => !Object.keys(r.s).length)) delete L.runs; else L.runs = n;
}
export const baseStyle = (L) => ({ f: L.font, w: L.weight || 700, i: !!L.italic, u: !!L.under, c: L.color || '#FFFFFF', sz: L.size || 80, ls: L.ls || 0 });
export const effStyle = (L, s) => ({ ...baseStyle(L), ...(s || {}) });

// divide os runs nas posições a e b (índices no texto puro) e devolve [runs, iA, iB] (fatia iA..iB-1 = trecho)
function splitAt(runs, pos) {
  let acc = 0;
  for (let i = 0; i < runs.length; i++) {
    const r = runs[i], end = acc + r.t.length;
    if (pos === acc) return i;
    if (pos > acc && pos < end) { runs.splice(i, 1, { t: r.t.slice(0, pos - acc), s: { ...r.s } }, { t: r.t.slice(pos - acc), s: { ...r.s } }); return i + 1; }
    acc = end;
  }
  return runs.length;
}
// aplica estilo num trecho [a,b). Sem trecho (a === b): vale para o texto todo (camada) e limpa o que estava por trecho.
export function applyStyle(L, a, b, key, value) {
  const layerKey = { f: 'font', w: 'weight', i: 'italic', u: 'under', c: 'color', sz: 'size', ls: 'ls' }[key];
  const runs = runsOf(L).map((r) => ({ t: r.t, s: { ...r.s } }));
  if (a == null || b == null || a >= b) {
    L[layerKey] = value; runs.forEach((r) => delete r.s[key]); setRuns(L, runs); return;
  }
  const iA = splitAt(runs, a), iB = splitAt(runs, b);
  for (let i = iA; i < iB; i++) runs[i].s[key] = value;
  setRuns(L, runs);
}
// valor que o trecho tem (null se misturado) — para acender os botões
export function styleIn(L, a, b, key) {
  const runs = runsOf(L);
  if (a == null || b == null || a >= b) return baseStyle(L)[key];
  let acc = 0, val, first = true;
  for (const r of runs) {
    const end = acc + r.t.length;
    if (end > a && acc < b) { const v = effStyle(L, r.s)[key]; if (first) { val = v; first = false; } else if (v !== val) return null; }
    acc = end;
  }
  return first ? baseStyle(L)[key] : val;
}
// troca o texto [a,b) por txt, herdando o estilo do caractere anterior
export function insertText(L, a, b, txt) {
  const runs = runsOf(L).map((r) => ({ t: r.t, s: { ...r.s } }));
  const iA = splitAt(runs, a), iB = splitAt(runs, b);
  const s = { ...(runs[iA - 1]?.s || runs[iA]?.s || {}) };
  runs.splice(iA, iB - iA, { t: txt, s });
  setRuns(L, runs);
}

// ---------- Layout e desenho no canvas ----------
const fontStr = (st, k, fontCss) => `${st.i ? 'italic ' : ''}${st.w} ${st.sz * k}px ${fontCss(st.f)}`;
function segWidth(ctx, t, st, k) {
  if (!st.ls) return ctx.measureText(t).width;
  return graphemes(t).reduce((w, ch) => w + ctx.measureText(ch).width + st.ls * k, 0) - st.ls * k;
}
// devolve { lines: [{ segs: [{ t, st, w, fs }], w, h, fs }], w, h, k }
export function richLayout(ctx, L, W, H, fontCss, maxW) {
  const k = Math.min(W, H) / 1080, lhMul = L.lh || 1.2;
  const pieces = [];
  for (const r of runsOf(L)) {
    const st = effStyle(L, r.s), t = L.upper ? r.t.toUpperCase() : r.t;
    for (const p of t.split(/(\n|[ \t]+)/)) if (p) pieces.push({ t: p, st, kind: p === '\n' ? 'nl' : /^[ \t]+$/.test(p) ? 'sp' : 'w' });
  }
  const lines = []; let cur = { segs: [], w: 0 }, space = null, word = [];
  const measure = (seg) => { ctx.font = fontStr(seg.st, k, fontCss); seg.w = segWidth(ctx, seg.t, seg.st, k); seg.fs = seg.st.sz * k; return seg; };
  const pushLine = () => { lines.push(cur); cur = { segs: [], w: 0 }; space = null; };
  const flushWord = () => {
    if (!word.length) return;
    const segs = word.map((p) => measure({ t: p.t, st: p.st })), ww = segs.reduce((a, s) => a + s.w, 0);
    const sp = space && cur.segs.length ? measure({ t: ' ', st: space.st }) : null;
    if (cur.segs.length && cur.w + (sp ? sp.w : 0) + ww > maxW) { pushLine(); }
    else if (sp) { cur.segs.push(sp); cur.w += sp.w; }
    cur.segs.push(...segs); cur.w += ww; word = []; space = null;
  };
  for (const p of pieces) {
    if (p.kind === 'w') { word.push(p); continue; }
    flushWord();
    if (p.kind === 'nl') pushLine(); else space = p;
  }
  flushWord(); if (cur.segs.length || !lines.length) lines.push(cur);
  const baseFs = (L.size || 80) * k;
  for (const ln of lines) { ln.fs = Math.max(baseFs * (ln.segs.length ? 0 : 1), ...ln.segs.map((s) => s.fs)); ln.h = ln.fs * lhMul; }
  return { lines, w: Math.max(baseFs * 0.5, ...lines.map((l) => l.w)), h: lines.reduce((a, l) => a + l.h, 0), k };
}
function drawSeg(ctx, seg, x, y, k, fontCss) {
  const st = seg.st; ctx.font = fontStr(st, k, fontCss); ctx.fillStyle = st.c;
  if (st.ls) { let cx = x; for (const ch of graphemes(seg.t)) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + st.ls * k; } }
  else ctx.fillText(seg.t, x, y);
  if (st.u && seg.t.trim()) { const th = Math.max(1, seg.fs * 0.06); ctx.fillRect(x, y + seg.fs * 0.12, seg.w, th); }
}
// posiciona cada pedaço (para desenhar e para animar): devolve [{ x, y (linha de base), w, h, top, segs }]
export function placeLines(m, align = 'center') {
  let top = -m.h / 2; const out = [];
  for (const ln of m.lines) {
    const x0 = align === 'left' ? -m.w / 2 : align === 'right' ? m.w / 2 - ln.w : -ln.w / 2;
    const base = top + ln.h / 2 + ln.fs * 0.34;
    let x = x0; const segs = ln.segs.map((s) => { const o = { ...s, x, y: base }; x += s.w; return o; });
    out.push({ x: x0, y: base, w: ln.w, h: ln.h, top, segs }); top += ln.h;
  }
  return out;
}
export function drawRich(ctx, m, placed, fontCss) {
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  for (const ln of placed) for (const s of ln.segs) drawSeg(ctx, s, s.x, s.y, m.k, fontCss);
}
// pedaços para animação: 'l' linha · 'w' palavra (trecho entre espaços) · outro = letra
export function richUnits(ctx, m, placed, mode, fontCss) {
  const out = [];
  for (const ln of placed) {
    if (mode === 'l') { out.push({ x: ln.x, y: ln.top, w: ln.w, h: ln.h, draw: () => ln.segs.forEach((s) => drawSeg(ctx, s, s.x, s.y, m.k, fontCss)) }); continue; }
    for (const s of ln.segs) {
      if (!s.t.trim()) continue;
      if (mode === 'w') { out.push({ x: s.x, y: ln.top, w: s.w, h: ln.h, draw: () => drawSeg(ctx, s, s.x, s.y, m.k, fontCss) }); continue; }
      ctx.font = fontStr(s.st, m.k, fontCss); let cx = s.x;
      for (const ch of graphemes(s.t)) {
        const cw = ctx.measureText(ch).width, x = cx;
        if (ch.trim()) out.push({ x, y: ln.top, w: cw, h: ln.h, draw: () => drawSeg(ctx, { ...s, t: ch, w: cw }, x, s.y, m.k, fontCss) });
        cx += cw + (s.st.ls || 0) * m.k;
      }
    }
  }
  return out;
}

// ---------- Editor de texto no painel (contenteditable) ----------
const escH = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function cssOf(s, fontCss) {
  const p = [];
  if (s.f) p.push(`font-family:${fontCss(s.f).replace(/"/g, "'")}`);
  if (s.w) p.push(`font-weight:${s.w}`);
  if (s.i) p.push('font-style:italic'); else if (s.i === false) p.push('font-style:normal');
  if (s.u) p.push('text-decoration:underline'); else if (s.u === false) p.push('text-decoration:none');
  if (s.c) p.push(`color:${s.c}`);
  if (s.ls) p.push(`letter-spacing:${(s.ls / 4).toFixed(2)}px`);
  if (s.sz) p.push(`font-size:${Math.max(0.7, Math.min(1.8, s.sz / 80)).toFixed(2)}em`);
  return p.join(';');
}
export function runsHTML(L, fontCss) {
  return runsOf(L).map((r) => `<span data-s="${escH(JSON.stringify(r.s || {}))}" style="${cssOf(r.s || {}, fontCss)}">${escH(r.t)}</span>`).join('');
}
export function editorCss(L, fontCss) {
  const b = baseStyle(L);
  return `font-family:${fontCss(b.f).replace(/"/g, "'")};font-weight:${b.w};font-style:${b.i ? 'italic' : 'normal'};text-decoration:${b.u ? 'underline' : 'none'};letter-spacing:${(b.ls / 4).toFixed(2)}px;text-align:${L.align || 'center'};${L.upper ? 'text-transform:uppercase;' : ''}`;
}
// lê o DOM editado de volta para runs
export function readEditor(root) {
  const runs = []; let first = true;
  const walk = (n) => {
    for (const c of n.childNodes) {
      if (c.nodeType === 3) { const sp = c.parentElement?.closest('[data-s]'); let s = {}; try { s = sp && root.contains(sp) ? JSON.parse(sp.dataset.s) : {}; } catch {} runs.push({ t: c.nodeValue.replace(/ /g, ' '), s }); first = false; }
      else if (c.nodeName === 'BR') { if (c !== n.lastChild || n !== root) runs.push({ t: '\n', s: {} }); }
      else if (c.nodeType === 1) { if ((c.nodeName === 'DIV' || c.nodeName === 'P') && !first) runs.push({ t: '\n', s: {} }); walk(c); }
    }
  };
  walk(root); return runs;
}
export const isClean = (root) => [...root.childNodes].every((c) => c.nodeType === 1 && c.nodeName === 'SPAN' && c.dataset.s != null && [...c.childNodes].every((x) => x.nodeType === 3));
// posição do cursor/seleção dentro do editor, em caracteres do texto puro
export function getOffsets(root) {
  const sel = document.getSelection(); if (!sel || !sel.rangeCount) return null;
  const r = sel.getRangeAt(0); if (!root.contains(r.startContainer) || !root.contains(r.endContainer)) return null;
  const off = (node, o) => { const q = document.createRange(); q.setStart(root, 0); q.setEnd(node, o); return q.toString().length; };
  const a = off(r.startContainer, r.startOffset), b = off(r.endContainer, r.endOffset);
  return { a: Math.min(a, b), b: Math.max(a, b) };
}
export function setOffsets(root, a, b) {
  const find = (pos) => {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let acc = 0, n, last = null;
    while ((n = w.nextNode())) { last = n; if (pos <= acc + n.nodeValue.length) return [n, pos - acc]; acc += n.nodeValue.length; }
    return last ? [last, last.nodeValue.length] : [root, root.childNodes.length];
  };
  const [sn, so] = find(a), [en, eo] = find(b);
  const r = document.createRange(); r.setStart(sn, so); r.setEnd(en, eo);
  const sel = document.getSelection(); sel.removeAllRanges(); sel.addRange(r);
}
