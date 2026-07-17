"use client";

import Link from "next/link";
import { useState } from "react";
import { Bookmark } from "lucide-react";
import { setChannelRef } from "@/features/pauta/actions";

/**
 * Salvar canal como referência (M10.5, lote B5) — a porta de entrada
 * dos cards de canal do Workspace. Otimista, com rollback e aviso de
 * plano no mesmo padrão do FavoriteButton.
 */
export function SaveChannelButton({
  channelId,
  initialSaved,
}: {
  channelId: string;
  initialSaved: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [message, setMessage] = useState<string | null>(null);

  async function toggle(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    const next = !saved;
    setSaved(next);
    setMessage(null);
    const result = await setChannelRef(channelId, next);
    if (result.error) {
      setSaved(!next);
      setMessage(result.error);
    }
  }

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={saved}
        title={
          saved
            ? "Remover canal das referências"
            : "Salvar canal como referência (vai para o Workspace)"
        }
        className={`cursor-pointer px-xxxs transition-colors ${
          saved ? "text-data-series" : "text-muted hover:text-ink"
        }`}
      >
        <Bookmark
          size={16}
          strokeWidth={1.6}
          fill={saved ? "currentColor" : "none"}
        />
      </button>

      {message && (
        <span
          role="dialog"
          className="absolute right-0 top-full z-10 mt-xxs w-[260px] rounded-md border border-hairline bg-canvas-elevated p-xs text-left"
        >
          <span className="block text-body-sm text-ink">{message}</span>
          <span className="mt-xxs flex items-center gap-xs">
            <Link
              href="/app?settings=plano"
              className="text-body-sm text-primary"
              onClick={(event) => event.stopPropagation()}
            >
              Ver planos
            </Link>
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setMessage(null);
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
