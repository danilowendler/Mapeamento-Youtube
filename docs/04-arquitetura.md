# 4 · Arquitetura de Sistema

## 4.1 Visão geral

```
                        ┌─────────────────────────────────────────┐
 Usuário ──────────────▶│  Vercel · Next.js (App Router)          │
                        │  ├─ UI: Server Components (padrão)      │
                        │  │      Client Components (ilhas:       │
                        │  │      dashboard realtime, filtros)    │
                        │  └─ API: Route Handlers                 │
                        │         └─ Services ─ Repositories      │
                        └────────┬──────────────┬─────────────────┘
                                 │              │ dispara eventos
                                 ▼              ▼
                  ┌──────────────────┐   ┌─────────────────────┐
                  │ Supabase          │   │ Inngest             │
                  │ · Postgres (RLS)  │◀──│ pipeline de coleta  │
                  │ · Auth            │   │ (jobs duráveis)     │
                  │ · Realtime        │   └──────────┬──────────┘
                  └──────────────────┘               ▼
                                          YouTube Data API v3
                  Stripe ◀── webhooks ──▶ (orçamento de cota)
```

**Estilo: monólito modular em camadas**, hospedado inteiro no repositório Next.js. Tudo é serviço gerenciado; não existe servidor para administrar.

## 4.2 Registro de decisões arquiteturais (ADRs)

### ADR-001 · Monólito modular (não microsserviços)
**Decisão:** todo o backend vive no app Next.js (Route Handlers + camadas de serviço), num único deploy.
**Motivo:** executor solo — cada peça móvel adicional é custo de operação e depuração. A separação em camadas (`services/`, `repositories/`) preserva a opção de extrair o motor de análise para um worker dedicado no futuro **sem reescrita**, apenas movendo módulos.
**Rejeitado:** microsserviços (overhead injustificável), backend Node separado (duplicaria deploy, auth e tipos sem ganho no MVP).

### ADR-002 · Inngest para processamento assíncrono
**Decisão:** pipeline de coleta como funções duráveis Inngest, invocadas por eventos emitidos pelas rotas.
**Motivo:** a coleta exige o que serverless puro não dá — passos com retry automático, rate limiting, controle de concorrência, execução além do timeout — e o que uma fila própria (BullMQ + Redis + worker em VPS) custaria em infraestrutura para operar. Inngest entrega durabilidade e observabilidade com free tier generoso e integração nativa com Next.js/Vercel.
**Rejeitado:** BullMQ+VPS (infra para um time, não para um solo), pg_cron/pgmq (viável, mas sem retries ricos nem observabilidade), Vercel Cron (só agendamento, não orquestração).
**Gatilho de revisão:** se os custos do Inngest superarem ~US$ 50/mês, avaliar migração do pipeline para worker próprio — as camadas tornam isso um refactor localizado.

### ADR-003 · Supabase como plataforma de dados
**Decisão:** Postgres + Auth + Realtime + RLS do Supabase; Storage quando houver assets de usuário.
**Motivo:** definido na especificação do produto e correto para o caso: RLS dá isolamento multi-tenant no nível do banco (defesa em profundidade), Realtime resolve resultados progressivos sem WebSocket próprio, Auth elimina páginas de risco (reset de senha, OAuth Google).

### ADR-004 · Resultados progressivos via Realtime
**Decisão:** o pipeline grava resultados parciais por canal; o frontend assina mudanças da pesquisa via Supabase Realtime e renderiza conforme chegam.
**Motivo:** pesquisa fria leva 30 s–3 min; tela travada mata a percepção de velocidade (princípio nº 1 do produto). Cache aparece em < 2 s, o resto flui — o produto *parece* instantâneo mesmo quando não é.
**Rejeitado:** polling (funciona, mas desperdiça requisições e atrasa percepção; fica como fallback trivial se Realtime der problema), fila+notificação (quebra o fluxo de exploração).

### ADR-005 · Orçamento de cota como serviço interno
**Decisão:** módulo `QuotaBudget` com reserva prévia, prioridades e reserva estratégica de 15% ([doc 3, §3.4](03-estrategia-de-dados.md)); contadores persistidos no Postgres.
**Motivo:** sem governança central, a cota é esgotada pelos primeiros usuários do dia e o produto "quebra" para os demais — o pior modo de falha possível para a confiança.

### ADR-006 · Enforcement de planos no service layer + banco
**Decisão:** limites de plano verificados nos services (única porta de entrada das operações) com contadores em `usage_periods`; a UI apenas reflete o estado.
**Motivo:** limite aplicado só na UI é limite inexistente. O contador no banco com verificação transacional impede corrida (duas pesquisas simultâneas estourando o limite).

## 4.3 Camadas e responsabilidades

| Camada | Local | Responsabilidade | Proibido |
|---|---|---|---|
| UI | `app/`, `components/`, `features/` | Renderização, interação, assinatura Realtime | Regra de negócio, chamada direta a APIs externas |
| API | `app/api/*` (Route Handlers) | HTTP: validação de entrada (Zod), auth, orquestração fina | Lógica de negócio inline, SQL |
| Services | `services/` | Regras de negócio: pesquisa, análise, quota, planos | Conhecer HTTP (req/res) ou detalhes de SQL |
| Repositories | `repositories/` | Acesso a dados (cliente Supabase tipado) | Regra de negócio |
| Jobs | `jobs/` (funções Inngest) | Pipeline de coleta, manutenção de corpus | Ser chamado diretamente pela UI |
| Lib | `lib/` | Clientes externos (YouTube, Stripe, Supabase, Inngest) | Estado de negócio |

Regra de dependência: **de cima para baixo, nunca o contrário.** Services não importam de `app/`; repositories não importam de services.

### Estrutura de pastas (contrato)

```
app/                  # rotas, layouts, route handlers (app/api)
components/           # UI genérica reutilizável (Button, Card, Table)
features/             # UI por domínio (search/, results/, billing/, auth/)
services/             # searchService, analysisService, quotaService, planService
repositories/         # channelRepo, videoRepo, searchRepo, usageRepo
jobs/                 # funções Inngest (collectChannel, runSearch, refreshCorpus)
hooks/                # hooks client (useSearchProgress, useFilters)
lib/                  # youtubeClient, stripeClient, supabase/, inngestClient
utils/                # puros e sem dependência (formatadores, parsers)
types/                # tipos de domínio compartilhados
database/             # migrations, seed de nichos
middleware.ts         # sessão/proteção de rotas
styles/  public/
```

## 4.4 Fluxos principais

### Pesquisa (o fluxo central)
1. UI envia `POST /api/searches` (entrada + tipo).
2. Route handler valida (Zod) → `searchService.create()`: verifica limite do plano (transacional), cria registro `searches`, resolve entrada, emite evento `search.requested` ao Inngest e responde `202` com o ID.
3. UI navega para a tela de resultados e assina o canal Realtime da pesquisa.
4. Pipeline Inngest executa ([doc 3, §3.5](03-estrategia-de-dados.md)); cada canal concluído grava `search_results` → Realtime empurra ao cliente.
5. Job marca a pesquisa `completed`; UI encerra o progresso.

### Billing
Stripe Checkout (criação) e Customer Portal (gestão) — nunca formulário de cartão próprio. Webhooks (`checkout.session.completed`, `customer.subscription.updated/deleted`) atualizam `subscriptions`; os services leem sempre do banco, nunca da API do Stripe em request path.

## 4.5 Caminho de escala (o que muda quando crescer)

| Gargalo futuro | Sinal | Resposta preparada |
|---|---|---|
| Cota 10k/dia | Fila de prioridade 1–2 constantemente represada | Pedido de aumento ao Google (métricas de consumo já registradas desde o dia 1) |
| Compute de análise | Jobs Inngest lentos/caros | Extrair `jobs/` + `services/analysis` para worker dedicado (Railway/Fly); camadas já isolam |
| Leitura do corpus | Latência de consulta com corpus grande | Índices já previstos ([doc 5](05-modelo-de-dados.md)); depois, réplicas de leitura |
| Realtime | Limites de conexões simultâneas | Fallback para polling já trivial na arquitetura |

O que **não** faremos preventivamente: sharding, filas Kafka, cache Redis, CQRS. Cada um tem gatilho claro e nenhum chegou.
