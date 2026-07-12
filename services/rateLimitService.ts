import { createAdminClient } from "@/lib/supabase/admin";

export class RateLimitedError extends Error {
  constructor() {
    super("Muitas requisições — aguarde um instante e tente de novo.");
    this.name = "RateLimitedError";
  }
}

/**
 * Rate limit persistente (doc 8 §8.2). Janela fixa por chave.
 * Lança RateLimitedError quando o limite da janela é excedido.
 * Fail-open: se a checagem falhar (banco fora), a requisição passa —
 * disponibilidade acima de proteção neste produto.
 */
export async function enforceRateLimit(
  key: string,
  max: number,
  windowSeconds: number,
): Promise<void> {
  try {
    const { data, error } = await createAdminClient().rpc(
      "check_rate_limit",
      {
        p_key: key,
        p_max: max,
        p_window_seconds: windowSeconds,
      },
    );
    if (error) {
      console.error("[rate-limit]", error.message);
      return;
    }
    if (data === false) throw new RateLimitedError();
  } catch (error) {
    if (error instanceof RateLimitedError) throw error;
    console.error("[rate-limit]", error);
  }
}
