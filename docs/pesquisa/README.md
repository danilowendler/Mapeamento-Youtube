# docs/pesquisa

Material de partida para a **sessão dedicada ao problema de cota da YouTube Data API v3**
(o `search.list` custa 100 unidades; hoje a coleta é disparada na requisição do usuário, e
3 assinantes Pro já esgotam a cota diária). São documentos de **pesquisa/proposta** — não
decisões fechadas — importados em 21/07/2026.

| Arquivo | O que é |
|---|---|
| `arquitetura-e-monetizacao-corpus-indexado.md` | O **porquê** + o desenho: análise de custo, modelo de corpus indexado, estratégia de nichos, cadência de refresh, nova monetização. |
| `proposta-inversao-do-gatilho-de-coleta.md` | O **como**: plano de migração arquivo-por-arquivo (inverter o gatilho: usuário → cron). |
| `ADR-007-inversao-do-gatilho-de-coleta.md` | Stub-âncora do ADR (status PROPOSTO) — a sessão preenche/decide e promove para `docs/04-arquitetura.md`. |

**Regra de ouro:** escrever/promover o ADR-007 e os patches das docs 03/04/05 **antes** de
qualquer código — senão sessões futuras reconstroem o fluxo antigo, porque a doc ainda manda
coletar em tempo de requisição.
