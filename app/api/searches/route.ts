import { NextResponse } from "next/server";
import { inngest, searchRunEvent } from "@/lib/inngest/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  createSearch,
  createSearchSchema,
  InvalidChannelInputError,
  PlanLimitError,
} from "@/services/searchService";

/**
 * POST /api/searches — cria uma pesquisa e dispara o pipeline.
 * Camadas (doc 4 §4.3): rota valida (Zod) e orquestra; regra de
 * negócio no service; resposta 202 + id para a UI navegar.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = createSearchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  try {
    const { searchId } = await createSearch(supabase, user.id, parsed.data);
    await inngest.send(
      searchRunEvent.create({ searchId, priority: 2 }),
    );
    // Instrumentação do funil (doc 1 §1.7)
    await createAdminClient().from("product_events").insert({
      user_id: user.id,
      name: "search_created",
      properties: { mode: parsed.data.mode, search_id: searchId },
    });
    return NextResponse.json({ id: searchId }, { status: 202 });
  } catch (error) {
    if (error instanceof PlanLimitError) {
      return NextResponse.json(
        { error: error.message, limit: error.kind },
        { status: 429 },
      );
    }
    if (error instanceof InvalidChannelInputError) {
      return NextResponse.json(
        {
          error:
            "Algumas entradas não são canais válidos (use URL, @handle ou ID). " +
            "Busca por nome chega em breve.",
          invalid: error.invalid,
        },
        { status: 422 },
      );
    }
    console.error("[POST /api/searches]", error);
    return NextResponse.json(
      { error: "Erro ao criar a pesquisa. Tente novamente." },
      { status: 500 },
    );
  }
}
