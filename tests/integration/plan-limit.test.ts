/**
 * Integração · limite de pesquisas transacional (ADR-006, DoD do
 * estágio B): disparos PARALELOS não podem estourar o limite do
 * plano. Usa o banco de dev; cria e remove um usuário descartável.
 */
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasEnv = Boolean(url && anonKey && serviceKey);

describe.skipIf(!hasEnv)("plano · try_consume_search (corrida)", () => {
  const admin = createClient(url ?? "", serviceKey ?? "", {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const email = `limit-${Date.now()}@teste.mapeamento.local`;
  const password = `limit-${Date.now()}-Aa1!`;
  let userId = "";
  let freeLimit = 0;

  beforeAll(async () => {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data.user) throw error ?? new Error("createUser");
    userId = data.user.id;

    const { data: plan } = await admin
      .from("plans")
      .select("limits")
      .eq("code", "free")
      .single();
    freeLimit = (plan?.limits as { searches_per_month: number })
      .searches_per_month;
  });

  afterAll(async () => {
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it("N chamadas paralelas consomem no máximo o limite", async () => {
    const client = createClient(url ?? "", anonKey ?? "", {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: signInError } = await client.auth.signInWithPassword({
      email,
      password,
    });
    expect(signInError).toBeNull();

    // 2× o limite, tudo em paralelo — a corrida de verdade
    const attempts = freeLimit * 2;
    const results = await Promise.all(
      Array.from({ length: attempts }, () =>
        client.rpc("try_consume_search"),
      ),
    );

    const granted = results.filter((r) => r.data !== -1 && r.error === null);
    const denied = results.filter((r) => r.data === -1);

    expect(granted).toHaveLength(freeLimit);
    expect(denied).toHaveLength(attempts - freeLimit);

    // O contador persistido bate exatamente com o limite
    const { data: usage } = await admin
      .from("usage_periods")
      .select("searches_used")
      .eq("user_id", userId)
      .single();
    expect(usage?.searches_used).toBe(freeLimit);
  });

  it("anon não executa try_consume_search", async () => {
    const anon = createClient(url ?? "", anonKey ?? "", {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await anon.rpc("try_consume_search");
    // Execute revogado do role anon → PostgREST recusa a chamada
    // (e mesmo se executasse, auth.uid() nulo retornaria -1)
    expect(error !== null || data === -1).toBe(true);
  });
});
