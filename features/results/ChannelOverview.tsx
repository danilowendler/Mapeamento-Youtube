import { SaveChannelButton } from "@/features/pauta/SaveChannelButton";
import type { ChannelSummary } from "./types";

/** Cor do ponto de status por estado do canal (mesma semântica dos chips). */
const STATE_DOT: Record<ChannelSummary["state"], string> = {
  collecting: "animate-pulse bg-info",
  ready: "bg-success",
  no_eligible: "bg-muted",
  failed: "bg-warning",
};

/**
 * Visão geral dos canais analisados (aba "Canais"). A mesma informação
 * que ficava nos chips do topo, agora em largura total e organizada:
 * status, nº de oportunidades e o vídeo que trouxe o canal (T5), com o
 * botão de salvar como referência.
 */
export function ChannelOverview({
  channels,
}: {
  channels: ChannelSummary[];
}) {
  if (channels.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-hairline p-sm text-body-md text-body">
        Os canais desta pesquisa aparecem aqui conforme são analisados.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-xxs">
      {channels.map((channel) => (
        <li
          key={channel.channelId}
          className="flex items-center justify-between gap-xs rounded-md border border-hairline px-sm py-xs"
        >
          <div className="flex min-w-0 flex-col gap-xxxs">
            <div className="flex items-center gap-xxs">
              <span
                aria-hidden="true"
                className={`h-[6px] w-[6px] shrink-0 rounded-full ${STATE_DOT[channel.state]}`}
              />
              <span className="truncate text-title-sm text-ink">
                {channel.title}
              </span>
              {channel.state === "collecting" && (
                <span className="shrink-0 animate-pulse text-body-sm text-body">
                  coletando…
                </span>
              )}
              {channel.state === "ready" && (
                <span className="shrink-0 text-body-sm text-muted-soft">
                  {channel.opportunities}{" "}
                  {channel.opportunities === 1 ? "oportunidade" : "oportunidades"}
                </span>
              )}
              {channel.state === "no_eligible" && (
                <span
                  className="shrink-0 text-body-sm text-info"
                  title="Este canal publica com frequência altíssima — os vídeos recentes ainda estão acumulando views e não podem ser comparados com justiça."
                >
                  sem vídeos elegíveis
                </span>
              )}
              {channel.state === "failed" && (
                <span className="shrink-0 text-body-sm text-warning">falhou</span>
              )}
            </div>
            {channel.matchedVideoTitle && (
              <p
                className="truncate text-body-sm text-muted"
                title={channel.matchedVideoTitle}
              >
                entrou por: “{channel.matchedVideoTitle}”
              </p>
            )}
          </div>
          <SaveChannelButton
            channelId={channel.channelId}
            initialSaved={channel.saved}
            labeled
          />
        </li>
      ))}
    </ul>
  );
}
