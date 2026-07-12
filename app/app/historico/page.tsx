import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Histórico · Mapeamento Inteligente" };

const STATUS: Record<string, { label: string; dot: string }> = {
  queued: { label: "Na fila", dot: "bg-muted" },
  running: { label: "Analisando…", dot: "animate-pulse bg-info" },
  completed: { label: "Concluída", dot: "bg-success" },
  partial: { label: "Parcial", dot: "bg-focus-ring" },
  failed: { label: "Falhou", dot: "bg-warning" },
};

export default async function HistoricoPage() {
  const supabase = await createClient();
  const { data: searches } = await supabase
    .from("searches")
    .select("id, type, input, status, channels_total, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-md pt-xl">
      <h1 className="text-display-lg text-ink">Histórico</h1>

      {!searches || searches.length === 0 ? (
        <p className="border border-dashed border-hairline p-sm text-body-md text-body">
          Nenhuma pesquisa ainda —{" "}
          <Link href="/app" className="text-ink underline">
            faça a primeira
          </Link>
          .
        </p>
      ) : (
        <ul className="flex flex-col">
          {searches.map((search) => {
            const input = search.input as {
              channels?: string[];
              keyword?: string;
              nicheName?: string;
            };
            const label = input.nicheName
              ? `Nicho: ${input.nicheName}`
              : input.keyword
                ? `“${input.keyword}”`
                : `${(input.channels ?? []).slice(0, 3).join(", ")}${
                    (input.channels ?? []).length > 3
                      ? ` +${(input.channels ?? []).length - 3}`
                      : ""
                  }`;
            return (
              <li key={search.id} className="border-b border-hairline">
                <Link
                  href={`/app/pesquisas/${search.id}`}
                  className="flex items-center justify-between gap-xs py-xs transition-colors hover:bg-canvas-elevated/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-body-md text-ink">{label}</p>
                    <p className="text-body-sm text-muted-soft">
                      {new Date(search.created_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {" · "}
                      {search.channels_total}{" "}
                      {search.channels_total === 1 ? "canal" : "canais"}
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center gap-xxs text-caption-upper uppercase text-body">
                    <span
                      aria-hidden="true"
                      className={`h-[6px] w-[6px] rounded-full ${
                        (STATUS[search.status] ?? STATUS.queued).dot
                      }`}
                    />
                    {(STATUS[search.status] ?? STATUS.queued).label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
