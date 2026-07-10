# 7 · Monetização & Planos

## 7.1 Modelo: freemium + assinatura mensal em R$

O plano gratuito é funil de aquisição (o momento "uau" precisa ser vivido de graça); os pagos vendem **volume e produtividade**. O eixo de preço mapeia diretamente para o custo real: pesquisas/mês e canais/pesquisa são os drivers de consumo de cota ([doc 3](03-estrategia-de-dados.md)).

## 7.2 Planos (decisão inicial — revisitar com dados reais de uso no estágio B)

| | **Gratuito** | **Criador — R$ 49/mês** | **Pro — R$ 99/mês** |
|---|---|---|---|
| Pesquisas/mês | 3 | 30 | 100 |
| Canais por pesquisa | 5 | 20 | 50 |
| Histórico | 7 dias | Completo | Completo |
| Favoritos (Minha Pauta) | — | ✅ | ✅ |
| Exportação CSV | — | ✅ | ✅ |
| Prioridade na fila de cota | Baixa | Média | Alta |
| Persona-alvo | Curioso/avaliação | Criador individual (Marina) | Agência / heavy user |

Racional dos números:
- **3 pesquisas gratuitas** bastam para 2–3 momentos "uau" sem sustentarem uso profissional contínuo. Custo marginal ≈ 0 (gratuito consome majoritariamente cache — prioridade baixa na cota).
- **R$ 49** ancora abaixo da percepção "ferramenta gringa em dólar" (1of10 ≈ US$ 15–40) e acima de "app descartável" — compatível com a disposição da persona (R$ 30–100).
- **Pro a 2× o preço com 3,3× o volume** — upgrade racional para quem opera multi-canal; margem cresce com o cache.
- Anual com desconto (~2 meses grátis): fica para pós-lançamento, quando houver confiança de retenção.

## 7.3 Enforcement técnico (resumo — detalhes no [doc 4, ADR-006](04-arquitetura.md))

- Limites versionados em `plans.limits` (jsonb); consumo em `usage_periods` incrementado **na mesma transação** que cria a pesquisa.
- Verificação exclusivamente no service layer; a UI apenas exibe contadores e antecipa o paywall.
- Downgrade/cancelamento: limites atuais valem até o fim do ciclo pago (`cancel_at_period_end`); upgrade: efeito imediato com proração do Stripe.
- Excedente: não existe compra avulsa no MVP — atingiu o limite, o caminho é upgrade (simplicidade primeiro; pacotes extras são candidato pós-MVP para agências).

## 7.4 Integração Stripe

- **Checkout Session** para assinar (nunca formulário de cartão próprio); **Customer Portal** para trocar plano/cartão/cancelar. Superfície de PCI e de código mínimas.
- Webhooks mínimos: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed` → única fonte de escrita em `subscriptions`.
- Falha de pagamento: status `past_due` mantém acesso por 7 dias com aviso na UI; depois, rebaixa para limites do gratuito (sem apagar nada). Dunning por e-mail via Stripe.
- Moeda BRL; cartão no MVP. **Pix** (via Stripe) é candidato forte pós-lançamento — relevante no Brasil, mas exige tratar assinatura recorrente sem cartão; não bloqueia o MVP.

## 7.5 Métricas de negócio (acompanhadas desde o estágio A)

MRR · assinantes por plano · conversão free→pago (meta ≥ 3% em 30 dias) · churn mensal (alerta > 8%) · custo de cota por usuário ativo (deve cair com o aquecimento do corpus) · % de pesquisas servidas 100% de cache (proxy da margem).

## 7.6 Alavancas de crescimento embutidas no produto

1. **URLs de resultado compartilháveis** ([doc 6, §6.4](06-ux-ui.md)) — pesquisa vista por não-usuário → cadastro para pesquisar o próprio nicho.
2. **Corpus como conteúdo:** páginas públicas SEO com recortes agregados por nicho ("os vídeos que explodiram em Finanças este mês") — candidato pós-MVP, motor de aquisição orgânica barato.
3. **Exportação carimbada:** CSV inclui linha de origem com URL do produto — distribuição passiva via relatórios de agências.
