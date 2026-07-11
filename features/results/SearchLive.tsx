"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SearchSummary } from "./types";

const TERMINAL = new Set(["completed", "partial", "failed"]);

/**
 * Progresso ao vivo (ADR-004): assina mudanças da pesquisa e dos
 * resultados via Supabase Realtime e re-renderiza a página (RSC
 * refresh) a cada canal concluído. Polling leve como fallback.
 */
export function SearchLive({ search }: { search: SearchSummary }) {
  const router = useRouter();
  const refreshing = useRef(false);

  useEffect(() => {
    if (TERMINAL.has(search.status)) return;

    const refresh = () => {
      if (refreshing.current) return;
      refreshing.current = true;
      router.refresh();
      setTimeout(() => {
        refreshing.current = false;
      }, 800);
    };

    const supabase = createClient();
    const channel = supabase
      .channel(`search-${search.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "search_results",
          filter: `search_id=eq.${search.id}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "searches",
          filter: `id=eq.${search.id}`,
        },
        refresh,
      )
      .subscribe();

    // Fallback: Realtime pode perder eventos; um poll curto garante
    // que o progresso nunca pareça morto.
    const interval = setInterval(refresh, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [search.id, search.status, router]);

  if (TERMINAL.has(search.status)) {
    if (search.status === "partial") {
      return (
        <p className="text-body-sm text-warning">
          Alguns canais não puderam ser analisados.
        </p>
      );
    }
    return null;
  }

  const pct =
    search.channelsTotal > 0
      ? Math.round((search.channelsDone / search.channelsTotal) * 100)
      : 0;

  return (
    <div className="flex flex-col gap-xxs" role="status" aria-live="polite">
      <div className="flex items-center justify-between text-body-sm text-body">
        <span>
          {search.channelsDone === 0
            ? "Coletando vídeos e calculando medianas…"
            : `Analisando canais… ${search.channelsDone} de ${search.channelsTotal}`}
        </span>
        <span className="tabular-nums">
          {search.channelsDone > 0 ? `${pct}%` : ""}
        </span>
      </div>
      <div className="relative h-[3px] w-full overflow-hidden bg-canvas-elevated">
        {search.channelsDone === 0 ? (
          // Indeterminada: a coleta está viva, só ainda sem frações
          <div className="absolute inset-y-0 w-1/3 animate-progress-sweep bg-ink" />
        ) : (
          <div
            className="h-full bg-ink transition-all duration-500"
            style={{ width: `${Math.max(pct, 4)}%` }}
          />
        )}
      </div>
    </div>
  );
}
