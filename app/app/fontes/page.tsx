export const metadata = { title: "Teste de tipografia" };

/**
 * TEMPORÁRIO (lote B0, design system v2): comparação das candidatas a
 * serif display do BEVIEWER. Remover esta rota — e as famílias não
 * escolhidas em app/layout.tsx — assim que o time bater o martelo.
 */
const CANDIDATES = [
  {
    name: "Instrument Serif",
    variable: "var(--font-instrument-serif)",
    note: "Recomendação do arquiteto — a cara dos produtos de IA atuais; elegante sem ser clássica demais.",
  },
  {
    name: "Fraunces",
    variable: "var(--font-fraunces)",
    note: "Mais personalidade e calor; ótima em tamanhos grandes, um pouco mais 'editorial'.",
  },
  {
    name: "Playfair Display",
    variable: "var(--font-playfair)",
    note: "Idêntica ao protótipo do handoff; a mais clássica (Didone) das três.",
  },
];

export default function FontesPage() {
  return (
    <div className="mx-auto flex max-w-[860px] flex-col gap-lg pt-xl">
      <header className="flex flex-col gap-xxs">
        <span className="text-caption-upper uppercase tracking-widest text-primary">
          Design system v2 · teste temporário
        </span>
        <h1 className="text-display-lg text-ink">Escolha a serif display</h1>
        <p className="text-body-md text-body">
          A família escolhida vestirá só os títulos e a saudação (escala
          display) — UI, corpo e números continuam na Inter. Avalie no
          desktop e no celular.
        </p>
      </header>

      {CANDIDATES.map((font) => (
        <section
          key={font.name}
          className="flex flex-col gap-xs rounded-md border border-hairline p-sm"
        >
          <div className="flex items-baseline justify-between gap-xs">
            <h2 className="text-title-md text-ink">{font.name}</h2>
            <p className="text-body-sm text-muted-soft">{font.note}</p>
          </div>
          <div
            className="flex flex-col gap-xxs"
            style={{ fontFamily: font.variable }}
          >
            <p className="text-display-lg font-normal text-ink">
              Boa tarde, Danilo
            </p>
            <p className="text-display-md font-normal text-ink">
              O que você quer mapear hoje?
            </p>
            <p className="text-display-md font-normal uppercase tracking-[2px] text-ink">
              Dashboard · Workspace
            </p>
          </div>
          <p className="text-body-sm text-body">
            O subtítulo e o corpo do app permanecem assim, na Inter — o
            contraste entre as duas famílias é o efeito desejado.
          </p>
        </section>
      ))}
    </div>
  );
}
