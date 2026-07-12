import { SearchForm } from "@/features/search/SearchForm";
import { UsageMeter } from "@/features/search/UsageMeter";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUsage } from "@/services/planService";

export const metadata = { title: "Nova Pesquisa · Mapeamento Inteligente" };

export default async function NovaPesquisaPage() {
  const supabase = await createClient();
  const [{ data: niches }, usage] = await Promise.all([
    supabase.from("niches").select("slug, name, description").order("name"),
    getCurrentUsage(supabase),
  ]);

  const exhausted = usage.used >= usage.limit;

  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-md pt-xl">
      <header className="flex flex-col gap-xxs">
        <h1 className="text-display-lg text-ink">O que você quer mapear?</h1>
        <p className="text-body-md text-body">
          Escolha um nicho, digite um tema ou informe canais — e descubra
          quais vídeos performaram muito acima do normal.
        </p>
      </header>

      <UsageMeter usage={usage} />

      {exhausted ? (
        <div className="flex flex-col gap-xxs border border-hairline p-sm">
          <p className="text-title-sm text-ink">
            Você usou as {usage.limit} pesquisas do mês
          </p>
          <p className="text-body-md text-body">
            Seus créditos renovam em{" "}
            {new Date(`${usage.periodEnd}T00:00:00`).toLocaleDateString(
              "pt-BR",
            )}
            . Planos com mais pesquisas chegam em breve — enquanto isso, suas
            pesquisas anteriores continuam acessíveis no histórico.
          </p>
        </div>
      ) : (
        <SearchForm niches={niches ?? []} />
      )}
    </div>
  );
}
