import { SearchForm } from "@/features/search/SearchForm";
import { UsageMeter } from "@/features/search/UsageMeter";
import { BRAND } from "@/lib/brand";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUsage } from "@/services/planService";

export const metadata = { title: "Mapping" };

/** Saudação por hora do dia no fuso do público (Brasil-first). */
function greetingForNow(): string {
  const hour = Number(
    new Intl.DateTimeFormat("pt-BR", {
      hour: "numeric",
      hour12: false,
      timeZone: "America/Sao_Paulo",
    }).format(new Date()),
  );
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

export default async function MappingPage() {
  const supabase = await createClient();
  const [{ data: niches }, { data: profile }, usage] = await Promise.all([
    supabase.from("niches").select("slug, name, description").order("name"),
    supabase.from("profiles").select("display_name").single(),
    getCurrentUsage(supabase),
  ]);

  const firstName = profile?.display_name?.trim().split(/\s+/)[0];
  const exhausted = usage.used >= usage.limit;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-220px)] w-full max-w-[760px] flex-col justify-center gap-md py-lg">
      <header className="flex flex-col items-center gap-xxs text-center">
        <span className="text-caption-upper uppercase tracking-widest text-primary">
          {BRAND.name}:)
        </span>
        <h1 className="font-display text-display-lg text-ink">
          {greetingForNow()}
          {firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="text-body-md text-body">
          Digite um tema, escolha um nicho ou cole canais — e descubra quais
          vídeos performaram muito acima do normal.
        </p>
      </header>

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

      <UsageMeter usage={usage} />
    </div>
  );
}
