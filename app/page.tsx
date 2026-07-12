import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-sm px-xs py-xxl">
      <span className="rounded-full bg-canvas-elevated px-[12px] py-xxxs text-caption-upper uppercase text-ink">
        Beta em construção
      </span>
      <h1 className="text-center text-display-xl text-ink md:text-display-mega">
        Mapeamento Inteligente
      </h1>
      <p className="max-w-[560px] text-center text-body-md text-body">
        Descubra sobre o que fazer seu próximo vídeo. Oportunidades reais de
        conteúdo no YouTube, identificadas por dados — em minutos.
      </p>
      <div className="mt-xs flex items-center gap-xs">
        <Link
          href="/cadastro"
          className="inline-flex h-[48px] items-center bg-primary px-md text-button-label uppercase text-on-primary active:bg-primary-active"
        >
          Começar grátis
        </Link>
        <Link
          href="/login"
          className="inline-flex h-[48px] items-center border border-ink px-md text-button-label uppercase text-ink"
        >
          Entrar
        </Link>
      </div>

      <section className="mt-xxl grid w-full max-w-[860px] gap-xs md:grid-cols-3">
        {[
          {
            step: "1",
            title: "Escolha o tema",
            text: "Um nicho pronto, uma palavra-chave ou os canais que você acompanha.",
          },
          {
            step: "2",
            title: "Nós analisamos",
            text: "Coletamos os vídeos e comparamos cada um com a mediana do próprio canal.",
          },
          {
            step: "3",
            title: "Receba oportunidades",
            text: "Vídeos com 3×, 10×, 30× o desempenho normal — temas com demanda comprovada.",
          },
        ].map(({ step, title, text }) => (
          <div
            key={step}
            className="flex flex-col gap-xxs border border-hairline p-sm"
          >
            <span className="text-caption-upper uppercase text-primary">
              Passo {step}
            </span>
            <h2 className="text-title-md text-ink">{title}</h2>
            <p className="text-body-sm text-body">{text}</p>
          </div>
        ))}
      </section>

      <footer className="mt-xxl flex items-center gap-xs border-t border-hairline pt-sm text-body-sm text-muted">
        <span>© {new Date().getFullYear()} Mapeamento Inteligente</span>
        <Link href="/termos" className="hover:text-body">
          Termos de Uso
        </Link>
        <Link href="/privacidade" className="hover:text-body">
          Privacidade
        </Link>
      </footer>
    </main>
  );
}
