import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { BRAND } from "@/lib/brand";
import { OutlierField } from "@/features/landing/OutlierField";
import { Reveal } from "@/features/landing/Reveal";
import {
  StepCardDiagram,
  StepInputDiagram,
  StepScanDiagram,
} from "@/features/landing/StepDiagrams";

export const metadata: Metadata = {
  title: { absolute: BRAND.metaTitle },
  description: BRAND.metaDescription,
};

/* ============ dados das seções (copy do Relume, refinada) ============ */

const DEMO_CASES = [
  {
    score: "716×",
    tier: "bg-primary text-on-primary",
    title: "682 mil views em um canal que faz 500",
    text: "Um criador pequeno acertou um tema que o algoritmo já queria entregar. O sinal estava lá — a plataforma o encontrou em segundos.",
    metric: "5,6 mi views vs. mediana de 7,8 mil",
  },
  {
    score: "13×",
    tier: "bg-ink text-canvas",
    title: "O Short certo para o assunto certo",
    text: "Shorts e vídeos longos têm dinâmicas incomparáveis. A análise separa os formatos para o sinal ser honesto.",
    metric: "9,4 mi views vs. mediana de 723 mil",
  },
  {
    score: "4,4×",
    tier: "bg-canvas-elevated text-ink",
    title: "A leitura honesta de um canal uniforme",
    text: "Quando não há outlier, a plataforma diz. Score explicado em todos os níveis — você entende a lógica, não decora números.",
    metric: "7,3 mi views vs. mediana de 1,7 mi",
  },
];

const STEPS = [
  {
    number: "1",
    title: "Defina o terreno da sua caça",
    text: "Informe um nicho, uma palavra-chave ou uma lista de canais que você admira ou compete.",
    diagram: <StepInputDiagram />,
  },
  {
    number: "2",
    title: "Receba os sinais de demanda real",
    text: "A plataforma coleta os vídeos e compara cada um com a mediana do próprio canal — sem misturar Shorts com longos.",
    diagram: <StepScanDiagram />,
  },
  {
    number: "3",
    title: "Salve e estruture sua pauta",
    text: "Monte seu banco de ideias comprovadas na Minha Pauta e exporte em CSV para planejar a semana.",
    diagram: <StepCardDiagram />,
  },
];

const FEATURES = [
  {
    title: "Descoberta de nichos curada",
    text: "Encontre comunidades com alta demanda em minutos, não em semanas de pesquisa manual.",
  },
  {
    title: "Mapeamento de palavras-chave",
    text: "Visualize os canais e temas que geram visualizações reais e organize seu calendário editorial com dados.",
  },
  {
    title: "Pontuação explicada",
    text: "Cada resultado mostra o múltiplo de desempenho e o motivo. Você entende a lógica, não decora números.",
  },
  {
    title: "Shorts e longos separados",
    text: "O algoritmo do YouTube trata formatos de forma distinta. Nossa análise também — baselines independentes.",
  },
  {
    title: "Minha Pauta",
    text: "Favorite as oportunidades e monte um banco de ideias comprovadas para os próximos vídeos.",
  },
  {
    title: "Exportação CSV",
    text: "Leve as análises para a planilha ou para o relatório do cliente, no formato do Excel brasileiro.",
  },
];

const PLANS = [
  {
    name: "Gratuito",
    price: "R$ 0",
    features: ["3 pesquisas por mês", "5 canais por pesquisa", "Histórico de 7 dias"],
    cta: "Começar grátis",
    highlight: false,
  },
  {
    name: "Criador",
    price: "R$ 49",
    features: [
      "30 pesquisas por mês",
      "20 canais por pesquisa",
      "Minha Pauta + exportação CSV",
      "Histórico completo",
    ],
    cta: "Começar agora",
    highlight: true,
  },
  {
    name: "Pro",
    price: "R$ 99",
    features: [
      "100 pesquisas por mês",
      "50 canais por pesquisa",
      "Minha Pauta + exportação CSV",
      "Prioridade na fila de análise",
    ],
    cta: "Começar agora",
    highlight: false,
  },
];

const FAQS = [
  {
    q: "De onde vêm os dados?",
    a: "Coletamos métricas públicas de vídeos e canais diretamente das APIs oficiais do YouTube e as processamos para revelar padrões que o olho humano não capta. Não inventamos métricas — nós as organizamos.",
  },
  {
    q: "Isso é permitido pelo YouTube?",
    a: "Sim. Utilizamos apenas dados públicos, obtidos pelas APIs oficiais, respeitando integralmente os termos da plataforma. Somos uma camada de inteligência analítica, não uma violação de políticas.",
  },
  {
    q: "Como a pontuação é calculada?",
    a: "Comparamos as views de um vídeo com a mediana de views do próprio canal, no mesmo formato e faixa de idade. Um vídeo com 100 mil views num canal de mediana 1 mil recebe 100×. Isso isola o desempenho do tema, ignorando a fama do canal.",
  },
  {
    q: "Funciona para canais pequenos?",
    a: "É onde a ferramenta mais brilha: outliers de canais pequenos são os sinais mais puros de demanda por um tema — e é exatamente isso que a análise relativa revela.",
  },
  {
    q: "Posso cancelar a qualquer momento?",
    a: "Sem letras miúdas. Cancele quando quiser e o acesso permanece até o fim do ciclo pago. Não pedimos justificativa nem dificultamos a saída.",
  },
  {
    q: "O plano gratuito é suficiente?",
    a: "Para sentir a precisão da ferramenta, sim: são 3 pesquisas por mês. Para um fluxo de criação consistente, os planos pagos oferecem a cadência necessária.",
  },
];

/* ============================ página ============================ */

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Navegação */}
      <header className="sticky top-0 z-20 border-b border-hairline bg-canvas/95 backdrop-blur-sm">
        <nav className="mx-auto flex h-[64px] max-w-[1280px] items-center gap-md px-xs md:px-md">
          <Link href="/">
            <BrandMark />
          </Link>
          <div className="ml-auto hidden items-center gap-md md:flex">
            {[
              ["#como-funciona", "Como funciona"],
              ["#recursos", "Recursos"],
              ["#planos", "Planos"],
              ["#faq", "FAQ"],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="text-nav-link uppercase text-body transition-colors hover:text-ink"
              >
                {label}
              </a>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-xs md:ml-0">
            <Link
              href="/login"
              className="text-nav-link uppercase text-body transition-colors hover:text-ink"
            >
              Entrar
            </Link>
            <Link
              href="/cadastro"
              className="inline-flex h-[40px] items-center bg-primary px-xs text-button-label uppercase text-on-primary active:bg-primary-active"
            >
              Começar grátis
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex flex-col">
        {/* Hero — o Outlier */}
        <section className="flex flex-col items-center gap-md pt-xxl text-center">
          <div className="flex max-w-[820px] flex-col items-center gap-sm px-xs">
            <h1 className="text-display-lg text-ink md:text-display-mega md:tracking-[-1.6px]">
              Descubra sobre o que fazer seu próximo vídeo — em minutos
            </h1>
            <p className="max-w-[560px] text-body-md text-body md:text-title-sm md:font-normal">
              Pare de perder horas garimpando canais concorrentes. Analisamos
              milhares de vídeos para revelar oportunidades reais — temas que
              performaram até 100× acima da média do próprio canal.
            </p>
            <div className="mt-xxs flex flex-col items-center gap-xxs">
              <div className="flex items-center gap-xs">
                <Link
                  href="/cadastro"
                  className="inline-flex h-[48px] items-center bg-primary px-md text-button-label uppercase text-on-primary active:bg-primary-active"
                >
                  Começar grátis
                </Link>
                <a
                  href="#como-funciona"
                  className="inline-flex h-[48px] items-center border border-ink px-md text-button-label uppercase text-ink"
                >
                  Ver como funciona
                </a>
              </div>
              {/* Redutor de risco no ponto de decisão (item 5C, #2) */}
              <p className="text-caption text-muted">
                Grátis · 3 pesquisas por mês · sem cartão de crédito
              </p>
            </div>
          </div>
          <OutlierField />
        </section>

        {/* Prova — casos reais com a régua de score */}
        <section className="mx-auto flex w-full max-w-[1280px] flex-col gap-md px-xs py-xxl md:px-md">
          <Reveal>
            <div className="flex max-w-[640px] flex-col gap-xxs">
              <span className="text-caption-upper uppercase text-primary">
                Prova, não promessa
              </span>
              <h2 className="text-display-lg text-ink">
                Oportunidades que ignoram a sorte e seguem os dados
              </h2>
              <p className="text-body-md text-body">
                Cada card abaixo é um vídeo real analisado pela plataforma. Não
                é achismo — é a mediana do próprio canal como régua, e o score
                como o tamanho da demanda não atendida.
              </p>
            </div>
          </Reveal>
          <div className="grid gap-xs md:grid-cols-3">
            {DEMO_CASES.map((demo, index) => (
              <Reveal key={demo.score} delayMs={index * 120}>
                <article className="flex h-full flex-col gap-xs border border-hairline p-sm transition-colors hover:border-muted">
                  <span
                    className={`w-fit px-xxs py-xxxs text-title-md tabular-nums ${demo.tier}`}
                  >
                    {demo.score}
                  </span>
                  <h3 className="text-title-md text-ink">{demo.title}</h3>
                  <p className="text-body-sm text-body">{demo.text}</p>
                  <p className="mt-auto border-t border-hairline pt-xxs text-caption text-muted">
                    {demo.metric}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Editorial — o fim da garimpagem */}
        <section className="border-y border-hairline bg-technical-grid">
          <div className="mx-auto grid w-full max-w-[1280px] gap-md px-xs py-xxl md:grid-cols-2 md:px-md">
            <Reveal>
              <h2 className="text-display-lg text-ink">O fim da garimpagem</h2>
            </Reveal>
            <Reveal delayMs={120}>
              <div className="flex flex-col gap-xs text-body-md text-body">
                <p>
                  O jeito antigo: abrir dezenas de abas, rolar canal por canal,
                  comparar views de cabeça e torcer para a intuição acertar.
                  Horas de trabalho para meia dúzia de palpites.
                </p>
                <p>
                  O jeito novo: a plataforma coleta até mil vídeos por canal,
                  calcula a mediana de cada formato e te entrega só o que
                  rompeu a régua — com o motivo escrito em cada card. O que
                  levava uma tarde agora leva o tempo de um café.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Como funciona */}
        <section
          id="como-funciona"
          className="mx-auto flex w-full max-w-[1280px] scroll-mt-[80px] flex-col gap-md px-xs py-xxl md:px-md"
        >
          <Reveal>
            <div className="flex max-w-[640px] flex-col gap-xxs">
              <span className="text-caption-upper uppercase text-muted">
                Como funciona
              </span>
              <h2 className="text-display-lg text-ink">
                Da ideia ao roteiro em três passos precisos
              </h2>
            </div>
          </Reveal>
          <div className="grid gap-md md:grid-cols-3">
            {STEPS.map((step, index) => (
              <Reveal key={step.number} delayMs={index * 120}>
                <div className="flex flex-col gap-xs">
                  {step.diagram}
                  <span className="text-caption-upper uppercase text-primary">
                    Passo {step.number}
                  </span>
                  <h3 className="text-title-md text-ink">{step.title}</h3>
                  <p className="text-body-sm text-body">{step.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Recursos */}
        <section
          id="recursos"
          className="border-y border-hairline"
        >
          <div className="mx-auto flex w-full max-w-[1280px] scroll-mt-[80px] flex-col gap-md px-xs py-xxl md:px-md">
            <Reveal>
              <div className="flex max-w-[640px] flex-col gap-xxs">
                <span className="text-caption-upper uppercase text-muted">
                  Recursos
                </span>
                <h2 className="text-display-lg text-ink">
                  Seis ferramentas para substituir a intuição pela certeza
                </h2>
              </div>
            </Reveal>
            <div className="grid gap-x-md gap-y-sm md:grid-cols-3">
              {FEATURES.map((feature, index) => (
                <Reveal key={feature.title} delayMs={(index % 3) * 100}>
                  <div className="flex flex-col gap-xxs border-t border-hairline pt-xs">
                    <h3 className="text-title-sm text-ink">{feature.title}</h3>
                    <p className="text-body-sm text-body">{feature.text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Planos */}
        <section
          id="planos"
          className="mx-auto flex w-full max-w-[1280px] scroll-mt-[80px] flex-col gap-md px-xs py-xxl md:px-md"
        >
          <Reveal>
            <div className="flex max-w-[640px] flex-col gap-xxs">
              <span className="text-caption-upper uppercase text-muted">
                Planos
              </span>
              <h2 className="text-display-lg text-ink">
                Comece grátis, escale quando a pauta pedir
              </h2>
            </div>
          </Reveal>
          <div className="grid gap-xs md:grid-cols-3">
            {PLANS.map((plan, index) => (
              <Reveal key={plan.name} delayMs={index * 120}>
                <div
                  className={`flex h-full flex-col gap-sm border p-sm ${
                    plan.highlight ? "border-ink" : "border-hairline"
                  }`}
                >
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-title-md text-ink">{plan.name}</h3>
                    {plan.highlight && (
                      <span className="text-caption-upper uppercase text-primary">
                        mais popular
                      </span>
                    )}
                  </div>
                  <p className="text-display-md tabular-nums text-ink">
                    {plan.price}
                    <span className="text-body-sm text-muted"> /mês</span>
                  </p>
                  <ul className="flex flex-col gap-xxs text-body-sm text-body">
                    {plan.features.map((feature) => (
                      <li key={feature} className="border-t border-hairline pt-xxs">
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/cadastro"
                    className={`mt-auto inline-flex h-[48px] items-center justify-center px-md text-button-label uppercase ${
                      plan.highlight
                        ? "bg-primary text-on-primary active:bg-primary-active"
                        : "border border-ink text-ink"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="border-t border-hairline">
          <div className="mx-auto flex w-full max-w-[820px] scroll-mt-[80px] flex-col gap-md px-xs py-xxl md:px-md">
            <Reveal>
              <h2 className="text-center text-display-lg text-ink">
                Perguntas frequentes
              </h2>
            </Reveal>
            <div className="flex flex-col">
              {FAQS.map((faq) => (
                <details
                  key={faq.q}
                  className="group border-b border-hairline py-xs"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-xs text-title-sm text-ink [&::-webkit-details-marker]:hidden">
                    {faq.q}
                    <span
                      aria-hidden="true"
                      className="text-muted transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="pt-xxs text-body-md text-body">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="border-t border-hairline bg-technical-grid">
          <div className="mx-auto flex w-full max-w-[1280px] flex-col items-center gap-sm px-xs py-super text-center md:px-md">
            <Reveal>
              <h2 className="max-w-[640px] text-display-lg text-ink">
                Pare de garimpar. Comece a mapear.
              </h2>
            </Reveal>
            <Reveal delayMs={120}>
              <div className="flex flex-col items-center gap-xxs">
                <Link
                  href="/cadastro"
                  className="inline-flex h-[48px] items-center bg-primary px-md text-button-label uppercase text-on-primary active:bg-primary-active"
                >
                  Começar grátis
                </Link>
                <p className="text-caption text-muted">
                  Grátis · 3 pesquisas por mês · sem cartão de crédito
                </p>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      {/* Rodapé */}
      <footer className="border-t border-hairline">
        <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center gap-x-md gap-y-xs px-xs py-lg text-body-sm text-muted md:px-md">
          <span className="text-ink">{BRAND.name}</span>
          <span className="hidden sm:inline">· {BRAND.descriptor}</span>
          <span>© {new Date().getFullYear()}</span>
          <div className="ml-auto flex items-center gap-md">
            <Link href="/termos" className="transition-colors hover:text-body">
              Termos de Uso
            </Link>
            <Link
              href="/privacidade"
              className="transition-colors hover:text-body"
            >
              Política de Privacidade
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
