# 3 · Estratégia de Dados

> Este é o documento mais crítico do projeto. A economia de dados **é** a arquitetura do produto: dita custos, planos, UX e modelagem.

## 3.1 Fonte de dados: YouTube Data API v3 (decisão)

Usamos **exclusivamente a API oficial**. Motivos: custo zero em dinheiro, conformidade total com os termos do YouTube (pré-requisito para um negócio de longo prazo), e possibilidade de solicitar aumento de cota ao Google mediante auditoria — o caminho de crescimento legítimo. Alternativas descartadas: provedores de scraping (custo variável desde o dia 1, zona cinzenta legal, dependência frágil).

### Economia de cota (tabela de referência)

Cota padrão: **10.000 unidades/dia** por projeto Google Cloud.

| Operação | Endpoint | Custo | O que retorna |
|---|---|---|---|
| Busca por palavra-chave | `search.list` | **100** | 50 resultados/página (vídeos ou canais) |
| Dados de canais | `channels.list` | 1 | Até 50 canais/chamada: inscritos, playlist de uploads, estatísticas |
| Vídeos de um canal | `playlistItems.list` (playlist de uploads) | 1 | 50 vídeos/página |
| Métricas de vídeos | `videos.list` | 1 | Até 50 vídeos/chamada: views, likes, duração, data |

**Assimetria central:** analisar um canal de 500 vídeos custa ~21 unidades (1 channels + 10 playlistItems + 10 videos). Uma única busca por palavra-chave custa 100. Regra permanente: **`search.list` é artigo de luxo; todo o resto é commodity.**

> **Observação de produção (12/07/2026):** o console do Google mostra o sistema de cotas atual com **limites por método**: "Search Queries per day" = 100 requisições (equivalente ao teto de 100 buscas/dia do modelo de unidades) e "Queries per day" = 10.000 **requisições** no pool geral — buscas contam 1 ali, não 100. Na prática temos mais folga de coleta que o modelado. Nosso `quota_ledger` mantém o modelo clássico (busca = 100 un) deliberadamente: é mais conservador e serve de margem de segurança. Recalibrar apenas se a fila de prioridades represar.

Custos típicos por operação de produto:

| Operação de produto | Custo estimado | Cabem por dia (10k) |
|---|---|---|
| Analisar canal frio (~200 vídeos) | ~9 unidades | ~1.100 |
| Analisar canal em cache | 0 | ∞ |
| Recoleta incremental (canal já no corpus) | ~3 unidades | ~3.300 |
| Busca por keyword (1 página) | 100 | 100 |
| Nicho curado (3–5 keywords, sem cache) | 300–500 | 20–33 |

## 3.2 Corpus global compartilhado (decisão)

Todos os canais e vídeos coletados ficam em tabelas **globais**, compartilhadas entre todos os usuários (leitura), alimentadas apenas pelo pipeline de coleta (escrita via service role). Consequências:

1. **Cache hit = custo zero e resposta instantânea.** Se qualquer usuário analisou o canal X há menos de 7 dias, todos os demais recebem o resultado de imediato.
2. **O corpus é o fosso competitivo.** Concorrentes que consultam sob demanda pagam o custo integral a cada pesquisa, para sempre.
3. **Nichos curados aquecem o cache onde importa:** os usuários iniciais (Brasil) pesquisam os mesmos temas; o corpus PT-BR fica quente rapidamente.
4. **Buscas por keyword também são cacheadas:** a mesma keyword pesquisada por outro usuário em ≤ 72 h reutiliza o resultado (0 unidades em vez de 100).

## 3.3 Política de frescor e conformidade (decisão)

As políticas de serviços da API do YouTube exigem que dados armazenados sejam **atualizados ou descartados em até 30 dias**. Nossa política de frescor cumpre isso por construção:

| Idade dos dados do canal | Comportamento |
|---|---|
| ≤ 7 dias | Cache hit — servido direto do corpus |
| 7–30 dias | Servido do corpus **e** recoleta incremental agendada em background |
| > 30 dias | **Não é servido**; recoleta obrigatória antes de exibir; se o canal não for reprocessado, métricas expiram (expurgo) |

Recoleta incremental = buscar apenas vídeos novos desde a última coleta + atualizar métricas dos vídeos existentes em lotes de 50 (`videos.list`). Um job diário de manutenção renova os canais mais consultados dentro da sobra de cota do dia (prioridade mínima).

> **Teto de tamanho do corpus (consequência dos Termos).** A regra dos 30 dias é "atualizar **ou** deletar". Manter N canais frescos custa ≈ `N × 2,5 un ÷ 30` por dia. Reservando ~metade da cota padrão para manutenção (~5.000 un/dia), o corpus sustentável **sob cota padrão** fica na ordem de **~60 mil canais** — acima disso, ou se deleta a cauda longa (perdendo fosso), ou se depende da extensão de cota. Ou seja: o corpus **não cresce sem limite**; ele precisa ser continuamente regado, e a torneira é fixa. É por isso que a **extensão de cota é estrutural**, não só uma aceleração — ela define o tamanho máximo conforme do índice.

## 3.4 Orçamento de cota (decisão)

Serviço interno de **token bucket diário** sobre as 10.000 unidades, com reserva prévia: antes de qualquer chamada, o pipeline reserva o custo estimado; se não houver saldo, o job entra em fila para o próximo ciclo com aviso honesto na UI ("alta demanda — sua pesquisa está na fila").

Prioridades de consumo (maior → menor):

1. Pesquisa interativa de assinante (Pro > Criador)
2. Pesquisa interativa de usuário gratuito
3. Recoleta incremental de canais 7–30 dias
4. Manutenção/aquecimento de corpus

Reserva estratégica: 15% da cota diária nunca é consumida pelas prioridades 3–4, garantindo que pesquisas interativas do fim do dia não encontrem cota zerada. Métricas de consumo por prioridade são registradas desde o dia 1 — são a base do pedido de aumento de cota ao Google.

## 3.5 Pipeline de coleta (visão lógica)

Cada pesquisa dispara um job durável (Inngest) com etapas idempotentes:

```
resolver entrada → (se keyword/nicho) search.list → lista de canais-alvo
→ para cada canal: cache? ─sim→ publicar resultado imediato
                        └─não→ channels.list → playlistItems (paginado)
                               → videos.list (lotes de 50) → gravar no corpus
                               → calcular scores → publicar resultado parcial
→ consolidar pesquisa → marcar completa
```

- **Publicação progressiva:** cada canal concluído grava seu resultado e o frontend recebe via Supabase Realtime — o usuário nunca espera o lote inteiro.
- **Idempotência:** reprocessar uma etapa não duplica dados (upsert por ID do YouTube).
- **Limites de paralelismo:** coleta de canais em paralelo controlado (evita rajadas contra a API e contra o Postgres).
- **Profundidade de coleta (adaptativa desde o M4):** base de 200 vídeos mais recentes por canal (cobre ~2 anos da maioria dos canais ativos). Para canais de altíssima frequência de publicação (ex.: canais de cortes/lives com dezenas de uploads/dia), a *descoberta* pagina até 1.000 vídeos em busca de um mínimo de 50 vídeos elegíveis para baseline (≥ 14 dias), mas as *métricas* são buscadas só para os 200 mais recentes + os elegíveis (teto de 500) — profundidade sem desperdício de cota. Canal validado: CazéTV (~35 uploads/dia, 25 unidades, 71 vídeos com score).

> **Direção (ADR-007, 22/07/2026):** este pipeline é hoje disparado **na requisição do usuário** — correto na Fase 1, porque o custo real já caiu para ~100–390 un/pesquisa (cache + coleta capada + ranking). A direção-alvo é **inverter o gatilho**: a coleta migra de *usuário* para *cron*, e a pesquisa passa a ser servida 100% do corpus (`search.list` só em background). A migração é **faseada e disparada por métrica** — ver [doc 4, ADR-007](04-arquitetura.md) e `docs/pesquisa/plano-de-migracao-e-indexacao.md`. Enquanto a Fase 2 não é acionada, este fluxo permanece a verdade operacional.

## 3.6 Motor de outliers (o algoritmo)

### Fórmula central (decisão)

```
score(vídeo) = views(vídeo) / baseline(canal, formato, faixa de idade)
```

**Baseline = mediana** das views dos vídeos do mesmo canal, **do mesmo formato**, em faixa de idade comparável.

Três regras inegociáveis:

1. **Mediana, não média.** A média é inflada pelos próprios virais; a mediana representa o desempenho "normal" do canal. É o que torna o score honesto.
2. **Shorts ≠ vídeos longos.** Dinâmicas de distribuição incomparáveis (feed de Shorts vs. busca/sugestões). Heurística de classificação: duração ≤ 3 min = Short. Cada formato tem baseline próprio e os resultados são separados na UI.
3. **Ajuste por idade.** Views acumulam com o tempo. Vídeos com < 14 dias não entram no cálculo do baseline (ainda estão acumulando), e o score de um vídeo é calculado contra a mediana de vídeos em faixa de idade semelhante: 14 d–3 m, 3–12 m, > 12 m. Canal com menos de 10 vídeos elegíveis num formato/faixa usa a mediana geral do formato, sinalizando "baseline de baixa confiança" no resultado.

### Interpretação (exibida ao usuário)

| Score | Leitura |
|---|---|
| ≥ 3× | Oportunidade — tema puxou acima do normal do canal |
| ≥ 10× | Forte — demanda comprovada pelo tema |
| ≥ 30× | Excepcional — sinal raro, prioridade máxima de pauta |

Cada card de resultado exibe a explicação: *"438 mil views — 18× a mediana de vídeos longos deste canal (24 mil)"*. Score explicável é diferencial de confiança; nunca esconder o cálculo atrás de um número mágico.

### Evolução planejada (pós-MVP, registrada para não distorcer a modelagem)

- **Score composto de oportunidade:** multiplicador × fator de recência (outlier recente > antigo) × repetição entre canais (tema que explodiu em 3+ canais do nicho é sinal muito mais forte).
- **Sinais de engajamento:** razão likes/views e comentários/views como desempate.
- **Feedback loop:** favoritos e exportações como sinal de qualidade da recomendação para calibrar pesos.

## 3.7 Racionamento de `search.list` — e como reduzi-lo (ADR-007, Fase 1)

Buscas por keyword são o **único** recurso caro (100 un/chamada + teto de ~100 chamadas/dia por projeto). Todo o resto — coleta, refresh — é abundante. Barateá-las é a pergunta central do ADR-007. Regras e alavancas:

- **Cache do mapa keyword→canais com TTL longo.** O *mapa* de quais canais representam um tema (`keyword_results`) é um dado **estável** — os canais de "receita fácil" não mudam em dias. A partir da Fase 1, esse mapa é cacheado por **~30 dias** (não mais 72 h), enquanto as **métricas** dos vídeos/canais resolvidos seguem a política de frescor 7/30 (§3.3). Separar as duas TTLs corta a maioria dos `search.list` frios sem tocar em conformidade. *(Estado atual do código: TTL único de 72 h em `keywordService.KEYWORD_CACHE_HOURS` — a Fase 1 o desmembra.)*
- **Roteador keyword→nicho/keyword-conhecida (`pg_trgm`, custo zero).** Keyword nova que casa por similaridade com um nicho curado ou com uma keyword já resolvida é servida do corpus, sem `search.list`. Só keyword genuinamente inédita paga a busca.
- **Grafo como descoberta** (§3.8): antes de gastar `search.list`, expandir pelos canais que já coaparecem no corpus.
- Nicho curado consulta primeiro o cache; em cache quente, um nicho inteiro custa **0 unidades**.
- Análise direta de canal/lista **nunca** toca `search.list` — barata e generosa em todos os planos.

> **Métrica de plano (transição, ADR-007):** hoje conta-se "pesquisas/mês" (o proxy do custo de `search.list`). Quando a pesquisa passar a ser 100% corpus (Fase 2), esse proxy perde sentido e a cobrança migra para **canais monitorados + pedidos de indexação** — o que efetivamente consome cota. Ver [doc 7, §7.7](07-monetizacao.md).

## 3.8 Descoberta de canais relacionados — e motor de descoberta do corpus (ADR-007)

O endpoint oficial de canais relacionados foi descontinuado pelo YouTube. A descoberta é **derivada do corpus**: canais que coaparecem nos resultados das mesmas keywords/nichos ganham arestas de afinidade (tabela `channel_niche_affinity`, [doc 5](05-modelo-de-dados.md)). Quanto mais buscas acontecem, melhor a malha de relações — mais um retorno crescente do corpus compartilhado.

Hoje esse grafo (`services/relatedService.ts` + `channel_niche_affinity`) alimenta **apenas a UI** de "canais relacionados". No ADR-007 ele é **promovido a motor de descoberta**: expandir o corpus pelos canais que já coaparecem custa **zero unidades** e é mais preciso que busca por string (segue comportamento real, não texto). É a alavanca de maior retorno e menor custo para crescer o corpus sem `search.list` — 80% do código já existe.
