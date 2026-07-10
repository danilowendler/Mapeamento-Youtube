---
name: security-audit
description: Auditoria de segurança completa e sequencial para qualquer aplicação ou serviço - web apps (Next.js, React, Node, .NET, Python), SaaS multi-tenant, APIs, mobile (React Native/Expo), apps com IA/LLM e infraestrutura (Vercel, Docker, VPS). Use esta skill sempre que o usuário pedir para "blindar", "auditar", "revisar segurança", "verificar vulnerabilidades", "hardening" ou "pentest básico" de um app, ou mencionar vazamento de chaves/API keys, proteção de rotas, SQL injection, XSS, CSRF, isolamento de tenants, segurança de pagamentos, autenticação insegura ou preparação para producão. Também use antes de qualquer deploy em produção.
---

# Security Audit — Auditoria Sequencial de Segurança

Esta skill executa uma auditoria de segurança em fases ordenadas, para qualquer tipo de serviço. A regra central é:

**Percorra TODAS as fases na ordem. Em cada fase, verifique se ela se aplica ao projeto. Se não se aplica, registre "N/A — motivo" e pule para a próxima. Nunca pule silenciosamente.**

Ao final, gere um relatório com: vulnerabilidades encontradas (severidade Crítica/Alta/Média/Baixa), correção aplicada ou recomendada, e itens N/A.

## Como conduzir a auditoria

1. **Fase 0 primeiro**: identifique a stack e marque quais fases se aplicam.
2. Execute as fases 1 a 14 na ordem. Para cada verificação: **detectar → classificar severidade → corrigir (ou propor correção)**.
3. Corrija primeiro o que é Crítico. Não refatore nada fora do escopo de segurança sem avisar.
4. Leia o arquivo de referência da fase QUANDO chegar nela — eles contêm comandos de detecção e código de correção pronto.

## Referências (leia quando chegar na fase correspondente)

| Arquivo | Fases | Conteúdo |
|---|---|---|
| `references/secrets-e-env.md` | 1 | Segredos, .env, chaves em bundle/repositório |
| `references/nextjs.md` | 2, 4, 5, 7 | Específico Next.js: middleware, Server Actions, headers, RSC |
| `references/backends-gerais.md` | 2, 4, 5, 12 | Node/Express, .NET, Python/FastAPI, Docker, VPS |
| `references/auth.md` | 3 | Senhas, JWT, sessões, RBAC, OAuth |
| `references/database.md` | 6 | SQL injection, RLS, connection strings, LGPD |
| `references/saas-e-negocio.md` | 8, 9 | Multi-tenancy, billing, lógica de negócio, rate limit |
| `references/mobile.md` | 10 | React Native/Expo, armazenamento seguro, chaves no app |
| `references/ia-e-integracoes.md` | 11 | LLM/prompt injection, webhooks, OAuth de terceiros, e-mail |
| `references/deploy-e-dependencias.md` | 12, 13, 14 | Vercel, CORS, CI/CD, supply chain, logging, incidentes |

---

## FASE 0 — Reconhecimento (sempre se aplica)

- [ ] Mapear a stack: framework(s), linguagem, ORM, provedor de auth, banco, onde faz deploy, tem mobile? tem IA? tem pagamento? é multi-tenant?
- [ ] Listar superfícies de ataque: rotas de API, Server Actions/endpoints, formulários, uploads, webhooks (recebidos e enviados), cron/background jobs, filas, integrações de terceiros.
- [ ] Verificar CVEs conhecidos do framework na versão usada. Next.js < 14.2.25 / < 15.2.3: **CVE-2025-29927, bypass de middleware (Crítica)**. Para outros frameworks, buscar advisories da versão.
- [ ] Rodar o scanner de dependências da stack (`npm audit`, `dotnet list package --vulnerable`, `pip-audit`) e anotar High/Critical para a Fase 14.
- [ ] Montar a tabela de fases aplicáveis e apresentar ao usuário antes de prosseguir.

## FASE 1 — Segredos e variáveis de ambiente

*Quase sempre se aplica.*

- [ ] `.env*`/appsettings com segredos fora do versionamento; existe `.env.example` sem valores reais.
- [ ] Histórico do git sem segredos (gitleaks). Se achou: **rotacionar a chave** — limpar histórico não basta.
- [ ] Nenhum segredo em código enviado ao cliente (`NEXT_PUBLIC_*`, `VITE_*`, `EXPO_PUBLIC_*`, bundle mobile).
- [ ] Nenhuma chamada com chave secreta feita direto do cliente (browser ou app) — deve passar pelo backend.
- [ ] Segredos hardcoded: buscar `sk-`, `pk_live`, `AKIA`, `ghp_`, `Bearer `, connection strings.

→ `references/secrets-e-env.md`

## FASE 2 — Proteção de rotas e endpoints

*Se o serviço não tem nenhuma área privada, marque N/A.*

- [ ] Todo endpoint privado valida sessão/token **dentro do handler** (defesa em profundidade — middleware/gateway pode ser bypassado).
- [ ] Middleware/gateway com allowlist (nega por padrão), não blocklist.
- [ ] Server Actions / RPCs / endpoints "internos" tratados como públicos: auth + autorização internas.
- [ ] Rotas com ID (`/pedidos/[id]`) verificam posse do recurso (IDOR).
- [ ] Cron jobs e background endpoints protegidos (secret no header, não URL "escondida").
- [ ] Rotas de debug/admin/metrics (`/health` detalhado, `/swagger` em prod, `/metrics`) não expostas publicamente.

→ Next.js: `references/nextjs.md` | Outros: `references/backends-gerais.md`

## FASE 3 — Autenticação e autorização

*Se 100% público sem login, marque N/A.*

- [ ] Senhas com bcrypt/argon2 (nunca MD5/SHA1/texto puro).
- [ ] JWT: assinatura verificada, expiração curta, secret forte, algoritmo fixado, refresh com rotação.
- [ ] Cookies de sessão: `HttpOnly`, `Secure`, `SameSite`; token nunca em localStorage.
- [ ] RBAC verificado no servidor a cada operação sensível; role nunca vem do cliente.
- [ ] Reset de senha: token de uso único com expiração, sem enumeração de usuários, invalida sessões.
- [ ] Brute force: rate limit por IP E por conta no login.
- [ ] OAuth (login social): validar `state`, validar `redirect_uri` com allowlist exata.
- [ ] MFA disponível para contas administrativas (mínimo para admins do SaaS).

→ `references/auth.md`

## FASE 4 — Validação de entrada

*Se aceita qualquer input do usuário, se aplica.*

- [ ] Toda entrada validada no servidor com schema (Zod / FluentValidation / Pydantic) — nunca só no cliente.
- [ ] Sem HTML do usuário renderizado cru (`dangerouslySetInnerHTML`, `Html.Raw`, `| safe`); sanitizar se inevitável.
- [ ] URLs do usuário: só `https:`, bloquear IPs privados se o servidor faz fetch delas (SSRF).
- [ ] Uploads: tipo real por magic bytes, limite de tamanho, renomear, servir de bucket/domínio separado.
- [ ] Sem `eval`/`exec`/deserialização insegura (pickle, BinaryFormatter) com input do usuário.
- [ ] Path traversal: nomes de arquivo do usuário nunca concatenados em caminhos (`../../etc/passwd`).
- [ ] Parsers de XML com entidades externas desabilitadas (XXE).

→ `references/nextjs.md` ou `references/backends-gerais.md`

## FASE 5 — Headers de segurança e CSRF

*Se tem frontend web, se aplica.*

- [ ] CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, HSTS.
- [ ] CSRF coberto em toda mutação autenticada por cookie (Origin check ou token).
- [ ] Header de versão do servidor removido (`X-Powered-By`, `Server`).

→ Templates: `references/nextjs.md` (Next) e `references/backends-gerais.md` (Express/.NET/FastAPI)

## FASE 6 — Banco de dados

*Sem banco = N/A.*

- [ ] Zero SQL concatenado — parametrizado ou ORM; auditar `$queryRawUnsafe`, `FromSqlRaw`, f-strings em SQL.
- [ ] Connection string só no servidor, com TLS.
- [ ] Supabase/Firebase: RLS/Security Rules em TODAS as tabelas/coleções — a chave pública sem regras = banco aberto.
- [ ] Usuário do banco com privilégio mínimo.
- [ ] Dados sensíveis (CPF, saúde — LGPD) minimizados, mascarados e com acesso auditado.
- [ ] Backup automático ativo E restauração testada.
- [ ] NoSQL injection (Mongo: `$where`, operadores vindos do body sem validação).

→ `references/database.md`

## FASE 7 — Exposição de dados nas respostas

*Se retorna dados, se aplica.*

- [ ] APIs retornam DTOs explícitos, nunca a entidade inteira (hash de senha, tokens, dados de outros usuários).
- [ ] Next.js: props Server→Client Component sem campos sensíveis.
- [ ] Erros em produção genéricos; stack trace só em log de servidor.
- [ ] IDs sequenciais não expostos em recursos sensíveis (preferir UUID).
- [ ] GraphQL (se houver): introspection desligada em prod, limite de profundidade/complexidade.

## FASE 8 — Rate limiting, CORS e abuso

*APIs expostas = se aplica.*

- [ ] CORS com allowlist; nunca `*` em rota autenticada; nunca refletir Origin sem validar.
- [ ] Rate limit em: login, cadastro, reset, endpoints caros (IA, e-mail, SMS, geração de arquivos).
- [ ] Webhooks recebidos verificam assinatura.
- [ ] Endpoints que geram custo protegidos contra loop/bot (considerar CAPTCHA em cadastro público).

→ `references/saas-e-negocio.md` e `references/deploy-e-dependencias.md`

## FASE 9 — SaaS: multi-tenancy, billing e lógica de negócio

*Se não é SaaS nem tem pagamento, marque N/A — mas para produtos MWM/B2B esta fase é crítica.*

- [ ] **Isolamento de tenant**: toda query filtra por `tenant_id` derivado da sessão (nunca do request); testado com dois tenants.
- [ ] Convites/membros: usuário só convida para o próprio tenant; troca de tenant revalida permissões.
- [ ] **Preço/plano nunca vem do cliente**: valor cobrado definido no servidor a partir do catálogo.
- [ ] Webhook de pagamento com assinatura verificada + idempotência (evento duplicado não credita duas vezes).
- [ ] Estado de assinatura verificado no servidor a cada uso de recurso pago (não só no login).
- [ ] Lógica de negócio: quantidades negativas, race condition em cupom/saldo (usar transação/lock), abuso de trial (mesmo cartão/e-mail+alias), replay de requisições.
- [ ] Downgrade/cancelamento: acesso realmente revogado; export de dados do tenant disponível (contratos B2B pedem).

→ `references/saas-e-negocio.md`

## FASE 10 — Mobile (React Native / Expo / nativo)

*Sem app mobile = N/A.*

- [ ] Tokens em SecureStore/Keychain/Keystore — nunca AsyncStorage.
- [ ] Nenhuma chave secreta embarcada no app (o binário é descompilável); tudo via backend.
- [ ] `EXPO_PUBLIC_*` tratado como público.
- [ ] Deep links validados (não navegar para tela autenticada por link externo sem checar sessão).
- [ ] TLS obrigatório; considerar certificate pinning para apps sensíveis.
- [ ] Dados sensíveis fora de logs (`console.log` vai para logcat/Console) e fora de screenshots de background quando crítico.

→ `references/mobile.md`

## FASE 11 — IA/LLM e integrações externas

*Sem IA e sem integrações = N/A.*

- [ ] Prompt injection: conteúdo do usuário/documentos nunca tratado como instrução; saídas do LLM validadas antes de executar ações.
- [ ] LLM não recebe segredos nem dados de outros tenants no contexto.
- [ ] Custo de IA limitado por usuário (rate limit + max_tokens + orçamento).
- [ ] Tool use/function calling do LLM com allowlist de ações e confirmação para ações destrutivas.
- [ ] OAuth de terceiros: escopos mínimos, tokens criptografados em repouso, refresh seguro.
- [ ] E-mail do domínio: SPF, DKIM e DMARC configurados (impede spoofing do seu domínio).

→ `references/ia-e-integracoes.md`

## FASE 12 — Deploy e infraestrutura

*Sempre se aplica; conteúdo depende do alvo (Vercel, Docker, VPS, cloud).*

- [ ] Env vars separadas por ambiente; preview/staging nunca usa produção.
- [ ] HTTPS forçado + HSTS em tudo.
- [ ] Vercel: Deployment Protection em previews privados.
- [ ] Docker: imagem sem segredos em layers, usuário não-root, base atualizada, `.dockerignore` com `.env`.
- [ ] VPS: SSH só com chave, root login off, firewall (só 80/443/SSH), fail2ban, updates automáticos de segurança.
- [ ] Buckets (S3/Blob/Supabase Storage) privados por padrão; URLs assinadas para acesso.

→ `references/backends-gerais.md` (Docker/VPS) e `references/deploy-e-dependencias.md` (Vercel)

## FASE 13 — CI/CD e supply chain

*Se tem repositório e pipeline, se aplica.*

- [ ] Secrets do pipeline em secret store (GitHub Actions secrets), nunca no YAML; sem `pull_request_target` com checkout de código de fork.
- [ ] Branch protection na main: PR obrigatório, sem force push.
- [ ] Actions de terceiros fixadas por SHA (não `@master`).
- [ ] Scan automático no CI: gitleaks (segredos) + audit de dependências; build falha em Critical.
- [ ] Lockfile commitado; Dependabot/Renovate ativo.
- [ ] Pacotes novos revisados (typosquatting, scripts postinstall).

→ `references/deploy-e-dependencias.md`

## FASE 14 — Logging, monitoramento e resposta a incidentes

*Sempre se aplica.*

- [ ] Logs sem senhas, tokens, dados pessoais completos (LGPD).
- [ ] Trilha de auditoria de ações sensíveis: quem, o quê, quando, de onde.
- [ ] Alertas para picos de erro 401/403/500 e uso anômalo.
- [ ] Plano de incidente documentado: rotação de todas as chaves, kill switch do deploy, preservação de logs, notificação (clientes B2B por contrato; ANPD se vazamento de dados pessoais).

→ `references/deploy-e-dependencias.md`

---

## Relatório final (formato obrigatório)

```
# Relatório de Auditoria de Segurança — <projeto> — <data>

## Escopo
- Stack detectada: ...
- Fases aplicáveis: ... | Fases N/A: X (motivo), Y (motivo)

## Resumo
- Críticas: N | Altas: N | Médias: N | Baixas: N

## Vulnerabilidades
### [CRÍTICA] Título
- Fase: X | Arquivo: caminho
- Problema: descrição
- Correção: aplicada / recomendada (com código ou passo a passo)

(repetir por item, ordenado por severidade)

## Próximos passos recomendados
```

## Classificação de severidade

- **Crítica**: exploração remota sem auth, vazamento de segredo, RCE, SQL injection, bypass de auth, vazamento cross-tenant.
- **Alta**: IDOR, XSS armazenado, falta de RLS, CSRF destrutivo, manipulação de preço/billing, prompt injection com ação.
- **Média**: headers ausentes, rate limit ausente, erros verbosos, CORS permissivo, SPF/DKIM/DMARC ausentes.
- **Baixa**: hardening adicional, logging incompleto, dependências desatualizadas sem CVE.
