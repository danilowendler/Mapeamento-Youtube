export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-sm px-xs py-xxl">
      <span className="rounded-full bg-canvas-elevated px-[12px] py-xxxs text-caption-upper uppercase text-ink">
        Em construção · M0
      </span>
      <h1 className="text-center text-display-xl text-ink md:text-display-mega">
        Mapeamento Inteligente
      </h1>
      <p className="max-w-[560px] text-center text-body-md text-body">
        Descubra sobre o que fazer seu próximo vídeo. Oportunidades reais de
        conteúdo no YouTube, identificadas por dados — em minutos.
      </p>
      <a
        href="https://github.com/danilowendler/Mapeamento-Youtube"
        className="mt-xs inline-flex h-[48px] items-center bg-primary px-md text-button-label uppercase text-on-primary active:bg-primary-active"
      >
        Acompanhar o projeto
      </a>
    </main>
  );
}
