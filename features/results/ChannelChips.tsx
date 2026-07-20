import { SaveChannelButton } from "@/features/pauta/SaveChannelButton";

export type ChannelChip = {
  channelId: string;
  title: string;
  state: "collecting" | "ready" | "no_eligible" | "failed";
  opportunities: number;
  /** true quando o canal já está salvo como referência no Workspace. */
  saved: boolean;
  /**
   * Vídeo que trouxe o canal para a busca (keyword/nicho — T5). Só
   * presente quando o vídeo já está no corpus; undefined = sem linha.
   */
  matchedVideoTitle?: string;
};

/**
 * Resumo por canal da pesquisa (doc 6 §6.5 — estados projetados):
 * quantas oportunidades cada canal rendeu, ou por que não rendeu.
 */
export function ChannelChips({ chips }: { chips: ChannelChip[] }) {
  if (chips.length === 0) return null;

  return (
    <ul className="flex flex-wrap items-start gap-xxs">
      {chips.map((chip) => (
        <li key={chip.channelId} className="flex flex-col gap-xxxs">
          <div
            className="flex items-center gap-xxs rounded-full border border-hairline px-xxs py-xxxs text-body-sm"
            title={
              chip.state === "no_eligible"
                ? "Este canal publica com frequência altíssima — os vídeos recentes ainda estão acumulando views e não podem ser comparados com justiça."
                : undefined
            }
          >
            <span
              aria-hidden="true"
              className={`h-[6px] w-[6px] shrink-0 rounded-full ${
                chip.state === "collecting"
                  ? "animate-pulse bg-info"
                  : chip.state === "ready"
                    ? "bg-success"
                    : chip.state === "failed"
                      ? "bg-warning"
                      : "bg-muted"
              }`}
            />
            <span className="text-ink">{chip.title}</span>
            {chip.state === "collecting" && (
              <span className="animate-pulse text-body">coletando…</span>
            )}
            {chip.state === "ready" && (
              <span className="text-muted-soft">
                {chip.opportunities}{" "}
                {chip.opportunities === 1 ? "oportunidade" : "oportunidades"}
              </span>
            )}
            {chip.state === "no_eligible" && (
              <span className="text-info">sem vídeos elegíveis*</span>
            )}
            {chip.state === "failed" && (
              <span className="text-warning">falhou</span>
            )}
            <SaveChannelButton
              channelId={chip.channelId}
              initialSaved={chip.saved}
              labeled
            />
          </div>
          {chip.matchedVideoTitle && (
            <p
              className="max-w-[240px] truncate pl-xs text-caption text-muted"
              title={chip.matchedVideoTitle}
            >
              entrou por: “{chip.matchedVideoTitle}”
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
