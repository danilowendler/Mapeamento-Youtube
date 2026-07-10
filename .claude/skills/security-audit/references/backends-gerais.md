# Backends Gerais (Node/Express, .NET, Python) e Infraestrutura (Docker, VPS)

Use este arquivo quando o serviço NÃO for Next.js — ou tiver componentes além dele.

## Node.js / Express / Fastify

### Headers e proteções básicas

```ts
import helmet from "helmet";
import rateLimit from "express-rate-limit";

app.disable("x-powered-by");
app.use(helmet()); // CSP, HSTS, nosniff, frameguard etc.
app.use(express.json({ limit: "1mb" })); // limite de payload
app.set("trust proxy", 1); // atrás de proxy (Vercel/nginx) para IP real
```

### Auth em middleware + handler

```ts
function requireAuth(req, res, next) {
  const token = req.cookies?.session;
  const user = verifySession(token);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  req.user = user;
  next();
}
app.get("/api/pedidos/:id", requireAuth, async (req, res) => {
  const pedido = await db.pedido.findFirst({
    where: { id: req.params.id, userId: req.user.id }, // IDOR check
  });
  if (!pedido) return res.status(404).end();
  res.json(toDto(pedido));
});
```

### Armadilhas específicas de Node

- `child_process.exec` com input do usuário = RCE; usar `execFile` com array de args, ou não usar.
- Prototype pollution: validar body com schema (Zod) resolve; cuidado com merges profundos de objetos do usuário.
- ReDoS: regex com backtracking catastrófico em input do usuário — validar tamanho antes, preferir regex simples.
- `express.static` apontando para pasta com arquivos sensíveis.

## .NET (ASP.NET Core)

### Configuração segura

```csharp
// Program.cs
app.UseHsts();
app.UseHttpsRedirection();
builder.Services.AddAuthorization(o =>
    o.FallbackPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser().Build()); // nega por padrão; [AllowAnonymous] libera
```

- Segredos: `dotnet user-secrets` em dev, variáveis de ambiente/Key Vault em prod — nunca `appsettings.json` commitado com segredo.
- SQL: EF Core parametriza; auditar `FromSqlRaw`/`ExecuteSqlRaw` com interpolação — usar `FromSqlInterpolated` ou parâmetros.
- Nunca `BinaryFormatter` (deserialização = RCE); `System.Text.Json` sem polimorfismo inseguro.
- Model binding: usar DTOs de entrada com `[Required]`/FluentValidation; nunca bindar a entidade do EF direto do body (over-posting: cliente seta `IsAdmin = true`).
- Swagger/OpenAPI desabilitado ou protegido em produção.
- CSRF: `[ValidateAntiForgeryToken]` em forms com cookie auth.

## Python (FastAPI / Django / Flask)

- Validação: Pydantic (FastAPI) ou Django forms — sempre no servidor.
- SQL: ORM ou parâmetros (`cursor.execute("... WHERE id = %s", [id])`); nunca f-string em SQL.
- Nunca `pickle.loads` / `yaml.load` (usar `yaml.safe_load`) em dados externos.
- Templates: autoescape ligado (Jinja2 no FastAPI: conferir); `| safe` só com conteúdo sanitizado.
- Django: `DEBUG = False` em prod, `ALLOWED_HOSTS` definido, `SECRET_KEY` de env.
- FastAPI: docs (`/docs`, `/redoc`) protegidas ou desligadas em produção se a API for privada.
- Subprocess: `subprocess.run([...], shell=False)` — nunca `shell=True` com input do usuário.

## Docker

```dockerfile
# Base específica e enxuta (menos CVEs que :latest cheio)
FROM node:22-alpine

# Usuário não-root
RUN addgroup -S app && adduser -S app -G app
USER app

WORKDIR /app
COPY --chown=app:app package*.json ./
RUN npm ci --omit=dev
COPY --chown=app:app . .

CMD ["node", "server.js"]
```

Checklist:
- [ ] `.dockerignore` com `.env`, `.git`, `node_modules` — senão o segredo entra na imagem.
- [ ] Nenhum `ARG`/`ENV` com segredo no Dockerfile (fica gravado nas layers; `docker history` revela). Segredos só em runtime (env do orquestrador) ou BuildKit secrets.
- [ ] Multi-stage build: artefatos de build não vão para a imagem final.
- [ ] Scan da imagem: `docker scout cves <img>` ou `trivy image <img>`.
- [ ] Container roda sem `--privileged`; portas expostas mínimas; read-only filesystem quando possível.

## VPS / servidor próprio

Hardening mínimo ao subir uma VPS (Hetzner, DigitalOcean, Contabo etc.):

```bash
# 1. Usuário próprio + SSH por chave, desabilitar senha e root
adduser deploy && usermod -aG sudo deploy
# copiar chave: ssh-copy-id deploy@ip
# /etc/ssh/sshd_config:
#   PermitRootLogin no
#   PasswordAuthentication no
systemctl restart ssh

# 2. Firewall — só o necessário
ufw default deny incoming
ufw allow OpenSSH
ufw allow 80/tcp && ufw allow 443/tcp
ufw enable

# 3. Fail2ban (brute force SSH)
apt install fail2ban -y

# 4. Updates de segurança automáticos
apt install unattended-upgrades -y
dpkg-reconfigure -plow unattended-upgrades
```

- App atrás de reverse proxy (nginx/Caddy) com TLS (Caddy faz Let's Encrypt automático); app nunca exposto direto na porta.
- Banco NUNCA com porta pública (bind em localhost ou rede privada; acesso remoto via túnel SSH).
- App roda como usuário sem privilégio (systemd `User=app`), não root.
- Logs com rotação (`logrotate`); monitorar disco cheio (derruba o serviço).

## Buckets e storage de arquivos

- S3/Blob/Supabase Storage: **privado por padrão**; público só para assets realmente públicos.
- Acesso a arquivos privados via URL assinada com expiração curta (minutos), gerada no servidor após verificar permissão do usuário sobre AQUELE arquivo.
- Nunca montar a autorização no nome do arquivo "difícil de adivinhar" — enumeração acontece.

```ts
// Supabase: URL assinada após check de posse
const doc = await db.documento.findFirst({ where: { id, tenantId: user.tenantId } });
if (!doc) return new Response("Not found", { status: 404 });
const { data } = await supabaseAdmin.storage.from("docs")
  .createSignedUrl(doc.path, 60); // 60s
```
