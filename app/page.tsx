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
          Criar conta
        </Link>
        <Link
          href="/login"
          className="inline-flex h-[48px] items-center border border-ink px-md text-button-label uppercase text-ink"
        >
          Entrar
        </Link>
      </div>
    </main>
  );
}
