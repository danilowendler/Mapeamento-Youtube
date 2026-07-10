# 2 · Requisitos & Escopo

O MVP é o **caminho A (comercial completo)**, entregue em três estágios lançáveis: **C → B → A**. Cada estágio é um produto utilizável — se o cronograma apertar, qualquer marco anterior sustenta um lançamento.

## 2.1 Estágio C — Núcleo mágico (semanas 1–3)

Objetivo: provar a tese de valor com o mínimo indispensável. Lançável para beta fechado.

| ID | User story | Critérios de aceite |
|----|-----------|---------------------|
| C1 | Como visitante, quero criar conta e entrar (e-mail/senha e Google) para acessar a plataforma | Supabase Auth; verificação de e-mail; sessão persistente; recuperação de senha |
| C2 | Como usuário, quero informar um canal (URL, @handle ou nome) para analisá-lo | Aceita os 3 formatos; resolve para ID canônico; erro claro se canal não existir |
| C3 | Como usuário, quero informar uma lista de canais (até o limite do plano) para análise em lote | Input multilinha; validação por item; itens inválidos sinalizados sem abortar o lote |
| C4 | Como usuário, quero ver as oportunidades de cada canal rankeadas por score | Score = views/mediana com ajuste de idade; Shorts e longos separados; cada card mostra o motivo do destaque |
| C5 | Como usuário, quero ver resultados aparecendo progressivamente | Cache exibido de imediato; canais frios entram conforme processados; barra de progresso "X de Y canais" |
| C6 | Como usuário, quero acessar minhas pesquisas anteriores | Lista com data, entrada e atalho para reabrir resultados sem reprocessar |
| C7 | Como sistema, preciso respeitar o orçamento diário de cota da API | Token bucket; pesquisa que excederia cota entra em fila com aviso honesto ao usuário |

## 2.2 Estágio B — Descoberta (semanas 4–6)

Objetivo: abrir a porta de entrada por tema, não só por canal. Lançável público (gratuito).

| ID | User story | Critérios de aceite |
|----|-----------|---------------------|
| B1 | Como usuário, quero pesquisar por palavra-chave para descobrir canais e vídeos do tema | `search.list` racionada por plano; resultados alimentam o corpus |
| B2 | Como usuário iniciante, quero escolher um nicho pronto em vez de inventar palavras-chave | Catálogo curado de nichos PT-BR (≥ 20 no lançamento), cada um = conjunto de keywords mantido por nós |
| B3 | Como usuário, quero descobrir canais relacionados aos que já analiso | Derivado do corpus: canais que coexistem nos mesmos resultados de busca/nicho (sem endpoint oficial — foi descontinuado) |
| B4 | Como usuário, quero filtrar resultados (score mín., faixa de views, idade do vídeo, tamanho do canal, formato Short/longo) | Filtros client-side sobre resultado carregado; estado de filtro preservado na sessão |
| B5 | Como usuário, quero ordenar por score, views, data ou tamanho do canal | Ordenação instantânea, sem nova consulta |
| B6 | Como usuário gratuito, quero entender meus limites e o que ganho assinando | Contador de uso visível; paywall claro e não hostil ao atingir limite |

## 2.3 Estágio A — Comercial (semanas 7–9)

Objetivo: cobrar. Lançamento oficial.

| ID | User story | Critérios de aceite |
|----|-----------|---------------------|
| A1 | Como usuário, quero assinar um plano pagando em R$ | Stripe Checkout; cartão; ciclo mensal; nota dos planos no [doc 7](07-monetizacao.md) |
| A2 | Como assinante, quero gerenciar minha assinatura | Stripe Customer Portal: trocar plano, atualizar cartão, cancelar |
| A3 | Como sistema, preciso aplicar os limites do plano em tempo real | Enforcement no service layer + contadores no banco; downgrade/cancelamento rebaixa limites no fim do ciclo |
| A4 | Como usuário, quero favoritar oportunidades para montar minha pauta | Favoritos por usuário; tela "minha pauta"; disponível a partir do plano Criador |
| A5 | Como assinante, quero exportar resultados em CSV | Exportação da pesquisa atual com todas as métricas visíveis |
| A6 | Como visitante, quero uma landing page que explique o produto | Proposta de valor, demo visual, planos, FAQ, CTA de cadastro |

## 2.4 Requisitos não-funcionais

| Categoria | Requisito |
|---|---|
| Performance | Pesquisa 100% em cache: primeiros resultados < 2 s. Pesquisa fria: primeiro resultado parcial < 15 s, 20 canais completos < 3 min |
| Escala | Suportar 5.000 usuários ativos/mês e corpus de 500 mil vídeos sem mudança de arquitetura |
| Disponibilidade | Serviços gerenciados (Vercel/Supabase/Inngest); sem SLA formal no MVP, alvo prático ≥ 99,5% |
| Segurança | RLS em todas as tabelas de usuário; segredos fora do cliente; rate limiting nas rotas públicas ([doc 8](08-seguranca-e-operacao.md)) |
| Conformidade | Políticas da API do YouTube (refresh/expurgo ≤ 30 dias); LGPD para dados de conta |
| Acessibilidade | Navegável por teclado; contraste AA; semântica correta |
| Responsividade | Desktop-first (persona trabalha em desktop), funcional em mobile |
| Idioma | 100% PT-BR; strings centralizadas para i18n futura |

## 2.5 Fora de escopo do MVP

Sugestões por IA (títulos/roteiros/thumbnails) · comparação lado a lado de canais · exportação Excel/Notion/Sheets · API pública · times/multiusuário · notificações de tendências · app mobile. Registrados no roadmap ([doc 1, §1.9](01-visao-de-produto.md)) — não entram em nenhuma decisão de agora, mas a modelagem não deve bloqueá-los.

## 2.6 Critério de pronto (Definition of Done) por estágio

- **C:** 10 usuários beta completam uma análise de lista sem suporte; custo de cota/pesquisa medido e registrado.
- **B:** usuário novo chega a oportunidades a partir de um nicho curado em < 60 s; taxa de ativação medida.
- **A:** primeira assinatura real processada de ponta a ponta (checkout → webhook → limites aplicados → portal).
