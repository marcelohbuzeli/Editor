# Backend do Meu Editor (Supabase `meu-editor`)

Projeto: `ebtyzwsujufkdgxkbiho` (São Paulo, plano grátis). Separado do Dashplassô.

## O que existe
- `migrations/` — tabelas `perfis`, `projetos`, `kiwify_eventos`, bucket privado `projetos` (uma pasta por usuário),
  RLS por `auth.uid()` e acesso só com perfil `ativo`, RPC `gastar_creditos(qtd)` atômica.
- `functions/kiwify-webhook` — compra aprovada (inclui cupom 100%) cria/convida o usuário e soma créditos;
  reembolso, chargeback e cancelamento bloqueiam. Valida `?signature=` (HMAC-SHA1 com o token) ou `?token=`.
- `functions/editar-ia` — recebe a transcrição + formulário + kit e devolve a receita (Claude Opus 5.5, JSON Schema,
  prompt de sistema em cache). Debita créditos só quando a receita volta. Sem `ANTHROPIC_API_KEY` responde
  `ia_em_configuracao`.
- `functions/transcrever` — legendas automáticas para todos: recebe só a voz (WAV 16 kHz), manda para o Whisper
  large v3 da Groq com a chave do Meu Editor e devolve as palavras com tempo. Só com login e perfil ativo.
  Sem `GROQ_API_KEY` responde `transcricao_em_configuracao`.
- `functions/sons` — efeitos sonoros do Freesound para todos (só CC0, os mais baixados). Busca com cache de 6 h
  (a chave tem limite diário) e repasse das prévias MP3. Só com login e perfil ativo. Segredo `AUDIO_API_KEY`.
- `auth/emails-pt.json` — e-mails em português (com código de 6 dígitos). Só dá para aplicar com SMTP próprio.

## Segredos (Edge Functions)
| nome | valor |
|---|---|
| `KIWIFY_TOKEN` | token do webhook na Kiwify (hoje há um temporário; troque pelo da Kiwify) |
| `KIWIFY_PLANOS` | ex.: `{"padrao":{"plano":"editor","creditos":30},"Meu Editor Anual":{"plano":"anual","creditos":400}}` |
| `APP_URL` | `https://marcelohbuzeli.github.io/Editor/` |
| `ANTHROPIC_API_KEY` | quando comprar a chave: liga o "Editar com IA" |
| `GROQ_API_KEY` | chave da Groq (gsk_…): liga as legendas automáticas para todos os usuários |
| `AUDIO_API_KEY` | chave da API do Freesound: liga a biblioteca de efeitos sonoros |
| `CUSTO_IA` | créditos por edição (padrão 1) |

```bash
supabase secrets set --remote=ebtyzwsujufkdgxkbiho ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set --remote=ebtyzwsujufkdgxkbiho GROQ_API_KEY=gsk_...
supabase functions deploy kiwify-webhook editar-ia transcrever sons --remote=ebtyzwsujufkdgxkbiho --no-verify-jwt --use-api
```

## Kiwify
Webhook: `https://ebtyzwsujufkdgxkbiho.supabase.co/functions/v1/kiwify-webhook`
Eventos: compra aprovada, reembolso, chargeback, assinatura cancelada, assinatura renovada.

## Antes de vender (obrigatório)
O e-mail padrão do Supabase só envia para a equipe e tem limite de 2 por hora. Configure um SMTP próprio
(ex.: Resend) em Authentication → SMTP, e depois aplique `auth/emails-pt.json` (Authentication → Email Templates).
Sem isso, o comprador não recebe o convite nem o "esqueci a senha".
