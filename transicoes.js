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
// desfoque leve e barato: reduz e amplia (funciona em qualquer navegador, inclusive Safari)
function blurred(img, W, H, amt, key) {
  const f = Math.max(1, Math.round(1 + amt * 22)), w = Math.max(2, Math.round(W / f)), h = Math.max(2, Math.round(H / f));
  const s = tmp(key + 's', w, h), sx = s.getContext('2d'); sx.imageSmoothingEnabled = true; sx.drawImage(img, 0, 0, w, h);
  const o = tmp(key + 'o', W, H), ox = o.getContext('2d'); ox.imageSmoothingEnabled = true; ox.clearRect(0, 0, W, H); ox.drawImage(s, 0, 0, W, H);
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
  { id: 'burn', name: 'Film burn', cat: 'Básicas', dur: 1.0, snd: '@burn', over: true },
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

// Imagens de exemplo para a prévia, quando ainda não há clipes: geradas aqui mesmo (nada vem da internet)
export function sampleFrames(w, h) {
  const mk = (fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d')); return c; };
  const A = mk((x) => {
    const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#ff8a3d'); g.addColorStop(1, '#ff3d7f'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(255,255,255,.9)'; x.beginPath(); x.arc(w * 0.5, h * 0.4, w * 0.22, 0, Math.PI * 2); x.fill();
    x.fillStyle = 'rgba(80,0,40,.35)'; x.fillRect(0, h * 0.68, w, h * 0.32);
  });
  const B = mk((x) => {
    const g = x.createLinearGradient(0, h, w, 0); g.addColorStop(0, '#2b6cff'); g.addColorStop(1, '#3de0c8'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(255,255,255,.85)';
    x.beginPath(); x.moveTo(w * 0.5, h * 0.2); x.lineTo(w * 0.8, h * 0.62); x.lineTo(w * 0.2, h * 0.62); x.closePath(); x.fill();
    x.fillStyle = 'rgba(0,20,60,.3)'; for (let i = 0; i < 4; i++) x.fillRect(0, h * (0.72 + i * 0.07), w, h * 0.03);
  });
  return [A, B];
}
