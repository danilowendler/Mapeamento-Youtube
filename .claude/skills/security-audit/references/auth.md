# Autenticação e Autorização

## Preferência geral

Se possível, use uma solução consolidada (Auth.js/NextAuth, Clerk, Supabase Auth, Lucia) em vez de auth artesanal. A auditoria abaixo cobre tanto o uso correto dessas soluções quanto implementações custom.

## Senhas

```bash
grep -rn "md5\|sha1\|createHash" --include="*.ts" . | grep -v node_modules
```

```ts
// CERTO
import bcrypt from "bcryptjs";
const hash = await bcrypt.hash(senha, 12);
const ok = await bcrypt.compare(senha, hash);
```

- Custo bcrypt >= 10 (12 recomendado). argon2id é ainda melhor se o runtime permitir.
- Política: mínimo 8+ caracteres; não forçar regras bizarras; checar contra senhas vazadas é bônus (API do haveibeenpwned com k-anonymity).
- Comparações de token sempre com `crypto.timingSafeEqual`, não `===`.

## JWT

```ts
import { jwtVerify, SignJWT } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET); // 32+ bytes aleatórios

// Emitir
const token = await new SignJWT({ sub: user.id, role: user.role })
  .setProtectedHeader({ alg: "HS256" })   // algoritmo FIXO
  .setExpirationTime("15m")               // curto; refresh token para renovar
  .setIssuedAt()
  .sign(secret);

// Verificar
const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
```

Erros clássicos a procurar:
- `jwt.decode()` usado onde deveria ser `jwt.verify()` (decode NÃO valida assinatura).
- Aceitar qualquer `alg` do header (ataque `alg: none` / confusão RS256→HS256).
- Secret fraco (`"secret"`, nome do projeto) — gerar com `openssl rand -base64 32`.
- Expiração de dias/semanas sem mecanismo de revogação.
- Dados sensíveis no payload (JWT é apenas codificado, não criptografado).

## Cookies de sessão

```ts
cookies().set("session", token, {
  httpOnly: true,   // JS do cliente não lê (mitiga roubo via XSS)
  secure: true,     // só HTTPS
  sameSite: "lax",  // "strict" para apps sem navegação externa
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
});
```

- Nunca armazenar token de sessão em `localStorage` (qualquer XSS rouba).
- Regenerar o ID de sessão após login (evita session fixation).
- Logout deve invalidar no servidor, não só apagar o cookie.

## RBAC

```ts
// lib/permissions.ts
import "server-only";

const PERMISSIONS = {
  admin: ["user:read", "user:write", "user:delete", "report:read"],
  gestor: ["user:read", "report:read"],
  usuario: ["report:read:own"],
} as const;

export function can(user: { role: keyof typeof PERMISSIONS }, perm: string) {
  return (PERMISSIONS[user.role] as readonly string[])?.includes(perm) ?? false;
}
```

Regras:
- O `role` vem do banco/sessão validada no servidor — nunca do body, header customizado ou estado do cliente.
- Verificar permissão em CADA operação sensível (não só ao renderizar o menu).
- Esconder botão no front não é controle de acesso; é só UX.

## Reset de senha

- Token: aleatório (32+ bytes), uso único, expira em <= 1h, armazenado como hash no banco.
- Resposta idêntica exista ou não o e-mail ("Se o e-mail existir, enviamos instruções") — evita enumeração de usuários.
- Invalidar todas as sessões ativas após troca de senha.

## Brute force / rate limit de login

```ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const limiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "15 m"), // 5 tentativas / 15min
});

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const { success } = await limiter.limit(`login:${ip}`);
  if (!success) return new Response("Muitas tentativas", { status: 429 });
  // ...
}
```

Complementos: limitar também por conta (não só IP), atraso progressivo, e mensagem de erro genérica ("credenciais inválidas", nunca "senha errada" vs "usuário não existe").

## OAuth como login (login social no SEU app)

- [ ] `state` aleatório por tentativa, validado no callback (anti-CSRF).
- [ ] `redirect_uri` com match exato na allowlist — nunca prefixo/regex/wildcard.
- [ ] PKCE sempre que o fluxo passar por SPA/mobile.
- [ ] Vincular conta social a conta existente só após confirmar posse do e-mail (senão: account takeover pré-cadastro — atacante cria conta com e-mail da vítima antes dela).
- [ ] Validar o `email_verified` do provedor antes de confiar no e-mail.

## MFA

- [ ] TOTP (authenticator app) no mínimo para contas admin do sistema/SaaS.
- [ ] Códigos de recuperação gerados no setup, armazenados como hash, uso único.
- [ ] Operações críticas (trocar e-mail, desativar MFA, deletar conta) exigem reautenticação recente ("sudo mode").
- [ ] SMS como segundo fator só se não houver alternativa (SIM swap).
