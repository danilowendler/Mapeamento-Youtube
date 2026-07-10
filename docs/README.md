# Mapeamento Inteligente — Documentação Oficial

> Fonte única de verdade do produto. Toda decisão de desenvolvimento deve ser rastreável a um destes documentos. Quando a realidade divergir da documentação, a documentação é atualizada — nunca ignorada.

**Status:** aprovado em 10/07/2026 · **Fase:** pré-desenvolvimento · **Executor:** fundador solo + Claude Code

## Documentos

| # | Documento | Responde a |
|---|-----------|-----------|
| 1 | [Visão de Produto](01-visao-de-produto.md) | Por que este produto existe e para quem? |
| 2 | [Requisitos & Escopo](02-requisitos-e-escopo.md) | O que será construído, em que ordem, com que critérios? |
| 3 | [Estratégia de Dados](03-estrategia-de-dados.md) | Como obtemos, processamos e rankeamos dados do YouTube? |
| 4 | [Arquitetura de Sistema](04-arquitetura.md) | Como o sistema é organizado e por quê? |
| 5 | [Modelo de Dados](05-modelo-de-dados.md) | Como o banco é modelado, protegido e indexado? |
| 6 | [UX / UI](06-ux-ui.md) | Como o usuário vive o produto? |
| 7 | [Monetização & Planos](07-monetizacao.md) | Como o produto gera receita e controla custos? |
| 8 | [Segurança & Operação](08-seguranca-e-operacao.md) | Como o produto se mantém seguro e no ar? |
| 9 | [Plano de Implementação](09-plano-de-implementacao.md) | Em que ordem construímos, com que marcos verificáveis? |
| — | [DESIGN-ferrari.md](../DESIGN-ferrari.md) | Design system oficial (tokens, tipografia, componentes) |

## Decisões estruturantes (resumo)

1. **Executor:** fundador solo com Claude Code; MVP comercial em ~8-9 semanas → arquitetura com mínimo de peças móveis operacionais.
2. **Monetização:** freemium + assinaturas em R$ (Gratuito / Criador / Pro), enforcement de limites no backend e banco.
3. **Dados:** exclusivamente API oficial do YouTube (Data API v3) + **corpus global compartilhado** entre usuários — o ativo estratégico do negócio.
4. **Mercado inicial:** Brasil / PT-BR; internacionalização preparada na arquitetura, fora do MVP.
5. **UX de pesquisa:** resultados progressivos (Supabase Realtime + jobs duráveis via Inngest).
6. **Escopo:** caminho A (MVP comercial) entregue em estágios lançáveis C → B → A.

## Stack

Next.js (App Router) · React · TypeScript · Tailwind CSS · Node.js (camadas: routes → services → repositories) · Supabase (Postgres, Auth, Realtime, RLS) · Inngest (jobs) · Stripe (billing) · Vercel (hosting)

## Convenções desta documentação

- **Decisão** = escolha aprovada; mudar exige atualizar o documento e registrar o motivo.
- **Proposta** = sugestão ainda não validada; marcada explicitamente como tal.
- Termos em inglês consagrados (score, cache, webhook) são mantidos; o restante em PT-BR.
