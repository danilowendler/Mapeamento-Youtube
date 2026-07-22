# docs/pesquisa

Material de partida para a **sessão dedicada ao problema de cota da YouTube Data API v3**
(o `search.list` custa 100 unidades; hoje a coleta é disparada na requisição do usuário, e
3 assinantes Pro já esgotam a cota diária). São documentos de **pesquisa/proposta** — não
decisões fechadas — importados em 21/07/2026.

### Resultado da sessão (22/07/2026)

| Arquivo | O que é | Status |
|---|---|---|
| **`relatorio-api-youtube.md`** | Relatório de validação: custos, cota, extensão, OAuth/Analytics, Termos + comparativo das alternativas de descoberta barata. | ✅ produzido |
| **`plano-de-migracao-e-indexacao.md`** | Plano de execução refinado contra o código real: Fase 1 (tática) + Fase 2 (endgame) arquivo-por-arquivo + indexação inicial + métrica de plano. | ✅ produzido |
| `ADR-007-...` → **[doc 4 §4.2, ADR-007](../04-arquitetura.md)** | **Decisão promovida:** direção aceita, execução **faseada disparada por métrica**. | ✅ decidido |

Patches aplicados nas fontes de verdade: doc 3 (§3.3/3.5/3.7/3.8), doc 4 (ADR-007 + §4.5), doc 5 (§5.1/5.6), doc 7 (§7.7).

### Material de partida (histórico da pesquisa)

| Arquivo | O que é |
|---|---|
| `arquitetura-e-monetizacao-corpus-indexado.md` | O **porquê** + o desenho: análise de custo, modelo de corpus indexado, estratégia de nichos, cadência de refresh, nova monetização. |
| `proposta-inversao-do-gatilho-de-coleta.md` | O **como** (original, pré-código): plano de migração arquivo-por-arquivo. **Ver o refinado** em `plano-de-migracao-e-indexacao.md`. |
| `ADR-007-inversao-do-gatilho-de-coleta.md` | Stub-âncora, agora **decidido e promovido** (aponta para o doc 4). |

**Regra de ouro (cumprida):** o ADR-007 e os patches das docs 03/04/05 foram escritos **antes**
de qualquer código — sessões futuras não devem reconstruir o fluxo de coleta-em-request-time
como "a" verdade; ele é a **Fase 1** de uma migração já decidida (ADR-007).
