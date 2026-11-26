// Galeria de transições do Meu Editor, desenhadas no canvas (prévia, reprodução e exportação usam o mesmo código).
// Cada transição recebe o quadro de saída (A) e o de entrada (B), já do tamanho do vídeo, e o progresso p (0 → 1).
// A transição fica centrada no corte: metade antes, metade depois. Antes do corte, A é o vídeo tocando e B é o
// primeiro quadro do próximo clipe; depois do corte, A é o último quadro do clipe anterior e B é o vídeo tocando.
// "over: true" = efeito por cima do corte seco (flash, film burn): não precisa dos dois quadros.

const cl = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const eio = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const eo = (p) => 1 - Math.pow(1 - cl(p), 3);
export function rng(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

// telas auxiliares (reaproveitadas)
const pool = new Map();
function tmp(key, w, h) {
  let c = pool.get(key); if (!c) { c = document.createElement('canvas'); pool.set(key, c); }
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  return c;
}
const full = (ctx, img, W, H, a = 1) => { if (a <= 0) return; ctx.globalAlpha = a; ctx.drawImage(img, 0, 0, W, H); ctx.globalAlpha = 1; };
function scaled(ctx, img, W, H, k, a = 1, rot = 0) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(W / 2, H / 2); if (rot) ctx.rotate(rot); ctx.scale(k, k);
  ctx.drawImage(img, -W / 2, -H / 2, W, H); ctx.restore();
}
// Desfoque real (gaussiano). Com o filtro do canvas (Chrome, Edge, Safari novo) é um blur de verdade; sem ele,
// reduz e amplia em etapas de metade com suavização alta e mistura duas escalas, o que fica liso, sem pixelar.
const FILTER_OK = (() => { try { const c = document.createElement('canvas').getContext('2d'); c.filter = 'blur(2px)'; return c.filter === 'blur(2px)'; } catch { return false; } })();
function blurred(img, W, H, amt, key) {
  amt = cl(amt); const o = tmp(key + 'o', W, H), ox = o.getContext('2d');
  if (amt < 0.01) { ox.clearRect(0, 0, W, H); ox.drawImage(img, 0, 0, W, H); return o; }
  const r = amt * Math.max(W, H) * 0.035;
  if (FILTER_OK) {
    // borda: desenha um pouco maior para o desfoque não escurecer os cantos
    const m = r * 2;
    ox.clearRect(0, 0, W, H); ox.filter = `blur(${r.toFixed(2)}px)`; ox.drawImage(img, -m, -m, W + m * 2, H + m * 2); ox.filter = 'none';
    return o;
  }
  const steps = Math.max(1, Math.min(6, Math.round(Math.log2(1 + r))));
  let src = img, w = W, h = H;
  for (let i = 0; i < steps; i++) {
    w = Math.max(2, Math.round(w / 2)); h = Math.max(2, Math.round(h / 2));
    const s = tmp(key + 'd' + i, w, h), sx = s.getContext('2d'); sx.imageSmoothingEnabled = true; sx.imageSmoothingQuality = 'high';
    sx.clearRect(0, 0, w, h); sx.drawImage(src, 0, 0, w, h); src = s;
  }
  for (let i = steps - 2; i >= 0; i--) {
    const c = pool.get(key + 'd' + i), cx = c.getContext('2d'); cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = 'high';
    cx.clearRect(0, 0, c.width, c.height); cx.drawImage(src, 0, 0, c.width, c.height); src = c;
  }
  ox.clearRect(0, 0, W, H); ox.imageSmoothingEnabled = true; ox.imageSmoothingQuality = 'high'; ox.drawImage(src, 0, 0, W, H);
  return o;
}
function pixelated(img, W, H, amt, key) {
  const f = Math.max(1, Math.round(1 + amt * 40)), w = Math.max(2, Math.round(W / f)), h = Math.max(2, Math.round(H / f));
  const s = tmp(key + 's', w, h), sx = s.getContext('2d'); sx.imageSmoothingEnabled = false; sx.drawImage(img, 0, 0, w, h);
  const o = tmp(key + 'o', W, H), ox = o.getContext('2d'); ox.imageSmoothingEnabled = false; ox.clearRect(0, 0, W, H); ox.drawImage(s, 0, 0, W, H);
  return o;
}
// revela B dentro de uma forma (clip), por cima de A
function reveal(ctx, A, B, W, H, path) {
  full(ctx, A, W, H);
  ctx.save(); ctx.beginPath(); path(ctx); ctx.clip(); full(ctx, B, W, H); ctx.restore();
}
const slide = (dx, dy, push) => (ctx, W, H, A, B, p) => {
  const e = eio(p);
  if (push) { ctx.drawImage(A, -dx * e * W, -dy * e * H, W, H); }
  else full(ctx, A, W, H);
  ctx.drawImage(B, dx * (1 - e) * W, dy * (1 - e) * H, W, H);
};
export function drawFilmBurn(ctx, W, H, p, seed) {
  const a = Math.sin(Math.PI * cl(p)); if (a <= 0.002) return;
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
export function drawFlash(ctx, W, H, p) {
  const a = 1 - Math.abs(p - 0.5) * 2; if (a <= 0) return;
  ctx.save(); ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fillRect(0, 0, W, H); ctx.restore();
}

const WH = 'swoosh-curto-1.mp3', WH2 = 'swoosh-curto-2.mp3', WH3 = 'whoosh-15.mp3', HIT = 'hit.mp3', FLR = 'flare-3.mp3';
// snd: som padrão (arquivo da biblioteca de SFX; '@click' e '@burn' = sons embutidos). dur: duração padrão (s).
export const TRANSITIONS = [
  // ---------- Básicas ----------
  { id: 'dissolve', name: 'Esmaecer', cat: 'Básicas', dur: 0.6, snd: null, draw: (ctx, W, H, A, B, p) => { full(ctx, A, W, H); full(ctx, B, W, H, eio(p)); } },
  { id: 'fadeblack', name: 'Fade preto', cat: 'Básicas', dur: 0.8, snd: null, draw: (ctx, W, H, A, B, p) => {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    if (p < 0.5) full(ctx, A, W, H, 1 - eio(p * 2)); else full(ctx, B, W, H, eio((p - 0.5) * 2));
  } },
  { id: 'fadewhite', name: 'Fade branco', cat: 'Básicas', dur: 0.8, snd: null, draw: (ctx, W, H, A, B, p) => {
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    if (p < 0.5) full(ctx, A, W, H, 1 - eio(p * 2)); else full(ctx, B, W, H, eio((p - 0.5) * 2));
  } },
  { id: 'flash', name: 'Flash', cat: 'Básicas', dur: 0.3, snd: '@click', over: true },
  { id: 'burn', name: 'Film burn', cat: 'Básicas', dur: 0.5, snd: 'flare-2.mp3', over: true },
  // ---------- Movimento ----------
  { id: 'slideL', name: 'Deslizar ←', cat: 'Movimento', dur: 0.45, snd: WH, draw: slide(1, 0, false) },
  { id: 'slideR', name: 'Deslizar →', cat: 'Movimento', dur: 0.45, snd: WH, draw: slide(-1, 0, false) },
  { id: 'slideU', name: 'Deslizar ↑', cat: 'Movimento', dur: 0.45, snd: WH, draw: slide(0, 1, false) },
  { id: 'slideD', name: 'Deslizar ↓', cat: 'Movimento', dur: 0.45, snd: WH, draw: slide(0, -1, false) },
  { id: 'pushL', name: 'Empurrar ←', cat: 'Movimento', dur: 0.45, snd: WH, draw: slide(1, 0, true) },
  { id: 'pushR', name: 'Empurrar →', cat: 'Movimento', dur: 0.45, snd: WH, draw: slide(-1, 0, true) },
  { id: 'pushU', name: 'Empurrar ↑', cat: 'Movimento', dur: 0.45, snd: WH, draw: slide(0, 1, true) },
  { id: 'pushD', name: 'Empurrar ↓', cat: 'Movimento', dur: 0.45, snd: WH, draw: slide(0, -1, true) },
  { id: 'whip', name: 'Chicote', cat: 'Movimento', dur: 0.35, snd: WH2, draw: (ctx, W, H, A, B, p) => {
    // empurra rápido com rastro borrado no meio
    const e = eio(p), b = Math.sin(Math.PI * p);
    const a = blurred(A, W, H, b * 0.8, 'wa'), bb = blurred(B, W, H, b * 0.8, 'wb');
    ctx.drawImage(a, -e * W, 0, W, H); ctx.drawImage(bb, (1 - e) * W, 0, W, H);
  } },
  // ---------- Zoom ----------
  { id: 'zoomIn', name: 'Zoom in', cat: 'Zoom', dur: 0.5, snd: WH3, draw: (ctx, W, H, A, B, p) => {
    if (p < 0.5) { const q = eio(p * 2); scaled(ctx, blurred(A, W, H, q * 0.5, 'za'), W, H, 1 + q * 1.4); }
    else { const q = eio((p - 0.5) * 2); scaled(ctx, blurred(B, W, H, (1 - q) * 0.5, 'zb'), W, H, 1.6 - q * 0.6); }
  } },
  { id: 'zoomOut', name: 'Zoom out', cat: 'Zoom', dur: 0.5, snd: WH3, draw: (ctx, W, H, A, B, p) => {
    if (p < 0.5) { const q = eio(p * 2); scaled(ctx, blurred(A, W, H, q * 0.5, 'za'), W, H, 1 - q * 0.45); }
    else { const q = eio((p - 0.5) * 2); scaled(ctx, blurred(B, W, H, (1 - q) * 0.5, 'zb'), W, H, 2.2 - q * 1.2); }
  } },
  { id: 'spin', name: 'Giro', cat: 'Zoom', dur: 0.55, snd: WH3, draw: (ctx, W, H, A, B, p) => {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    if (p < 0.5) { const q = eio(p * 2); scaled(ctx, blurred(A, W, H, q * 0.6, 'sa'), W, H, 1 + q * 0.6, 1, q * Math.PI * 0.5); }
    else { const q = eio((p - 0.5) * 2); scaled(ctx, blurred(B, W, H, (1 - q) * 0.6, 'sb'), W, H, 1.6 - q * 0.6, 1, -(1 - q) * Math.PI * 0.5); }
  } },
  { id: 'pop', name: 'Surgir', cat: 'Zoom', dur: 0.45, snd: WH2, draw: (ctx, W, H, A, B, p) => {
    full(ctx, A, W, H); const q = eo(p); const k = 0.3 + 0.7 * q + Math.sin(q * Math.PI) * 0.06;
    scaled(ctx, B, W, H, k, cl(p * 2.5));
  } },
  { id: 'flip', name: 'Virar', cat: 'Zoom', dur: 0.5, snd: WH, draw: (ctx, W, H, A, B, p) => {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const img = p < 0.5 ? A : B, sx = Math.abs(Math.cos(eio(p) * Math.PI));
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(Math.max(0.001, sx), 1 - (1 - sx) * 0.08); ctx.drawImage(img, -W / 2, -H / 2, W, H); ctx.restore();
  } },
  // ---------- Formas ----------
  { id: 'circleOpen', name: 'Círculo', cat: 'Formas', dur: 0.6, snd: null, draw: (ctx, W, H, A, B, p) => reveal(ctx, A, B, W, H, (c) => c.arc(W / 2, H / 2, eio(p) * Math.hypot(W, H) / 2, 0, Math.PI * 2)) },
  { id: 'circleClose', name: 'Íris', cat: 'Formas', dur: 0.7, snd: null, draw: (ctx, W, H, A, B, p) => {
    // fecha em A até preto e abre em B
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); const R = Math.hypot(W, H) / 2;
    const img = p < 0.5 ? A : B, r = p < 0.5 ? (1 - eio(p * 2)) * R : eio((p - 0.5) * 2) * R;
    ctx.save(); ctx.beginPath(); ctx.arc(W / 2, H / 2, Math.max(0.5, r), 0, Math.PI * 2); ctx.clip(); full(ctx, img, W, H); ctx.restore();
  } },
  { id: 'diamond', name: 'Losango', cat: 'Formas', dur: 0.6, snd: null, draw: (ctx, W, H, A, B, p) => reveal(ctx, A, B, W, H, (c) => {
    const r = eio(p) * (W + H) * 0.55; c.moveTo(W / 2, H / 2 - r); c.lineTo(W / 2 + r, H / 2); c.lineTo(W / 2, H / 2 + r); c.lineTo(W / 2 - r, H / 2); c.closePath();
  }) },
  { id: 'wipeL', name: 'Limpar ←', cat: 'Formas', dur: 0.5, snd: null, draw: (ctx, W, H, A, B, p) => reveal(ctx, A, B, W, H, (c) => c.rect(W * (1 - eio(p)), 0, W, H)) },
  { id: 'wipeR', name: 'Limpar →', cat: 'Formas', dur: 0.5, snd: null, draw: (ctx, W, H, A, B, p) => reveal(ctx, A, B, W, H, (c) => c.rect(0, 0, W * eio(p), H)) },
  { id: 'wipeDiag', name: 'Diagonal', cat: 'Formas', dur: 0.55, snd: null, draw: (ctx, W, H, A, B, p) => reveal(ctx, A, B, W, H, (c) => {
    const e = eio(p) * (W + H) * 1.02; c.moveTo(0, 0); c.lineTo(e, 0); c.lineTo(e - H, H); c.lineTo(0, H); c.closePath();
  }) },
  { id: 'splitV', name: 'Cortina', cat: 'Formas', dur: 0.55, snd: WH2, draw: (ctx, W, H, A, B, p) => {
    // A se abre pelo meio como uma cortina, revelando B atrás
    full(ctx, B, W, H); const e = eio(p) * W / 2;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W / 2, H); ctx.clip(); ctx.drawImage(A, -e, 0, W, H); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(W / 2, 0, W / 2, H); ctx.clip(); ctx.drawImage(A, e, 0, W, H); ctx.restore();
  } },
  { id: 'splitH', name: 'Abrir', cat: 'Formas', dur: 0.55, snd: WH2, draw: (ctx, W, H, A, B, p) => {
    full(ctx, B, W, H); const e = eio(p) * H / 2;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H / 2); ctx.clip(); ctx.drawImage(A, 0, -e, W, H); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(0, H / 2, W, H / 2); ctx.clip(); ctx.drawImage(A, 0, e, W, H); ctx.restore();
  } },
  { id: 'blinds', name: 'Persiana', cat: 'Formas', dur: 0.6, snd: null, draw: (ctx, W, H, A, B, p) => reveal(ctx, A, B, W, H, (c) => {
    const n = 8, bh = H / n; for (let i = 0; i < n; i++) { const q = eio(cl(p * 1.4 - i * 0.05)); c.rect(0, i * bh, W, bh * q); }
  }) },
  { id: 'squares', name: 'Quadrados', cat: 'Formas', dur: 0.7, snd: null, draw: (ctx, W, H, A, B, p) => reveal(ctx, A, B, W, H, (c) => {
    const cols = 6, sz = W / cols, rows = Math.ceil(H / sz), R = rng(7);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) { const q = eio(cl((p - R() * 0.5) * 2)); if (q > 0) { const s = sz * q; c.rect(x * sz + (sz - s) / 2, y * sz + (sz - s) / 2, s, s); } }
  }) },
  // ---------- Efeitos ----------
  { id: 'blur', name: 'Desfoque', cat: 'Efeitos', dur: 0.6, snd: null, draw: (ctx, W, H, A, B, p) => {
    const b = Math.sin(Math.PI * p); full(ctx, blurred(A, W, H, b, 'ba'), W, H); full(ctx, blurred(B, W, H, b, 'bb'), W, H, eio(p));
  } },
  { id: 'pixel', name: 'Pixelar', cat: 'Efeitos', dur: 0.6, snd: null, draw: (ctx, W, H, A, B, p) => {
    const b = Math.sin(Math.PI * p); full(ctx, pixelated(p < 0.5 ? A : B, W, H, b, 'px'), W, H);
  } },
  { id: 'glitch', name: 'Glitch', cat: 'Efeitos', dur: 0.4, snd: HIT, draw: (ctx, W, H, A, B, p) => {
    const img = p < 0.5 ? A : B, amt = Math.sin(Math.PI * p), R = rng(Math.floor(p * 14) + 3);
    full(ctx, img, W, H);
    const n = 9; for (let i = 0; i < n; i++) {
      if (R() > 0.35 + 0.5 * (1 - amt)) continue;
      const y = R() * H, h = (0.02 + R() * 0.09) * H, dx = (R() - 0.5) * 0.25 * W * amt;
      ctx.drawImage(R() < 0.5 ? A : B, 0, y * img.height / H, img.width, h * img.height / H, dx, y, W, h);
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 * amt;
    ctx.drawImage(img, 10 * amt * W / 360, 0, W, H); ctx.restore();
  } },
  { id: 'shake', name: 'Tremor', cat: 'Efeitos', dur: 0.45, snd: HIT, draw: (ctx, W, H, A, B, p) => {
    const amt = Math.sin(Math.PI * p), R = rng(Math.floor(p * 30) + 1), dx = (R() - 0.5) * 0.08 * W * amt, dy = (R() - 0.5) * 0.05 * H * amt;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(dx, dy); scaled(ctx, A, W, H, 1 + 0.08 * amt); scaled(ctx, B, W, H, 1 + 0.08 * amt, eio(p)); ctx.restore();
  } },
  { id: 'light', name: 'Luz', cat: 'Efeitos', dur: 0.8, snd: FLR, draw: (ctx, W, H, A, B, p) => {
    full(ctx, A, W, H); full(ctx, B, W, H, eio(p));
    const a = Math.sin(Math.PI * p), x = (-0.3 + 1.6 * p) * W;
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    const g = ctx.createLinearGradient(x - W * 0.5, 0, x + W * 0.5, H * 0.3);
    g.addColorStop(0, 'rgba(255,120,40,0)'); g.addColorStop(0.45, `rgba(255,170,90,${0.75 * a})`); g.addColorStop(0.55, `rgba(255,240,210,${0.9 * a})`); g.addColorStop(1, 'rgba(255,90,40,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  } },
];
export const trById = (id) => TRANSITIONS.find((t) => t.id === id) || null;
export const TR_CATS = [...new Set(TRANSITIONS.map((t) => t.cat))];

// Desenha um quadro da transição (inclusive flash e film burn, para a prévia da galeria)
export function drawTransition(ctx, W, H, tr, A, B, p, seed = 1) {
  if (tr.over) {
    full(ctx, p < 0.5 ? A : B, W, H);
    if (tr.id === 'flash') drawFlash(ctx, W, H, p); else drawFilmBurn(ctx, W, H, p, seed);
    return;
  }
  ctx.save(); tr.draw(ctx, W, H, A, B, cl(p)); ctx.restore();
}

// Imagens de exemplo para a prévia (uma dupla de cenas por tipo de transição), desenhadas aqui mesmo: nada vem da internet
export function sampleFrames(w, h, cat = 'Básicas') {
  const mk = (fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); fn(x); return c; };
  const lg = (x, y0, y1, stops) => { const g = x.createLinearGradient(0, y0 * h, 0, y1 * h); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
  const sun = (x, cx, cy, r, c1, c2) => { const g = x.createRadialGradient(cx * w, cy * h, 0, cx * w, cy * h, r * w); g.addColorStop(0, c1); g.addColorStop(1, c2); x.fillStyle = g; x.beginPath(); x.arc(cx * w, cy * h, r * w, 0, Math.PI * 2); x.fill(); };
  const hills = (x, y, amp, col, ph = 0) => { x.fillStyle = col; x.beginPath(); x.moveTo(0, h); for (let i = 0; i <= 24; i++) { const u = i / 24; x.lineTo(u * w, (y + Math.sin(u * 6 + ph) * amp + Math.sin(u * 13 + ph * 2) * amp * 0.4) * h); } x.lineTo(w, h); x.closePath(); x.fill(); };
  const R = rng(cat.length * 31 + 7);
  const scenes = {
    'Básicas': [
      (x) => { x.fillStyle = lg(x, 0, 0.62, [[0, '#2b1b4a'], [0.55, '#e0613a'], [1, '#ffc46b']]); x.fillRect(0, 0, w, h); sun(x, 0.5, 0.6, 0.2, '#fff3cf', '#ffb35c'); x.fillStyle = lg(x, 0.62, 1, [[0, '#7a3a52'], [1, '#1c1430']]); x.fillRect(0, 0.62 * h, w, h); for (let i = 0; i < 7; i++) { x.fillStyle = `rgba(255,210,150,${0.5 - i * 0.06})`; x.fillRect(w * (0.36 + R() * 0.06), h * (0.65 + i * 0.045), w * (0.22 - i * 0.02), 1.5); } },
      (x) => { x.fillStyle = lg(x, 0, 0.55, [[0, '#7fd3ff'], [1, '#d9f3ff']]); x.fillRect(0, 0, w, h); x.fillStyle = lg(x, 0.55, 0.8, [[0, '#0b78b8'], [1, '#2bb3c9']]); x.fillRect(0, 0.55 * h, w, 0.25 * h); x.fillStyle = lg(x, 0.8, 1, [[0, '#f1dcab'], [1, '#e2c387']]); x.fillRect(0, 0.8 * h, w, h); x.fillStyle = 'rgba(255,255,255,.9)'; for (let i = 0; i < 3; i++) { const cx = R() * w, cy = (0.12 + R() * 0.25) * h; x.beginPath(); x.ellipse(cx, cy, w * 0.14, h * 0.025, 0, 0, Math.PI * 2); x.fill(); } },
    ],
    'Movimento': [
      (x) => { x.fillStyle = lg(x, 0, 1, [[0, '#0a0f2c'], [1, '#26164a']]); x.fillRect(0, 0, w, h); for (let i = 0; i < 9; i++) { const bw = w * (0.08 + R() * 0.12), bh = h * (0.25 + R() * 0.45), bx = (i / 9) * w; x.fillStyle = '#121633'; x.fillRect(bx, h - bh, bw, bh); for (let k = 0; k < 18; k++) if (R() < 0.45) { x.fillStyle = R() < 0.5 ? '#ffd27a' : '#8fd6ff'; x.fillRect(bx + 2 + R() * (bw - 5), h - bh + 4 + R() * (bh - 8), 2, 2); } } },
      (x) => { x.fillStyle = lg(x, 0, 0.5, [[0, '#ffb07c'], [1, '#ffe2b8']]); x.fillRect(0, 0, w, h); hills(x, 0.5, 0.03, '#9aa3c4'); x.fillStyle = '#3b3d48'; x.beginPath(); x.moveTo(w * 0.42, h * 0.52); x.lineTo(w * 0.58, h * 0.52); x.lineTo(w * 1.1, h); x.lineTo(-w * 0.1, h); x.closePath(); x.fill(); x.fillStyle = '#ffd34d'; for (let i = 0; i < 6; i++) { const t = i / 6, y = h * (0.55 + t * t * 0.45), ww = 1 + t * 4; x.fillRect(w / 2 - ww / 2, y, ww, h * 0.02 * (1 + t * 2)); } },
    ],
    'Zoom': [
      (x) => { x.fillStyle = lg(x, 0, 0.7, [[0, '#9ec9ff'], [1, '#e8f1ff']]); x.fillRect(0, 0, w, h); x.fillStyle = '#5b6b8c'; x.beginPath(); x.moveTo(-w * 0.1, h * 0.7); x.lineTo(w * 0.38, h * 0.28); x.lineTo(w * 0.62, h * 0.5); x.lineTo(w * 0.8, h * 0.36); x.lineTo(w * 1.1, h * 0.7); x.closePath(); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.moveTo(w * 0.38, h * 0.28); x.lineTo(w * 0.46, h * 0.36); x.lineTo(w * 0.31, h * 0.35); x.closePath(); x.fill(); hills(x, 0.68, 0.025, '#2f6b4f', 1); hills(x, 0.8, 0.03, '#1f4d39', 2.5); },
      (x) => { x.fillStyle = lg(x, 0, 1, [[0, '#cfe8c8'], [1, '#2e5b3a']]); x.fillRect(0, 0, w, h); for (let i = 0; i < 14; i++) { const tx = R() * w, ty = h * (0.35 + R() * 0.55), s2 = 0.6 + R(); x.fillStyle = `rgba(${20 + R() * 30},${70 + R() * 50},${40 + R() * 20},.95)`; x.beginPath(); x.moveTo(tx, ty - 34 * s2); x.lineTo(tx + 12 * s2, ty); x.lineTo(tx - 12 * s2, ty); x.closePath(); x.fill(); x.fillStyle = '#4a3322'; x.fillRect(tx - 1.5, ty, 3, 6 * s2); } },
    ],
    'Formas': [
      (x) => { x.fillStyle = lg(x, 0, 0.6, [[0, '#ff9a5a'], [1, '#ffd9a0']]); x.fillRect(0, 0, w, h); sun(x, 0.7, 0.25, 0.1, '#fff7e0', '#ffd27a'); hills(x, 0.62, 0.05, '#e3a35e', 0.5); hills(x, 0.75, 0.04, '#c98243', 2); hills(x, 0.88, 0.03, '#a8642f', 4); },
      (x) => { x.fillStyle = lg(x, 0, 0.45, [[0, '#8ad0ff'], [1, '#d6f0ff']]); x.fillRect(0, 0, w, h); x.fillStyle = lg(x, 0.45, 1, [[0, '#6fb24a'], [1, '#2f6e2a']]); x.fillRect(0, 0.45 * h, w, h); for (let i = 0; i < 70; i++) { const fy = h * (0.47 + R() * 0.53), fx = R() * w, r = 1 + (fy / h - 0.45) * 5; x.fillStyle = ['#ff5d8f', '#ffd23f', '#ffffff', '#c56bff'][Math.floor(R() * 4)]; x.beginPath(); x.arc(fx, fy, r, 0, Math.PI * 2); x.fill(); } },
    ],
    'Efeitos': [
      (x) => { x.fillStyle = '#0b0614'; x.fillRect(0, 0, w, h); for (let i = 0; i < 6; i++) { const g = x.createRadialGradient(R() * w, R() * h, 0, R() * w, R() * h, w * (0.4 + R() * 0.5)); const c = ['255,60,170', '60,140,255', '140,60,255', '0,230,200'][i % 4]; g.addColorStop(0, `rgba(${c},.85)`); g.addColorStop(1, `rgba(${c},0)`); x.fillStyle = g; x.fillRect(0, 0, w, h); } x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = 2; x.beginPath(); x.arc(w / 2, h / 2, w * 0.26, 0, Math.PI * 2); x.stroke(); },
      (x) => { x.fillStyle = lg(x, 0, 1, [[0, '#120a24'], [1, '#2a0d3a']]); x.fillRect(0, 0, w, h); for (let i = 0; i < 5; i++) { const cx = (0.1 + i * 0.2) * w; const g = x.createLinearGradient(cx, 0, w / 2, h * 0.75); const c = ['255,80,200', '80,200,255', '255,220,90', '160,90,255', '90,255,180'][i]; g.addColorStop(0, `rgba(${c},.0)`); g.addColorStop(0.3, `rgba(${c},.55)`); g.addColorStop(1, `rgba(${c},0)`); x.fillStyle = g; x.beginPath(); x.moveTo(cx - 3, 0); x.lineTo(cx + 3, 0); x.lineTo(w / 2 + 30, h * 0.8); x.lineTo(w / 2 - 30, h * 0.8); x.closePath(); x.fill(); } x.fillStyle = '#06030c'; for (let i = 0; i < 12; i++) { const px = (i / 11) * w; x.beginPath(); x.arc(px, h * (0.86 + R() * 0.04), w * 0.06, 0, Math.PI * 2); x.fill(); } x.fillRect(0, h * 0.9, w, h); },
    ],
  };
  const [fa, fb] = scenes[cat] || scenes['Básicas'];
  return [mk(fa), mk(fb)];
}
