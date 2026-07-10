# 8 · Segurança & Operação

## 8.1 Autenticação e autorização

- **Supabase Auth**: e-mail/senha (com verificação) + Google OAuth. Sessão via cookies httpOnly gerenciados pelo SDK SSR; `middleware.ts` protege todas as rotas do app autenticado.
- **Autorização em três camadas** (defesa em profundidade):
  1. Middleware — bloqueia não autenticados;
  2. Service layer — regras de negócio e limites de plano;
  3. **RLS no Postgres** — isolamento por `user_id` mesmo se as camadas acima falharem. RLS é a rede de segurança, nunca a única barreira.
- Service role key: usada **somente** em código de servidor (jobs, webhooks); jamais exposta a bundle de cliente. Cliente browser usa apenas a anon key + RLS.

## 8.2 Superfície de ataque e mitigações

| Vetor | Mitigação |
|---|---|
| Abuso de pesquisa (esgotar cota/limites) | Limites de plano transacionais (ADR-006) + rate limiting por usuário e IP nas rotas de escrita (Upstash Ratelimit ou equivalente) |
| Contas descartáveis para farmar plano gratuito | Verificação de e-mail obrigatória antes da 1ª pesquisa; monitorar padrão de criação por IP; CAPTCHA só se houver abuso real (atrito antecipado é custo de conversão) |
| Injeção via entrada de pesquisa | Validação Zod em toda rota; entrada tratada como dado, nunca interpolada em queries (repositories usam client parametrizado) |
| Webhooks Stripe forjados | Verificação de assinatura do webhook; idempotência por event id |
| Endpoints Inngest expostos | Assinatura nativa do Inngest (signing key) |
| Vazamento de chaves (YouTube, Stripe, service role) | Variáveis de ambiente na Vercel; nada em `NEXT_PUBLIC_*` além do estritamente público; rotação documentada; chave YouTube com restrição de API no Google Cloud |
| XSS via metadados do YouTube (títulos maliciosos) | React escapa por padrão; **proibido** `dangerouslySetInnerHTML` com dado do corpus; CSP básica |

## 8.3 LGPD e privacidade

- Dados pessoais coletados: e-mail, nome, avatar (OAuth) — o mínimo. Dados do corpus são públicos do YouTube e não são dados pessoais de usuários nossos.
- **Exclusão de conta:** self-service; cascata apaga tudo da zona do usuário ([doc 5, §5.5](05-modelo-de-dados.md)); corpus não referencia usuários por construção.
- Política de privacidade e termos na landing (estágio A); base legal: execução de contrato.
- E-mails transacionais apenas (verificação, billing); marketing só com opt-in.

## 8.4 Conformidade com YouTube API Services

Requisitos das políticas do Google que **moldam o produto** (não são burocracia):
- Refresh/expurgo de dados armazenados ≤ 30 dias → política de frescor ([doc 3, §3.3](03-estrategia-de-dados.md)).
- Atribuição: resultados linkam para o YouTube; nunca reproduzimos vídeos internamente, nunca baixamos conteúdo.
- Não combinar dados da API com scraping — reforça a decisão da fonte única oficial.
- Página de conformidade exigida na auditoria de aumento de cota: manter desde já um `COMPLIANCE.md` interno com como cada regra é atendida.

## 8.5 Observabilidade

| Camada | Ferramenta | O que olhar |
|---|---|---|
| Erros (front + back) | Sentry | Exceções, releases, taxa de erro por rota |
| Jobs | Painel do Inngest | Falhas de pipeline, retries, duração |
| Banco | Dashboard Supabase | Queries lentas, conexões, tamanho do corpus |
| Produto | Eventos próprios (tabela ou PostHog) | Funil: cadastro → 1ª pesquisa → resultado visto → favorito → assinatura |
| Cota | `quota_ledger` + alerta | Consumo diário por prioridade; alerta em 80% |

Alertas mínimos (e-mail/Telegram): cota ≥ 80% antes das 18h · fila de prioridade 1 represada > 15 min · taxa de erro do pipeline > 5% · webhook Stripe falhando.

## 8.6 Ambientes e deploy

- **Ambientes:** produção + preview (Vercel por PR) + local. Dois projetos Supabase (prod / dev); nunca apontar preview para o banco de produção.
- **Pipeline:** push → CI (typecheck, lint, testes) → preview deploy → merge em `main` → produção. Migrations aplicadas via Supabase CLI como passo explícito e consciente (não automático no deploy, no MVP).
- **Backups:** backups automáticos do Supabase (PITR quando o plano permitir); o corpus é reconstruível pela API — o crítico são os dados de usuário e billing.
- **Rollback:** deploys imutáveis da Vercel (promover build anterior); migrations sempre com estratégia expand-contract (aditivas primeiro, destrutivas só após código novo estável).

## 8.7 Estratégia de testes

Pirâmide pragmática para executor solo — testar onde erro custa caro:

1. **Unitários (prioridade máxima):** motor de outliers (baselines, buckets de idade, Shorts/longos, amostras pequenas), orçamento de cota, verificação de limites de plano. Puros, rápidos, rodam no CI.
2. **Integração:** services + banco (limites transacionais, RLS — testar que usuário A **não** lê dados do usuário B), handlers de webhook Stripe com payloads gravados.
3. **E2E mínimo (Playwright):** cadastro → pesquisa → resultado → favoritar; checkout em modo teste do Stripe.

Sem meta de cobertura numérica; meta qualitativa: **nenhuma regra de dinheiro, cota ou isolamento sem teste.**

## 8.8 Checklist pré-lançamento (gate do estágio A)

- [ ] Auditoria de segurança completa (usar a skill `security-audit` deste workspace)
- [ ] RLS revisada tabela a tabela (inclusive corpus: escrita bloqueada para authenticated)
- [ ] Rate limiting ativo nas rotas públicas e de escrita
- [ ] Segredos auditados (nenhum em bundle de cliente; restrições de chave no Google Cloud)
- [ ] Webhooks Stripe com verificação de assinatura + idempotência testadas
- [ ] Fluxo de exclusão de conta funcional de ponta a ponta
- [ ] Termos de uso + política de privacidade publicados
- [ ] Alertas de cota e de erro ativos
- [ ] Backup/restore ensaiado uma vez
