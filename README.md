# Mapeamento Inteligente

Copiloto de pesquisa de conteúdo para criadores de YouTube: identifica vídeos com desempenho excepcional **relativo ao próprio canal** (outliers) e responde *"sobre o que vale a pena produzir o próximo vídeo?"*.

> 📚 **Toda decisão de produto e arquitetura vive em [`docs/`](docs/README.md)** — fonte única de verdade. O roteiro de construção está no [plano de implementação](docs/09-plano-de-implementacao.md).

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS v4 · Supabase (Postgres, Auth, Realtime, RLS) · Inngest · Stripe · Vercel

## Desenvolvimento

```bash
pnpm install          # dependências
cp .env.example .env.local   # preencher credenciais
pnpm dev              # servidor local
pnpm typecheck && pnpm lint && pnpm test   # o que o CI roda
```

## Estrutura

Camadas descritas na [arquitetura, §4.3](docs/04-arquitetura.md): `app/` (rotas) → `services/` (negócio) → `repositories/` (dados), com `jobs/` (Inngest), `lib/` (clientes externos) e UI em `components/` + `features/`. Design tokens em [`DESIGN-ferrari.md`](DESIGN-ferrari.md), mapeados em `app/globals.css`.
