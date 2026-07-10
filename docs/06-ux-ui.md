# 6 · UX / UI

> Regra de ouro: **do login à primeira oportunidade em < 60 segundos.** Cada decisão de interface serve a percepção de velocidade e à clareza do "porquê" de cada recomendação.

## 6.1 Mapa de navegação

```
Landing (pública)
└─ Auth (cadastro/login — Supabase Auth, Google + e-mail)
   └─ App (shell autenticado, sidebar)
      ├─ Nova Pesquisa  ← tela inicial (a ação nº 1 fica a zero cliques)
      ├─ Resultados /pesquisas/[id]
      ├─ Histórico
      ├─ Minha Pauta (favoritos)          [plano Criador+]
      └─ Conta (perfil, plano & uso, billing via Stripe Portal)
```

Desktop-first (persona trabalha em desktop), tudo funcional em mobile. Sidebar colapsável; em mobile vira navegação inferior.

## 6.2 Fluxo de onboarding (primeira sessão)

1. Cadastro (Google em 1 clique preferencial).
2. Pergunta única: **"Qual é o seu nicho?"** — grade visual dos nichos curados + campo de busca. Zero formulários longos.
3. Ao escolher, dispara imediatamente a primeira pesquisa do nicho (custo ~0, cache quente por construção) e leva à tela de resultados progressivos.
4. Primeiro resultado na tela = momento "uau" — banner discreto explica o score ("este vídeo tem 12× a mediana do canal").

Racional: onboarding **é** o produto acontecendo, não um tour. Nada de tooltips em série ou vídeos explicativos.

## 6.3 Tela: Nova Pesquisa

Um único campo inteligente + abas de modo:

```
┌──────────────────────────────────────────────────────┐
│  O que você quer mapear?                              │
│  ┌────────────────────────────────────────────────┐  │
│  │ 🔍 nicho, palavra-chave, @canal ou URL...       │  │
│  └────────────────────────────────────────────────┘  │
│  [ Nichos ▾ ]  [ Palavra-chave ]  [ Canais ]          │
│                                                       │
│  Nichos populares:                                    │
│  [Finanças] [Fitness] [Games] [Culinária] [Educação]… │
│                                                       │
│  Uso do plano:  ▓▓▓░░░░░░░  3 de 30 pesquisas         │
└──────────────────────────────────────────────────────┘
```

- Detecção automática do tipo de entrada (URL/@ → canal; texto → keyword) com confirmação visual do modo.
- Modo "Canais": textarea para lista (um por linha), validação item a item, contador vs. limite do plano.
- Contador de uso sempre visível — transparência antecipa o paywall sem emboscada.

## 6.4 Tela: Resultados (a tela mais importante do produto)

```
┌ Pesquisa: "finanças pessoais" · ▓▓▓▓▓▓░░ 14/20 canais ┐
│ [Filtros: score ≥ 3× ▾][Formato: Longos ▾][Idade ▾]    │
│ [Ordenar: Score ▾]                    [Exportar CSV]   │
├────────────────────────────────────────────────────────┤
│ ┌───────┐ Como saí das dívidas ganhando pouco          │
│ │ thumb │ Canal Grana Leve · 45k inscritos             │
│ │  18×  │ 438k views · há 3 meses · 12 min             │
│ └───────┘ 18× a mediana do canal (24k) · ★ Favoritar   │
│ …cards seguintes…                                      │
└────────────────────────────────────────────────────────┘
```

Decisões de design:

- **Cards, não tabela**, como visual padrão: thumbnail é informação essencial (criadores pensam visualmente). Alternância para visão em tabela densa (persona agência).
- **Badge de score** é o elemento visual dominante do card, com cor por faixa: 3–10× / 10–30× / 30×+.
- **Explicação sempre presente** no card ("18× a mediana do canal") — o score nunca é um número mágico.
- **Progressivo:** resultados de cache renderizam de imediato; novos canais entram com animação sutil de chegada; skeleton apenas no primeiro segundo. Barra "X de Y canais" no header.
- **Shorts e longos** em seções/abas separadas — nunca misturados no mesmo ranking ([doc 3, §3.6](03-estrategia-de-dados.md)).
- Clique no card → painel lateral com detalhes do vídeo e do canal + link para o YouTube (nunca reproduzimos o vídeo dentro do app — fora do escopo e das políticas).
- Filtros e ordenação client-side, instantâneos, preservados na URL (compartilhável).

## 6.5 Estados do sistema (projetados, não improvisados)

| Estado | Tratamento |
|---|---|
| Pesquisa fria em andamento | Resultados parciais + barra de progresso; nunca tela vazia com spinner |
| Fila por cota esgotada | Honestidade: "Alta demanda — sua pesquisa está na fila e roda em ~N min. Avisaremos." (posição na fila visível) |
| Canal sem outliers | Estado vazio com valor: "Nenhum vídeo acima de 3× — os vídeos deste canal performam de forma uniforme" + sugerir canais relacionados |
| Canal pequeno (baseline de baixa confiança) | Badge "amostra pequena" no card, tooltip explica |
| Limite do plano atingido | Paywall claro: o que você tentou fazer, o que o plano resolve, CTA de upgrade; nunca botão desabilitado sem explicação |
| Erro de coleta de um canal | Card de erro discreto no fim da lista, com "tentar novamente"; a pesquisa segue `partial`, nunca falha inteira |

## 6.6 Design system (decisão)

**Fonte oficial de tokens e componentes: [`DESIGN-ferrari.md`](../DESIGN-ferrari.md)** (raiz do repo). Linguagem visual cinematográfica-editorial: canvas quase-preto `#181818`, acento único vermelho `#da291c` usado com escassez (CTAs primários e destaques), cantos retos (0px) em CTAs/cards, escada de espaçamento de 8px (`xxxs` 4px → `super` 128px), display em peso 500 — nunca bold.

Regras de aplicação no produto:

- **Tokens sempre, hex nunca** — a escala do design system vira tokens semânticos no Tailwind (`canvas`, `canvas-elevated`, `ink`, `body`, `hairline`, `primary`); componente não conhece cor crua.
- **Fonte:** FerrariSans é licenciada — usamos o substituto documentado, **Inter** (peso 500 no display com letter-spacing negativo), via `next/font`.
- **Tema escuro é o único tema do MVP** — o design system é dark-first e isso casa com o hábito do público criador (thumbnails saltam sobre `#181818`). Bandas claras (`canvas-light`) só em contextos editoriais da landing, como no sistema original.
- **Adaptações necessárias para um app de dados** (o design system descreve superfícies de marketing; estas extensões seguem seus princípios):
  - *Badge de score:* faixas 3×/10×/30× usam brilho crescente da escala existente, reservando o vermelho `primary` só para a faixa máxima (30×+) — mantém o acento escasso;
  - *Números de métricas:* `number-display` (peso 700, tracking negativo) em tamanhos reduzidos para cards e stats; números tabulares;
  - *Densidade:* a visão tabela usa a densidade das bandas editoriais claras como referência de compactação, porém sobre canvas escuro;
  - *Estados semânticos:* `semantic-success/info/warning` do sistema para feedback de pipeline e billing.
- **Acessibilidade:** contraste AA (atenção: `body` #969696 sobre `#181818` passa AA para texto normal — verificar cada par ao compor), foco visível (anel amarelo do sistema), navegação por teclado completa na lista de resultados, `alt` em thumbnails, toque ≥ 44px.
- **Performance percebida:** thumbnails com lazy loading + `next/image`; skeletons apenas no primeiro carregamento; transições ≤ 200 ms.

## 6.7 Landing page (estágio A — via Relume)

**Ferramenta: [Relume](https://www.relume.io)** — geraremos a estrutura da landing lá e aplicaremos o design system na exportação. Quando chegar o momento (milestone 9 do [plano](09-plano-de-implementacao.md)), escreveremos um **prompt para o Relume** contendo: proposta de valor, público, seções desejadas e direção visual extraída do `DESIGN-ferrari.md`.

Estrutura: hero cinematográfico full-bleed (screenshot do produto como "fotografia") com promessa ("Descubra sobre o que fazer seu próximo vídeo — em minutos") → demonstração visual do resultado real → como funciona em 3 passos → planos → FAQ (inclui "de onde vêm os dados?") → banda CTA pré-footer. Tom direto, sem jargão. SEO básico: SSR nativo do Next.js, metadados, OG image.
