// Webhook da Kiwify → libera ou bloqueia o acesso ao Meu Editor.
// URL para colar na Kiwify: https://<projeto>.supabase.co/functions/v1/kiwify-webhook
// Segredos: KIWIFY_TOKEN (token do webhook na Kiwify), APP_URL (endereço do app), KIWIFY_PLANOS (opcional, JSON).
//
// A Kiwify assina cada envio: ?signature=<HMAC-SHA1 do corpo, com o token>. Também aceitamos ?token=<token>
// (útil em testes). Sem assinatura válida, nada acontece (401).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const TOKEN = Deno.env.get("KIWIFY_TOKEN") ?? "";
const APP_URL = Deno.env.get("APP_URL") ?? "https://marcelohbuzeli.github.io/Editor/";
// Ex.: {"padrao":{"plano":"mensal","creditos":30},"Meu Editor Anual":{"plano":"anual","creditos":400}}
// A chave é o nome do plano da assinatura ou do produto na Kiwify; "padrao" vale para o resto.
const PLANOS: Record<string, { plano: string; creditos: number }> = (() => {
  try { return JSON.parse(Deno.env.get("KIWIFY_PLANOS") ?? "{}"); } catch { return {}; }
})();
const PADRAO = PLANOS.padrao ?? { plano: "editor", creditos: 30 };

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function hmacSha1Hex(key: string, msg: string) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function iguais(a: string, b: string) {   // comparação em tempo constante
  if (a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
async function assinaturaValida(url: URL, corpo: string, obj: unknown) {
  if (!TOKEN) return false;
  const tk = url.searchParams.get("token");
  if (tk && iguais(tk, TOKEN)) return true;
  const sig = (url.searchParams.get("signature") ?? "").toLowerCase();
  if (!sig) return false;
  // a Kiwify assina o JSON do pedido; conferimos o corpo cru e a versão re-serializada
  for (const m of [corpo, JSON.stringify(obj), JSON.stringify((obj as { order?: unknown })?.order ?? null)]) {
    if (m && iguais(await hmacSha1Hex(TOKEN, m), sig)) return true;
  }
  return false;
}

type Pedido = Record<string, any>;
function classificar(p: Pedido): "liberar" | "bloquear" | "ignorar" {
  const ev = String(p.webhook_event_type ?? "").toLowerCase();
  const st = String(p.order_status ?? "").toLowerCase();
  if (["order_refunded", "chargeback", "subscription_canceled"].includes(ev)) return "bloquear";
  if (["refunded", "chargedback", "chargeback"].includes(st)) return "bloquear";
  // compra aprovada (inclui cupom de 100%: chega como pedido pago de valor zero) e renovação
  if (["order_approved", "subscription_renewed"].includes(ev)) return "liberar";
  if (st === "paid" || st === "approved") return "liberar";
  return "ignorar";
}
function planoDo(p: Pedido) {
  const nomes = [p.Subscription?.plan?.name, p.Product?.product_name, p.Product?.product_id].filter(Boolean).map(String);
  for (const n of nomes) if (PLANOS[n]) return PLANOS[n];
  return PADRAO;
}

async function acharUsuario(email: string) {
  const { data } = await admin.from("perfis").select("id, creditos, status, kiwify").ilike("email", email).limit(1);
  return data?.[0] ?? null;
}

async function criarOuConvidar(email: string, nome: string) {
  // convite por e-mail: o comprador recebe o link e um código para criar a senha
  const inv = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: APP_URL, data: { nome } });
  if (!inv.error && inv.data?.user) return { id: inv.data.user.id, convite: "enviado" };
  // e-mail não saiu (ex.: SMTP padrão do Supabase só envia para a equipe): cria a conta mesmo assim;
  // o comprador entra depois com "Esqueci a senha" / código por e-mail quando o SMTP estiver configurado.
  const cr = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { nome } });
  if (cr.error || !cr.data?.user) throw new Error("não consegui criar o usuário: " + (cr.error?.message ?? inv.error?.message));
  return { id: cr.data.user.id, convite: "falhou: " + (inv.error?.message ?? "sem detalhe") };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { erro: "use POST" });
  const url = new URL(req.url);
  const corpo = await req.text();
  let obj: any;
  try { obj = JSON.parse(corpo); } catch { return json(400, { erro: "JSON inválido" }); }
  if (!(await assinaturaValida(url, corpo, obj))) return json(401, { erro: "assinatura inválida" });

  const p: Pedido = obj.order ?? obj;
  const email = String(p.Customer?.email ?? p.customer?.email ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) return json(400, { erro: "pedido sem e-mail do cliente" });
  const acao = classificar(p);
  const evento = String(p.webhook_event_type ?? p.order_status ?? "desconhecido");
  const chave = `${p.order_id ?? p.subscription_id ?? "sem-id"}:${evento}`;

  // não processa o mesmo evento duas vezes (a Kiwify reenvia quando não recebe 200)
  const { error: dup } = await admin.from("kiwify_eventos").insert({ chave, email, evento, corpo: obj });
  if (dup) {
    if (dup.code === "23505") return json(200, { ok: true, repetido: true });
    return json(500, { erro: dup.message });
  }

  try {
    if (acao === "ignorar") return json(200, { ok: true, acao });
    const resumo = { order_id: p.order_id ?? null, evento, status: p.order_status ?? null, produto: p.Product?.product_name ?? null, em: new Date().toISOString() };
    let u = await acharUsuario(email);

    if (acao === "bloquear") {
      if (!u) return json(200, { ok: true, acao, aviso: "usuário não existe" });
      await admin.from("perfis").update({ status: "bloqueado", kiwify: resumo }).eq("id", u.id);
      return json(200, { ok: true, acao, usuario: u.id });
    }

    // liberar
    const pl = planoDo(p);
    let convite: string | null = null;
    if (!u) {
      const nome = String(p.Customer?.full_name ?? p.Customer?.first_name ?? "");
      const c = await criarOuConvidar(email, nome);
      convite = c.convite;
      // o gatilho do banco cria o perfil; garante caso ainda não exista
      await admin.from("perfis").upsert({ id: c.id, email, nome }, { onConflict: "id", ignoreDuplicates: true });
      u = { id: c.id, creditos: 0, status: "ativo", kiwify: {} };
    }
    const { error } = await admin.from("perfis")
      .update({ status: "ativo", plano: pl.plano, creditos: (u.creditos ?? 0) + pl.creditos, kiwify: resumo })
      .eq("id", u.id);
    if (error) throw error;
    return json(200, { ok: true, acao, usuario: u.id, plano: pl.plano, creditos_adicionados: pl.creditos, convite });
  } catch (e) {
    // libera o reenvio da Kiwify se deu erro no meio
    await admin.from("kiwify_eventos").delete().eq("chave", chave);
    return json(500, { erro: String((e as Error).message ?? e) });
  }
});
