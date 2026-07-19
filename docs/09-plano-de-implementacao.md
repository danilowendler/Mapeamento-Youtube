# 9 · Plano de Implementação

> Roteiro executável do MVP em **10 milestones** agrupados nos estágios lançáveis C → B → A ([doc 2](02-requisitos-e-escopo.md)). Cada milestone tem critérios de conclusão **verificáveis** — um milestone só fecha quando todos passam. Nenhum código é escrito fora da ordem daqui sem atualizar este documento.

**Convenções de execução:**
- Branch por milestone (`m1-auth`, `m2-coleta`...), merge em `main` só com CI verde.
- Ao final de cada milestone: demo manual do critério de conclusão + registro de aprendizados que alterem docs.
- Referências: cada milestone aponta os documentos que governam seu conteúdo.

---

## Estágio C — Núcleo mágico (milestones 0–4 · semanas 1–3)

### M0 · Fundação (2–3 dias)
Objetivo: esqueleto do projeto com qualidade de produção desde o primeiro commit.

Entregáveis:
- Next.js (App Router) + TypeScript estrito + Tailwind, estrutura de pastas do [doc 4, §4.3](04-arquitetura.md)
- Tokens do design system ([DESIGN-ferrari.md](../DESIGN-ferrari.md)) mapeados no Tailwind (cores semânticas, escada de espaçamento, tipografia Inter via `next/font`)
- Projeto Supabase de desenvolvimento + Supabase CLI com migrations funcionando (o projeto de **produção** é criado só no M4, antes do beta — aplicar as migrations acumuladas nele do zero valida que elas reconstroem o banco inteiro)
- Contas/integrações: Inngest (dev), Google Cloud (chave YouTube com restrição de API)
- CI (GitHub Actions): typecheck + lint + testes em todo push
- Variáveis de ambiente documentadas (`.env.example`)

✅ Conclusão: `pnpm build` e CI verdes; página inicial vazia deployada na Vercel com preview por PR; migration de teste aplicada via CLI no projeto de desenvolvimento.

### M1 · Auth + shell do app (3–4 dias) — [C1]
Objetivo: entrar no produto com segurança.

Entregáveis:
- Supabase Auth: e-mail/senha com verificação + Google OAuth; `middleware.ts` protegendo o app
- Trigger de criação de `profiles`; migration inicial da zona de usuário com RLS ([doc 5, §5.2](05-modelo-de-dados.md))
- Shell autenticado: sidebar (Nova Pesquisa · Histórico · Conta), tema escuro com tokens, responsivo
- Páginas de auth (login, cadastro, recuperação) no design system

✅ Conclusão: cadastro → verificação → login → shell; teste de integração provando que usuário A não lê dados do usuário B (RLS).

### M2 · Corpus + pipeline de coleta (5–6 dias) — [C7 e base de tudo]
Objetivo: dado um ID de canal, o corpus se popula sozinho, dentro do orçamento de cota. **É o milestone de maior risco técnico — por isso vem cedo.**

Entregáveis:
- Migrations do corpus global: `channels`, `videos`, `collection_jobs`, `quota_ledger` ([doc 5, §5.1/5.3](05-modelo-de-dados.md))
- `lib/youtubeClient` tipado (channels, playlistItems, videos) com tratamento de erros/paginação
- `quotaService`: token bucket diário com reserva prévia, prioridades e reserva estratégica de 15% ([doc 3, §3.4](03-estrategia-de-dados.md))
- Pipeline Inngest `collectChannel`: resolver canal → coletar até 200 vídeos → gravar (upsert idempotente) — [doc 3, §3.5](03-estrategia-de-dados.md)
- Política de frescor: cache ≤ 7 dias servido direto; recoleta incremental 7–30 dias ([doc 3, §3.3](03-estrategia-de-dados.md))

✅ Conclusão: disparar coleta de 3 canais reais pelo painel do Inngest → corpus populado; segunda execução consome ~0 unidades (cache); `quota_ledger` bate com o consumo real do console Google; testes unitários do `quotaService`.

### M3 · Motor de outliers + pesquisa progressiva (5–6 dias) — [C2, C3, C4, C5]
Objetivo: o momento "uau" funcionando de ponta a ponta.

Entregáveis:
- `analysisService`: baselines por formato/faixa de idade (mediana), score por vídeo, flag de baixa confiança ([doc 3, §3.6](03-estrategia-de-dados.md)) — **com bateria completa de testes unitários** (é o coração do produto)
- Migrations: `channel_baselines`, `searches`, `search_results`
- Fluxo completo: `POST /api/searches` (Zod + limite transacional) → evento → pipeline → publicação progressiva
- Tela Nova Pesquisa (campo inteligente: URL/@handle/nome + modo lista) e tela Resultados: cards com badge de score, explicação do destaque, Shorts/longos separados, progresso "X de Y", Realtime ([doc 6, §6.3/6.4](06-ux-ui.md))

✅ Conclusão: pesquisar uma lista de 5 canais frios → primeiros cards < 15 s, lista completa < 3 min; pesquisa repetida → tudo < 2 s; scores conferidos manualmente contra planilha para 2 canais conhecidos.

### M4 · Histórico + produção (2–3 dias) — [C6] → **marco: Estágio C lançável**
Entregáveis: tela Histórico (reabrir sem reprocessar), estados de erro/vazio/fila projetados no [doc 6, §6.5](06-ux-ui.md), Sentry ativo, **criação do projeto Supabase de produção** (migrations aplicadas do zero + Vercel de produção apontando para ele).

> **Decisão (11/07/2026):** o time de produto dispensou o beta fechado — lançamento vai direto ao público no fim do estágio B/A. A infraestrutura de convites (`beta_invites`, gate `BETA_INVITE_REQUIRED`) foi construída e fica **dormente** (variável desligada); pode ser ativada no futuro para early access sem nenhum desenvolvimento novo.

✅ Conclusão: ambiente de produção no ar (Vercel + Supabase prod + Inngest), fluxo completo validado em produção pelo fundador; custo de cota por pesquisa medido e registrado no [doc 3](03-estrategia-de-dados.md).

---

## Estágio B — Descoberta (milestones 5–6 · semanas 4–6)

### M5 · Busca por keyword + nichos curados (5–6 dias) — [B1, B2]
Entregáveis:
- `search.list` no `youtubeClient` + racionamento por prioridade no `quotaService`
- Migrations: `keyword_cache`, `keyword_results`, `niches` + seed de ≥ 20 nichos PT-BR (curadoria manual)
- Cache de keyword 72 h ([doc 3, §3.2](03-estrategia-de-dados.md)); pipeline `runSearch` orquestrando keyword → canais → coleta
- UI: modos keyword/nicho na Nova Pesquisa, grade de nichos, onboarding da primeira sessão ([doc 6, §6.2](06-ux-ui.md))

✅ Conclusão: usuário novo chega a oportunidades a partir de um nicho em < 60 s (cache aquecido); keyword repetida por outro usuário custa 0 unidades; custo real por nicho frio registrado.

### M6 · Relacionados, filtros e limites visíveis (4–5 dias) — [B3, B4, B5, B6] → **marco: Estágio B, lançamento público gratuito**
Entregáveis:
- `channel_niche_affinity` alimentada pelas coaparições + seção "canais relacionados"
- Filtros e ordenação client-side com estado na URL (compartilhável)
- `plans` + `usage_periods` + contador de uso na UI + paywall não-hostil (plano único `free` por ora)
- Landing provisória mínima (1 seção, CTA de cadastro) — a definitiva vem no M9

✅ Conclusão: funil completo instrumentado (cadastro → 1ª pesquisa → resultado → retorno); ativação ≥ 60% medida na primeira semana pública; limites do free aplicados transacionalmente (teste de corrida).

---

## Estágio A — Comercial (milestones 7–9 · semanas 7–9)

### M7 · Billing Stripe (4–5 dias) — [A1, A2, A3]
Entregáveis:
- Produtos/preços no Stripe (Criador R$ 49 · Pro R$ 99); Checkout + Customer Portal
- Webhooks com verificação de assinatura + idempotência → `subscriptions` ([doc 7, §7.4](07-monetizacao.md))
- Enforcement dos três planos ([doc 7, §7.2/7.3](07-monetizacao.md)); ciclo past_due de 7 dias
- Tela Conta: plano atual, uso, atalho ao Portal

✅ Conclusão: assinatura de teste ponta a ponta (checkout → webhook → limites novos ativos → downgrade no portal → limites rebaixados no fim do ciclo simulado); payloads de webhook cobertos por testes de integração.

### M8 · Favoritos + exportação (3–4 dias) — [A4, A5]
Entregáveis: `favorites` + tela Minha Pauta; exportação CSV com carimbo de origem ([doc 7, §7.6](07-monetizacao.md)); ambos gated por plano.

✅ Conclusão: favoritar → aparece na pauta → exportar CSV com todas as métricas; gratuito vê paywall correto nas duas features.

### M9 · Landing definitiva + hardening + lançamento (5–6 dias) — [A6] → **marco: lançamento comercial**
Entregáveis:
- **Prompt para o Relume** (proposta de valor, público, seções do [doc 6, §6.7](06-ux-ui.md), direção visual do [DESIGN-ferrari.md](../DESIGN-ferrari.md)) → estrutura gerada → aplicação dos tokens na exportação/implementação
- Termos de uso + política de privacidade; exclusão de conta self-service ([doc 8, §8.3](08-seguranca-e-operacao.md))
- Rate limiting nas rotas públicas; alertas de cota e erro ([doc 8, §8.5](08-seguranca-e-operacao.md))
- **Auditoria completa com a skill `security-audit`** + checklist pré-lançamento inteiro ([doc 8, §8.8](08-seguranca-e-operacao.md))
- E2E Playwright: cadastro → pesquisa → favoritar → checkout de teste

✅ Conclusão: checklist do doc 8 100% marcado; primeira assinatura real processada; lançamento.

---

## M10 · Refinamento de UI/UX (pós-go-live, iterativo)

> Adicionada em 12/07/2026 a pedido do time de produto. O /app receberá
> elementos de interface selecionados pelo fundador (referências do
> 21st.dev) + recomendações do arquiteto, aplicados **sempre traduzidos
> para os tokens do [DESIGN-ferrari.md](../DESIGN-ferrari.md)** — nunca
> colados com estilo alheio (roxo/gradientes/cantos arredondados de
> bibliotecas genéricas são adaptados ou recusados).

Formato de trabalho: lotes pequenos por tela (fundador indica a
referência → arquiteto adapta ao design system → deploy → avaliação).

### Escopo definido pelo time (12/07/2026)

> ✅ Itens 1–4 entregues em 12/07/2026 (lotes m10-1 a m10-4; migrations
> `20260712000006` e `20260712000007` aplicadas em dev+prod). Item 5
> segue aberto, sob demanda do fundador.

1. **Nova Pesquisa fracionada:** as três portas de entrada (Nichos ·
   Palavra-chave · Canais) deixam de ser abas e viram **painéis lado a
   lado** no desktop (empilhados no mobile). Decisão reversível — se a
   densidade piorar a experiência, volta ao formato de abas.
2. **Entrada estilo IA:** o campo de palavra-chave vira um componente
   de chat/prompt (referência do 21st.dev): *"O que você quer mapear
   hoje, Danilo?"* (nome real do usuário). Nota do arquiteto: é uma
   entrada inteligente, não um LLM — o parse continua determinístico
   (nicho/keyword/canal via parseChannelInput); a estética é de chat,
   a promessa não. Placeholder rotativo com exemplos.
3. **Histórico com mini-dashboard:** recomendação do arquiteto —
   3 stat tiles (pesquisas no mês · oportunidades encontradas ·
   favoritos acionados, a North Star) + 1 gráfico de barras compacto
   (pesquisas/oportunidades por semana, últimas 8 semanas). Dados já
   existem em searches/product_events/favorites. **Obrigatório: ler a
   skill `dataviz` antes de qualquer gráfico.**
4. **Minha Pauta com categorias:** encapsulamento dos favoritos em
   coleções nomeadas pelo usuário (ex.: "Próximo mês", "Shorts",
   "Cliente X"). Exige migration: tabela `pauta_categories` (user_id,
   name, position, RLS por dono) + coluna `category_id` nullable em
   favorites; UI de agrupamento + mover entre categorias; sem
   categoria = "Geral".
5. Demais itens: componentes avulsos do 21st.dev trazidos pelo
   fundador, adaptados um a um.

✅ Conclusão (por lote): componente no ar fiel aos tokens, sem
regressão de performance (skeletons/otimista preservados), suite
verde, migrations aplicadas em dev+prod quando houver.

## M10.5 · BEVIEWER — rebrand + reescopo do /app (17/07/2026)

> Decisão do time: manter a proposta (outliers) e mudar a casca para a
> linguagem dos produtos de IA. Handoff externo em
> `design_handoff_beviewer/HANDOFF.md` (prints mandam no layout, tokens
> mandam no render). Marca: Sinal → **BEVIEWER** (segue via
> `lib/brand.ts`).

| Lote | Conteúdo | Status |
|---|---|---|
| B0 | Design system v2: raio suave (8/12/16), serif display (teste em `/app/fontes`), lucide-react | ✅ 17/07/2026 |
| B1 | Marca BEVIEWER + sidebar recolhível (3 itens: Mapping/Dashboard/Workspace) + popover do usuário; serif = Fraunces | ✅ 17/07/2026 |
| B2 | Modal de Settings (Geral/Perfil/Plano/Conta) + `/app/conta` vira redirect | ✅ 17/07/2026 |
| B3 | Mapping: chat central + saudação por hora + dropdowns Nichos/Canais | ✅ 17/07/2026 |
| B4 | Dashboard: 4 tiles + gráfico semanal + faixas de score + formatos + histórico (migration faixas) | ✅ 17/07/2026 |
| B5 | Workspace: pastas tipadas (Pautas/Referências) + canais salvos (migration) + drag-and-drop com fallback; UX didática a pedido do time (chips de tipo, estados vazios que ensinam, "Mover para" sempre visível) | ✅ 17/07/2026 |
| B5.4 | Página dedicada da pasta (`/app/pauta/[id]`): notas da pasta + nota por item (migration `20260717000003`), ordenação, mover/soltar — spec em `docs/superpowers/specs/2026-07-17` (brainstorm com companion visual) | ✅ 17/07/2026 |
| B6 | Light mode (Personalização) — revalidar dataviz na superfície clara | ✅ 17/07/2026 |

✅ Conclusão (por lote): mesmo critério da M10 + avaliação do fundador
em produção. M9 restante (security-audit, Playwright, go-live Stripe)
fecha DEPOIS, cobrindo as tabelas novas.

## Pré-M9 · Ajustes de mercado T1–T3 (19/07/2026)

> Feedback de potencial cliente (via fundador). Sem migrations — tudo
> read-time; a régua materializada das métricas (3×) fica intacta.

| Lote | Conteúdo | Status |
|---|---|---|
| T1 | Piso de score 1.5×: `MIN_DISPLAY_SCORE = 1.5` em services/outliers (métricas seguem `MIN_OPPORTUNITY_SCORE = 3`); query de resultados e export ≥ 1.5; filtro ganha "≥ 1,5×" como DEFAULT; ScoreBadge com tier apagado 1.5–3× | ✅ 19/07/2026 |
| T2 | Aba "Trending" nos resultados: query no corpus (vídeos dos canais prontos, `published_at` ≤ 7 dias, ordem `view_count`, ~12, incluindo sem score, zero cota); selo didático "sem score ainda" no lugar do badge; rodapé "números da última análise"; filtros de score ocultos na aba. T2b: score PARCIAL (piso honesto — views ÷ mediana do formato, `partialScore` no motor) exibido quando o vídeo jovem já superou a mediana | ✅ 19/07/2026 |
| T3 | Filtro "País" nos resultados: `channels.country` nos cards; select com países presentes na pesquisa (`Intl.DisplayNames` pt-BR) + balde "Não informado" (country é autodeclarado/esparso); estado na URL; vale também para a Trending | |

Fora de escopo decidido: seletor de região/idioma na BUSCA (mexe em
cache de keywords 72h + 100 un/busca fria + posicionamento Brasil-first)
e rebaixamento global da régua de oportunidade para 1.5× (exigiria
re-backfill das contagens materializadas — só se o mercado consolidar).

✅ Conclusão (por lote): suite verde, merge --no-ff, avaliação do
fundador em produção. Depois: M9 final (security-audit + Playwright +
go-live Stripe).

## M11 · Pós-lançamento imediato (contínuo)
Não é milestone de construção — é regime de operação: acompanhar métricas ([doc 1, §1.7](01-visao-de-produto.md) e [doc 7, §7.5](07-monetizacao.md)), triagem de feedback, ajuste de pricing com dados reais, pedido de aumento de cota ao Google quando a fila de prioridade 1–2 represar, e priorização do roadmap pós-MVP (Pix, anual, páginas SEO do corpus, IA).

## Riscos de cronograma e válvulas de escape

| Se... | Então... |
|---|---|
| M2/M3 estourarem (risco técnico maior) | M4 absorve o atraso; estágio C segue lançável só com análise por canal |
| Estágio B atrasar | Lançar beta público só com análise de canal/lista (ainda é o "uau") e nichos vêm depois |
| Stripe travar (conta/aprovação) | Lançar B público e manter lista de espera paga por 1–2 semanas |
| Cota diária insuficiente já no beta | Reduzir profundidade de coleta (200 → 100 vídeos) e canais/pesquisa do free (5 → 3) — parâmetros, não refactor |
