# Plano de migração (arquivo-por-arquivo) + indexação inicial + métrica de plano

> Refinamento executável do [ADR-007](../04-arquitetura.md) e da
> [proposta original](proposta-inversao-do-gatilho-de-coleta.md), corrigido contra o
> **estado real do código** (22/07/2026). Execução **faseada**: a Fase 1 é para agora;
> a Fase 2 é disparada pelo gatilho do ADR-007. **Nenhum código nesta sessão** — este é
> o roteiro.

## 0. Correções à proposta original (o código evoluiu além dela)

A proposta de 21/07 foi escrita sobre um modelo anterior. Correções factuais:

| Proposta original diz | Realidade do código |
|---|---|
| "custo de ~920 un por pesquisa" | Já são **~100–390 un** (cache 72 h + coleta capada em ~9 un/canal + ranking). |
| "`jobs/runSearch.ts` — morre" | **Não morre — se bifurca.** Deixa de chamar `search.list`/coleta síncrona e passa a montar o resultado a partir do corpus. |
| "`collectChannel` muda de gatilho" | O **job** `jobs/collectChannel.ts` já existe e está **ocioso** (trigger `corpus/channel.collect` sem emissor — o fluxo usa o *serviço* `collectionService.collectChannel` direto no `runSearch`). A Fase 2 dá a ele seu **primeiro emissor** (fila/descoberta). |
| "criar tabela `verticais`" | Já existe **`niches`** (22 nichos PT-BR seedados). Não criar `verticais`. |
| "busca por tema = `tsvector` sobre títulos" | Começar pelo **mapa keyword→canais** (cache 30 d) + roteador `pg_trgm` + grafo; `tsvector` é opcional e posterior. |
| "de 41 para 9 un/canal" | Já feito (`BASE_VIDEOS_PER_CHANNEL = 200`). |
| tabela de preços rica como decisão | É **material de partida** de uma revisão de pricing, não compromisso (doc 7 §7.7). |

Infra que já existe e favorece a migração: cron Inngest (`monitorQuota`), coleta-por-evento ociosa (`channelCollectEvent`), `reserve_quota` com prioridades e reserva de 15%, `channel_niche_affinity` + `relatedService` (grafo), `channel_refs` ("canais salvos"), Realtime (ADR-004).

---

## 1. Fase 1 — alívio tático (agora · sem migration · sem reescrita)

Ordem de menor→maior esforço. Cada item é isolado e reversível.

### 1.1 Solicitar a extensão de cota — **primeiro, hoje** (fora do código)
Formulário de Audit & Quota Extension. Leva semanas/meses; é o caminho crítico. Pré-requisitos (/termos, /privacidade) já existem.

### 1.2 `services/keywordService.ts` — desmembrar o TTL do mapa
- Hoje `KEYWORD_CACHE_HOURS = 72` decide o re-fetch do `search.list`. Trocar por **`KEYWORD_MAP_TTL_DAYS ≈ 30`** para o *mapa* keyword→canais. As **métricas** dos canais resolvidos continuam governadas por `channels.refreshed_at` (7/30) em `collectionService` — dois relógios distintos.
- Efeito: a keyword popular deixa de repagar `search.list` a cada 72 h. Corte esperado de `search.list` frios: alto.
- Risco: o mapa pode envelhecer (canal novo do tema demora a entrar). Aceitável — a lista de canais de um tema é estável; e o grafo (1.4) e os pedidos de indexação cobrem o resto.

### 1.3 `services/keywordService.ts` — roteador keyword→nicho/keyword-conhecida
- Antes de reservar `search.list`, tentar casar a keyword nova (por `pg_trgm`/similaridade) com: (a) uma keyword já em `keyword_cache` dentro do TTL; (b) as `niches.keywords` curadas. Se casar acima de um limiar, servir do corpus (0 un).
- Exige habilitar a extensão `pg_trgm` e um índice trigram sobre `keyword_cache.keyword` e `niches.keywords` — **migration pequena e aditiva** (única da Fase 1, se aceita; senão, começar com match exato/normalizado, sem extensão).
- Degrada em silêncio: sem match, cai no `search.list` de hoje.

### 1.4 `services/relatedService.ts` — expor o grafo como fonte de descoberta
- Hoje só alimenta a UI. Adicionar um caminho que, dado um nicho/keyword, retorna canais por coaparição/afinidade **antes** de gastar `search.list`. Reusa `channel_niche_affinity` e `keyword_results`. Custo zero.

### 1.5 `jobs/monitorQuota.ts` — alarme de `search.list` frio/dia
- `getTodayUsage()` já quebra por prioridade. Adicionar contagem de operações `search.list` do dia (via `quota_ledger.operation`) e alertar ao aproximar de ~80–100/dia. É o **sensor do gatilho da Fase 2**.

### 1.6 (Opcional) `app/api/searches` + UI — servir corpus na hora
- Quando a keyword resolve do cache/grafo, o resultado já é servível sem coleta nova → resposta mais rápida. Sem mudar o contrato 202/Realtime.

**Saída da Fase 1:** o teto prático sobe de "dezenas" para "centenas" de assinantes, e passamos a **medir** quando o gargalo real chega. Nenhuma reescrita; tudo empilha na direção da Fase 2.

---

## 2. Fase 2 — endgame (disparado por métrica · reescrita localizada)

Só inициar quando o gatilho do ADR-007 acender (fila de prioridade 1–2 represada por dias **ou** extensão aprovada). Arquivo-por-arquivo, refinado:

### 2.1 `jobs/discoverChannels.ts` — **novo** · único lugar com `search.list`
Cron noturno. Por nicho (`niches.keywords`), roda `search.list` com orçamento fechado, ranqueia (`rankChannelsByRelevance`), aplica filtro de entrada (≥ 10 vídeos, ativo < 12 meses via `channels.list`, 1 un) e emite `corpus/channel.collect` para os aprovados. Registrar no `serve()` de `app/api/inngest/route.ts`.

### 2.2 `jobs/refreshCorpus.ts` — **novo** · o job de manutenção (conformidade 30 d)
Cron. Camadas A/B/C (diária / 3 dias / semanal) por `channels.refresh_tier`. Usa o refresh incremental de ~2–3 un já existente em `collectionService` (modo `incremental`). É o que mantém o corpus conforme aos Termos. Registrar no `serve()`.

### 2.3 `jobs/collectChannel.ts` — dar o primeiro emissor ao job ocioso
O job já existe (trigger `corpus/channel.collect`). Descoberta (2.1) e fila (2.6) passam a emitir esse evento. Aqui entra a prioridade de coleta correta (descoberta = 4; fila paga = alta).

### 2.4 `jobs/runSearch.ts` — bifurcar (não deletar)
Fase "resolver-tema" deixa de chamar `resolveKeywordChannels` com `search.list` no caminho quente: resolve do corpus (mapa + grafo). Se cobertura insuficiente → enfileira indexação e devolve resultado parcial. A montagem por canal a partir do corpus (análise já materializada) permanece.

### 2.5 `services/quotaService.ts` — inverter prioridades
Hoje: `paidInteractive:1 · freeInteractive:2 · incrementalRefresh:3 · maintenance:4`, com reserva de 15% protegendo pesquisa interativa (cap 8.500 em `reserve_quota`). Passa a: **refresh camada A → fila de indexação paga → refresh B/C → descoberta → fila grátis**. A reserva de 15% muda de propósito (protege pedidos urgentes do topo de plano). Ajuste em `reserve_quota()` (migration) + nas constantes de `QuotaPriority`.

### 2.6 Fila de indexação — **nova entidade** (`index_queue`, ver doc 5 §5.6)
Substitui o "202 é o caminho normal" por "202 é exceção (canal frio)". SLA por plano. Notificação de "saiu da fila" via Realtime (repropósito do ADR-004).

### 2.7 `services/searchService.ts` — duas saídas
`createSearch` deixa de consumir `try_consume_search` (pesquisa vira ilimitada) e passa a: resolver do corpus → 200; ou enfileirar → 202. O enforcement migra para `index_queue` e `channel_refs` (métrica nova, §4).

### 2.8 Busca por tema contra o corpus (evolução opcional)
Se mapa+grafo não bastarem, adicionar `tsvector`/`pg_trgm` sobre `videos.title` e `channels.title/description`. Só se a precisão exigir — é o item de maior esforço e menor prioridade.

---

## 3. Plano de indexação inicial (pré-requisito da Fase 2)

Pode rodar em background **com o produto no ar como está**, respeitando o teto de ~100 `search.list`/dia e a reserva de pesquisa interativa. Base real: **22 nichos** seedados, 3 keywords cada.

| Etapa | Cálculo | Custo (un) | Restrição | Dias |
|---|---|---|---|---|
| Descoberta | 22 nichos × 3 keywords seedadas = **66 buscas** | 6.600 | teto ~100 `search.list`/dia → cabe em ~1 dia; usar margem, 2 dias | 1–2 |
| Filtro de entrada | ~ canais candidatos × `channels.list` (1 un) | baixo | pool de 10.000 req/dia (abundante) | — |
| Indexação inicial | ~3.000–4.500 canais aprovados × ~9 un | ~30.000–40.000 | ~1.100 canais/dia (pool de coleta) | 3–4 |
| **Total** | | **~40.000–47.000** | | **~1 semana** |

Notas:
- Meta realista PT-BR: **~150–200 canais/nicho** (não os 300 das docs de pesquisa) — densidade suficiente para baseline e outliers relativos.
- Priorizar por demanda real (nichos que os usuários pedem) e por gaming BR se o lançamento com o canal-âncora seguir de pé.
- Expansão posterior é **por grafo** (custo zero), não por mais `search.list`.
- **Densidade > amplitude:** melhor 10 nichos profundos que 22 rasos.

## 4. Ajuste da métrica de plano (detalhe no doc 7 §7.7)

| Hoje | Fase 2 |
|---|---|
| `plans.limits.searches_per_month` | `monitored_channels` + `index_requests_per_month` (jsonb, **sem migration**) |
| `try_consume_search()` + `usage_periods.searches_used` | `index_requests_used` (fluxo) + contagem de `channel_refs` com `alerts_enabled` (estado) |
| contador "PESQUISAS NO MÊS · 3/100" | "CANAIS MONITORADOS · 12/40" + "PEDIDOS DE INDEXAÇÃO · 7/150" |
| pesquisa limitada | **pesquisa ilimitada** em todos os planos |

Reusar `channel_refs` (Workspace) como base de "canais monitorados" — adicionar flag `alerts_enabled`, não criar entidade nova.

## 5. Ordem de execução e gatilhos (resumo)

1. **Agora:** 1.1 (extensão) → 1.5 (alarme) → 1.2 (TTL do mapa) → 1.4 (grafo) → 1.3 (roteador).
2. **Rodar em paralelo, quando fizer sentido:** indexação inicial (§3) em background.
3. **Gatilho ADR-007 aceso →** Fase 2 na ordem: 2.1/2.2 (crons) → 2.3 (emissor) → 2.5 (prioridades) → 2.6 (fila) → 2.4/2.7 (bifurcar busca) → 4 (métrica) → 2.8 (tsvector, se preciso).
4. **Atualizar o doc 09** com este milestone quando a Fase 2 for agendada — não antecipar (regra do CLAUDE.md).
