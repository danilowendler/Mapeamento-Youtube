# SaaS — Multi-tenancy, Billing e Lógica de Negócio

## Multi-tenancy: isolamento de tenant

O vazamento cross-tenant é a vulnerabilidade mais grave de um SaaS B2B — um cliente vendo dados de outro geralmente encerra o contrato e pode gerar obrigação de notificação (LGPD).

### O padrão: tenant_id derivado da sessão, nunca do request

```ts
// ERRADO — tenant vem do cliente (header, body ou query)
const tenantId = req.headers.get("x-tenant-id");
const dados = await db.projeto.findMany({ where: { tenantId } });

// CERTO — tenant vem da sessão validada no servidor
const { user } = await requireUser();
const dados = await db.projeto.findMany({
  where: { tenantId: user.tenantId },
});
```

### Centralizar o filtro (evita esquecer em uma query)

Prisma — client extension que injeta o filtro em todo model tenant-scoped:

```ts
// lib/db-tenant.ts
import "server-only";

const TENANT_MODELS = new Set(["Projeto", "Documento", "Membro", "Fatura"]);

export function tenantDb(tenantId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (TENANT_MODELS.has(model ?? "")) {
            if ("where" in args) args.where = { ...args.where, tenantId };
            if ("data" in args && operation === "create") {
              (args.data as any).tenantId = tenantId;
            }
          }
          return query(args);
        },
      },
    },
  });
}
```

Alternativa em Postgres: RLS com `set_config('app.tenant_id', ...)` por request — o banco garante o isolamento mesmo se o código esquecer.

### Auditoria de isolamento

```bash
# Queries em modelos multi-tenant sem filtro de tenant (revisar manualmente cada hit)
grep -rn "findMany\|findFirst\|findUnique\|updateMany\|deleteMany" --include="*.ts" src/ | grep -v "tenantId" | grep -v node_modules
```

Teste obrigatório: criar Tenant A e Tenant B, logar como B e tentar acessar por ID direto todos os recursos de A (URLs, APIs, downloads, exports). Tudo deve retornar 404/403.

### Convites e membros

- Convite só pode ser criado para o tenant do convidador (verificar no servidor).
- Token de convite: uso único, expira, vinculado ao e-mail convidado.
- Ao remover membro: revogar sessões ativas dele, não só tirar do banco.
- Troca de tenant ativo (workspace switcher): revalidar role no novo tenant, nunca carregar o role antigo.

## Billing e pagamentos

### Preço nunca vem do cliente

```ts
// ERRADO
const { priceId, amount } = await req.json();
await stripe.paymentIntents.create({ amount }); // cliente escolhe quanto paga

// CERTO — catálogo no servidor
const PLANOS = { basic: "price_abc", pro: "price_def" } as const;
const { plano } = schema.parse(await req.json()); // plano ∈ chaves de PLANOS
const session = await stripe.checkout.sessions.create({
  line_items: [{ price: PLANOS[plano], quantity: 1 }],
  // ...
});
```

### Webhook de pagamento: assinatura + idempotência

```ts
export async function POST(req: Request) {
  const body = await req.text();
  const event = stripe.webhooks.constructEvent(
    body, req.headers.get("stripe-signature")!, process.env.STRIPE_WEBHOOK_SECRET!
  ); // lança se assinatura inválida

  // Idempotência: evento duplicado não processa duas vezes
  const jaProcessado = await db.webhookEvent.findUnique({ where: { id: event.id } });
  if (jaProcessado) return new Response("ok");
  await db.webhookEvent.create({ data: { id: event.id, type: event.type } });

  // processar...
}
```

### Estado da assinatura

- Verificar `status === "active" || "trialing"` **no servidor, a cada uso de recurso pago** — não só no login (assinatura pode ser cancelada com sessão aberta).
- Fonte da verdade: o provedor de pagamento via webhook, espelhado no banco; nunca uma flag que o cliente consiga alterar.
- Cancelamento/downgrade: job que revoga o acesso na data efetiva; testar.

## Lógica de negócio (o que scanner nenhum pega)

### Race conditions em recursos finitos (cupom, saldo, estoque, seats)

```ts
// ERRADO — check-then-act: duas requisições simultâneas passam no if
const cupom = await db.cupom.findUnique({ where: { codigo } });
if (cupom.usos < cupom.limite) {
  await db.cupom.update({ where: { codigo }, data: { usos: { increment: 1 } } });
}

// CERTO — operação atômica condicional
const res = await db.cupom.updateMany({
  where: { codigo, usos: { lt: cupom.limite } },
  data: { usos: { increment: 1 } },
});
if (res.count === 0) throw new Error("Cupom esgotado");
```

Mesmo padrão para débito de saldo/créditos: `updateMany({ where: { id, saldo: { gte: valor } }, data: { saldo: { decrement: valor } } })`.

### Checklist de lógica de negócio

- [ ] Quantidades/valores negativos rejeitados no servidor (`quantity: -5` gerando crédito).
- [ ] Totais recalculados no servidor no checkout — nunca aceitar `total` do carrinho do cliente.
- [ ] Cupom: limite por uso, por usuário, validade, não empilhável (a menos que intencional) — tudo validado atomicamente.
- [ ] Trial: detectar reuso (e-mail com alias `+`, mesmo cartão, mesmo device) se abuso for relevante ao negócio.
- [ ] Fluxos multi-etapa não puláveis (ex.: ir direto à etapa "confirmado" sem pagar) — validar estado no servidor a cada etapa.
- [ ] Ações sensíveis idempotentes ou com proteção de replay (duplo clique em "transferir" não transfere duas vezes).
- [ ] Limites de plano (nº de projetos, usuários, storage) impostos no servidor.

## Rate limiting por tenant

Além do rate limit por IP/usuário (ver deploy-e-dependencias.md), em SaaS limitar por tenant nos recursos caros — um cliente abusando não pode degradar os demais:

```ts
const { success } = await limiter.limit(`tenant:${user.tenantId}:export`);
```
