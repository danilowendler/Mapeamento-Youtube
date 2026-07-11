export const metadata = { title: "Nova Pesquisa · Mapeamento Inteligente" };

export default function NovaPesquisaPage() {
  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-sm pt-xl">
      <h1 className="text-display-lg text-ink">O que você quer mapear?</h1>
      <p className="text-body-md text-body">
        A pesquisa por canais chega no M3 — este é o placeholder do shell
        autenticado (M1).
      </p>
      <div className="flex h-[120px] items-center justify-center border border-dashed border-hairline text-caption-upper uppercase text-muted">
        Campo de pesquisa · em construção
      </div>
    </div>
  );
}
