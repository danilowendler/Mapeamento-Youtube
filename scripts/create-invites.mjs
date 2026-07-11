/**
 * Gera códigos de convite do beta fechado.
 * Uso: node scripts/create-invites.mjs [quantidade] [nota]
 * Ex.: node scripts/create-invites.mjs 10 "primeira leva"
 */
import { randomBytes } from "node:crypto";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const count = Number(process.argv[2] ?? 5);
const note = process.argv[3] ?? null;

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const codes = Array.from({ length: count }, () => ({
  code: `mi-${randomBytes(4).toString("hex")}`,
  note,
}));

const { error } = await db.from("beta_invites").insert(codes);
if (error) {
  console.error("Erro:", error.message);
  process.exit(1);
}

console.log(`${count} convites criados:\n`);
for (const { code } of codes) console.log(`  ${code}`);
