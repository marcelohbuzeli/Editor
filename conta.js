// Conta do Meu Editor: login (e-mail + senha, link/código por e-mail, esqueci a senha) no Supabase próprio do Editor.
// O app só abre com login e perfil ativo. Sem dependências: fala direto com a API de Auth do Supabase.
export const SB = { url: 'https://ebtyzwsujufkdgxkbiho.supabase.co', key: 'sb_publishable_H4PrhFsUlp4crpXsOe-wpA_BWpa_GYD' };
const CHAVE = 'editor-sessao';
const APP_URL = location.origin + location.pathname.replace(/index\.html$/, '');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let perfilCache = null;
const ler = () => { try { return JSON.parse(localStorage.getItem(CHAVE) || 'null'); } catch { return null; } };
const gravar = (s) => { try { s ? localStorage.setItem(CHAVE, JSON.stringify(s)) : localStorage.removeItem(CHAVE); } catch {} };
function guardar(ses) {
  ses.expires_at ??= Math.floor(Date.now() / 1000) + (ses.expires_in || 3600);
  gravar(ses); return ses;
}

async function auth(path, body, token) {
  const r = await fetch(SB.url + '/auth/v1' + path, {
    method: body === undefined ? 'GET' : (path === '/user' ? 'PUT' : 'POST'),
    headers: { apikey: SB.key, 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const t = await r.text(); let j = {}; try { j = t ? JSON.parse(t) : {}; } catch {}
  if (!r.ok) throw new Error(traduzir(j.error_code || j.code || j.error, j.msg || j.message || j.error_description || ('erro ' + r.status)));
  return j;
}
function traduzir(cod, msg) {
  const m = {
    invalid_credentials: 'E-mail ou senha incorretos.',
    email_not_confirmed: 'Confirme seu e-mail antes de entrar.',
    otp_expired: 'Código vencido ou inválido. Peça outro.',
    over_email_send_rate_limit: 'Muitos e-mails em pouco tempo. Espere alguns minutos.',
    over_request_rate_limit: 'Muitas tentativas. Espere um pouco.',
    user_not_found: 'Não achamos uma conta com esse e-mail.',
    otp_disabled: 'Não há conta com esse e-mail. Use o e-mail da compra.',
    signup_disabled: 'Não há conta com esse e-mail. Use o e-mail da compra.',
    weak_password: 'Senha fraca: use pelo menos 8 caracteres.',
    same_password: 'A senha nova precisa ser diferente da atual.',
  };
  return m[cod] || msg;
}

// Sessão válida (renova sozinha quando está para vencer). null = sem login.
let renovando = null;
export async function sessao() {
  let ses = ler(); if (!ses?.access_token) return null;
  if ((ses.expires_at || 0) * 1000 < Date.now() + 60000) {
    if (!ses.refresh_token) return null;
    renovando ??= auth('/token?grant_type=refresh_token', { refresh_token: ses.refresh_token })
      .then(guardar).catch((e) => { if (/refresh|invalid|not found/i.test(e.message)) gravar(null); return null; })
      .finally(() => { renovando = null; });
    ses = await renovando;
  }
  return ses;
}
// Pedido autenticado para a API do Supabase (REST, Storage, Functions).
export async function sbReq(path, opt = {}) {
  const ses = await sessao(); if (!ses) { mostrarLogin(); throw new Error('Entre na sua conta para continuar.'); }
  const r = await fetch(SB.url + path, { ...opt, headers: { apikey: SB.key, Authorization: 'Bearer ' + ses.access_token, ...(opt.headers || {}) } });
  if (r.status === 401) { const s2 = await sessao(); if (!s2) mostrarLogin(); }
  if (!r.ok) {
    const t = (await r.text()).slice(0, 300); let j = null; try { j = JSON.parse(t); } catch {}
    const e = new Error(j?.mensagem || j?.message || ('Erro ' + r.status + ': ' + t)); e.status = r.status; e.codigo = j?.codigo; e.dados = j; throw e;
  }
  return r;
}
export async function perfil(forcar = false) {
  if (perfilCache && !forcar) return perfilCache;
  const ses = await sessao(); if (!ses) return null;
  const r = await sbReq(`/rest/v1/perfis?id=eq.${ses.user.id}&select=id,email,nome,plano,creditos,status,kit`);
  perfilCache = (await r.json())[0] || null; return perfilCache;
}
export async function salvarKit(kit) {
  const ses = await sessao();
  await sbReq(`/rest/v1/perfis?id=eq.${ses.user.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ kit }) });
  if (perfilCache) perfilCache.kit = kit;
}
export async function sair() {
  const ses = ler();
  try { if (ses?.access_token) await fetch(SB.url + '/auth/v1/logout', { method: 'POST', headers: { apikey: SB.key, Authorization: 'Bearer ' + ses.access_token } }); } catch {}
  gravar(null); perfilCache = null; location.reload();
}
export async function trocarSenha(senha) { const ses = await sessao(); await auth('/user', { password: senha }, ses.access_token); try { localStorage.removeItem('editor-nova-senha'); } catch {} }

// ---------- Tela de login ----------
let host = null, resolver = null, etapa = 'senha', emailAtual = '';
function css() {
  if (document.getElementById('conta-css')) return;
  const s = document.createElement('style'); s.id = 'conta-css';
  s.textContent = `
#conta{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px 16px calc(24px + env(safe-area-inset-bottom));
  background:radial-gradient(120% 80% at 50% 0%,var(--bg1,#1a1030),var(--bg0,#0c0814));color:var(--ink,#fff);overflow:auto;font-family:var(--font,Helvetica,Arial,sans-serif)}
#conta[hidden]{display:none}
#conta .cx{width:100%;max-width:380px}
#conta .marca{display:flex;align-items:center;gap:10px;justify-content:center;margin-bottom:22px;font-weight:700;font-size:20px}
#conta .marca i{width:38px;height:38px;border-radius:12px;background:var(--logo,#ff6d29);display:grid;place-items:center}
#conta .marca svg{width:22px;height:22px;color:#fff}
#conta h2{font-size:22px;margin:0 0 6px;text-align:center}
#conta p.sub{color:var(--ink-3,#aaa);text-align:center;margin:0 0 18px;font-size:14px;line-height:1.45}
#conta label{display:block;font-size:13px;color:var(--ink-2,#ddd);margin:12px 0 6px}
#conta input{width:100%;box-sizing:border-box;height:50px;border-radius:14px;border:1px solid var(--line-2,#444);background:var(--glass-2,#ffffff17);color:inherit;font-size:16px;padding:0 14px}
#conta input:focus{outline:none;border-color:var(--accent,#FF6B2C)}
#conta input.cod{letter-spacing:.4em;text-align:center;font-size:22px;font-weight:700}
#conta .b{width:100%;height:52px;border-radius:999px;border:0;background:var(--accent,#FF6B2C);color:#fff;font-weight:700;font-size:16px;margin-top:16px}
#conta .b:disabled{opacity:.5}
#conta .b2{background:none;border:0;color:var(--accent-2,#FFB089);font-size:14px;margin-top:14px;width:100%;padding:8px}
#conta .abas{display:flex;background:var(--glass,#ffffff0e);border-radius:999px;padding:4px;margin-bottom:6px}
#conta .abas button{flex:1;height:38px;border:0;border-radius:999px;background:none;color:var(--ink-2,#ddd);font-weight:600;font-size:13.5px}
#conta .abas button.on{background:var(--glass-3,#ffffff24);color:#fff}
#conta .msg{min-height:20px;margin-top:12px;font-size:13.5px;text-align:center;color:var(--ink-2,#ddd)}
#conta .msg.erro{color:var(--danger,#ff5a6e)}
#conta .rod{margin-top:26px;text-align:center;font-size:12.5px;color:var(--ink-3,#999)}
#conta .rod a{color:var(--accent-2,#FFB089)}`;
  document.head.appendChild(s);
}
const LOGO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12"/></svg>';

function tela(html, bind) {
  css();
  if (!host) { host = document.createElement('div'); host.id = 'conta'; document.body.appendChild(host); }
  host.hidden = false;
  host.innerHTML = `<div class="cx"><div class="marca"><i>${LOGO}</i>Meu Editor</div>${html}
    <div class="msg" id="ct-msg"></div>
    <div class="rod">Ainda não tem acesso? <a href="instalar.html#comprar">Saiba como</a> · <a href="instalar.html">Instalar no iPhone</a></div></div>`;
  bind?.(host);
  const f = host.querySelector('input'); if (f && !f.value) setTimeout(() => f.focus(), 50);
}
const msg = (t, erro) => { const m = host?.querySelector('#ct-msg'); if (m) { m.textContent = t || ''; m.className = 'msg' + (erro ? ' erro' : ''); } };
async function ocupado(btn, fn) {
  const txt = btn.textContent; btn.disabled = true; btn.textContent = 'Aguarde…'; msg('');
  try { await fn(); } catch (e) { msg(e.message, true); } finally { if (btn.isConnected) { btn.disabled = false; btn.textContent = txt; } }
}

function telaLogin() {
  const abas = `<div class="abas"><button data-e="senha" class="${etapa === 'senha' ? 'on' : ''}">Com senha</button><button data-e="link" class="${etapa === 'link' ? 'on' : ''}">Link por e-mail</button></div>`;
  if (etapa === 'senha') {
    tela(`<h2>Entrar</h2><p class="sub">Use o e-mail da sua compra.</p>${abas}
      <form id="f"><label>E-mail</label><input type="email" id="em" autocomplete="email" inputmode="email" value="${esc(emailAtual)}" required>
      <label>Senha</label><input type="password" id="pw" autocomplete="current-password" required>
      <button class="b" id="ok">Entrar</button></form>
      <button class="b2" id="esq">Esqueci a senha / primeiro acesso</button>`, (h) => {
      h.querySelector('#f').onsubmit = (ev) => { ev.preventDefault(); emailAtual = h.querySelector('#em').value.trim();
        ocupado(h.querySelector('#ok'), async () => { const s = await auth('/token?grant_type=password', { email: emailAtual, password: h.querySelector('#pw').value }); guardar(s); await entrar(); }); };
      h.querySelector('#esq').onclick = () => { emailAtual = h.querySelector('#em').value.trim(); etapa = 'esqueci'; telaLogin(); };
      ligarAbas(h);
    });
  } else if (etapa === 'link') {
    tela(`<h2>Entrar sem senha</h2><p class="sub">Mandamos um link para o seu e-mail. Abra o link neste aparelho.</p>${abas}
      <form id="f"><label>E-mail</label><input type="email" id="em" autocomplete="email" inputmode="email" value="${esc(emailAtual)}" required>
      <button class="b" id="ok">Enviar link</button></form>
      <p class="sub" style="margin-top:14px">No iPhone com o app instalado, prefira entrar <b>com senha</b>: o link abre no Safari, fora do app.</p>`, (h) => {
      h.querySelector('#f').onsubmit = (ev) => { ev.preventDefault(); emailAtual = h.querySelector('#em').value.trim();
        ocupado(h.querySelector('#ok'), async () => { await auth('/otp?redirect_to=' + encodeURIComponent(APP_URL), { email: emailAtual, create_user: false }); etapa = 'codigo-link'; telaLogin(); msg('Pronto! Veja seu e-mail (e a caixa de spam).'); }); };
      ligarAbas(h);
    });
  } else if (etapa === 'codigo-link' || etapa === 'codigo-senha') {
    const rec = etapa === 'codigo-senha';
    tela(`<h2>${rec ? 'Criar senha nova' : 'Confira seu e-mail'}</h2>
      <p class="sub">Enviamos um e-mail para <b>${esc(emailAtual)}</b>. Toque no link do e-mail${rec ? '' : ' neste aparelho'} ou, se ele trouxer um código, digite aqui.</p>
      <form id="f"><label>Código do e-mail</label><input id="cd" class="cod" inputmode="numeric" autocomplete="one-time-code" maxlength="10">
      <button class="b" id="ok">Confirmar código</button></form>
      <button class="b2" id="volta">Voltar</button>`, (h) => {
      h.querySelector('#f').onsubmit = (ev) => { ev.preventDefault();
        ocupado(h.querySelector('#ok'), async () => {
          const s = await auth('/verify', { type: rec ? 'recovery' : 'email', email: emailAtual, token: h.querySelector('#cd').value.replace(/\D/g, '') });
          guardar(s); if (rec) { etapa = 'nova-senha'; telaLogin(); } else await entrar();
        }); };
      h.querySelector('#volta').onclick = () => { etapa = 'senha'; telaLogin(); };
    });
  } else if (etapa === 'esqueci') {
    tela(`<h2>Criar ou trocar a senha</h2><p class="sub">Primeiro acesso ou esqueceu a senha? Mandamos um e-mail para você criar uma senha nova.</p>
      <form id="f"><label>E-mail da compra</label><input type="email" id="em" autocomplete="email" inputmode="email" value="${esc(emailAtual)}" required>
      <button class="b" id="ok">Enviar e-mail</button></form>
      <button class="b2" id="volta">Voltar para entrar</button>`, (h) => {
      h.querySelector('#f').onsubmit = (ev) => { ev.preventDefault(); emailAtual = h.querySelector('#em').value.trim();
        ocupado(h.querySelector('#ok'), async () => { await auth('/recover?redirect_to=' + encodeURIComponent(APP_URL), { email: emailAtual }); etapa = 'codigo-senha'; telaLogin(); msg('E-mail enviado. Veja também a caixa de spam.'); }); };
      h.querySelector('#volta').onclick = () => { etapa = 'senha'; telaLogin(); };
    });
  } else if (etapa === 'nova-senha') {
    tela(`<h2>Crie sua senha</h2><p class="sub">Escolha uma senha com pelo menos 8 caracteres. Você vai usar este e-mail e esta senha para entrar, inclusive no iPhone.</p>
      <form id="f"><label>Senha nova</label><input type="password" id="p1" autocomplete="new-password" minlength="8" required>
      <label>Repita a senha</label><input type="password" id="p2" autocomplete="new-password" minlength="8" required>
      <button class="b" id="ok">Salvar e entrar</button></form>`, (h) => {
      h.querySelector('#f').onsubmit = (ev) => { ev.preventDefault();
        const a = h.querySelector('#p1').value, b = h.querySelector('#p2').value;
        if (a !== b) return msg('As senhas não são iguais.', true);
        ocupado(h.querySelector('#ok'), async () => { await trocarSenha(a); await entrar(); }); };
    });
  }
}
function ligarAbas(h) { h.querySelectorAll('.abas [data-e]').forEach((b) => b.onclick = () => { const em = h.querySelector('#em'); if (em) emailAtual = em.value.trim(); etapa = b.dataset.e; telaLogin(); }); }

function telaBloqueado(p) {
  tela(`<h2>Acesso bloqueado</h2><p class="sub">A conta <b>${esc(p?.email || '')}</b> está sem acesso ativo${p ? '' : ' (perfil não encontrado)'}. Isso acontece após reembolso, chargeback ou cancelamento da assinatura.</p>
    <p class="sub">Se acha que é um engano, responda o e-mail da compra.</p>
    <button class="b" id="tenta">Tentar de novo</button><button class="b2" id="sai">Sair desta conta</button>`, (h) => {
    h.querySelector('#tenta').onclick = (ev) => ocupado(ev.currentTarget, entrar);
    h.querySelector('#sai').onclick = sair;
  });
}

async function entrar() {
  const p = await perfil(true).catch(() => null);
  if (!p || p.status !== 'ativo') return telaBloqueado(p);
  if (host) host.hidden = true;
  resolver?.(p); resolver = null;
}
export function mostrarLogin() { if (host && !host.hidden) return; etapa = 'senha'; telaLogin(); }

// Volta de um link do e-mail (#access_token=…&type=magiclink|recovery|invite) ou erro (#error=…)
async function lerRetornoDoEmail() {
  if (!location.hash.includes('access_token') && !location.hash.includes('error')) return null;
  const q = new URLSearchParams(location.hash.slice(1));
  history.replaceState(null, '', location.pathname + location.search);
  if (q.get('error')) return { erro: q.get('error_code') === 'otp_expired' ? 'O link venceu ou já foi usado. Peça outro.' : (q.get('error_description') || 'Link inválido.') };
  const ses = { access_token: q.get('access_token'), refresh_token: q.get('refresh_token'), expires_in: +q.get('expires_in') || 3600, expires_at: +q.get('expires_at') || undefined };
  ses.user = await auth('/user', undefined, ses.access_token);
  guardar(ses);
  return { tipo: q.get('type') };
}

// Chamado pelo app ao abrir: resolve com o perfil quando o usuário está logado e ativo.
export function iniciar() {
  return new Promise(async (res) => {
    resolver = res;
    let ret = null; try { ret = await lerRetornoDoEmail(); } catch (e) { ret = { erro: e.message }; }
    if (ret?.tipo === 'recovery' || ret?.tipo === 'invite') { try { localStorage.setItem('editor-nova-senha', '1'); } catch {} }
    const ses = await sessao();
    // veio do link de criar/trocar senha (mesmo que a página tenha recarregado no meio): pede a senha nova antes de abrir
    let novaSenha = false; try { novaSenha = localStorage.getItem('editor-nova-senha') === '1'; } catch {}
    if (ses && novaSenha) { etapa = 'nova-senha'; telaLogin(); return; }
    if (!ses) { etapa = 'senha'; telaLogin(); if (ret?.erro) msg(ret.erro, true); return; }
    try { await entrar(); } catch { etapa = 'senha'; telaLogin(); }
  });
}
