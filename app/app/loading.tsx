/**
 * Skeleton de navegação: troca de página responde no clique
 * (percepção de velocidade — princípio nº 1 do produto).
 */
export default function AppLoading() {
  return (
    <div
      className="mx-auto flex max-w-[860px] animate-pulse flex-col gap-md pt-lg md:pt-xl"
      aria-busy="true"
      aria-label="Carregando"
    >
      <div className="flex flex-col gap-xxs">
        <div className="h-[12px] w-[140px] bg-canvas-elevated" />
        <div className="h-[36px] w-[360px] max-w-full bg-canvas-elevated" />
        <div className="h-[16px] w-[480px] max-w-full bg-canvas-elevated" />
      </div>
      <div className="h-[40px] w-full rounded-md bg-canvas-elevated" />
      <div className="flex flex-col gap-xs">
        <div className="h-[92px] w-full rounded-md border border-hairline bg-canvas-elevated/40" />
        <div className="h-[92px] w-full rounded-md border border-hairline bg-canvas-elevated/40" />
        <div className="h-[92px] w-full rounded-md border border-hairline bg-canvas-elevated/40" />
      </div>
    </div>
  );
}
