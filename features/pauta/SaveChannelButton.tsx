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
  labeled = false,
}: {
  channelId: string;
  initialSaved: boolean;
  /** true = botão-pílula com texto "salvar/salvo" (didático). */
  labeled?: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [message, setMessage] = useState<string | null>(null);

  async function toggle(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    const next = !saved;
    setSaved(next);
    setMessage(null);
    try {
      const result = await setChannelRef(channelId, next);
      if (result.error) {
        setSaved(!next);
        setMessage(result.error);
      }
    } catch {
      setSaved(!next);
      setMessage("Falha de rede. Tente novamente.");
    }
  }

  const title = saved
    ? "Remover canal das referências do Workspace"
    : "Salvar canal como referência (vai para o Workspace)";

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={saved}
        title={title}
        className={
          labeled
            ? `flex cursor-pointer items-center gap-xxxs rounded-full border px-xxs py-xxxs text-caption transition-colors ${
                saved
                  ? "border-data-series/60 text-data-series"
                  : "border-hairline text-body hover:border-muted hover:text-ink"
              }`
            : `cursor-pointer px-xxxs transition-colors ${
                saved ? "text-data-series" : "text-muted hover:text-ink"
              }`
        }
      >
        <Bookmark
          size={labeled ? 12 : 16}
          strokeWidth={1.6}
          fill={saved ? "currentColor" : "none"}
        />
        {labeled && (saved ? "salvo" : "salvar")}
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
