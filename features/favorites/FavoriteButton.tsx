"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toggleFavorite } from "./actions";

/**
 * Estrela de favorito no card de oportunidade. Para plano gratuito,
 * o clique revela o paywall não-hostil (doc 6 §6.5) em vez de falhar
 * silenciosamente.
 */
export function FavoriteButton({
  videoId,
  searchId,
  initialFavorited,
}: {
  videoId: string;
  searchId?: string;
  initialFavorited: boolean;
}) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [gateMessage, setGateMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onClick(event: React.MouseEvent) {
    // O card inteiro é um link para o YouTube — não navegar
    event.preventDefault();
    event.stopPropagation();
    startTransition(async () => {
      const result = await toggleFavorite(videoId, searchId);
      if (result.planGate) {
        setGateMessage(result.error ?? "");
        return;
      }
      if (result.error) return;
      setFavorited(result.favorited ?? false);
    });
  }

  return (
    <span className="relative inline-flex">
      <button
        onClick={onClick}
        disabled={isPending}
        aria-pressed={favorited}
        aria-label={favorited ? "Remover da pauta" : "Salvar na pauta"}
        title={favorited ? "Remover da pauta" : "Salvar na pauta"}
        className={`cursor-pointer px-xxs text-title-md leading-none transition-colors ${
          favorited ? "text-focus-ring" : "text-muted hover:text-ink"
        }`}
      >
        {favorited ? "★" : "☆"}
      </button>

      {gateMessage && (
        <span
          role="dialog"
          className="absolute right-0 top-full z-10 mt-xxs w-[260px] border border-hairline bg-canvas-elevated p-xs text-left"
        >
          <span className="block text-body-sm text-ink">{gateMessage}</span>
          <span className="mt-xxs flex items-center gap-xs">
            <Link
              href="/app/conta#planos"
              className="text-body-sm text-primary"
              onClick={(event) => event.stopPropagation()}
            >
              Ver planos
            </Link>
            <button
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setGateMessage(null);
              }}
              className="cursor-pointer text-body-sm text-muted-soft"
            >
              Agora não
            </button>
          </span>
        </span>
      )}
    </span>
  );
}
