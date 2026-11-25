// Legendas automáticas sem o comprador precisar de chave: recebe o áudio (WAV 16 kHz mono, só a voz, nunca o vídeo),
// repassa para o Whisper da Groq com a chave do Meu Editor e devolve o JSON da Groq como veio (palavras com tempo).
// Só para quem tem login e perfil ativo. Sem o segredo GROQ_API_KEY responde { codigo: "transcricao_em_configuracao" }.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const MAX_BYTES = 24 * 1024 * 1024; // limite da Groq: 25 MB (≈ 13 min de voz em WAV 16 kHz)

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { codigo: "metodo", mensagem: "Use POST." });
  const chave = Deno.env.get("GROQ_API_KEY");
  if (!chave) return json(503, { codigo: "transcricao_em_configuracao", mensagem: "Legendas automáticas em configuração." });

  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: "Bearer " + jwt } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: u, error: ue } = await sb.auth.getUser(jwt);
  if (ue || !u?.user) return json(401, { codigo: "sem_login", mensagem: "Entre na sua conta para continuar." });
  const { data: perfil } = await sb.from("perfis").select("status").eq("id", u.user.id).single();
  if (!perfil || perfil.status !== "ativo") return json(403, { codigo: "bloqueado", mensagem: "Seu acesso está bloqueado." });

  let form: FormData;
  try { form = await req.formData(); } catch { return json(400, { codigo: "audio", mensagem: "Áudio inválido." }); }
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) return json(400, { codigo: "audio", mensagem: "Áudio vazio." });
  if (file.size > MAX_BYTES) return json(413, { codigo: "audio_grande", mensagem: "Vídeo longo demais para legendar de uma vez (máx. ~12 min de fala)." });

  const fd = new FormData();
  fd.append("file", file, "audio.wav");
  fd.append("model", "whisper-large-v3");
  fd.append("language", String(form.get("language") || "pt"));
  fd.append("response_format", "verbose_json");
  fd.append("timestamp_granularities[]", "word");
  fd.append("timestamp_granularities[]", "segment");
  const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", { method: "POST", headers: { Authorization: "Bearer " + chave }, body: fd });
  if (r.status === 429) return json(429, { codigo: "limite", mensagem: "Muita gente legendando agora. Tente de novo em 1 minuto." });
  if (!r.ok) return json(502, { codigo: "groq", mensagem: "A transcrição falhou (" + r.status + "). Tente de novo." });
  return new Response(await r.text(), { headers: { ...cors, "Content-Type": "application/json" } });
});
