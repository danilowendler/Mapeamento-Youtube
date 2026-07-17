import { SearchForm } from "@/features/search/SearchForm";
import { UsageMeter } from "@/features/search/UsageMeter";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUsage } from "@/services/planService";

export const metadata = { title: "Nova Pesquisa" };

export default async function NovaPesquisaPage() {
  const supabase = await createClient();
  const [{ data: niches }, { data: profile }, usage] = await Promise.all([
    supabase.from("niches").select("slug, name, description").order("name"),
    supabase.from("profiles").select("display_name").single(),
    getCurrentUsage(supabase),
  ]);

  // Saudação da entrada estilo chat (M10, lote 2) — primeiro nome real
  const firstName = profile?.display_name?.trim().split(/\s+/)[0];

  const exhausted = usage.used >= usage.limit;

  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-md pt-lg md:pt-xl lg:max-w-[1080px]">
      <header className="flex flex-col gap-xxs">
        <span className="text-caption-upper uppercase tracking-widest text-primary">
          Central de pesquisa
        </span>
        <h1 className="font-display text-display-lg text-ink">
          O que você quer mapear hoje{firstName ? `, ${firstName}` : ""}?
        </h1>
        <p className="text-body-md text-body">
          Escolha um nicho, digite um tema ou informe canais — e descubra
          quais vídeos performaram muito acima do normal.
        </p>
      </header>

      <UsageMeter usage={usage} />

      {exhausted ? (
        <div className="flex flex-col gap-xxs rounded-md border border-hairline p-sm">
          <p className="text-title-sm text-ink">
            Você usou as {usage.limit} pesquisas do mês
          </p>
          <p className="text-body-md text-body">
            Seus créditos renovam em{" "}
            {new Date(`${usage.periodEnd}T00:00:00`).toLocaleDateString(
              "pt-BR",
            )}
            . Os planos Criador (30 pesquisas/mês) e Pro (100/mês) liberam
            muito mais — e suas pesquisas anteriores seguem no histórico.
          </p>
          <a
            href="/app?settings=plano"
            className="inline-flex h-[48px] w-fit items-center rounded-sm bg-primary px-md text-button-label uppercase text-on-primary active:bg-primary-active"
          >
            Ver planos
          </a>
        </div>
      ) : (
        <SearchForm niches={niches ?? []} />
      )}
    </div>
  );
}
