# Banco de Dados — SQL Injection, RLS, Connection Strings

## SQL Injection

### Detecção

```bash
# Raw SQL perigoso
grep -rn "\$queryRawUnsafe\|\$executeRawUnsafe\|sql.unsafe\|query(\`\|query(\"" --include="*.ts" . | grep -v node_modules

# Concatenação suspeita em strings SQL
grep -rnE "(SELECT|INSERT|UPDATE|DELETE).*(\$\{|\" ?\+)" --include="*.ts" . | grep -v node_modules
```

### Correção

```ts
// ERRADO — injeção direta
await prisma.$queryRawUnsafe(`SELECT * FROM users WHERE email = '${email}'`);

// CERTO — Prisma tagged template (parametrizado automaticamente)
await prisma.$queryRaw`SELECT * FROM users WHERE email = ${email}`;

// MELHOR — API do ORM
await prisma.user.findUnique({ where: { email } });

// pg puro
await pool.query("SELECT * FROM users WHERE email = $1", [email]);
```

Regra: `$queryRawUnsafe` só é aceitável com strings 100% estáticas ou identificadores validados contra allowlist (nomes de coluna para ORDER BY, por exemplo):

```ts
const SORT_COLS = new Set(["created_at", "price", "name"]);
if (!SORT_COLS.has(sort)) sort = "created_at";
```

## Connection string

- Deve estar em `DATABASE_URL` (sem `NEXT_PUBLIC_`), com `sslmode=require` (Postgres) ou TLS equivalente.
- Nunca logar a connection string; cuidado com `console.log(process.env)`.
- Em serverless (Vercel), usar pooler (PgBouncer / Supabase pooler / Prisma Accelerate / Neon) para não esgotar conexões — esgotamento de pool é vetor de negação de serviço.

## Supabase — RLS é obrigatório

A `anon key` do Supabase é pública por design (vai no bundle). Sem RLS, qualquer pessoa com a anon key lê e escreve **todas as tabelas** via API REST.

### Verificar

```sql
-- Tabelas sem RLS no schema public
select tablename from pg_tables
where schemaname = 'public'
and tablename not in (
  select tablename from pg_tables t
  join pg_class c on c.relname = t.tablename
  where c.relrowsecurity
);
```
Ou no dashboard: Database → Tables → coluna RLS.

### Corrigir

```sql
alter table public.pedidos enable row level security;

create policy "usuario le seus pedidos"
on public.pedidos for select
using (auth.uid() = user_id);

create policy "usuario cria seus pedidos"
on public.pedidos for insert
with check (auth.uid() = user_id);
```

- `service_role key`: só no servidor, nunca no cliente — ela ignora RLS.
- Testar as policies com um segundo usuário de teste, não só com o dono dos dados.

## Privilégio mínimo

```sql
-- Usuário da aplicação não precisa de DDL
create user app_user with password '...';
grant select, insert, update, delete on all tables in schema public to app_user;
-- NÃO conceder: drop, alter, create, superuser
```

## Dados sensíveis e LGPD

Relevante para dados de saúde (laboratório) e dados pessoais em geral:

- CPF, resultados de exames, dados de saúde = **dados sensíveis pela LGPD** — exigem base legal e proteção reforçada.
- Criptografar em repouso (a maioria dos provedores gerenciados já faz) e, para campos muito sensíveis, criptografia em nível de coluna (pgcrypto ou na aplicação).
- Minimizar: não armazenar o que não precisa; mascarar em telas e logs (`***.456.789-**`).
- Log de acesso a dados sensíveis: quem consultou o quê e quando.
- Retenção definida: dado que expirou deve ser apagado ou anonimizado.

## Backups

- Confirmar que backup automático está ativo no provedor (Supabase/Neon/RDS).
- **Testar a restauração** pelo menos uma vez em ambiente separado — backup não testado não é backup.
- Point-in-time recovery para dados críticos.
