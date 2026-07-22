# Roadmap de conversão & ativação — BEVIEWER

> Documento de trabalho (21/07/2026). Auditoria de CRO/onboarding baseada no
> playbook Revenue-Centric Design (RCD). Cobre os dois funis do produto:
> **conversão da landing** (visitante → cadastro) e **ativação**
> (cadastro → 1ª pesquisa → achou oportunidade → favoritou).
> Prioridade pensada para um fundador solo: primeiro o que **destrava
> medição e trabalho futuro**, depois as alavancas de maior impacto.

## Estado atual (feito)

| Item | O que é | Situação |
|---|---|---|
| 5A · Web Analytics | `@vercel/analytics` + `<Analytics/>` no layout (pageviews sem cookie) | ✅ em produção · **falta ligar no painel da Vercel** e visitar o site |
| 5B · Funil em SQL | `docs/analytics/funil-ativacao.sql` — mede cadastro→pesquisa→oportunidade→favorito | ✅ em produção (só leitura, rodar no Supabase) |
| 5C · Landing (quick win) | Redutor de risco nos CTAs ("Grátis · 3 pesquisas/mês · sem cartão") | ✅ em produção |

## Método (não pular)

**Meça o baseline antes de mexer.** Com o Web Analytics ligado e o funil SQL
rodado, anote os números de hoje. Toda mudança abaixo deve ser avaliada
contra esse baseline — senão a gente otimiza no escuro (é o item mais barato
e o que dá sentido a todos os outros).

---

## Backlog priorizado

### P0 — Base de medição (agora, sem código, sem custo)

**0.1 · Ligar o Web Analytics no painel da Vercel.**
Projeto → aba Analytics → Enable → visitar o beviewer.com e navegar. Sem
isso, nada é medido. É a fundação de todo o resto.

**0.2 · Rodar o funil SQL (`funil-ativacao.sql`) no Supabase de produção.**
Descobre onde o usuário trava HOJE (cadastrou e não pesquisou? pesquisou e
não achou nada?) para priorizar com dado, não achismo.

### P1 — Infra que destrava o futuro

**1.1 · E-mail próprio (Resend + SPF/DKIM no domínio) — "item 6".**
*Por que é P1:* é um **desbloqueador**. Habilita dois itens de ativação
(2.2 e 2.3) que hoje são impossíveis, melhora a entregabilidade da
confirmação de e-mail e sobe o profissionalismo (e-mail vindo de
`@beviewer.com`). Combina com o domínio recém-publicado.
*Facilita eventos futuros:* qualquer comunicação com o usuário
(boas-vindas, reativação, avisos de cobrança) passa a existir.

### P2 — Maior alavanca de conversão da landing

**2.1 · Prova à altura da promessa — RCD Princípio 4 ("sua promessa é do
tamanho da sua prova").**
*Achado:* a claim mais forte da landing é "**100× acima da média**", mas a
prova são três casos **anônimos**. O mercado acredita no que se demonstra.
*O que fazer:* um depoimento com nome/rosto de criador real, um contador
honesto ("N criadores já mapearam X mil vídeos"), ou um caso identificável.
*Bloqueio:* **depende de você** fornecer pelo menos 1 depoimento/caso — o
código já está pronto para receber.
*Vazamento que ataca:* topo do funil (quem chega, não confia, não cadastra).

### P3 — Ativação (cadastro → aha)

**3.1 · Entregar o "aha" antes de pedir trabalho (onboarding no app).**
*Mecanismo:* mostrar valor antes do esforço; default é a decisão que você
tomou pelo usuário. O default "Nichos prontos" já ajuda, mas o usuário ainda
precisa rodar uma pesquisa e esperar para ver o 1º score.
*O que fazer:* uma pesquisa-exemplo pré-carregada (ou "ver um resultado de
exemplo") que mostra um card com score real na hora.
*Esforço:* pequeno-médio (lote de produto). *Não depende de infra externa.*
*Vazamento:* "pesquisou e desistiu no meio / não chegou ao valor".

**3.2 · Reduzir a fricção da confirmação de e-mail.**
*Achado:* hoje o usuário cadastra → sai do produto → procura o e-mail →
volta. É provável que seja o **maior dreno** da ativação (ver query 2 do
funil).
*O que fazer:* deixar a 1ª pesquisa acontecer antes de confirmar (adiar a
verificação), ou tornar o e-mail rápido e da marca.
*Depende de:* **1.1 (Resend)** para a parte do e-mail.

**3.3 · E-mail de ativação (reativar quem travou) — Zeigarnik (tarefa
incompleta puxa de volta).**
*Achado:* quem cadastra e não pesquisa não recebe nada.
*O que fazer:* e-mail "você se cadastrou mas ainda não mapeou nada — comece
por um destes nichos".
*Depende de:* **1.1 (Resend)**.

### P4 — Posicionamento

**4.1 · Afiar o ICP no hero — RCD Princípio 2 ("quem fala com todos não
convence ninguém").**
*Achado:* o hero fala com "criadores" de forma genérica.
*O que fazer:* se o alvo real é um perfil específico (ex.: criador travado
abaixo de 100k, ou gestor/agência de canais), dizer isso no hero.
*Bloqueio:* **depende de você decidir o ICP** — não dá para escolher o
público-alvo da empresa por você.

---

## Segurança relacionada (fora do funil, mas na fila da faxina)

**CSP completa — "item 7".** Ao montar a Content-Security-Policy (adiada na
auditoria M9), lembrar de permitir `va.vercel-scripts.com` (Web Analytics) e
os domínios de Stripe/Sentry.

## Dependências em uma olhada

```
P0 (medição)  ── habilita avaliar todo o resto
P1 Resend  ──┬─ 3.2 (fricção de e-mail)
             └─ 3.3 (e-mail de ativação)
2.1 Prova   ── depende de conteúdo do fundador
4.1 ICP     ── depende de decisão do fundador
3.1 Aha     ── independente (lote de produto quando quiser)
```

## Resumo executivo

1. **Ligue o analytics e rode o funil** (P0) — barato, hoje, e dá base para tudo.
2. **Faça o Resend** (P1) — destrava dois itens de ativação e o futuro de comunicação.
3. **Traga uma prova real** (P2) — maior alavanca de conversão; só depende de você.
4. Depois, **ativação** (P3) e **ICP** (P4).
