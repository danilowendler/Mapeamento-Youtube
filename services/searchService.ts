import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { parseChannelInput } from "@/utils/youtube";

/**
 * Limite fixo do beta fechado (estágio C). No M6/M7 este valor passa
 * a vir de plans.limits com contagem transacional em usage_periods
 * (ADR-006) — o TODO está registrado no plano (doc 09).
 */
export const BETA_MAX_CHANNELS_PER_SEARCH = 20;

export const createSearchSchema = z.object({
  inputs: z
    .array(z.string().trim().min(2, "Entrada muito curta."))
    .min(1, "Informe pelo menos um canal.")
    .max(
      BETA_MAX_CHANNELS_PER_SEARCH,
      `Máximo de ${BETA_MAX_CHANNELS_PER_SEARCH} canais por pesquisa no beta.`,
    ),
});

export type CreateSearchInput = z.infer<typeof createSearchSchema>;

export class InvalidChannelInputError extends Error {
  constructor(public readonly invalid: string[]) {
    super(`Entradas inválidas: ${invalid.join(", ")}`);
    this.name = "InvalidChannelInputError";
  }
}

/**
 * Cria a pesquisa em nome do usuário (cliente com RLS — o insert só
 * passa se user_id = auth.uid()). O disparo do pipeline é feito pelo
 * caller (rota), que tem acesso ao cliente Inngest.
 */
export async function createSearch(
  supabase: SupabaseClient,
  userId: string,
  input: CreateSearchInput,
): Promise<{ searchId: string; inputs: string[] }> {
  // Valida cada entrada; nomes livres ainda não são suportados (M5)
  const invalid: string[] = [];
  const normalized: string[] = [];
  for (const raw of input.inputs) {
    const parsed = parseChannelInput(raw);
    if (!parsed || parsed.kind === "name") {
      invalid.push(raw);
    } else {
      normalized.push(raw.trim());
    }
  }
  if (invalid.length > 0) throw new InvalidChannelInputError(invalid);

  const unique = [...new Set(normalized)];

  const { data, error } = await supabase
    .from("searches")
    .insert({
      user_id: userId,
      type: unique.length === 1 ? "channel" : "channel_list",
      input: { channels: unique },
      channels_total: unique.length,
    })
    .select("id")
    .single();
  if (error) throw new Error(`searches.insert: ${error.message}`);

  return { searchId: data.id, inputs: unique };
}
