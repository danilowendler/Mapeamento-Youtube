/**
 * Cria (idempotente) os produtos e preços dos planos no Stripe e
 * grava os stripe_price_id na tabela plans do banco indicado.
 *
 * Uso: node scripts/setup-stripe-products.mjs [SUPABASE_DB_URL|SUPABASE_PROD_DB_URL]
 * (padrão: SUPABASE_DB_URL — banco de desenvolvimento)
 *
 * Idempotência via price lookup_key: rodar duas vezes não duplica.
 */
import { config } from "dotenv";
import pg from "pg";
import Stripe from "stripe";

config({ path: ".env.local" });

const envName = process.argv[2] ?? "SUPABASE_DB_URL";
const connectionString = process.env[envName];
if (!connectionString) {
  console.error(`Variável ${envName} ausente no .env.local.`);
  process.exit(1);
}
if (!process.env.STRIPE_SECRET_KEY) {
  console.error("STRIPE_SECRET_KEY ausente no .env.local.");
  process.exit(1);
}

const PLANS = [
  {
    code: "criador",
    productName: "Sinal · Criador",
    lookupKey: "criador_mensal",
    amount: 4900,
  },
  {
    code: "pro",
    productName: "Sinal · Pro",
    lookupKey: "pro_mensal",
    amount: 9900,
  },
];

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const db = new pg.Client({ connectionString });
await db.connect();

for (const plan of PLANS) {
  // Preço já existe? (lookup_key é único por conta)
  const existing = await stripe.prices.list({
    lookup_keys: [plan.lookupKey],
    limit: 1,
  });

  let priceId;
  if (existing.data.length > 0) {
    priceId = existing.data[0].id;
    console.log(`${plan.code}: preço já existe (${priceId})`);
  } else {
    const product = await stripe.products.create({
      name: plan.productName,
      metadata: { plan_code: plan.code },
    });
    const price = await stripe.prices.create({
      product: product.id,
      currency: "brl",
      unit_amount: plan.amount,
      recurring: { interval: "month" },
      lookup_key: plan.lookupKey,
      metadata: { plan_code: plan.code },
    });
    priceId = price.id;
    console.log(`${plan.code}: produto + preço criados (${priceId})`);
  }

  const { rowCount } = await db.query(
    "update public.plans set stripe_price_id = $1 where code = $2",
    [priceId, plan.code],
  );
  console.log(
    `${plan.code}: stripe_price_id gravado em ${envName} (${rowCount} linha)`,
  );
}

await db.end();
console.log("Concluído.");
