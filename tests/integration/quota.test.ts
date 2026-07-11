/**
 * Integração · orçamento de cota (doc 3 §3.4).
 * Consome poucas unidades fictícias do ledger real de dev (operação
 * "integration.test") — volume desprezível frente às 10.000/dia.
 */
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasEnv = Boolean(url && anonKey && serviceKey);

describe.skipIf(!hasEnv)("quota · reserve_quota", () => {
  const admin = createClient(url ?? "", serviceKey ?? "", {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  it("service role reserva unidades com sucesso", async () => {
    const { data, error } = await admin.rpc("reserve_quota", {
      p_units: 1,
      p_priority: 4,
      p_operation: "integration.test",
    });
    expect(error).toBeNull();
    expect(data).toBe(true);
  });

  it("rejeita parâmetros inválidos", async () => {
    const zero = await admin.rpc("reserve_quota", {
      p_units: 0,
      p_priority: 4,
      p_operation: "integration.test",
    });
    expect(zero.data).toBe(false);

    const badPriority = await admin.rpc("reserve_quota", {
      p_units: 1,
      p_priority: 9,
      p_operation: "integration.test",
    });
    expect(badPriority.data).toBe(false);
  });

  it("anon NÃO executa reserve_quota (revoke aplicado)", async () => {
    const anon = createClient(url ?? "", anonKey ?? "", {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error } = await anon.rpc("reserve_quota", {
      p_units: 1,
      p_priority: 4,
      p_operation: "hack",
    });
    expect(error).not.toBeNull();
  });

  it("anon NÃO lê o quota_ledger (RLS sem policies)", async () => {
    const anon = createClient(url ?? "", anonKey ?? "", {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data } = await anon.from("quota_ledger").select("id").limit(1);
    expect(data ?? []).toHaveLength(0);
  });

  it("anon NÃO escreve no corpus (channels)", async () => {
    const anon = createClient(url ?? "", anonKey ?? "", {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error } = await anon.from("channels").insert({
      youtube_id: "UC_fake_integration_test00",
      title: "não deveria entrar",
    });
    expect(error).not.toBeNull();
  });
});
