import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { parseChannelInput } from "@/utils/youtube";
import { normalizeKeyword } from "./keywordService";
import { getPlanLimits } from "./planService";

/** Teto absoluto do schema; o limite efetivo vem do plano (ADR-006). */
export const BETA_MAX_CHANNELS_PER_SEARCH = 20;

export const createSearchSchema = z.union([
  z.object({
    mode: z.literal("channels"),
    inputs: z
      .array(z.string().trim().min(2, "Entrada muito curta."))
      .min(1, "Informe pelo menos um canal.")
      .max(
        BETA_MAX_CHANNELS_PER_SEARCH,
        `Máximo de ${BETA_MAX_CHANNELS_PER_SEARCH} canais por pesquisa.`,
      ),
  }),
  z.object({
    mode: z.literal("keyword"),
    keyword: z
      .string()
      .trim()
      .min(2, "Palavra-chave muito curta.")
      .max(80, "Palavra-chave muito longa."),
  }),
  z.object({
    mode: z.literal("niche"),
    nicheSlug: z.string().trim().min(2),
  }),
]);

export type CreateSearchInput = z.infer<typeof createSearchSchema>;

export class InvalidChannelInputError extends Error {
  constructor(public readonly invalid: string[]) {
    super(`Entradas inválidas: ${invalid.join(", ")}`);
    this.name = "InvalidChannelInputError";
  }
}

export class PlanLimitError extends Error {
  constructor(
    public readonly kind: "searches" | "channels",
    message: string,
  ) {
    super(message);
    this.name = "PlanLimitError";
  }
}

/**
 * Cria a pesquisa em nome do usuário (cliente com RLS — o insert só
 * passa se user_id = auth.uid()). O disparo do pipeline é do caller.
 */
export async function createSearch(
  supabase: SupabaseClient,
  userId: string,
  input: CreateSearchInput,
): Promise<{ searchId: string }> {
  const limits = await getPlanLimits(supabase);

  let row: {
    type: string;
    input: Record<string, unknown>;
    channels_total: number;
  };

  if (input.mode === "channels") {
    const invalid: string[] = [];
    const normalized: string[] = [];
    for (const raw of input.inputs) {
      const parsed = parseChannelInput(raw);
      if (!parsed || parsed.kind === "name") invalid.push(raw);
      else normalized.push(raw.trim());
    }
    if (invalid.length > 0) throw new InvalidChannelInputError(invalid);

    const unique = [...new Set(normalized)];
    if (unique.length > limits.channels_per_search) {
      throw new PlanLimitError(
        "channels",
        `Seu plano permite ${limits.channels_per_search} canais por pesquisa.`,
      );
    }
    row = {
      type: unique.length === 1 ? "channel" : "channel_list",
      input: { channels: unique },
      channels_total: unique.length,
    };
  } else if (input.mode === "keyword") {
    row = {
      type: "keyword",
      input: { keyword: normalizeKeyword(input.keyword) },
      channels_total: 0, // definido pelo pipeline após o search.list
    };
  } else {
    // Valida o nicho e captura o nome para exibição no histórico
    const { data: niche } = await supabase
      .from("niches")
      .select("slug, name")
      .eq("slug", input.nicheSlug)
      .maybeSingle();
    if (!niche) throw new Error(`Nicho não encontrado: ${input.nicheSlug}`);
    row = {
      type: "niche",
      input: { nicheSlug: niche.slug, nicheName: niche.name },
      channels_total: 0,
    };
  }

  // Consumo transacional do crédito (ADR-006): imune a corrida —
  // N requisições paralelas consomem no máximo o limite do plano.
  const { data: remaining, error: consumeError } = await supabase.rpc(
    "try_consume_search",
  );
  if (consumeError) {
    throw new Error(`try_consume_search: ${consumeError.message}`);
  }
  if (remaining === -1) {
    throw new PlanLimitError(
      "searches",
      "Você usou todas as pesquisas do seu plano neste mês.",
    );
  }

  const { data, error } = await supabase
    .from("searches")
    .insert({ user_id: userId, ...row })
    .select("id")
    .single();
  if (error) throw new Error(`searches.insert: ${error.message}`);

  return { searchId: data.id };
}
