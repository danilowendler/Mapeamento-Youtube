import Link from "next/link";
import { CategoryHeader } from "@/features/pauta/CategoryHeader";
import { MoveCategorySelect } from "@/features/pauta/MoveCategorySelect";
import { NewCategoryForm } from "@/features/pauta/NewCategoryForm";
import { VideoCard } from "@/features/results/VideoCard";
import type { OpportunityCard } from "@/features/results/types";
import { createClient } from "@/lib/supabase/server";
import { getPlanLimits } from "@/services/planService";

export const metadata = { title: "Minha Pauta" };

export default async function PautaPage() {
  const supabase = await createClient();
  const limits = await getPlanLimits(supabase);

  if (!limits.favorites) {
    return (
      <div className="mx-auto flex max-w-[720px] flex-col gap-sm pt-xl">
        <h1 className="text-display-lg text-ink">Minha Pauta</h1>
        <div className="flex flex-col gap-xs border border-hairline p-sm">
          <p className="text-body-md text-body">
            Salve as melhores oportunidades e monte a pauta dos seus próximos
            vídeos — disponível nos planos Criador e Pro.
          </p>
          <Link
            href="/app/conta#planos"
            className="inline-flex h-[48px] w-fit items-center bg-primary px-md text-button-label uppercase text-on-primary active:bg-primary-active"
          >
            Ver planos
          </Link>
        </div>
      </div>
    );
  }

  const [{ data: categories }, { data: favorites }] = await Promise.all([
    supabase
      .from("pauta_categories")
      .select("id, name, position")
      .order("position")
      .order("created_at"),
    supabase
      .from("favorites")
      .select("video_id, search_id, category_id, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  let cards: (OpportunityCard & { categoryId: string | null })[] = [];
  if (favorites && favorites.length > 0) {
    const videoIds = favorites.map((f) => f.video_id);
    const { data: videos } = await supabase
      .from("videos")
      .select(
        "youtube_id, channel_id, title, thumbnail_url, is_short, duration_seconds, published_at, view_count, score, baseline_views",
      )
      .in("youtube_id", videoIds);
    const channelIds = [...new Set((videos ?? []).map((v) => v.channel_id))];
    const { data: channels } = await supabase
      .from("channels")
      .select("youtube_id, title, subscriber_count")
      .in("youtube_id", channelIds);
    const channelById = new Map(
      (channels ?? []).map((c) => [c.youtube_id, c]),
    );
    const videoById = new Map((videos ?? []).map((v) => [v.youtube_id, v]));

    cards = favorites
      .map((favorite) => {
        const video = videoById.get(favorite.video_id);
        if (!video) return null;
        const channel = channelById.get(video.channel_id);
        return {
          videoId: video.youtube_id,
          title: video.title,
          thumbnailUrl: video.thumbnail_url,
          isShort: video.is_short,
          durationSeconds: video.duration_seconds,
          publishedAt: video.published_at,
          viewCount: video.view_count,
          score: Number(video.score ?? 0),
          baselineViews: video.baseline_views,
          lowConfidence: false,
          channelId: video.channel_id,
          channelTitle: channel?.title ?? "—",
          channelSubscribers: channel?.subscriber_count ?? null,
          categoryId: favorite.category_id,
        };
      })
      .filter(
        (card): card is OpportunityCard & { categoryId: string | null } =>
          card !== null,
      );
  }

  const options = (categories ?? []).map((c) => ({ id: c.id, name: c.name }));
  const knownIds = new Set(options.map((o) => o.id));

  // "Geral" primeiro (caixa de entrada dos sem categoria), depois as
  // categorias do usuário na ordem de position
  const sections: { id: string | null; name: string }[] = [
    { id: null, name: "Geral" },
    ...options,
  ];
  const cardsOf = (sectionId: string | null) =>
    cards.filter((card) =>
      sectionId === null
        ? card.categoryId === null || !knownIds.has(card.categoryId)
        : card.categoryId === sectionId,
    );

  return (
    <div className="mx-auto flex max-w-[860px] flex-col gap-md pt-xl">
      <header className="flex flex-col gap-xxs">
        <h1 className="text-display-lg text-ink">Minha Pauta</h1>
        <p className="text-body-md text-body">
          As oportunidades que você salvou — a matéria-prima dos próximos
          vídeos.
        </p>
      </header>

      <NewCategoryForm />

      {cards.length === 0 && options.length === 0 ? (
        <p className="border border-dashed border-hairline p-sm text-body-md text-body">
          Nada salvo ainda — clique na ☆ de qualquer oportunidade para
          adicioná-la aqui.
        </p>
      ) : (
        sections.map((section) => {
          const sectionCards = cardsOf(section.id);
          // Geral vazio some quando o usuário já organizou tudo
          if (section.id === null && sectionCards.length === 0) return null;
          return (
            <section
              key={section.id ?? "geral"}
              className="flex flex-col gap-xs"
            >
              {section.id === null ? (
                <h2 className="border-b border-hairline pb-xxs text-title-md text-ink">
                  Geral{" "}
                  <span className="text-body-sm font-normal text-muted-soft">
                    · {sectionCards.length}{" "}
                    {sectionCards.length === 1 ? "ideia" : "ideias"}
                  </span>
                </h2>
              ) : (
                <CategoryHeader
                  id={section.id}
                  name={section.name}
                  count={sectionCards.length}
                />
              )}

              {sectionCards.length === 0 ? (
                <p className="text-body-sm text-muted-soft">
                  Vazia — use o seletor “Categoria” de qualquer favorito para
                  mover ideias para cá.
                </p>
              ) : (
                <ul className="flex flex-col gap-xs">
                  {sectionCards.map((card) => (
                    <li key={card.videoId} className="flex flex-col gap-xxs">
                      <VideoCard card={card} favorited />
                      <div className="flex justify-end">
                        <MoveCategorySelect
                          videoId={card.videoId}
                          current={
                            card.categoryId && knownIds.has(card.categoryId)
                              ? card.categoryId
                              : null
                          }
                          options={options}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
