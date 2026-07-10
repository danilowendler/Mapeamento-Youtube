# Mapeamento Inteligente — guia para o Claude Code

SaaS de descoberta de oportunidades de conteúdo no YouTube (detecção de outliers relativos ao próprio canal). Executor: fundador solo + Claude Code.

## Fonte de verdade

- **`docs/README.md`** — índice da documentação oficial. Consulte ANTES de decidir qualquer coisa de produto/arquitetura.
- **`docs/09-plano-de-implementacao.md`** — roteiro em milestones (M0–M9). Trabalhe na ordem; não antecipe milestones sem atualizar o plano.
- **`DESIGN-ferrari.md`** — design system. Tokens já mapeados em `app/globals.css`; componentes usam tokens semânticos, nunca hex cru.

## Regras do projeto

- Camadas: `app/api` (HTTP+Zod) → `services/` (negócio) → `repositories/` (dados). Dependência só de cima para baixo (doc 4, §4.3). UI nunca chama API externa direto.
- `search.list` do YouTube custa 100 unidades de cota; endpoints de canal/vídeo custam 1. Toda coleta passa pelo orçamento de cota (doc 3, §3.4).
- Limites de plano são verificados no service layer + banco (transacional) — nunca só na UI (ADR-006).
- Shorts (≤ 180 s) e vídeos longos nunca se misturam em baselines ou rankings (doc 3, §3.6).
- RLS em toda tabela de usuário; corpus global é escrita exclusiva de service role (doc 5).
- Idioma do produto e da documentação: PT-BR. Migrations via Supabase CLI, nunca dashboard em produção.

## Comandos

`pnpm dev` · `pnpm typecheck` · `pnpm lint` · `pnpm test` (Vitest) · `pnpm build`

## Landing page (M9)

Será estruturada no Relume.io — entregar ao usuário o **prompt em inglês** + **quantidade de páginas**, seguindo doc 6 §6.7.
