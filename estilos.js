// Modelos de texto do Meu Editor.
// Cada modelo é um sistema tipográfico: uma fonte base (legenda corrida) e as fontes de destaque
// (display, script, serifa) com as cores e animações dele. O mesmo modelo serve para:
//   1) Modelo de legenda: fala corrida na fonte base; nos pontos altos (*palavra* no texto) entra a combinação.
//   2) Adicionar texto: layouts de título prontos, desenhados com as fontes e cores do modelo.
// Marcação: palavras entre asteriscos são destaque. Ex.: "isso muda *tudo*". Quebra de linha = nova linha.

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

export const stripMarks = (s) => String(s || '').replace(/\*/g, '');
export function parseMarked(text) {
  const out = []; let on = false;
  for (const raw of String(text || '').split(/\s+/).filter(Boolean)) {
    let w = raw, hl = on;
    if (w.startsWith('*')) { on = true; hl = true; w = w.slice(1); }
    const ends = /\*[.,!?…:;"']*$/.test(w);
    if (ends) w = w.replace(/\*([.,!?…:;"']*)$/, '$1');
    w = w.replace(/\*/g, '');
    if (w) out.push({ t: w, hl });
    if (ends) on = false;
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

// ---------- Modelo de legenda ----------
// ctx já está transladado para o centro do bloco. times[i] = instante (tempo de origem) em que a palavra i é falada.
export function drawCapTpl(ctx, W, tpl, toks, times, s, fs, upper) {
  if (!toks.length) return;
  const first = toks.findIndex((t) => t.hl);
  if (first < 0) return drawCapRun(ctx, W, tpl, toks, times, s, fs, upper);
  let last = first; toks.forEach((t, i) => { if (t.hl) last = i; });
  const pre = toks.slice(0, first), mid = toks.slice(first, last + 1), post = toks.slice(last + 1);
  const tPre = times.slice(0, first), tMid = times[first], tPost = times.slice(last + 1);
  const small = fs * 0.62, maxW = W * 0.88;
  const bigTxt = mid.map((t) => t.t).join(' ');
  // tamanho do destaque: grande, mas cabendo na largura
  const d = tpl.disp; let big = fs * 1.95 * d.scale;
  ctx.font = fnt(d.font, d.weight, big, d.italic);
  const bw0 = ctx.measureText(up(bigTxt, d.upper)).width; if (bw0 > maxW) big *= maxW / bw0;
  const gapS = small * 0.25, rows = [];
  if (pre.length) rows.push({ k: 'small', h: small * 1.15 });
  rows.push({ k: 'big', h: big * (tpl.combo === 'script' ? 1.25 : 1.05) });
  if (post.length) rows.push({ k: 'small2', h: small * 1.15 });
  const totalH = rows.reduce((a, r) => a + r.h, 0) + gapS * (rows.length - 1);
  let y = -totalH / 2;
  for (const r of rows) {
    const cy = y + r.h / 2;
    if (r.k === 'small') smallRow(ctx, tpl, pre, tPre, s, small, cy, upper);
    else if (r.k === 'small2') smallRow(ctx, tpl, post, tPost, s, small, cy, upper);
    else bigCombo(ctx, tpl, bigTxt, tMid, s, big, cy);
    y += r.h + gapS;
  }
}
function smallRow(ctx, tpl, toks, times, s, px, cy, upper) {
  const b = tpl.base;
  ctx.font = fnt(b.font, b.weight, px); ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  const sp = ctx.measureText(' ').width, ws = toks.map((t) => ctx.measureText(up(t.t, upper)).width);
  let x = -(ws.reduce((a, w) => a + w, 0) + sp * (toks.length - 1)) / 2;
  toks.forEach((t, i) => {
    const p = (s - times[i]) / 0.2;
    if (p > 0) {
      ctx.save(); ctx.globalAlpha *= eOut(p * 1.4); ctx.translate(x + ws[i] / 2, cy + (1 - eOut(p)) * px * 0.35);
      shadowOn(ctx, px); ctx.fillStyle = b.color; ctx.textAlign = 'center'; ctx.fillText(up(t.t, upper), 0, 0); ctx.restore();
    }
    x += ws[i] + sp;
  });
}
function bigCombo(ctx, tpl, txt, t0, s, px, cy) {
  const p = (s - t0) / 0.28; if (p <= 0) return;
  const d = tpl.disp, label = up(txt, d.upper);
  ctx.save(); ctx.translate(0, cy); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = fnt(d.font, d.weight, px, d.italic);
  const w = ctx.measureText(label).width;
  if (tpl.combo === 'box') {
    ctx.rotate(-2.2 * Math.PI / 180);
    const padX = px * 0.16, bh = px * 1.02, pw = eOut(p * 1.3);
    shadowOff(ctx); ctx.fillStyle = tpl.accent; roundRect(ctx, -w / 2 - padX, -bh / 2, (w + padX * 2) * pw, bh, px * 0.08); ctx.fill();
    const q = cl((p - 0.35) / 0.65);
    if (q > 0) { const sc = 1.18 - 0.18 * eBack(q); ctx.scale(sc, sc); ctx.globalAlpha *= eOut(q * 1.5); ctx.fillStyle = tpl.ink; ctx.fillText(label, 0, px * 0.04); }
  } else if (tpl.combo === 'script') {
    const sc = 0.7 + 0.3 * eBack(p);
    ctx.save(); ctx.scale(sc, sc); ctx.globalAlpha *= eOut(p * 1.5); shadowOn(ctx, px, 0.45); ctx.fillStyle = tpl.paper; ctx.fillText(label, 0, -px * 0.12); ctx.restore();
    // a mesma palavra em script, por cima e inclinada, revelada da esquerda para a direita
    const q = cl((s - t0 - 0.15) / 0.45);
    if (q > 0) {
      const spx = px * 1.05; ctx.font = fnt(tpl.script, 400, spx); const sw = ctx.measureText(txt).width;
      ctx.save(); ctx.translate(px * 0.18, px * 0.38); ctx.rotate(-6 * Math.PI / 180);
      ctx.beginPath(); ctx.rect(-sw / 2 - spx, -spx * 1.5, (sw + spx * 2) * eOut(q), spx * 3); ctx.clip();
      shadowOn(ctx, spx, 0.55); ctx.fillStyle = tpl.accent; ctx.fillText(txt, 0, 0); ctx.restore();
    }
  } else {
    const sc = 0.85 + 0.15 * eOut(p);
    ctx.scale(sc, sc); ctx.globalAlpha *= eOut(p * 1.2);
    ctx.shadowColor = tpl.accent; ctx.shadowBlur = px * 0.45 * (1.4 - 0.6 * eOut(p)); ctx.fillStyle = tpl.accent;
    ctx.fillText(label, 0, 0); shadowOff(ctx); ctx.fillText(label, 0, 0);
  }
  ctx.restore();
}
// Legenda corrida: palavra por palavra, a palavra falada no momento ganha a cor de destaque do modelo
function drawCapRun(ctx, W, tpl, toks, times, s, fs, upper) {
  const b = tpl.base, maxW = W * 0.86;
  ctx.font = fnt(b.font, b.weight, fs); ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  const sp = ctx.measureText(' ').width, ws = toks.map((t) => ctx.measureText(up(t.t, upper)).width);
  const lines = []; let cur = [], cw = 0;
  toks.forEach((t, i) => { const add = ws[i] + (cur.length ? sp : 0); if (cur.length && cw + add > maxW) { lines.push({ ids: cur, w: cw }); cur = []; cw = 0; } cw += ws[i] + (cur.length ? sp : 0); cur.push(i); });
  if (cur.length) lines.push({ ids: cur, w: cw });
  let active = -1; times.forEach((t, i) => { if (t <= s) active = i; });
  const lh = fs * 1.2; let y = -(lines.length - 1) * lh / 2;
  for (const ln of lines) {
    let x = -ln.w / 2;
    for (const i of ln.ids) {
      const p = (s - times[i]) / 0.22;
      if (p > 0) {
        const sc = 0.62 + 0.38 * eBack(p);
        ctx.save(); ctx.translate(x + ws[i] / 2, y); ctx.scale(sc, sc); ctx.globalAlpha *= eOut(p * 1.6);
        shadowOn(ctx, fs, 0.6); ctx.fillStyle = i === active ? b.active : b.color; ctx.fillText(up(toks[i].t, upper), 0, 0); ctx.restore();
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
          if (t.hl) {
            const q = eOut((lt - i * 0.12 - 0.18) / 0.3), padX = px * 0.12, bh = px * 1.08;
            shadowOff(ctx); ctx.fillStyle = tpl.accent; roundRect(ctx, x - padX, -bh / 2, (r.ws[j] + padX * 2) * q, bh, px * 0.06); ctx.fill();
            ctx.fillStyle = q > 0.5 ? tpl.ink : tpl.paper; ctx.fillText(label, cx, px * 0.03);
          } else { shadowOn(ctx, px, 0.45); ctx.fillStyle = tpl.paper; ctx.fillText(label, cx, px * 0.03); }
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
        shadowOn(ctx, px, 0.45); ctx.fillStyle = ln.some((t) => t.hl) ? tpl.accent : tpl.paper; ctx.fillText(lineStr(ln, d.upper), 0, 0); ctx.restore();
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
        shadowOn(ctx, spx, 0.55); ctx.fillStyle = tpl.accent; ctx.fillText(scriptTxt, 0, 0); ctx.restore();
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
      shadowOff(ctx); ctx.fillStyle = tpl.accent; roundRect(ctx, -tw / 2, -th / 2, tw, th, th / 2); ctx.fill();
      ctx.fillStyle = tpl.combo === 'serif' ? '#FFFFFF' : tpl.ink; ctx.textAlign = 'left';
      let x = -tw / 2 + tpx * 0.7; for (const ch of label) { ctx.fillText(ch, x, tpx * 0.05); x += ctx.measureText(ch).width + sp; }
      ctx.restore(); y += th + tpx * 0.7;
    }
    y += lh / 2;
    rest.forEach((ln, i) => {
      const p = (lt - 0.12 - i * 0.1) / 0.4;
      if (p > 0) {
        ctx.save(); ctx.translate(0, y + (1 - eOut(p)) * px * 0.4); ctx.globalAlpha *= eOut(p * 1.4); ctx.font = fnt(d.font, d.weight, px, d.italic);
        shadowOn(ctx, px, 0.45); ctx.fillStyle = ln.some((t) => t.hl) ? tpl.accent : tpl.paper; ctx.fillText(lineStr(ln, d.upper), 0, 0); ctx.restore();
      }
      y += lh;
    });
    const lw = ws[ws.length - 1];
    scribble(ctx, -lw / 2, lw / 2, y - lh / 2 + px * 0.05, px * 0.07, (lt - 0.45) / 0.45, tpl.accent, Math.max(2, B * 0.08));
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
          ctx.fillStyle = t.hl ? tpl.accent : tpl.paper; ctx.fillText(t.t, 0, t.hl ? hx * 0.02 : 0); ctx.restore();
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
        if (e) { shadowOff(ctx); ctx.lineWidth = Math.max(1.5, px * 0.025); ctx.strokeStyle = hl[i] ? tpl.accent : tpl.paper; ctx.strokeText(s, 0, y); }
        else { shadowOn(ctx, px, 0.45); ctx.fillStyle = hl[i] ? tpl.accent : tpl.paper; ctx.fillText(s, 0, y); }
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
        if (p > 0) { ctx.save(); ctx.globalAlpha *= eOut(p); shadowOn(ctx, px, 0.55); ctx.fillStyle = ch.hl ? tpl.accent : tpl.paper; ctx.fillText(ch.c, x, y + (1 - eOut(p)) * px * 0.3); ctx.restore(); }
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
    const toks = parseMarked(id || 'isso vai *mudar* tudo');
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
