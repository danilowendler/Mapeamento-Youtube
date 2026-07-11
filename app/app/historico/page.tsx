import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Histórico · Mapeamento Inteligente" };

const STATUS_LABEL: Record<string, string> = {
  queued: "Na fila",
  running: "Analisando…",
  completed: "Concluída",
  partial: "Parcial",
  failed: "Falhou",
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
            const channels =
              (search.input as { channels?: string[] }).channels ?? [];
            return (
              <li key={search.id} className="border-b border-hairline">
                <Link
                  href={`/app/pesquisas/${search.id}`}
                  className="flex items-center justify-between gap-xs py-xs transition-colors hover:bg-canvas-elevated/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-body-md text-ink">
                      {channels.slice(0, 3).join(", ")}
                      {channels.length > 3 && ` +${channels.length - 3}`}
                    </p>
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
                  <span className="shrink-0 text-caption-upper uppercase text-body">
                    {STATUS_LABEL[search.status] ?? search.status}
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
