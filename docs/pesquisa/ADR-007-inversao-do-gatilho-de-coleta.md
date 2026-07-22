# ADR-007 · Inversão do gatilho de coleta (usuário → cron)

> **STATUS: DECIDIDO E PROMOVIDO (22/07/2026).** A decisão vive agora em
> **[`docs/04-arquitetura.md` §4.2, ADR-007](../04-arquitetura.md)** (formato
> Decisão/Motivo/Rejeitado dos demais ADRs). Foi **aceita como direção**, com
> **execução faseada disparada por métrica**: Fase 1 (alívio tático, sem reescrita) +
> Fase 2 (endgame, disparado pela fila de prioridade 1–2 represada ou pela extensão de
> cota aprovada).
>
> Este arquivo permanece como **registro histórico** da pesquisa que fundamentou o ADR.
> O relatório de validação da API (custos, extensão, OAuth, Termos) e o comparativo das
> alternativas de descoberta estão em
> [`relatorio-api-youtube.md`](relatorio-api-youtube.md); o plano de execução refinado
> contra o código real está em
> [`plano-de-migracao-e-indexacao.md`](plano-de-migracao-e-indexacao.md).
>
> Material de partida: `arquitetura-e-monetizacao-corpus-indexado.md` (o porquê) e
> `proposta-inversao-do-gatilho-de-coleta.md` (o como).

## Contexto / problema

`search.list` (descoberta por palavra-chave) custa **100 unidades**; os demais endpoints
custam **1**. A cota padrão é **10.000 unidades/dia por projeto do Google Cloud**. Hoje a
coleta é disparada **na requisição do usuário** (`runSearch` → `collectChannel`), o que faz
uma pesquisa custar quota. Medição: **3 assinantes Pro com 100 pesquisas/mês esgotam a cota
diária inteira** — teto rígido que limita a receita da empresa toda. A busca por palavra-chave
é o principal vilão de custo.

## Decisão proposta (a validar)

A YouTube Data API passa a ser usada **exclusivamente para alimentar um índice em PostgreSQL
em background**; nenhuma requisição de usuário toca a API. A busca do usuário vira query no
corpus (custo zero, latência de milissegundos). `search.list` sai do caminho do usuário e vira
custo pontual do worker de descoberta.

## Opções em aberto (a sessão dedicada deve decidir)

1. **Escopo/sequência:** migração completa para o corpus indexado (endgame) **vs.** ganhos
   táticos de alívio imediato **sem** reescrita (ex.: cache de keyword mais duradouro, mapear
   keyword → nichos já curados, reduzir profundidade de coleta, filtro de entrada). Recomendação
   do material: fazer os dois, sequenciados — mas a sessão valida.
2. **Baratear a descoberta por keyword** (pergunta central) — comparar, com custo de cota de
   cada: (a) full-text no Postgres (`tsvector`/`pg_trgm`, evoluível para embeddings) sobre
   títulos/metadados já indexados; (b) expansão por grafo no corpus (custo zero); (c) keyword →
   verticais curadas; (d) cache mais agressivo.
3. **Extensão de cota** (Audit & Quota Extension): solicitar já? bloqueante de lançamento?
4. **Modelo de cobrança:** trocar "pesquisas/mês" por "canais monitorados" + "pedidos de
   indexação" (impacta `planService`, `usage_periods` e a UI dos contadores).

## Consequências / impacto (resumo — detalhe na proposta)

- `jobs/runSearch.ts` é aposentado; `jobs/collectChannel.ts` muda de gatilho; nascem
  `jobs/refreshCorpus.ts` (camadas A/B/C + incremental de 2 un) e `jobs/discoverChannels.ts`
  (único lugar com `search.list`).
- `services/searchService.ts` vira caminho de duas saídas (corpus quente → 200; frio →
  enfileira indexação → 202, agora exceção).
- `services/quotaService.ts` inverte prioridades (refresh A → fila paga → refresh B/C →
  descoberta → fila grátis).
- ADR-004 (Realtime) é repropósito, não descarte: passa a notificar canal saindo da fila e os
  alertas de outlier.
- Novo: busca por tema contra o corpus, tabela `verticais`, fila de indexação como entidade.

## Perguntas em aberto que a sessão precisa responder

- Confirmar custos/cota na documentação **oficial** atual do YouTube (podem ter mudado).
- Validar que o estado **real do código** já evoluiu além das docs (cache de keyword 72h,
  coleta já capada, frescor 7/30d, ranking de canais) antes de propor mudanças.
- Termos de uso: corpus como cache legítimo, não redistribuição; limites de retenção.
- Confirmar que OAuth não aumenta a cota; papel da YouTube Analytics API como diferencial de plano.

## Regra de ouro

Escrever/promover este ADR e os patches das docs 03/04/05 **antes** de qualquer código — senão
sessões futuras reconstroem o fluxo antigo, porque a doc ainda manda coletar em tempo de requisição.
