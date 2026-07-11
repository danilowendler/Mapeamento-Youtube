# 5 · Modelo de Dados

> Postgres (Supabase). Duas zonas com políticas de segurança opostas: **corpus global** (leitura ampla, escrita só do pipeline) e **zona do usuário** (isolamento total por RLS). Schema descrito aqui em nível lógico; o DDL/migrations será gerado na implementação a partir deste documento.

## 5.1 Zona 1 — Corpus global

Leitura: qualquer usuário autenticado. Escrita: **apenas service role** (pipeline). Nenhum dado pessoal.

### `channels`
| Coluna | Tipo | Notas |
|---|---|---|
| youtube_id | text **PK** | ID canônico do canal (`UC...`) |
| handle | text | `@handle`, único quando presente |
| title, description, thumbnail_url | text | description truncada (não precisamos do texto integral) |
| subscriber_count, video_count, view_count | bigint | Estatísticas públicas |
| uploads_playlist_id | text | Playlist de uploads (chave da coleta barata) |
| country, default_language | text | Sinal para relevância PT-BR |
| first_collected_at, refreshed_at | timestamptz | `refreshed_at` governa frescor/expurgo (§3.3 do [doc 3](03-estrategia-de-dados.md)) |
| collection_status | text | `pending · collecting · ready · failed` |

### `videos`
| Coluna | Tipo | Notas |
|---|---|---|
| youtube_id | text **PK** | |
| channel_id | text FK→channels | |
| title, thumbnail_url | text | |
| published_at | timestamptz | |
| duration_seconds | int | |
| is_short | boolean | duração ≤ 180 s |
| view_count, like_count, comment_count | bigint | |
| score | numeric | Multiplicador vs. baseline; recalculado a cada refresh do canal |
| baseline_views | bigint | Mediana usada no cálculo (torna o score explicável e auditável) |
| age_bucket | text | `14d-3m · 3m-12m · 12m+` (nulo se < 14 dias) |
| refreshed_at | timestamptz | |

### `channel_baselines`
Medianas pré-calculadas por canal — evita recomputar em toda leitura.
| Coluna | Tipo | Notas |
|---|---|---|
| channel_id | text FK | **PK composta** (channel_id, format, age_bucket) |
| format | text | `short · long` |
| age_bucket | text | |
| median_views | bigint | |
| sample_size | int | < 10 ⇒ baseline de baixa confiança (flag na UI) |
| computed_at | timestamptz | |

### `niches`
Catálogo curado (seed versionado em `supabase/`).
| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid **PK** | |
| slug, name, description | text | |
| keywords | text[] | 3–5 keywords por nicho |
| is_active | boolean | Permite despublicar sem apagar |

### `keyword_cache` e `keyword_results`
Cache de `search.list` (TTL lógico de 72 h).
- `keyword_cache`: keyword normalizada **PK**, fetched_at, result_count.
- `keyword_results`: (keyword FK, position) → channel_id, video_id — materializa quais canais/vídeos apareceram para a keyword.

### `channel_niche_affinity`
Malha de "canais relacionados", derivada das coaparições em keywords/nichos.
| Coluna | Tipo | Notas |
|---|---|---|
| channel_id | text FK | **PK composta** (channel_id, niche_id) |
| niche_id | uuid FK | |
| strength | numeric | Nº de coaparições, com decaimento temporal |
| last_seen_at | timestamptz | |

## 5.2 Zona 2 — Dados do usuário (RLS por `user_id`)

Política padrão de todas as tabelas desta zona: `select/insert/update/delete` permitidos somente quando `user_id = auth.uid()`. Escritas administrativas (webhooks Stripe, pipeline) usam service role.

### `profiles`
1:1 com `auth.users` (criado por trigger no signup): display_name, avatar_url, onboarding_completed_at, created_at.

### `searches`
| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid **PK** | |
| user_id | uuid FK | |
| type | text | `channel · channel_list · keyword · niche` |
| input | jsonb | Entrada original normalizada |
| status | text | `queued · running · completed · partial · failed` |
| channels_total, channels_done | int | Alimenta a barra de progresso |
| quota_units_spent | int | Custo real — base para análise de margem e pedido de cota |
| created_at, completed_at | timestamptz | |

### `search_results`
Um registro por canal analisado dentro de uma pesquisa: (search_id FK, channel_id) **PK composta**, status, top_score, completed_at. Os vídeos e scores são lidos do corpus no momento da visualização — reabrir uma pesquisa mostra dados atuais (e canais expirados > 30 dias disparam recoleta, honrando a conformidade).

### `favorites`
(user_id, video_id) **PK composta**, search_id de origem (nulo se avulso), note (texto livre do usuário), created_at. É a matéria-prima da tela "minha pauta" e o sinal de qualidade do algoritmo.

### `plans` (tabela de referência, leitura pública)
| Coluna | Tipo | Notas |
|---|---|---|
| code | text **PK** | `free · creator · pro` |
| name, price_cents (BRL), stripe_price_id | | |
| limits | jsonb | `{searches_per_month, channels_per_search, history_days, favorites, export}` |

Limites em `jsonb` versionado — mudar plano não exige migration.

### `subscriptions`
user_id **PK**, stripe_customer_id, stripe_subscription_id, plan_code FK, status (`active · past_due · canceled`), current_period_start/end, cancel_at_period_end. Fonte de verdade local do billing; escrita exclusiva dos webhooks.

### `usage_periods`
Contadores de consumo por ciclo: (user_id, period_start) **PK composta**, period_end, searches_used. Incremento **transacional junto** da criação da pesquisa (impede corrida de limite — ADR-006).

## 5.3 Tabelas operacionais (sem acesso de usuário)

- `collection_jobs`: rastreio por canal do pipeline — channel_id, search_id, status, attempt, error, started_at, finished_at.
- `quota_ledger`: date, priority (1–4), operation, units_reserved, units_used. Base do token bucket e do relatório para o Google.

## 5.4 Índices críticos

| Tabela | Índice | Serve a |
|---|---|---|
| videos | (channel_id, is_short, published_at desc) | Montagem de baseline e listagem por canal |
| videos | (channel_id, score desc) | Top oportunidades por canal |
| channels | (refreshed_at) | Job de manutenção/expurgo |
| keyword_results | (keyword, position) | Cache hit de busca |
| searches | (user_id, created_at desc) | Histórico |
| usage_periods | (user_id, period_start) | Verificação de limite em request path |
| channel_niche_affinity | (niche_id, strength desc) | Canais relacionados |

## 5.5 Migrations e evolução

- Migrations versionadas no repo (`supabase/migrations`), aplicadas via Supabase CLI; **nunca** alteração manual no dashboard em produção.
- Seed de nichos versionado e idempotente.
- Convenções: snake_case; timestamps `timestamptz` sempre; soft delete apenas onde houver requisito real (não há, no MVP); FKs com `on delete cascade` somente da zona de usuário (apagar conta limpa tudo do usuário — requisito LGPD, [doc 8](08-seguranca-e-operacao.md)).
- O corpus **nunca** referencia dados de usuário — garante que exclusão de contas não toca o ativo global.
