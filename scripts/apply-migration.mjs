/**
 * Aplica uma migration diretamente via Postgres, registrando-a em
 * supabase_migrations.schema_migrations (mesmo controle do CLI).
 * Fallback para quando o binário do Supabase CLI está indisponível
 * (ex.: bloqueio do Windows App Control).
 *
 * Uso: node scripts/apply-migration.mjs <arquivo.sql> <ENV_DA_URL>
 * Ex.: node scripts/apply-migration.mjs supabase/migrations/20260712000001_plans.sql SUPABASE_DB_URL
 */
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local" });

const [file, envName = "SUPABASE_DB_URL"] = process.argv.slice(2);
if (!file) {
  console.error("Informe o arquivo da migration.");
  process.exit(1);
}

const connectionString = process.env[envName];
if (!connectionString) {
  console.error(`Variável ${envName} não encontrada no .env.local.`);
  process.exit(1);
}

const sql = readFileSync(file, "utf8");
const name = basename(file, ".sql");
const version = name.split("_")[0];

const client = new pg.Client({ connectionString });
await client.connect();

try {
  const { rows } = await client.query(
    "select 1 from supabase_migrations.schema_migrations where version = $1",
    [version],
  );
  if (rows.length > 0) {
    console.log(`Migration ${version} já aplicada — nada a fazer.`);
    process.exit(0);
  }

  await client.query("begin");
  await client.query(sql);
  await client.query(
    "insert into supabase_migrations.schema_migrations (version, name, statements) values ($1, $2, $3)",
    [version, name, [sql]],
  );
  await client.query("commit");
  console.log(`Migration ${name} aplicada e registrada em ${envName}.`);
} catch (error) {
  await client.query("rollback");
  console.error("Falha (rollback executado):", error.message);
  process.exit(1);
} finally {
  await client.end();
}
