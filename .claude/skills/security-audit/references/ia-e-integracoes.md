# IA/LLM e Integrações Externas (OAuth, webhooks, e-mail)

## Apps com LLM

### Prompt injection — o modelo mental

Todo conteúdo que entra no contexto do LLM e não foi escrito por você é potencialmente uma instrução maliciosa: mensagens do usuário, documentos enviados, resultados de busca, e-mails, dados de outros sistemas. O LLM não distingue de forma confiável "dado" de "instrução".

Consequência prática: **a segurança não pode depender do prompt**. Ela fica nas permissões do que o LLM pode fazer e ver.

### Regras de arquitetura

- [ ] **Contexto por tenant/usuário**: o LLM só recebe dados que AQUELE usuário pode ver. Nunca montar contexto com dados de vários tenants "para o modelo ter mais informação". RAG: o filtro de permissão acontece na busca (query filtrada por tenant/ACL), não pedindo ao modelo para "ignorar o que não for do usuário".
- [ ] **Sem segredos no contexto**: chaves, connection strings e dados internos não entram no prompt — o usuário consegue extraí-los.
- [ ] **System prompt é semi-público**: assuma que será extraído; não coloque nada nele que não possa vazar.
- [ ] **Saída do LLM é input não confiável**: se a resposta vira HTML, sanitizar (XSS via markdown/links `javascript:`); se vira SQL/código/comando, não executar sem validação estrita — idealmente nunca.

### Tool use / function calling

- [ ] Allowlist de ferramentas por contexto: o agente de suporte não tem ferramenta de "deletar conta".
- [ ] Ferramentas executam com as permissões DO USUÁRIO (repassar userId/tenantId da sessão para dentro da tool), nunca com credencial administrativa global.
- [ ] Ações destrutivas ou irreversíveis (deletar, pagar, enviar e-mail externo) exigem confirmação humana explícita fora do chat.
- [ ] Parâmetros das tools validados com schema como qualquer input.

### Custo e abuso

```ts
// Trípla contenção de custo
// 1. Rate limit por usuário (Upstash): N requisições/min
// 2. max_tokens em toda chamada
// 3. Orçamento acumulado por usuário/tenant no período
const gasto = await getGastoMensal(user.tenantId);
if (gasto > LIMITE_PLANO[user.plano]) {
  return Response.json({ error: "Limite do plano atingido" }, { status: 402 });
}
```

- [ ] Input do usuário com tamanho máximo (senão 1 requisição = contexto gigante = custo alto).
- [ ] Endpoint de IA nunca anônimo (bot descobre e drena sua conta da API).
- [ ] Logs de uso por usuário para detectar anomalia.

### Dados e privacidade

- [ ] Verificar política de retenção/treinamento do provedor de IA; para dados sensíveis (saúde/LGPD), usar modos sem retenção ou contrato adequado (DPA).
- [ ] Não logar prompts completos com dados pessoais; mascarar antes.

## OAuth com serviços de terceiros (o SEU app acessando Google/GitHub/etc. do usuário)

- [ ] Escopos mínimos: pedir `read` se só precisa ler; escopo largo assusta no consent e amplia o dano de um vazamento.
- [ ] `state` aleatório e validado no callback (anti-CSRF do fluxo OAuth).
- [ ] `redirect_uri` registrado exato — nunca validado por prefixo/wildcard.
- [ ] Access/refresh tokens dos usuários criptografados em repouso no banco (não texto puro) e nunca enviados ao frontend.
- [ ] Revogação: ao desconectar a integração, revogar o token no provedor, não só apagar do banco.
- [ ] PKCE em qualquer fluxo que passe pelo cliente (mobile/SPA).

## Webhooks

### Recebidos (terceiro → você)
- [ ] Verificar assinatura HMAC do provedor (Stripe, GitHub, etc.) sobre o corpo cru, antes de qualquer parse.
- [ ] Idempotência por event id (evento duplicado não processa duas vezes).
- [ ] Responder rápido (2xx) e processar assíncrono se demorar — retry storms do provedor podem virar auto-DoS.

### Enviados (você → cliente do SaaS)
- [ ] Assinar o payload com HMAC e secret por cliente, e documentar a verificação — seus clientes B2B vão pedir.
- [ ] Validar a URL de destino cadastrada: só https, resolver DNS e bloquear IPs privados (senão o cliente usa seu webhook como proxy de SSRF contra sua rede).
- [ ] Retry com backoff e limite; log de entregas.

## E-mail do domínio (SPF, DKIM, DMARC)

Sem esses registros DNS, qualquer pessoa envia e-mail "de" contato@seudominio.com.br — phishing contra seus clientes com sua marca.

```
# SPF — quem pode enviar pelo domínio (ex.: usando Resend/SES)
TXT @ "v=spf1 include:amazonses.com ~all"

# DKIM — chaves fornecidas pelo provedor de envio (CNAMEs)

# DMARC — política para quem falhar SPF/DKIM
TXT _dmarc "v=DMARC1; p=quarantine; rua=mailto:dmarc@seudominio.com.br; adkim=s; aspf=s"
# começar com p=none para monitorar, subir para quarantine → reject
```

Verificar: `dig TXT seudominio.com.br`, `dig TXT _dmarc.seudominio.com.br`, ou ferramentas como MXToolbox.

- [ ] E-mails transacionais por provedor dedicado (Resend, SES, Postmark) com domínio verificado.
- [ ] Links em e-mails sempre para o seu domínio (não encurtadores) — treina o cliente a desconfiar de phishing.
