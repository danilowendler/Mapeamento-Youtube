# Prioridades — lista viva (pós-lançamento)

> **Single pane of glass** do "o que fazer agora". Consolida a faxina pós-domínio,
> o roadmap de CRO/ativação e a frente estratégica de cota. É um backlog operacional
> — o roteiro de milestones fica no [doc 09](09-plano-de-implementacao.md); o detalhe
> de cada frente está nos docs referenciados.
> Atualizado em 22/07/2026.

---

## Feito recentemente (para contexto)

- **Pré-M9 T1–T6 + T4 parte 1** (ajustes de mercado: piso 1,5×, Trending + score parcial, filtro País, vídeo que casou, aba Canais, ranking de canais por frequência×posição).
- **Auditoria de segurança (M9):** sem achados críticos/altos; headers de segurança aplicados.
- **Domínio `beviewer.com` no ar** + `metadataBase`/OpenGraph.
- **Faxina bloco 2:** Trending vazia ciente de análise velha; filtro País some quando vazio; "vídeo que casou" com cobertura 100% (migration `keyword_results.video_title`); item 5 (A Web Analytics, B funil SQL, C landing quick-win + roadmap CRO).
- **Material da sessão de cota** versionado em [`docs/pesquisa/`](pesquisa/) + stub do ADR-007.

---

## Backlog priorizado (por frente)

### 🟥 Frente 1 — Go-live comercial (o que falta para cobrar de verdade)
1. **Go-live do Stripe** — chaves test → live, webhook live, renomear produtos para BEVIEWER. Maior bloqueador comercial.
2. **CSP completa** — adiada na auditoria; ao montar, permitir `va.vercel-scripts.com` (analytics), Stripe e Sentry.
3. **Testes E2E (Playwright)** — não existem; toda validação de fluxo é manual.

> ⚠️ **Tensão de sequência:** o go-live trava os preços atuais (Criador R$ 49 / Pro R$ 99), mas a Frente 4 (corpus indexado) propõe outra tabela (R$ 79 / R$ 179 / R$ 449, cobrando por "canais monitorados" em vez de "pesquisas"). **Decidir a Frente 4 antes de fixar o pricing live** — ou aceitar que os preços mudarão depois.

### 🟧 Frente 2 — Infra / operacional
1. **E-mail próprio (Resend + SPF/DKIM na GoDaddy + trocar SMTP no Supabase)** — desbloqueia a ativação da Frente 3 (fricção de e-mail, e-mail de reativação) e sobe o profissionalismo. Alto retorno.
2. **Backup do Supabase de produção** — confirmar plano/retenção e testar uma restauração num projeto descartável.
3. **Deployment Protection nos previews da Vercel.**
4. **Observabilidade** — confirmar que os alertas do Sentry e o cron `monitor-quota` realmente disparam.

### 🟨 Frente 3 — Conversão & ativação (detalhe em [roadmap-cro-ativacao.md](analytics/roadmap-cro-ativacao.md))
1. **P0 medição (fundador, sem código):** ligar o Web Analytics no painel da Vercel + rodar [`funil-ativacao.sql`](analytics/funil-ativacao.sql) no Supabase — o baseline que dá sentido a tudo.
2. **P2 prova real na landing** — depende de você fornecer 1 depoimento/caso identificável (código pronto para receber).
3. **P3 ativação:** aha pré-carregado no app (independente); reduzir fricção da confirmação de e-mail e e-mail de reativação (dependem da Frente 2).
4. **P4 ICP no hero** — depende de você decidir o público-alvo.

### 🟦 Frente 4 — Arquitetura de cota / corpus indexado (frente estratégica)
- **O problema mais importante do produto:** `search.list` custa 100 unidades e 3 assinantes Pro já esgotam a cota diária. Pesquisa + arquitetura numa **sessão dedicada** — material e prompt prontos em [`docs/pesquisa/`](pesquisa/) (ver `README.md` e o stub `ADR-007`).

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
2. **Frente 2 · Resend** — destrava ativação e sobe profissionalismo; combina com o domínio novo.
3. **Decidir a Frente 4** (corpus indexado) — porque ela condiciona o pricing do go-live.
4. Depois: go-live Stripe + CSP + E2E (Frente 1), com o pricing já alinhado à Frente 4.

*A ordem entre frentes é decisão do fundador; dentro de cada frente, a numeração já reflete a prioridade.*
