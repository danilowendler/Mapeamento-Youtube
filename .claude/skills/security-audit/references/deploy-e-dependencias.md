# Deploy (Vercel), CORS, Rate Limiting, Dependências e Logging

## CORS

Regra: rota autenticada por cookie NUNCA pode ter `Access-Control-Allow-Origin: *` (junto de `credentials`, os browsers nem permitem — mas configurações erradas com reflexão de Origin são comuns e piores).

```ts
// Allowlist explícita
const ALLOWED_ORIGINS = new Set([
  "https://meuapp.com.br",
  "https://app.cliente.com.br",
]);

export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  if (!ALLOWED_ORIGINS.has(origin)) return new Response(null, { status: 403 });
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Vary": "Origin",
    },
  });
}
```

Detecção do erro clássico (refletir qualquer origin):
```bash
grep -rn "Access-Control-Allow-Origin" --include="*.ts" . | grep -v node_modules
# Suspeito: value dinâmico igual ao req.headers.get("origin") sem allowlist
```

## Rate limiting (Upstash na Vercel)

Aplicar em: login, cadastro, reset de senha, envio de e-mail/SMS, endpoints de IA/API paga, busca pesada, geração de arquivos.

```ts
// lib/ratelimit.ts
import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export const apiLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(30, "1 m"),
  analytics: true,
});
```

Chavear por usuário autenticado quando existir (`user:${id}`), senão por IP. Retornar 429 com `Retry-After`.

## Webhooks recebidos

Todo webhook deve verificar assinatura antes de processar:

```ts
// Exemplo Stripe
import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const body = await req.text(); // corpo cru, antes de parse
  const sig = req.headers.get("stripe-signature")!;
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return new Response("Assinatura inválida", { status: 400 });
  }
  // processar event...
}
```

Sem verificação, qualquer pessoa que descubra a URL pode forjar eventos ("pagamento aprovado" falso).

## Vercel — checklist

- **Env vars por ambiente**: Production, Preview e Development com valores distintos. Preview NUNCA aponta para banco de produção.
- **Deployment Protection**: ativar para previews (Settings → Deployment Protection) em projetos privados — previews têm URLs adivinháveis.
- **Domínios**: HTTPS é automático; garantir HSTS via header (ver nextjs.md).
- **Logs da Vercel**: verificar que não estão logando payloads com dados pessoais/tokens.
- **Repositório privado**: Vercel funciona normalmente com repo privado no GitHub; manter privado se o código contém lógica de negócio sensível.
- **Funções**: definir `maxDuration` razoável para evitar abuso de custo.

## Dependências

```bash
npm audit                       # vulnerabilidades conhecidas
npm audit fix                   # correções sem breaking change
npm outdated                    # o que está para trás
npx depcheck                    # dependências não usadas (remover = menos superfície)
```

- Ativar Dependabot no GitHub: Settings → Code security → Dependabot alerts + security updates.
- Fixar versões exatas em produção (`package-lock.json` sempre commitado).
- Antes de adicionar pacote novo: checar downloads semanais, última atualização, e se o nome não é typosquatting de um pacote famoso.
- Scripts `postinstall` de pacotes desconhecidos são vetor de supply chain — revisar.

## Logging e auditoria

O que NUNCA logar: senhas (nem erradas), tokens/JWT completos, cookies, connection strings, cartão, CPF completo, dados de saúde.

O que SEMPRE logar (trilha de auditoria):
- Login (sucesso e falha), logout, troca de senha
- Mudança de permissão/role
- Criação/exclusão de dados sensíveis
- Acesso administrativo

Formato mínimo: `{ timestamp, userId, acao, recurso, ip, resultado }`.

```ts
// Mascaramento antes de logar
const maskCpf = (c: string) => c.replace(/^(\d{3})\d{6}(\d{2})$/, "$1.***.***-$2");
```

## Mensagens de erro em produção

```ts
// Handler global — nunca vazar detalhes
try {
  // ...
} catch (err) {
  console.error(err); // detalhe só no log do servidor
  return Response.json({ error: "Erro interno" }, { status: 500 }); // genérico pro cliente
}
```

Verificar que `NODE_ENV=production` no deploy (Vercel já garante) — páginas de erro de dev vazam stack e código.

## Plano de incidente (mínimo viável)

Documentar num INCIDENTES.md do projeto:
1. **Rotação de chaves**: lista de todas as chaves/segredos e onde rotacionar cada um (provedor + env da Vercel).
2. **Kill switch**: como pausar o deploy (Vercel → pause project) ou colocar em manutenção.
3. **Contatos**: quem avisar (parceiros, clientes, e — se houver vazamento de dados pessoais — avaliar notificação à ANPD conforme LGPD).
4. **Preservar evidências**: exportar logs antes de mexer em qualquer coisa.

## CI/CD e supply chain (GitHub Actions)

### Secrets do pipeline

- Secrets em Settings → Secrets and variables → Actions; nunca no YAML ou em echo de log.
- `pull_request_target` + checkout do código do fork = execução de código de estranho com seus secrets. Regra: workflows disparados por PR de fork não acessam secrets nem fazem checkout do código do fork com privilégios.
- `GITHUB_TOKEN` com permissões mínimas:

```yaml
permissions:
  contents: read
```

### Actions de terceiros fixadas por SHA

```yaml
# ERRADO — tag pode ser movida para código malicioso
- uses: alguem/acao-util@v1

# CERTO — SHA imutável (Dependabot atualiza)
- uses: alguem/acao-util@a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0
```

Actions oficiais (actions/, github/) podem ficar em tag major.

### Pipeline de segurança mínimo

```yaml
name: security
on: [push, pull_request]
permissions:
  contents: read
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - name: Segredos vazados
        uses: gitleaks/gitleaks-action@v2
        env: { GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }} }
      - name: Dependências vulneráveis
        run: npm audit --audit-level=critical
```

Opcional e recomendado quando o projeto crescer: CodeQL (SAST gratuito para repositório) e Semgrep.

### Branch protection (main)

Settings → Branches → Add rule:
- Require pull request before merging
- Require status checks (o workflow de security acima)
- Bloquear force push e deleção
- Para times: require review de 1+ pessoa

### Conta GitHub

- MFA obrigatório na conta e na organização (MWM).
- Personal Access Tokens: fine-grained, escopo mínimo, com expiração.
- Revisar OAuth apps autorizadas na conta periodicamente.
