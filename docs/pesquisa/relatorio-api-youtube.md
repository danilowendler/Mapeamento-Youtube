# Relatório — YouTube Data API v3: custos, cota, extensão, OAuth e Termos

> Validação oficial produzida na sessão de arquitetura de cota (22/07/2026). Fundamenta o
> [ADR-007](../04-arquitetura.md) e o [plano de migração](plano-de-migracao-e-indexacao.md).
> Números confirmados na documentação do Google for Developers em julho/2026 — reconfirmar
> na fonte antes de decisões de escala, pois o Google altera cotas sem aviso.

## 1. Custos por endpoint e cota (confirmado)

| Endpoint | Custo | Uso no BEVIEWER |
|---|---|---|
| `search.list` | **100 un** (50 resultados/página; paginar custa 100/página) | descoberta por keyword — o único endpoint caro |
| `channels.list` | 1 un (até 50 canais) | metadados + filtro de entrada |
| `playlistItems.list` | 1 un (até 50 itens) | listagem de uploads |
| `videos.list` | 1 un (até 50 vídeos) | estatísticas e duração |

- **Cota padrão: 10.000 unidades/dia, por projeto do Google Cloud** — não por usuário, não por chave de API. Reset à **meia-noite do Pacífico**.
- **Teto próprio de `search.list`:** a alocação padrão é descrita oficialmente como *"100 `search.list` calls, 100 `videos.insert` calls, and 10.000 units per day combined for all other endpoints"*. Há forte indício de que `search.list` tem um **balde separado de ~100 chamadas/dia**, além do pool de 10.000 que os endpoints baratos consomem. A nota de produção da [doc 3, §3.1](../03-estrategia-de-dados.md) já registrou isso no console do Google.
- **Consequência arquitetural (idêntica nos dois modelos de contabilidade):** `search.list` é o único recurso escasso; coleta e refresh são abundantes (10.000 requisições/dia ÷ ~9 por canal ≈ 1.100 canais frios/dia, ou dezenas de milhares de refreshes incrementais de 1 un). Nosso `quota_ledger` trata `search.list` como 100 un do mesmo pool — **deliberadamente conservador**; manter assim como margem de segurança.

## 2. Extensão de cota (Audit & Quota Extension)

- **Como:** formulário oficial "YouTube API Services - Audit and Quota Extension Form". A auditoria verifica conformidade com os **Terms of Service + Developer Policies**.
- **Prazo:** de **semanas a vários meses** (relatos de desenvolvedores; sem SLA público). Reauditar dentro de 12 meses reusa o mesmo formulário.
- **Requisitos:** caso de uso claro, **privacy policy pública**, **termos de uso**, branding/UI/tratamento de dados alinhados aos Termos. **Aprovação não garantida.**
- **Veredito:** **bloqueante de escala, não de lançamento.** /termos e /privacidade já existem (M9). **Solicitar desde já** — o prazo longo é o motivo. Sob os Termos (§4), a extensão é **estrutural**: define o tamanho máximo conforme do corpus, não apenas a velocidade de crescimento.

## 3. OAuth e YouTube Analytics API (confirmado)

- **OAuth NÃO aumenta a cota.** Requisições OAuth são atribuídas ao mesmo projeto GCP e consomem a mesma alocação de 10.000 un/dia. **Qualquer plano de escala baseado em "conectar contas para multiplicar cota" está errado** e deve ser descartado.
- **YouTube Analytics API é produto separado.** Dá séries temporais (retenção, CTR, impressões) **apenas do canal do próprio dono**, via OAuth dele — **não** de terceiros. Serve como **diferencial de plano Pro/Estúdio** ("conecte seu canal"), com **custo de cota zero** no orçamento diário do Data API. Não ajuda na descoberta de outliers de terceiros — fica fora do problema de cota, como alavanca de receita.

## 4. Termos de uso e retenção (confirmado — muda a arquitetura)

- **Retenção de 30 dias:** dados públicos armazenados ("Non-Authorized Data") devem ser **deletados OU atualizados em até 30 dias**. A política 7/30 (`services/freshness.ts`) já cumpre por construção.
- **Consistência:** o cliente deve refletir mudanças de metadados e viewcount "o mais rápido possível". Cache é legítimo; **redistribuição/venda de dado bruto do YouTube, não**. Vender *acesso ao índice e à análise* (o que fazemos) é conforme; vender *dumps do corpus* não seria.
- **Consequência não-óbvia — teto de tamanho do corpus:** a regra dos 30 dias impõe `manutenção/dia ≈ N_canais × 2,5 un ÷ 30`. Reservando ~metade da cota padrão (~5.000 un/dia), o corpus sustentável sob cota padrão é da ordem de **~60 mil canais**. Acima disso: deletar cauda longa (perde fosso) ou depender da extensão. **O corpus não cresce sem limite** (as docs de pesquisa, §5.2, subestimam isso). Detalhe na [doc 3, §3.3](../03-estrategia-de-dados.md).

## 5. A pergunta central — alternativas para baratear a descoberta por keyword

Ranqueadas por custo de cota × esforço × cobertura. "Custo/busca" é o custo por pesquisa de usuário depois de aquecido.

| # | Alternativa | Custo/busca | Cobertura | Esforço | Estado no código |
|---|---|---|---|---|---|
| d | **TTL do mapa keyword→canais 72 h → ~30 d** (separado do frescor de métricas) | **0** na maioria | igual | trivial (1 constante + desmembrar TTL) | cache existe, TTL curto |
| c | **Roteador keyword→nicho/keyword-conhecida** (`pg_trgm`) | **0** | temas curados/já vistos | baixo | nichos existem; roteador não |
| b | **Grafo como descoberta** (coaparição/`channel_niche_affinity`) | **0** | cresce com uso; só a partir de sementes | baixo | parcial (só UI, `relatedService`) |
| — | **Search frio → background** (servir corpus na hora, enfileirar) | 100 un movidas p/ a noite | — | médio | é o endgame (ADR-007 Fase 2) |
| a | **Full-text `tsvector` sobre títulos** | 0 | limitada ao corpus, ruidosa | médio-alto | não existe |
| a' | **Embeddings semânticos** | 0 (+ custo de embed) | melhor que tsvector | alto | não existe |

**Leitura:** (d)+(c)+(b) somam quase todo o benefício com esforço de dias e **sem reescrita**, e são exatamente os degraus que também constroem o endgame — nada é jogado fora. O ativo a indexar **não é "todos os títulos do YouTube"** (opção `a`, cara e ruidosa), e sim o **mapa keyword→canais** (`keyword_results`, já existente) + o grafo — ordens de grandeza menor e mais preciso, porque o produto precisa dos *canais certos do tema* (estáveis), não da recência de vídeo do `search.list`.

## 6. Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| Extensão de cota negada/demorada | Alto | Solicitar já; operar dentro da cota padrão cabe até ~60 mil canais |
| Mudança nos Termos/cotas da API | Alto | Só dados públicos e endpoints documentados; corpus como cache legítimo; frescor 7/30 já conforme |
| Nicho novo/viral gera muitos `search.list` frios | Médio | Fase 1 (cache do mapo 30 d + roteador) absorve; alarme de `search.list`/dia em `monitorQuota` |
| Corpus grande vira custo de conformidade | Médio | Deletar cauda longa após 30 d sem refresh; camadas A/B/C priorizam o que importa |

## Fontes

- [YouTube Data API Overview — Google for Developers](https://developers.google.com/youtube/v3/getting-started)
- [Search: list — YouTube Data API](https://developers.google.com/youtube/v3/docs/search/list)
- [Quota and Compliance Audits — YouTube Data API](https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits)
- [YouTube API Services - Developer Policies](https://developers.google.com/youtube/terms/developer-policies)
- [YouTube API Services Terms of Service](https://developers.google.com/youtube/terms/api-services-terms-of-service)
- [Additional policies for derived metrics and data storage](https://developers.google.com/youtube/terms/derived-metrics-policy)
