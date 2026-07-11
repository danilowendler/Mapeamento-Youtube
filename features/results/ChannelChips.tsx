export type ChannelChip = {
  channelId: string;
  title: string;
  state: "ready" | "no_eligible" | "failed";
  opportunities: number;
};

/**
 * Resumo por canal da pesquisa (doc 6 §6.5 — estados projetados):
 * quantas oportunidades cada canal rendeu, ou por que não rendeu.
 */
export function ChannelChips({ chips }: { chips: ChannelChip[] }) {
  if (chips.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-xxs">
      {chips.map((chip) => (
        <li
          key={chip.channelId}
          className="flex items-center gap-xxs border border-hairline px-xxs py-xxxs text-body-sm"
          title={
            chip.state === "no_eligible"
              ? "Este canal publica com frequência altíssima — os vídeos recentes ainda estão acumulando views e não podem ser comparados com justiça."
              : undefined
          }
        >
          <span className="text-ink">{chip.title}</span>
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
        </li>
      ))}
    </ul>
  );
}
