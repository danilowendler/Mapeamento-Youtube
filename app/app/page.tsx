import { SearchForm } from "@/features/search/SearchForm";

export const metadata = { title: "Nova Pesquisa · Mapeamento Inteligente" };

export default function NovaPesquisaPage() {
  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-md pt-xl">
      <header className="flex flex-col gap-xxs">
        <h1 className="text-display-lg text-ink">O que você quer mapear?</h1>
        <p className="text-body-md text-body">
          Informe canais do YouTube e descubra quais vídeos performaram muito
          acima do normal de cada um. Busca por palavra-chave e nichos chegam
          em breve.
        </p>
      </header>
      <SearchForm />
    </div>
  );
}
