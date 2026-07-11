/**
 * Teste de integração de RLS (critério do M1, doc 8 §8.7):
 * prova, contra o banco real de desenvolvimento, que um usuário
 * autenticado NÃO lê o profile de outro usuário.
 *
 * Requer .env.local preenchido; é pulado automaticamente sem ele.
 * Cria dois usuários descartáveis via admin API e os remove ao final.
 */
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasEnv = Boolean(url && anonKey && serviceKey);

describe.skipIf(!hasEnv)("RLS · profiles", () => {
  const admin = createClient(url ?? "", serviceKey ?? "", {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const suffix = Date.now();
  const password = `rls-test-${suffix}-Aa1!`;
  let userAId = "";
  let userBId = "";

  beforeAll(async () => {
    const [a, b] = await Promise.all([
      admin.auth.admin.createUser({
        email: `rls-a-${suffix}@teste.mapeamento.local`,
        password,
        email_confirm: true,
        user_metadata: { display_name: "Usuário A" },
      }),
      admin.auth.admin.createUser({
        email: `rls-b-${suffix}@teste.mapeamento.local`,
        password,
        email_confirm: true,
        user_metadata: { display_name: "Usuário B" },
      }),
    ]);
    if (a.error || !a.data.user) throw a.error ?? new Error("createUser A");
    if (b.error || !b.data.user) throw b.error ?? new Error("createUser B");
    userAId = a.data.user.id;
    userBId = b.data.user.id;
  });

  afterAll(async () => {
    await Promise.all(
      [userAId, userBId]
        .filter(Boolean)
        .map((id) => admin.auth.admin.deleteUser(id)),
    );
  });

  async function signedInClient(email: string) {
    const client = createClient(url ?? "", anonKey ?? "", {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error } = await client.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return client;
  }

  it("trigger cria o profile automaticamente no signup", async () => {
    const { data, error } = await admin
      .from("profiles")
      .select("id, display_name")
      .eq("id", userAId)
      .single();
    expect(error).toBeNull();
    expect(data?.display_name).toBe("Usuário A");
  });

  it("usuário lê o próprio profile", async () => {
    const clientA = await signedInClient(
      `rls-a-${suffix}@teste.mapeamento.local`,
    );
    const { data, error } = await clientA
      .from("profiles")
      .select("id")
      .eq("id", userAId)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data?.id).toBe(userAId);
  });

  it("usuário A NÃO lê o profile do usuário B", async () => {
    const clientA = await signedInClient(
      `rls-a-${suffix}@teste.mapeamento.local`,
    );
    const { data, error } = await clientA
      .from("profiles")
      .select("id")
      .eq("id", userBId)
      .maybeSingle();
    // RLS não gera erro: simplesmente filtra a linha para fora.
    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it("usuário A NÃO altera o profile do usuário B", async () => {
    const clientA = await signedInClient(
      `rls-a-${suffix}@teste.mapeamento.local`,
    );
    await clientA
      .from("profiles")
      .update({ display_name: "hackeado" })
      .eq("id", userBId);

    const { data } = await admin
      .from("profiles")
      .select("display_name")
      .eq("id", userBId)
      .single();
    expect(data?.display_name).toBe("Usuário B");
  });

  it("anônimo não lê profile algum", async () => {
    const anon = createClient(url ?? "", anonKey ?? "", {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data } = await anon.from("profiles").select("id");
    expect(data ?? []).toHaveLength(0);
  });
});
