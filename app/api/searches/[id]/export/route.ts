import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getPlanLimits } from "@/services/planService";
import { BRAND } from "@/lib/brand";
import { buildCsv } from "@/utils/csv";

/** Score mínimo de oportunidade — mesmo corte da tela de resultados. */
const MIN_OPPORTUNITY_SCORE = 3;

/**
 * GET /api/searches/[id]/export — CSV das oportunidades da pesquisa.
 * Gate por plano (export=true, doc 7 §7.2) e carimbo de origem
 * (doc 7 §7.6: distribuição passiva via relatórios).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const limits = await getPlanLimits(supabase);
  if (!limits.export) {
    return NextResponse.json(
      {
        error:
          "Exportação disponível nos planos Criador e Pro. Veja /app/conta.",
      },
      { status: 403 },
    );
  }

  // RLS: só o dono enxerga a pesquisa
  const { data: search } = await supabase
    .from("searches")
    .select("id, input")
    .eq("id", id)
    .maybeSingle();
  if (!search) {
    return NextResponse.json({ error: "Não encontrada." }, { status: 404 });
  }

  const { data: results } = await supabase
    .from("search_results")
    .select("channel_id")
    .eq("search_id", id)
    .eq("status", "ready");
  const channelIds = (results ?? []).map((r) => r.channel_id);
  if (channelIds.length === 0) {
    return NextResponse.json(
      { error: "Pesquisa sem resultados prontos." },
      { status: 422 },
    );
  }

  const db = createAdminClient();
  const [{ data: videos }, { data: channels }] = await Promise.all([
    db
      .from("videos")
      .select(
        "youtube_id, channel_id, title, is_short, duration_seconds, published_at, view_count, score, baseline_views",
      )
      .in("channel_id", channelIds)
      .gte("score", MIN_OPPORTUNITY_SCORE)
      .order("score", { ascending: false })
      .limit(500),
    db
      .from("channels")
      .select("youtube_id, title, subscriber_count")
      .in("youtube_id", channelIds),
  ]);
  const channelById = new Map((channels ?? []).map((c) => [c.youtube_id, c]));

  const csv = buildCsv(
    [
      "canal",
      "inscritos",
      "titulo",
      "formato",
      "duracao_segundos",
      "publicado_em",
      "views",
      "score",
      "mediana_do_canal",
      "url",
    ],
    (videos ?? []).map((video) => {
      const channel = channelById.get(video.channel_id);
      return [
        channel?.title ?? "",
        channel?.subscriber_count ?? null,
        video.title,
        video.is_short ? "short" : "longo",
        video.duration_seconds,
        video.published_at?.slice(0, 10) ?? "",
        video.view_count,
        String(Number(video.score)).replace(".", ","),
        video.baseline_views,
        `https://www.youtube.com/watch?v=${video.youtube_id}`,
      ];
    }),
    [
      `Gerado por ${BRAND.name} — ${process.env.NEXT_PUBLIC_APP_URL ?? ""}`,
    ],
  );

  // Sinal do funil: oportunidade acionada (doc 1 §1.7)
  await db.from("product_events").insert({
    user_id: user.id,
    name: "search_exported",
    properties: { search_id: id },
  });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="mapeamento-${id.slice(0, 8)}.csv"`,
    },
  });
}
