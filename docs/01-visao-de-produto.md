# 1 · Visão de Produto

## 1.1 O problema

Descobrir uma boa ideia de vídeo é a etapa de maior alavancagem na produção de conteúdo — e hoje é totalmente manual. Um criador precisa encontrar canais semelhantes, abrir cada um, comparar vídeo por vídeo (views × data × tamanho do canal) e repetir isso dezenas de vezes para extrair pouquíssimos insights. O processo consome horas, depende de experiência e não escala. Sem uma ideia validada, todo o investimento em roteiro, gravação e edição parte de um palpite.

## 1.2 A tese

**Vídeos que performam muito acima da média histórica do próprio canal revelam temas com demanda comprovada.** Um vídeo com 280 mil views num canal cuja mediana é 15 mil é um sinal mais valioso que um vídeo de 2 milhões num canal que sempre faz milhões — o primeiro prova que *o tema* puxou a audiência, não a marca do canal. Detectar esses outliers automaticamente, em escala, transforma horas de garimpo em minutos de análise.

## 1.3 O produto

Plataforma SaaS onde o criador informa um **nicho**, uma **palavra-chave**, um **canal** ou uma **lista de canais**, e recebe um painel de **oportunidades de conteúdo**: vídeos rankeados por desempenho excepcional relativo, com a justificativa de cada destaque ("18× a mediana do canal"), métricas, links e padrões identificados.

**Posicionamento:** copiloto inteligente de pesquisa de conteúdo. Não é um dashboard de métricas — é uma máquina de responder *"sobre o que vale a pena produzir o próximo vídeo?"*.

## 1.4 Público-alvo e personas

**Mercado inicial: criadores brasileiros de YouTube** (interface, corpus e pricing em PT-BR/R$). Ferramentas concorrentes fortes (1of10, vidIQ) operam em inglês e com pricing em dólar — há espaço claro para um player local.

### Persona primária — "Marina, criadora em crescimento"
- Canal com 5k–100k inscritos, publica 1–3 vídeos/semana, vive (ou quer viver) do canal.
- Dor: gasta 3–5 h/semana garimpando referências; sente que "chuta" os temas.
- Ganho: pauta validada por dados em minutos; consistência de publicação.
- Disposição a pagar: R$ 30–100/mês se economizar horas e melhorar o desempenho médio.

### Persona secundária — "Estúdio/agência"
- Gerencia 3–15 canais de clientes; precisa justificar pautas com dados.
- Ganho: pesquisa em lote (lista de canais), histórico organizado por cliente, exportação.
- Disposição a pagar: R$ 100–300/mês; sensível a limites de volume, não a preço.

### Persona terciária (pós-MVP) — empresas e consultorias de marketing de conteúdo.

## 1.5 Diferenciais competitivos

1. **Oportunidades, não métricas.** Concorrentes mostram números; nós respondemos a pergunta.
2. **Desempenho relativo como núcleo.** Score explicável baseado na mediana do próprio canal (ver [doc 3](03-estrategia-de-dados.md)).
3. **Corpus compartilhado.** Cada pesquisa de qualquer usuário enriquece o banco global → respostas cada vez mais rápidas e baratas. Efeito de rede de dados que ferramentas de consulta sob demanda não acumulam.
4. **Brasil primeiro.** Nichos curados em PT-BR, pricing em R$, corpus quente exatamente onde os usuários pesquisam.

## 1.6 Princípios de produto

Simplicidade · velocidade · interface limpa · poucos cliques até o valor · decisões baseadas em dados · alta performance percebida (resultados progressivos, nunca tela travada) · escalabilidade (milhares de usuários, centenas de milhares de vídeos).

**Regra de ouro de UX:** do login à primeira oportunidade na tela em menos de 60 segundos.

## 1.7 Métricas de sucesso (North Star + guardrails)

| Métrica | Definição | Meta inicial |
|---|---|---|
| **North Star: oportunidades acionadas** | Resultados favoritados ou exportados por semana | crescimento contínuo |
| Ativação | % de novos usuários que completam 1ª pesquisa e visualizam resultados em 24 h | ≥ 60% |
| Tempo até o valor | Cadastro → primeira lista de oportunidades | ≤ 60 s (cache) / ≤ 5 min (frio) |
| Retenção W4 | % ativos na 4ª semana após cadastro | ≥ 25% |
| Conversão free→pago | % de gratuitos que assinam em 30 dias | ≥ 3% |
| Custo de cota/usuário | Unidades de API consumidas por usuário ativo/dia | tendência de queda (cache) |

## 1.8 Riscos principais e mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| Cota da API do YouTube insuficiente em escala | Bloqueia crescimento | Corpus compartilhado + endpoints baratos + orçamento de cota por prioridade ([doc 3](03-estrategia-de-dados.md)); pedido de aumento de cota ao Google assim que houver tração |
| Conformidade com políticas da API (retenção de 30 dias) | Suspensão de acesso | Política de frescor/expurgo nativa do corpus ([doc 3, §3.6](03-estrategia-de-dados.md)) |
| Concorrente global lança versão PT-BR | Pressão competitiva | Velocidade de execução + nichos curados locais + preço em R$ |
| Fundador solo (bus factor = 1) | Continuidade | Documentação como fonte de verdade + arquitetura simples + serviços gerenciados |
| Score de outlier gerar recomendações ruins | Perda de confiança | Fórmula explicável, refinamento contínuo com feedback (favoritos = sinal de qualidade) |

## 1.9 Fora de escopo do produto (por ora)

Análise de outras plataformas (TikTok, Instagram, Twitch) · geração de conteúdo por IA (títulos, roteiros, thumbnails — roadmap pós-MVP) · dados privados de canais (YouTube Analytics do usuário) · app mobile nativo.
