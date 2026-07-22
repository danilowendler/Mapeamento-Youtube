# Prioridades — lista viva (pós-lançamento)

> **Single pane of glass** do "o que fazer agora". Consolida a faxina pós-domínio,
> o roadmap de CRO/ativação e a frente de cota (ADR-007). É um backlog operacional
> — o roteiro de milestones fica no [doc 09](09-plano-de-implementacao.md); o detalhe
> de cada frente está nos docs referenciados.
> Atualizado em 22/07/2026.

---

## Feito recentemente (para contexto)

- **Pré-M9 T1–T6 + T4 parte 1** (piso 1,5×, Trending + score parcial, filtro País, vídeo que casou, aba Canais, ranking de canais por frequência×posição).
- **Auditoria de segurança (M9):** sem achados críticos/altos; headers de segurança aplicados.
- **Domínio `beviewer.com` no ar** + `metadataBase`/OpenGraph.
- **Faxina bloco 2:** Trending vazia ciente; filtro País some quando vazio; "vídeo que casou" 100% (migration `keyword_results.video_title`); item 5 (A Web Analytics, B funil SQL, C landing quick-win + roadmap CRO).
- **Sessão de cota / ADR-007 (22/07):** decisão tomada (pesquisa + arquitetura, sem código) — ver Frente 4 e [`docs/pesquisa/`](pesquisa/).

---

## Backlog priorizado (por frente)

### 🟥 Frente 1 — Go-live comercial (o que falta para cobrar de verdade)
1. **Go-live do Stripe** — chaves test → live, webhook live, renomear produtos para BEVIEWER. Maior bloqueador comercial.
2. **CSP completa** — adiada na auditoria; ao montar, permitir `va.vercel-scripts.com` (analytics), Stripe e Sentry.
3. **Testes E2E (Playwright)** — não existem; toda validação de fluxo é manual.

> **Nota de pricing:** o go-live usa o pricing atual (Criador R$ 49 / Pro R$ 99). A migração de métrica para "canais monitorados" é **Fase 2 da Frente 4** (evento futuro, disparado por gatilho) — **não bloqueia o go-live**, mas planeje a comunicação da mudança de pacote quando ela vier.

### 🟧 Frente 2 — Infra / operacional
1. **E-mail próprio (Resend + SPF/DKIM na GoDaddy + trocar SMTP no Supabase)** — desbloqueia a ativação da Frente 3 e sobe o profissionalismo. Alto retorno.
2. **Backup do Supabase de produção** — confirmar plano/retenção e testar uma restauração num projeto descartável.
3. **Deployment Protection nos previews da Vercel.**
4. **Observabilidade** — confirmar que os alertas do Sentry e o cron `monitor-quota` realmente disparam.

### 🟨 Frente 3 — Conversão & ativação (detalhe em [roadmap-cro-ativacao.md](analytics/roadmap-cro-ativacao.md))
1. **P0 medição (fundador, sem código):** ligar o Web Analytics no painel da Vercel + rodar [`funil-ativacao.sql`](analytics/funil-ativacao.sql) — o baseline que dá sentido a tudo.
2. **P2 prova real na landing** — depende de você fornecer 1 depoimento/caso identificável (código pronto para receber).
3. **P3 ativação:** aha pré-carregado no app (independente); reduzir fricção da confirmação de e-mail e e-mail de reativação (dependem da Frente 2).
4. **P4 ICP no hero** — depende de você decidir o público-alvo.

### 🟦 Frente 4 — Cota / corpus indexado (decisão TOMADA — ADR-007, faseada)
A sessão dedicada rodou (22/07): **ADR-007 aceito** (doc 04 §4.2), patches nas docs 03/04/05/07, **M12** no doc 09, e o detalhe em [`docs/pesquisa/`](pesquisa/) (`relatorio-api-youtube.md`, `plano-de-migracao-e-indexacao.md`).

> **Calibração importante:** o custo real já caiu para ~100–390 un/pesquisa (cache 72h + coleta capada + ranking) — o gargalo **ainda não morde**. **Nada de reescrever para corpus-first agora.** Execução faseada, disparada por métrica.

- **Fase 1 (agora, sem reescrita):**
  1. Solicitar **extensão de cota** (Audit & Quota Extension) — leva meses, bloqueante de **escala** (o teto de retenção de 30 d limita o corpus a ~60 mil canais sob cota padrão). Ação do fundador, começar cedo.
  2. Desmembrar o **TTL do mapa keyword→canais** (72 h → ~30 d) do frescor de **métricas** (7/30 d).
  3. **Roteador keyword→nicho** via `pg_trgm` (aproveita os nichos já curados; custo 1 un).
  4. **Grafo** (`relatedService` + `channel_niche_affinity`) como fonte de **descoberta**, não só UI.
  5. **Alarme de `search.list`/dia** no `monitorQuota` (o sensor do gatilho da Fase 2).
- **Fase 2 (endgame, disparada por: fila de prioridade 1–2 represada OU extensão aprovada):** `discoverChannels` + `refreshCorpus`, inverter prioridades no `quotaService`, `index_queue`, busca 100% no corpus, e a **migração de métrica** (pesquisas → canais monitorados + pedidos de indexação).

### 🟩 Frente 5 — Refinamentos de produto
1. **Relevância de keyword parte 2 (filtro via Claude Haiku)** — só se o ranking (parte 1) não bastar no uso real.
2. **Casos-limite de estado** (coleta em andamento vs. "nenhum resultado"; todos os canais falharem).

---

## ⬇️ Feedbacks do YouTuber testador — A INCORPORAR

> **Seção reservada.** Os feedbacks de um YouTuber que está testando o site chegam a seguir;
> serão triados e distribuídos nas frentes acima (ou em uma nova frente, se fizer sentido),
> com esforço e dependência anotados. *— aguardando envio.*

---

## Sequência recomendada (near-term)

1. **Frente 3 · P0** (ligar analytics + rodar funil) — hoje, sem código, dá o baseline.
2. **Frente 4 · Fase 1** — começar já a **extensão de cota** (é lenta) e os ganhos táticos.
3. **Frente 2 · Resend** — destrava a ativação e sobe o profissionalismo; combina com o domínio novo.
4. **Frente 1** — go-live Stripe + CSP + E2E, com o pricing atual (a migração de métrica fica para a Fase 2 da Frente 4).

*A ordem entre frentes é decisão do fundador; dentro de cada frente, a numeração já reflete a prioridade.*
