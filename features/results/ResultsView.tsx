"use client";

import { useState } from "react";
import { VideoCard } from "./VideoCard";
import type { OpportunityCard } from "./types";

/**
 * Lista de oportunidades com abas Longos | Shorts — formatos nunca
 * se misturam no mesmo ranking (doc 3 §3.6).
 */
export function ResultsView({ cards }: { cards: OpportunityCard[] }) {
  const longs = cards.filter((card) => !card.isShort);
  const shorts = cards.filter((card) => card.isShort);
  const [tab, setTab] = useState<"long" | "short">(
    longs.length > 0 || shorts.length === 0 ? "long" : "short",
  );
  const visible = tab === "long" ? longs : shorts;

  return (
    <div className="flex flex-col gap-sm">
      <div role="tablist" className="flex border-b border-hairline">
        {(
          [
            { key: "long", label: `Vídeos longos (${longs.length})` },
            { key: "short", label: `Shorts (${shorts.length})` },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`cursor-pointer px-xs py-xxs text-nav-link uppercase transition-colors ${
              tab === key
                ? "border-b-2 border-ink text-ink"
                : "text-muted-soft hover:text-body"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="border border-dashed border-hairline p-sm text-body-md text-body">
          Nenhum vídeo com 3× ou mais acima da mediana neste formato — os
          vídeos destes canais performam de forma uniforme.
        </p>
      ) : (
        <ul className="flex flex-col gap-xs">
          {visible.map((card) => (
            <li key={card.videoId}>
              <VideoCard card={card} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
