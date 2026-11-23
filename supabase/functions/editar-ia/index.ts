// "Editar com IA": recebe a TRANSCRIÇÃO (o vídeo nunca sai do aparelho), o formulário e o kit da marca,
// e devolve uma RECEITA em JSON que o app aplica com as funções que já tem (as mesmas do __agente).
// Créditos só são debitados depois que a receita volta.
//
// GET  → { ativa, custo, creditos }   (o app mostra o estado antes de enviar)
// POST → { receita, creditos }        ou { codigo, mensagem } em caso de erro
// Sem o segredo ANTHROPIC_API_KEY responde { codigo: "ia_em_configuracao" }.
import Anthropic from "npm:@anthropic-ai/sdk@0.71.0";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const CUSTO = Number(Deno.env.get("CUSTO_IA") ?? "1") || 1;
const MODELO = "claude-opus-5-5";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

// ---------- Receita (JSON Schema da saída estruturada) ----------
const str = { type: "string" }, int = { type: "integer" }, num = { type: "number" }, bool = { type: "boolean" };
const obj = (properties: Record<string, unknown>) => ({ type: "object", properties, required: Object.keys(properties), additionalProperties: false });
const arr = (items: unknown) => ({ type: "array", items });
const RECEITA = obj({
  resumo: str,                                                       // 1–2 frases para o usuário: o que foi feito
  trechos: arr(obj({ de: int, ate: int })),                          // faixas de palavras que FICAM, na ordem final
  pausa_max: num,                                                    // pausas maiores que isso (s) são cortadas
  legenda: obj({
    modelo: { type: "string", enum: ["impacto", "elegante", "editorial", "simples"] },
    fonte: str, cor: str, cor_destaque: str, maiusculas: bool,
    posicao: { type: "string", enum: ["baixo", "meio", "alto"] },
  }),
  destaques: arr(str),                                               // palavras soltas que entram em destaque
  combinacoes: arr(obj({ grande: str, manuscrito: str })),           // frase de efeito: parte grande + parte manuscrita
  zoom_nos_cortes: bool,
  zooms_pontos: arr(obj({ palavra: int, forca: num })),              // zoom no ponto alto (índice da palavra)
  transicao_padrao: { type: "string", enum: ["none", "flash", "burn"] },
  transicoes: arr(obj({ palavra: int, tipo: { type: "string", enum: ["none", "flash", "burn"] } })),
  sons: arr(obj({ palavra: int, som: str })),                        // efeito sonoro no início dessa palavra
  textos: arr(obj({                                                  // textos / motion por cima do vídeo
    texto: str, palavra: int, duracao: num,
    layout: { type: "string", enum: ["bloco", "script", "etiqueta", "mix", "eco", "espacado"] },
    animacao_entrada: str, animacao_saida: str,
  })),
});

// Prompt de sistema estável (fica em cache): nada que mude por pedido entra aqui.
const SISTEMA = `Você é o editor automático do "Meu Editor", um editor de vídeo vertical (Reels, anúncios) que roda no celular.
Você NÃO vê o vídeo: recebe a transcrição palavra por palavra (índice | palavra | início em segundos | arquivo),
o objetivo do vídeo, o kit da marca e as opções disponíveis no app. Você devolve uma RECEITA de edição em JSON.

Como montar a receita:
1. trechos: faixas [de, ate] de índices de palavras que FICAM no vídeo, na ordem final. Remova:
   - começos em falso, frases repetidas e retakes (quando a pessoa repete uma frase, fique com a ÚLTIMA versão completa);
   - conversa fora do roteiro ("corta", "de novo", "pera", risadas, comentários para a câmera);
   - muletas soltas no começo e no fim ("é...", "então...", "tipo") quando não fazem falta.
   Se houver roteiro, siga a ordem e o texto do roteiro. Nunca invente palavras: só índices que existem.
2. pausa_max: entre 0.25 e 0.5. Reels de venda/crescimento: 0.25–0.3 (ritmo rápido). Autoridade: 0.35–0.45.
3. legenda: escolha o modelo pelo objetivo e pelo kit (impacto = forte, caixa alta; elegante = grande + manuscrito;
   editorial = sóbrio; simples = só texto). Use as cores e a fonte do kit quando existirem (cor em #RRGGBB).
4. destaques: até 1 palavra-chave a cada ~5 s (números, promessas, dores, a palavra do benefício).
5. combinacoes: 1 a 3 frases de efeito, só se o modelo for "elegante". "grande" e "manuscrito" são duas partes
   DIFERENTES e consecutivas da mesma frase falada (ex.: grande "profissão", manuscrito "mais vida").
   Copie as palavras exatamente como estão na transcrição.
6. zoom_nos_cortes: true para Reels dinâmicos (alterna zoom entre os takes). zooms_pontos: 1 a 4 picos de emoção.
   forca entre 1.1 e 1.3.
7. transicao_padrao: normalmente "none" (corte seco) em fala; "flash" só para ritmo de anúncio/venda.
   transicoes: casos pontuais (mudança de assunto). Use [] se não houver.
8. sons: poucos e com propósito (whoosh em texto que entra, "Dinheiro" em preço, "Hit" em revelação). Use só nomes
   da lista de sons recebida. Máximo 1 a cada 4 s.
9. textos: só se o usuário pediu motion. Frases curtas (2–5 palavras) que REFORÇAM a fala (gancho no início, número,
   CTA no fim). palavra = índice onde o texto entra; duracao 1.5–3 s. Animações: só nomes da lista recebida, ou "".
   Sem motion pedido: textos = [].
10. Objetivo:
   - Reels venda: gancho de dor/desejo nos 2 s iniciais, prova, CTA claro no fim.
   - Reels crescimento / seguidores: gancho forte, ritmo rápido, CTA de seguir/compartilhar.
   - Reels autoridade: ritmo mais calmo, destaques em conceitos e números.
   - Anúncio venda / leads / tráfego / alcance: o mais curto possível, benefício cedo, CTA explícito.
   Respeite a duração alvo: se a fala passar muito, corte trechos menos importantes (mantendo o sentido).
11. resumo: 1–2 frases em português simples dizendo o que você fez (sem jargão técnico).
Responda só com a receita.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const chave = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

  // ---------- quem está pedindo ----------
  const auth = req.headers.get("Authorization") ?? "";
  const jwt = auth.replace(/^Bearer\s+/i, "");
  if (!jwt) return json(401, { codigo: "sem_login", mensagem: "Entre na sua conta." });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: "Bearer " + jwt } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: u, error: ue } = await sb.auth.getUser(jwt);
  if (ue || !u?.user) return json(401, { codigo: "sem_login", mensagem: "Sessão expirada. Entre de novo." });
  const { data: perfil } = await sb.from("perfis").select("creditos, status, plano").eq("id", u.user.id).single();
  if (!perfil || perfil.status !== "ativo") return json(403, { codigo: "bloqueado", mensagem: "Seu acesso está bloqueado." });

  if (req.method === "GET") return json(200, { ativa: !!chave, custo: CUSTO, creditos: perfil.creditos });
  if (req.method !== "POST") return json(405, { codigo: "metodo", mensagem: "use POST" });

  if (!chave) return json(503, { codigo: "ia_em_configuracao", mensagem: "IA em configuração. Em breve o botão Editar com IA estará liberado." });
  if (perfil.creditos < CUSTO) return json(402, { codigo: "sem_creditos", mensagem: `Sem créditos de IA (precisa de ${CUSTO}).`, creditos: perfil.creditos });

  let pedido: any;
  try { pedido = await req.json(); } catch { return json(400, { codigo: "pedido", mensagem: "Pedido inválido." }); }
  if (!pedido?.transcricao || typeof pedido.transcricao !== "string") return json(400, { codigo: "sem_transcricao", mensagem: "Gere a legenda (transcrição) antes." });
  if (pedido.transcricao.length > 200_000) return json(413, { codigo: "longo", mensagem: "Vídeo longo demais para a IA." });

  // ---------- pedido para o Claude ----------
  const conteudo: any[] = [];
  const img = pedido.referencia_imagem;   // JPEG pequeno (base64) de uma imagem ou quadro de vídeo de referência
  if (typeof img === "string" && img.length < 1_500_000) {
    conteudo.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: img } });
  }
  conteudo.push({ type: "text", text: [
    "FORMULÁRIO:\n" + JSON.stringify(pedido.formulario ?? {}, null, 1),
    "KIT DA MARCA:\n" + JSON.stringify(pedido.kit ?? {}, null, 1),
    "OPÇÕES DO APP:\n" + JSON.stringify(pedido.opcoes ?? {}),
    `VÍDEO: ${pedido.duracao_bruta ?? "?"} s de material bruto.`,
    img ? "A imagem acima é a REFERÊNCIA de estilo que o usuário enviou." : "",
    "TRANSCRIÇÃO (índice|palavra|início s|arquivo):\n" + pedido.transcricao,
  ].filter(Boolean).join("\n\n") });

  const client = new Anthropic({ apiKey: chave });
  let msg;
  try {
    const stream = client.beta.messages.stream({
      model: MODELO,
      max_tokens: 32000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: { type: "json_schema", schema: RECEITA } },
      system: [{ type: "text", text: SISTEMA, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: conteudo }],
    } as any);
    msg = await stream.finalMessage();
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return json(503, { codigo: "ia_em_configuracao", mensagem: "IA em configuração (chave da Anthropic recusada)." });
    if (e instanceof Anthropic.RateLimitError) return json(429, { codigo: "ocupada", mensagem: "A IA está ocupada. Tente em 1 minuto." });
    if (e instanceof Anthropic.APIError) return json(502, { codigo: "ia_erro", mensagem: "A IA falhou (" + e.status + "). Nenhum crédito foi gasto." });
    return json(502, { codigo: "ia_erro", mensagem: "A IA não respondeu. Nenhum crédito foi gasto." });
  }
  if (msg.stop_reason === "refusal") return json(422, { codigo: "recusa", mensagem: "A IA não aceitou editar este conteúdo. Nenhum crédito foi gasto." });
  if (msg.stop_reason === "max_tokens") return json(502, { codigo: "ia_erro", mensagem: "A receita veio incompleta. Nenhum crédito foi gasto." });
  const texto = msg.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
  let receita;
  try { receita = JSON.parse(texto); } catch { return json(502, { codigo: "ia_erro", mensagem: "A receita veio com defeito. Nenhum crédito foi gasto." }); }

  // ---------- só agora debita ----------
  const { data: saldo, error: ge } = await sb.rpc("gastar_creditos", { qtd: CUSTO });
  if (ge) return json(402, { codigo: "sem_creditos", mensagem: "Sem créditos de IA." });
  return json(200, { receita, creditos: saldo, uso: { entrada: msg.usage.input_tokens, saida: msg.usage.output_tokens, cache: msg.usage.cache_read_input_tokens ?? 0 } });
});
