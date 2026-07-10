# Next.js — Rotas, Middleware, Server Actions, XSS, Headers

## Rotas e middleware

### CVE-2025-29927 (bypass de middleware) — verificar SEMPRE
Versões do Next.js anteriores a 14.2.25 / 15.2.3 (e 12.3.5 / 13.5.9) permitem pular o middleware inteiro enviando o header `x-middleware-subrequest`. Se toda a autenticação do app depende do middleware, isso é bypass total de auth.

```bash
# Verificar versão
node -e "console.log(require('./package.json').dependencies.next)"
```
Correção: `npm i next@latest` (ou no mínimo o patch da linha usada) **e** aplicar defesa em profundidade abaixo.

### Defesa em profundidade: auth no handler, não só no middleware

```ts
// lib/auth.ts
import "server-only";
import { cookies } from "next/headers";

export async function requireUser() {
  const session = await getSession(); // sua lógica de sessão
  if (!session) throw new Error("UNAUTHORIZED");
  return session.user;
}

// app/api/pedidos/route.ts
export async function GET() {
  let user;
  try { user = await requireUser(); }
  catch { return new Response("Unauthorized", { status: 401 }); }
  // ...
}
```

### Middleware com allowlist (bloqueia por padrão)

```ts
// middleware.ts
const PUBLIC_PATHS = ["/", "/login", "/api/webhook/stripe", "/_next", "/favicon.ico"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }
  const token = req.cookies.get("session")?.value;
  if (!token) return NextResponse.redirect(new URL("/login", req.url));
  return NextResponse.next();
}
```

### IDOR em rotas dinâmicas

```ts
// ERRADO: qualquer usuário logado lê qualquer pedido trocando o id
const pedido = await db.pedido.findUnique({ where: { id: params.id } });

// CERTO: escopo por dono
const pedido = await db.pedido.findFirst({
  where: { id: params.id, userId: user.id },
});
if (!pedido) return new Response("Not found", { status: 404 });
```

## Server Actions

Server Actions viram endpoints HTTP públicos. Regras:

```ts
"use server";
import { z } from "zod";

const schema = z.object({ titulo: z.string().min(1).max(200) });

export async function criarPost(input: unknown) {
  const user = await requireUser();               // 1. autenticação
  const data = schema.parse(input);               // 2. validação (nunca confiar no tipo)
  if (!can(user, "post:create")) throw new Error("FORBIDDEN"); // 3. autorização
  // 4. só então executar
}
```

- Nunca receber `userId`, `role`, `price` ou similares como argumento vindo do cliente — derivar da sessão/banco.
- Argumentos são `unknown` na prática: o cliente pode chamar a action com qualquer payload.

## Validação e XSS

### Validação server-side com Zod (padrão para todo input)

```ts
const schema = z.object({
  email: z.string().email().max(254),
  idade: z.coerce.number().int().min(0).max(130),
  site: z.string().url().refine(u => u.startsWith("https://"), "apenas https"),
});
const parsed = schema.safeParse(body);
if (!parsed.success) return Response.json({ error: "Dados inválidos" }, { status: 400 });
```

### dangerouslySetInnerHTML

```bash
grep -rn "dangerouslySetInnerHTML" --include="*.tsx" . | grep -v node_modules
```
Se o conteúdo vem do usuário (ou de CMS editável por terceiros):
```ts
import DOMPurify from "isomorphic-dompurify";
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />
```

### URLs do usuário (bloqueia `javascript:` e SSRF)

```ts
function safeUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" ? u.href : null;
  } catch { return null; }
}
```
Se o servidor faz fetch de URL fornecida pelo usuário: além de exigir https, bloquear IPs privados (127.0.0.0/8, 10/8, 172.16/12, 192.168/16, 169.254/16, ::1) resolvendo o DNS antes — senão é SSRF contra a rede interna/metadata da cloud.

### Uploads

```ts
const MAX = 5 * 1024 * 1024;
const ALLOWED = { "image/jpeg": [0xff, 0xd8], "image/png": [0x89, 0x50] };

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file") as File;
  if (!file || file.size > MAX) return new Response("Arquivo inválido", { status: 400 });
  const bytes = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  const ok = Object.values(ALLOWED).some(sig => sig.every((b, i) => bytes[i] === b));
  if (!ok) return new Response("Tipo não permitido", { status: 400 });
  const nome = `${crypto.randomUUID()}.${file.type === "image/png" ? "png" : "jpg"}`;
  // salvar em bucket (S3/Blob), nunca em pasta pública servida pelo app
}
```

## CSRF

- **Server Actions**: Next.js já compara `Origin` vs `Host` automaticamente — cobertas.
- **Route Handlers** com POST/PUT/DELETE autenticados por cookie: verificar manualmente.

```ts
function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const allowed = process.env.APP_URL; // ex: https://meuapp.com.br
  if (origin && origin !== allowed) throw new Error("CSRF");
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "same-site") throw new Error("CSRF");
}
```

## Headers de segurança (template para next.config)

```ts
// next.config.ts
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'", // apertar com nonce quando possível
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};
export default nextConfig;
```

Testar depois do deploy em https://securityheaders.com — meta: nota A.

## Vazamento na fronteira Server → Client Component

Tudo que um Server Component passa como prop para um Client Component é serializado e vai para o browser (visível no HTML/RSC payload).

```ts
// ERRADO
const user = await db.user.findUnique({ where: { id } }); // inclui passwordHash
return <Perfil user={user} />;

// CERTO — DTO explícito
return <Perfil user={{ id: user.id, nome: user.nome, avatar: user.avatar }} />;
```

Opcional (React taint API):
```ts
import { experimental_taintObjectReference as taint } from "react";
taint("Nao passar user completo para o cliente", user);
```
