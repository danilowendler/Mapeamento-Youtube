import { SearchForm } from "@/features/search/SearchForm";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Nova Pesquisa · Mapeamento Inteligente" };

export default async function NovaPesquisaPage() {
  const supabase = await createClient();
  const { data: niches } = await supabase
    .from("niches")
    .select("slug, name, description")
    .order("name");

  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-md pt-xl">
      <header className="flex flex-col gap-xxs">
        <h1 className="text-display-lg text-ink">O que você quer mapear?</h1>
        <p className="text-body-md text-body">
          Escolha um nicho, digite um tema ou informe canais — e descubra
          quais vídeos performaram muito acima do normal.
        </p>
      </header>
      <SearchForm niches={niches ?? []} />
    </div>
  );
}
