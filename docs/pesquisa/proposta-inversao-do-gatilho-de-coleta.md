# Proposta — inverter o gatilho da coleta (usuário → cron)

> Documento de pesquisa importado para o repo (21/07/2026) como material de partida
> da sessão dedicada ao problema de cota. Proposta técnica baseada na leitura do repo
> e das docs. **Status:** proposta a ser validada/refinada — ver
> `ADR-007-inversao-do-gatilho-de-coleta.md`. Complementa
> `arquitetura-e-monetizacao-corpus-indexado.md` (o "porquê"); aqui está o "como".

---

## Não tire a busca por tema. Inverta o gatilho dela.

A caixa de busca da tela **é** o produto. "Digite um tema, escolha um nicho ou cole canais" é
exatamente a UX certa e não se deve mexer nela. O que precisa morrer é o que está **atrás** dela —
o pipeline que sai coletando da API do YouTube no momento em que o usuário aperta enter.

Do ponto de vista do usuário, nada muda visualmente. Do ponto de vista de custo, muda tudo: a mesma
tela passa de ~920 unidades por enter para **0**.

## A boa notícia: ~70% da arquitetura já está pronta

A doc 04 já prevê tudo o que o modelo indexado precisa:

- `jobs/` com Inngest, e o contrato de pastas já lista `refreshCorpus` — o job de manutenção de
  corpus já está no desenho.
- Responsabilidade de `jobs/` já declarada como "pipeline de coleta, manutenção de corpus".
- `QuotaBudget` (ADR-005) com reserva prévia, prioridades e reserva estratégica de 15%.
- Supabase Postgres com RLS, e a doc 05 com índices já previstos.
- Camadas isoladas, que é exatamente o que torna essa migração um refactor localizado em vez de
  reescrita.

Você não está mudando de arquitetura. Está mudando **quem dispara a coleta**: hoje é o usuário,
passa a ser o cron.

## O que muda, arquivo por arquivo

### `services/searchService.ts` — a mudança central

Hoje: valida limite → cria registro em `searches` → emite `search.requested` → responde 202 com ID.

Passa a ser um caminho de duas saídas:

```
searchService.query(input)
  ├─ resolve entrada → vertical_id | canal_ids | termo
  ├─ consulta o corpus (Postgres) ───────────────► 200 com resultados, < 100ms
  └─ se cobertura insuficiente:
       └─ enfileira indexação (prioridade por plano) → 202 parcial
```

A diferença crítica: hoje 202 é o caminho normal. Passa a ser a exceção — só para canal frio que
ninguém indexou ainda.

### `jobs/runSearch.ts` — morre

É o job que consome cota por requisição de usuário. Não tem lugar no modelo novo.

### `jobs/collectChannel.ts` — sobrevive, muda de gatilho

Deixa de ser chamado por `search.requested` e passa a ser chamado por `channel.index.requested`,
emitido pelo worker de descoberta ou pela fila de pedidos. Aqui também entra a mudança de 1.000 para
200 vídeos: de 41 para 9 unidades por canal.

### `jobs/refreshCorpus.ts` — vira o job principal

Precisa das camadas A/B/C (diária, 3 dias, semanal) e do refresh incremental de 2 unidades: só a
primeira página de `playlistItems` + um `videos.list`.

### `jobs/discoverChannels.ts` — novo

É o único lugar do sistema onde `search.list` pode ser chamado. Roda de madrugada, por vertical, com
orçamento fechado.

### `services/quotaService.ts` — inverte as prioridades

Hoje o orçamento de cota serve pesquisas de usuário. Passa a servir, nesta ordem: (1) refresh camada
A, (2) fila de indexação de plano pago, (3) refresh camadas B e C, (4) descoberta, (5) fila do plano
gratuito. A reserva de 15% deixa de ser contra pico de usuários e passa a cobrir pedidos urgentes do
Estúdio.

### `services/planService.ts` + `usage_periods` — muda a unidade contada

De `searches_count` para `index_requests_count` e `monitored_channels_count`. Pesquisa deixa de ser
contada.

### ADR-004 (Realtime) — repropósito, não descarte

Para busca em corpus quente a resposta vem em milissegundos, então o streaming progressivo perde a
função ali. Mas ele continua perfeito para notificar quando um canal pedido sai da fila de indexação,
e depois para os alertas de outlier. Mantenha a infraestrutura, mude o evento.

## O que precisa ser construído de novo

1. **Busca por tema contra o corpus.** É o item de maior esforço real. Hoje "tema" vira
   `search.list`; passa a ser full-text search no Postgres sobre títulos e metadados dos vídeos já
   indexados, mais classificação por vertical. Supabase suporta `tsvector` com `pg_trgm` para tolerar
   erro de digitação — dá para começar simples e evoluir para embeddings depois, se a precisão exigir.
2. **Tabela `verticais` com queries de descoberta.** O botão "NICHOS PRONTOS" da tela já é a UX
   perfeita para isso — ele deixa de ser atalho e vira o caminho principal, porque é o único que
   garante corpus denso. Vale inclusive promovê-lo visualmente.
3. **Fila de indexação como entidade de produto, com SLA por plano.** É o que resolve o "colar link de
   um canal" quando o canal está frio.

## Um detalhe da tela que precisa mudar junto

O contador **PESQUISAS NO MÊS · 3/100** some. Ele comunica escassez de exatamente a coisa que passa a
ser abundante, e é o que faz o usuário racionar exploração. No lugar, dois indicadores que refletem o
valor real:

```
CANAIS MONITORADOS        12 / 40
PEDIDOS DE INDEXAÇÃO       7 / 150
```

## Ordem de execução sugerida

1. `refreshCorpus` com camadas A/B/C + refresh incremental de 2 unidades
2. `discoverChannels` + tabela `verticais` + sementes curadas
3. Rodar a indexação inicial (~10 dias em background, com o produto no ar como está)
4. Busca por tema contra o corpus, atrás de feature flag
5. Virar a chave em `searchService`, aposentar `runSearch`
6. Ajustar `planService`, `usage_periods` e a UI dos contadores
7. Atualizar `docs/03-estrategia-de-dados.md` e `docs/04-arquitetura.md` com um ADR-007 registrando a
   inversão

O passo 3 roda em paralelo com o resto — é por isso que a migração não bloqueia o cronograma do JP.
Você indexa enquanto constrói.

## Observação sobre a documentação (importante)

Como o repo declara `docs/` como fonte única de verdade e o `CLAUDE.md` aponta pra lá, vale escrever o
**ADR-007 antes de mexer no código**. Senão o Claude Code vai continuar reconstruindo o fluxo antigo a
cada sessão, porque a doc ainda manda coletar em tempo de requisição.
