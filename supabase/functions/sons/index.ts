// Efeitos sonoros do Freesound para todos os usuários, com a chave do Meu Editor (segredo AUDIO_API_KEY).
//   GET ?q=whoosh&page=1  → lista de sons (só CC0: domínio público, uso comercial sem crédito), mais baixados primeiro
//   GET ?u=<prévia>       → o MP3 da prévia (só do CDN do Freesound), repassado com CORS
// Só para quem tem login e perfil ativo. As buscas ficam em cache (a chave tem limite diário dividido entre todos).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};
const json = (status: number, body: unknown, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json", ...extra } });

const cache = new Map<string, { at: number; body: unknown }>();
const TTL = 6 * 3600 * 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "GET") return json(405, { codigo: "metodo", mensagem: "Use GET." });
  const chave = Deno.env.get("AUDIO_API_KEY");
  if (!chave) return json(503, { codigo: "sons_em_configuracao", mensagem: "Biblioteca de sons em configuração." });

  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: "Bearer " + jwt } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: u, error: ue } = await sb.auth.getUser(jwt);
  if (ue || !u?.user) return json(401, { codigo: "sem_login", mensagem: "Entre na sua conta para continuar." });
  const { data: perfil } = await sb.from("perfis").select("status").eq("id", u.user.id).single();
  if (!perfil || perfil.status !== "ativo") return json(403, { codigo: "bloqueado", mensagem: "Seu acesso está bloqueado." });

  const url = new URL(req.url);

  // áudio da prévia (não gasta a cota da chave: vem do CDN público do Freesound)
  const prev = url.searchParams.get("u");
  if (prev) {
    let p: URL;
    try { p = new URL(prev); } catch { return json(400, { codigo: "url", mensagem: "Endereço inválido." }); }
    if (p.protocol !== "https:" || !/(^|\.)freesound\.org$/.test(p.hostname) || !p.pathname.startsWith("/previews/")) {
      return json(400, { codigo: "url", mensagem: "Só prévias do Freesound." });
    }
    const r = await fetch(p.toString());
    if (!r.ok) return json(502, { codigo: "audio", mensagem: "Não consegui baixar este som." });
    return new Response(r.body, { headers: { ...cors, "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=604800" } });
  }

  // busca
  const q = (url.searchParams.get("q") || "").trim().slice(0, 80);
  if (!q) return json(400, { codigo: "busca", mensagem: "Digite o que procura." });
  const page = Math.max(1, Math.min(10, Number(url.searchParams.get("page")) || 1));
  const key = q.toLowerCase() + "|" + page;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return json(200, hit.body, { "Cache-Control": "private, max-age=3600" });

  const api = new URL("https://freesound.org/apiv2/search/text/");
  api.searchParams.set("query", q);
  api.searchParams.set("filter", 'license:"Creative Commons 0" duration:[0.1 TO 12]');
  api.searchParams.set("sort", "downloads_desc");
  api.searchParams.set("fields", "id,name,tags,duration,username,previews,num_downloads,avg_rating");
  api.searchParams.set("page_size", "30");
  api.searchParams.set("page", String(page));
  const r = await fetch(api.toString(), { headers: { Authorization: "Token " + chave } });
  if (r.status === 429) return json(429, { codigo: "limite", mensagem: "Muita gente buscando sons agora. Tente de novo em 1 minuto." });
  if (r.status === 404) return json(200, { itens: [], mais: false });
  if (!r.ok) return json(502, { codigo: "freesound", mensagem: "A busca de sons falhou (" + r.status + "). Tente de novo." });
  const d = await r.json();
  // curadoria: só fica o som que tem a palavra buscada no nome ou nas etiquetas (a busca do Freesound é ampla demais)
  const termos = q.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  const combina = (x: any) => !termos.length || termos.some((t) => (String(x.name) + " " + (x.tags || []).join(" ")).toLowerCase().includes(t));
  const body = {
    itens: (d.results || []).filter(combina).map((x: any) => ({
      id: x.id,
      nome: String(x.name || "").replace(/\.(wav|mp3|aiff?|flac|ogg|m4a)$/i, "").replace(/[_]+/g, " ").trim().slice(0, 60),
      dur: Math.round((x.duration || 0) * 100) / 100,
      autor: x.username,
      baixados: x.num_downloads,
      prev: x.previews?.["preview-hq-mp3"] || x.previews?.["preview-lq-mp3"] || null,
    })).filter((x: any) => x.prev),
    mais: !!d.next,
  };
  cache.set(key, { at: Date.now(), body });
  if (cache.size > 500) cache.clear();
  return json(200, body, { "Cache-Control": "private, max-age=3600" });
});
