# BEVIEWER — Arquitetura de Dados e Plano de Monetização

> Documento de pesquisa/decisão importado para o repo (21/07/2026) como material
> de partida da sessão dedicada ao problema de cota da YouTube Data API. Consolida
> a análise de custo, a justificativa para abandonar a consulta direta, o desenho do
> modelo indexado, a estratégia de cobertura de nichos e a estrutura de preços.
> **Status:** proposta a ser validada/refinada — ver `ADR-007-inversao-do-gatilho-de-coleta.md`.
> Versão 1 — julho de 2026.

---

## 1. Resumo executivo

**A decisão central:** o BEVIEWER deixa de consultar a API do YouTube em tempo real
durante a requisição do usuário. A API passa a ser usada exclusivamente para alimentar
um índice próprio em PostgreSQL, em processos de background. Toda consulta do usuário é
servida a partir desse índice.

**Por quê, em uma linha:** com consulta direta, o teto de receita da empresa inteira é de
aproximadamente R$ 27 mil por mês e a margem piora conforme a base cresce. Com índice, não
existe teto de consultas, e o custo por assinante cai mês a mês.

**O que passamos a vender:** não é acesso à API do YouTube — isso qualquer um tem, de graça.
É acesso ao corpus proprietário do BEVIEWER. Um concorrente novo enfrenta exatamente a mesma
cota de 10.000 unidades por dia e leva meses para reconstruir o que já indexamos. Cada noite
de indexação é um ativo acumulado que não se compra com dinheiro.

**Números-chave:**

| Indicador | Consulta direta | Índice |
|---|---|---|
| Custo por pesquisa do usuário | ~920 unidades | 0 unidades |
| Capacidade da plataforma | ~325 pesquisas/mês (total) | ilimitada |
| Teto de receita | ~R$ 27 mil/mês | sem teto de cota |
| Latência da resposta | segundos a minutos | milissegundos |
| Margem com escala | piora | melhora |
| Comportamento em pico de tráfego | colapso | absorve |
| Barreira competitiva | nenhuma | corpus proprietário |

---

## 2. Por que a consulta direta não compensa

### 2.1 A conta que inviabiliza o modelo

Formato original do produto: até 1.000 vídeos analisados por canal, até 20 canais por pesquisa.

Custo de uma única pesquisa:

```
search.list (descoberta por palavra-chave)          = 100 unidades
Por canal:
  channels.list                                     =   1 unidade
  playlistItems.list  (1.000 vídeos ÷ 50 por página)=  20 unidades
  videos.list         (1.000 vídeos ÷ 50 por lote)  =  20 unidades
                                                    -------------
  Subtotal por canal                                =  41 unidades

Pesquisa com 20 canais: 100 + (20 × 41)             = 920 unidades
```

A cota padrão da YouTube Data API v3 é de **10.000 unidades por dia**.

```
10.000 ÷ 920 = 10,8 pesquisas por dia
             → ~325 pesquisas por MÊS, para a plataforma INTEIRA
```

### 2.2 A consequência comercial

A tabela de preços original do site vendia 100 pesquisas por mês no plano Pro (R$ 99).

```
325 pesquisas disponíveis ÷ 100 por assinante = 3,25 assinantes Pro
3 × R$ 99 = R$ 297/mês
```

**Três assinantes consomem 100% da capacidade da empresa.** O teto absoluto de receita da
operação, com aquela estrutura, era de R$ 297 por mês. Esse é o número que torna a discussão de
preço secundária: nenhuma tabela de preços resolve um teto de capacidade.

Mesmo com as três otimizações possíveis dentro do modelo direto — reduzir para 200 vídeos por
canal, tirar o `search.list` do fluxo padrão e adicionar cache de 72 horas — a capacidade sobe
para cerca de 2.000 pesquisas por mês, o que sustenta aproximadamente 150 assinantes e um teto
de ~R$ 27 mil por mês. Melhor, mas ainda um teto rígido.

### 2.3 As quatro razões estruturais

**Razão 1 — a margem piora com escala.** No modelo direto, cada usuário adicional consome cota
adicional. O custo marginal é constante e a receita por usuário não cresce. Isso é o inverso da
curva de um SaaS saudável, onde o custo marginal tende a zero. Você estaria operando com a
economia de uma consultoria, não de um produto de software.

**Razão 2 — o pico de tráfego derruba a operação.** Um canal de 14 milhões de inscritos gera
tráfego em pico, não em fluxo. Se o BEVIEWER for citado em um vídeo, chegam milhares de cadastros
em duas horas. Com consulta direta, a cota diária inteira morre nos primeiros 15 minutos e todos
os demais visitantes veem tela de erro — queimando o ativo de distribuição mais valioso da
empresa, de forma irreversível e gratuita.

**Razão 3 — o limite de pesquisas destrói a ativação.** Cobrar por "pesquisas por mês" pune
exatamente o comportamento que gera o momento de valor: explorar. O usuário do plano gratuito faz
duas ou três pesquisas, uma delas dá resultado morno, e ele abandona o produto antes de ver um
outlier de 700×. Quem raciona uso não cria hábito, e quem não cria hábito cancela no segundo mês.

**Razão 4 — não há barreira competitiva.** Se o produto é uma camada fina sobre a API pública,
qualquer concorrente replica em semanas. Não existe ativo acumulado, não existe defensabilidade, e
a concorrência vira uma guerra de preço.

### 2.4 O que a consulta direta resolve bem

Para registro e honestidade intelectual: consulta direta é a escolha certa para validar hipótese
com dezenas de usuários e para lançar em dias em vez de semanas. Foi útil para chegar até aqui. O
que ela não faz é escalar — nem em receita, nem em experiência, nem em defensabilidade.

---

## 3. A arquitetura indexada

### 3.1 Princípio fundamental

> A API é usada para **alimentar** o índice. Nunca para **servi-lo**.

Nenhuma requisição de usuário toca a YouTube Data API. Toda consulta é uma query no PostgreSQL:
custo de cota zero, latência de milissegundos, capacidade limitada apenas por infraestrutura.

### 3.2 Separação de responsabilidades

```
┌─────────────────────────────────────────────────────────────────┐
│  PLANO DE CONTROLE  (background, consome cota)                   │
│                                                                  │
│  Worker de descoberta   → acha canais novos por vertical         │
│  Worker de indexação    → primeira carga de um canal             │
│  Worker de refresh      → atualização incremental                │
│  Worker de fila         → pedidos de indexação dos usuários      │
│                                                                  │
│  Orçamento: 10.000 unidades/dia (ou o teto estendido)            │
└───────────────────────────┬──────────────────────────────────────┘
                            │ escreve
                            ▼
                  ┌──────────────────┐
                  │   PostgreSQL     │
                  │   (o corpus)     │
                  └────────┬─────────┘
                           │ lê
┌──────────────────────────┼───────────────────────────────────────┐
│  PLANO DE DADOS  (requisição do usuário, cota zero)              │
│                                                                  │
│  Busca, filtro, ordenação, score, mediana, Minha Pauta,          │
│  exportação CSV, alertas, API pública, páginas de ranking        │
│                                                                  │
│  Orçamento: ilimitado                                            │
└──────────────────────────────────────────────────────────────────┘
```

### 3.3 O custo de indexar

**Carga inicial de um canal (200 vídeos mais recentes):**

```
channels.list                                    =  1 unidade
playlistItems.list  (200 ÷ 50 = 4 páginas)       =  4 unidades
videos.list         (200 ÷ 50 = 4 lotes)         =  4 unidades
                                                 ------------
Total                                            =  9 unidades
```

**Atualização incremental do mesmo canal:**

```
playlistItems.list  (apenas a 1ª página, 50 itens)=  1 unidade
videos.list         (1 lote com esses 50 IDs)     =  1 unidade
                                                  ------------
Total                                             =  2 unidades
```

Esta assimetria — 9 para criar, 2 para manter — é o que torna a operação sustentável. Uma única
chamada da primeira página entrega tudo o que importa: vídeos novos publicados desde a última
visita **e** as contagens de views atualizadas dos vídeos recentes. Vídeos antigos já
estabilizaram; entram no cálculo da mediana histórica e não precisam ser tocados novamente.

### 3.4 Por que 200 vídeos e não 1.000

A mediana do canal não fica mais precisa com 1.000 vídeos — fica mais **enviesada**. Vídeos de
2018 refletem um canal que não existe mais, um algoritmo que mudou e uma audiência diferente. Uma
baseline de 150 a 200 vídeos recentes é estatisticamente sólida e conceitualmente mais honesta.

Efeito colateral: o custo por canal cai de 41 para 9 unidades, uma redução de 78%.

A análise profunda de 1.000 vídeos permanece disponível como recurso do plano Estúdio, para
análise histórica de longo prazo — passa a ser diferencial de plano alto em vez de custo padrão.

### 3.5 Regra sobre o `search.list`

`search.list` custa **100 unidades por chamada** (50 resultados). É o endpoint mais caro da API
por uma ordem de grandeza: uma única busca por palavra-chave custa mais que indexar 11 canais
completos.

**Regra:** `search.list` nunca entra no caminho de uma requisição de usuário. Ele existe apenas no
worker de descoberta, executando em background, como custo pontual por vertical — não recorrente.

---

## 4. Como pesquisar: descoberta e cobertura de nichos

### 4.1 O problema

Um usuário faz apenas vídeos de Minecraft. Outro, apenas de beleza. Outro, culinária. Como garantir
que todos os nichos estejam representados com apenas 10.000 unidades por dia?

### 4.2 O reenquadramento

"Cobrir todos os tópicos" não significa indexar o YouTube inteiro. Para calcular a mediana de um
canal e detectar outliers relativos, é preciso ter **canais suficientes por nicho**, não todos os
canais existentes. Um nicho fica bem representado com 200 a 400 canais.

O usuário de Minecraft não precisa que beleza esteja no corpus. Precisa que Minecraft esteja
**profundo**. Cobertura é um problema de sequenciamento, não de capacidade.

### 4.3 Construção inicial: dez dias

Meta de lançamento: **30 verticais × 300 canais = 9.000 canais.**

| Etapa | Cálculo | Custo | Dias |
|---|---|---|---|
| Descoberta (30 nichos × 5 buscas) | 150 × 100 | 15.000 un | 1,5 |
| Indexação inicial | 9.000 × 9 | 81.000 un | 8,1 |
| **Total** | | **96.000 un** | **~10 dias** |

Dez dias de indexação entregam Minecraft, beleza, culinária, fitness, finanças, tecnologia, vlog,
true crime, automobilismo, pets e mais vinte verticais — todas com densidade suficiente para que
qualquer usuário encontre o próprio universo mapeado no primeiro login.

Dentro de uma janela de 45 dias pré-lançamento, há folga para três a quatro rodadas de expansão.

### 4.4 As quatro estratégias de descoberta

**Estratégia 1 — sementes curadas manualmente (custo zero).** Para cada vertical, montar à mão uma
lista de 20 a 30 canais de referência conhecidos. Não custa cota nenhuma, tem qualidade máxima e
serve de ponto de partida para a expansão por grafo.

**Estratégia 2 — `search.list` por vertical (custo pontual).** Cinco buscas bem construídas por
vertical entregam até 250 canais candidatos por 500 unidades. Usar variações de termo, não
repetições: para culinária, por exemplo, "receita fácil", "confeitaria", "churrasco", "comida
japonesa", "marmita fitness" — não cinco formas de escrever "culinária".

**Estratégia 3 — expansão por grafo (custo zero, a mais importante no longo prazo).** Depois das
sementes, `search.list` fica caro demais para escalar. Use o próprio corpus para crescer: canais
que aparecem nos mesmos temas, que compartilham palavras-chave de título, que operam na mesma
faixa de audiência, que são citados nas descrições uns dos outros. Os metadados já estão no banco —
a expansão custa zero unidade e é mais precisa que busca por string, porque segue comportamento
real em vez de texto.

**Estratégia 4 — indexação puxada por demanda.** No cadastro, perguntar o nicho do usuário.
Priorizar a fila de indexação pelo que os usuários reais pedem. Cada vertical indexada que ninguém
solicitou é cota desperdiçada. Este é o mecanismo que evita construir para um mercado imaginário.

### 4.5 Filtro de entrada

Canal com menos de 10 vídeos, ou parado há mais de 12 meses, não gera outlier útil e consome as
mesmas 9 unidades de um canal ativo.

Verificar com `channels.list` (1 unidade) antes de comprometer as outras 8. Um filtro que descarta
30% dos candidatos economiza cerca de 2.400 unidades a cada mil canais avaliados.

### 4.6 Cauda longa: pedido de indexação como feature

É impossível prever todo canal que todo usuário vai querer. A solução não é tentar — é transformar
a lacuna em produto. Canal fora do corpus vira um **pedido de indexação** na fila noturna:

| Plano | Tempo de entrada |
|---|---|
| Grátis | até 72h |
| Criador | fila noturna |
| Pro | fila noturna prioritária |
| Estúdio | slot reservado |

O tempo de espera vira diferenciação de plano em vez de limitação percebida. E o produto aprende
sozinho quais nichos importam, sem que ninguém precise adivinhar.

---

## 5. Cadência de atualização

### 5.1 Refresh escalonado por relevância

Atualizar tudo na mesma frequência é desperdício. Canal ativo e monitorado por muitos usuários muda
todo dia; canal de cauda longa que publica uma vez por mês não muda nada em uma semana.

| Camada | Critério | Canais | Cadência | Custo/dia |
|---|---|---|---|---|
| A | Ativos e monitorados por usuários pagantes | 900 | diária | 1.800 un |
| B | Relevantes do nicho, publicação regular | 2.700 | a cada 3 dias | 1.800 un |
| C | Cauda longa, baixa frequência | 5.400 | semanal | 1.550 un |
| | **Manutenção total** | **9.000** | | **~5.150 un** |

### 5.2 O orçamento diário resultante

```
Cota diária                          10.000 unidades
Manutenção do corpus (9.000 canais)   5.150 unidades
                                     ----------------
Disponível para expansão              4.850 unidades

4.850 ÷ 9 unidades por canal = ~540 canais novos por dia
                             = ~16.000 canais novos por mês
```

**Trajetória de crescimento sem extensão de cota:**

| Momento | Tamanho do corpus |
|---|---|
| Lançamento (dia 10) | 9.000 canais |
| Mês 1 | ~22.000 canais |
| Mês 2 | ~36.000 canais |
| Mês 3 | ~50.000 canais |

Com a extensão de cota aprovada, este ritmo multiplica proporcionalmente.

### 5.3 Extensão de cota

Solicitar a extensão pelo formulário oficial de auditoria (Audit and Quota Extension) desde já. O
processo leva semanas e determina a velocidade de crescimento do corpus. É uma tarefa bloqueante de
lançamento, não de backlog. O FAQ do site já afirma conformidade com os termos da plataforma —
formalizar isso antes do lançamento é coerente e reduz risco.

---

## 6. Modelo de dados

Esboço mínimo em PostgreSQL:

```sql
canais
  id, youtube_channel_id, nome, inscritos, pais, idioma,
  vertical_id, camada_refresh, ativo,
  indexado_em, atualizado_em

videos
  id, canal_id, youtube_video_id, titulo, publicado_em,
  duracao_seg, formato,          -- 'short' | 'longo'
  views, likes, comentarios,
  coletado_em

baselines
  canal_id, formato, faixa_idade,
  mediana_views, p25, p75, n_amostra,
  calculado_em

outliers                          -- materializado, recalculado no refresh
  video_id, canal_id, multiplo, score, vertical_id,
  detectado_em

verticais
  id, nome, slug, queries_descoberta[], prioridade

pautas                            -- Minha Pauta do usuário
  usuario_id, video_id, notas, salvo_em

monitoramentos                    -- canais que o usuário acompanha
  usuario_id, canal_id, criado_em

fila_indexacao
  canal_url, usuario_id, plano, prioridade, status, criado_em
```

**Pontos de atenção:**

- Shorts e vídeos longos precisam de baselines **independentes**. O algoritmo do YouTube trata os
  formatos de forma distinta; misturá-los produz score desonesto. Isso já é um diferencial declarado
  do produto e precisa estar no modelo desde o início.
- A tabela `outliers` deve ser materializada e recalculada no refresh, não computada em tempo de
  consulta. É o que garante resposta em milissegundos.
- Faixa de idade do vídeo importa: um vídeo de três dias e um de três anos não são comparáveis na
  mesma régua.

---

## 7. Plano de monetização

### 7.1 A unidade de valor

Com o modelo indexado, a métrica de cobrança muda de "pesquisas" para:

1. **Canais monitorados** — o que efetivamente consome cota
2. **Profundidade e frescor do corpus** — o que foi construído
3. **Assentos** — quantas pessoas da equipe acessam

Pesquisa passa a ser **ilimitada em todos os planos**, porque não custa nada e porque limitar
exploração mata o momento de ativação.

### 7.2 Tabela de planos

| | **Grátis** | **Criador** | **Pro** | **Estúdio** |
|---|---|---|---|---|
| Preço mensal | R$ 0 | R$ 79 | R$ 179 | R$ 449 |
| Anual (20% off) | — | R$ 63/mês | R$ 143/mês | R$ 359/mês |
| Pesquisas no corpus | ilimitadas | ilimitadas | ilimitadas | ilimitadas |
| Canais por pesquisa | 5 | 20 | 50 | ilimitado |
| Canais monitorados | 0 | 10 | 40 | 150 |
| Alertas de outlier | — | semanal | diário | tempo real |
| Pedidos de indexação | 3/mês | 40/mês | 150/mês | 500/mês |
| Prioridade na fila | 72h | noturna | noturna prioritária | slot reservado |
| Profundidade da análise | 200 vídeos | 200 vídeos | 400 vídeos | 1.000 vídeos |
| Histórico do corpus | 7 dias | completo | completo | completo |
| Minha Pauta | — | ilimitada | ilimitada | por cliente |
| Exportação | — | CSV | CSV | CSV + PDF white-label |
| Assentos | 1 | 1 | 3 | 8 (+R$ 49 extra) |
| Acesso à API | — | — | créditos | créditos |

**Versão internacional (USD, por geolocalização):** Creator US$ 19 · Pro US$ 39 · Studio US$ 99 —
anual com 20% de desconto. O dado é global e a dor é global. Precificar apenas em real limita o
teto de receita por uma decisão de front-end.

### 7.3 Justificativa dos preços

**Por que R$ 79 e não R$ 49 (preço original do site).** R$ 49 equivale a cerca de US$ 9, contra
1of10 a US$ 29–69, VidIQ a US$ 39, Spotter Studio a ~US$ 49 e OutlierKit a US$ 29. Estar 3× abaixo
do piso da categoria não é vantagem competitiva — é sinal de posicionamento fraco. Para um público
que gasta R$ 3.000 com um editor de vídeo, R$ 49 comunica "ferramentinha", não "infraestrutura de
decisão". Além disso, R$ 49 não cobre cota, gateway de pagamento e suporte com margem defensável.

**Por que mais barato que o cenário de consulta direta (R$ 97/247/597).** Naquele modelo o preço
racionava um recurso escasso. Aqui ele posiciona um produto abundante. R$ 79 com pesquisa ilimitada
converte muito melhor que R$ 97 com 15 pesquisas, e o custo marginal do usuário adicional é próximo
de zero. Volume passa a ser aliado, não inimigo.

**Por que o plano gratuito é raso de propósito.** O usuário explora o corpus inteiro à vontade e
sente a precisão da ferramenta. Bate na parede apenas quando quer **o canal dele** ou **o
concorrente específico dele** — o momento de máxima intenção de pagar. E o que ele perde ao não
assinar é o trabalho acumulado na Minha Pauta, não o acesso ao dado. Isso é lock-in saudável.

**Por que anual desde o dia 1.** Neste mercado o churn é brutal: criador testa ferramenta, usa três
semanas, cancela. O plano anual converte um LTV de 2,5 meses em 12 meses. É a alavanca isolada de
maior impacto no negócio — maior que qualquer funcionalidade.

### 7.4 Projeção de receita

| Base de assinantes | Mix (Criador/Pro/Estúdio) | Receita mensal |
|---|---|---|
| 40 | 25 / 12 / 3 | ~R$ 5.500 |
| 100 | 60 / 32 / 8 | ~R$ 14.000 |
| 500 | 300 / 160 / 40 | ~R$ 70.000 |

O ponto crítico: o custo de cota entre 100 e 500 assinantes **cresce pouco**, porque o corpus é
compartilhado entre todos. É essa curva — e não o preço — que torna o modelo indexado superior.

---

## 8. Camadas de receita complementares

**Alertas de outlier — o motor de retenção.** "Apareceu um vídeo 47× no nicho que você acompanha",
chegando por e-mail toda segunda-feira, transforma consulta pontual em hábito semanal. Era
impossível no modelo direto — monitorar 40 canais para 100 usuários estouraria a cota em uma manhã.
No modelo indexado é uma query no Postgres. É a funcionalidade que derruba churn e a que justifica o
salto de R$ 79 para R$ 179.

**Créditos avulsos — R$ 39 por 50 pedidos de indexação extras.** Válvula de escape, não upsell. Quem
estoura o limite não bate em parede: compra. E o preço unitário calibra toda a tabela de planos.

**API pública — R$ 0,10 por chamada, planos Pro e Estúdio.** Viável apenas no modelo indexado,
porque você serve o próprio banco. Abre o mercado de automação (n8n, dashboards internos de
produtora) e é diferencial que concorrentes diretos não oferecem.

**Assentos adicionais — R$ 49.** Canal grande não é uma pessoa: é dono, pesquisador de pauta,
roteirista, designer de thumbnail. Multiplica ticket com custo marginal praticamente zero, já que a
equipe consulta o mesmo corpus.

**Relatório white-label — dentro do Estúdio.** Agência que cobra R$ 8 mil por mês do cliente precisa
entregar documento com a marca dela. Custo de desenvolvimento baixo, e é o item que fecha a venda do
plano de R$ 449.

**Rankings públicos — aquisição orgânica.** Com corpus indexado, é possível publicar páginas abertas
do tipo "os 50 maiores outliers de gaming BR desta semana". Rankeiam no Google, geram tráfego
contínuo e funcionam como prova viva do produto. Custo zero. O modelo de consulta direta jamais
permitiria isso.

**Programa de afiliados — 30% a 40% recorrente.** Essencial dado o canal de distribuição disponível.
Detalhado na seção seguinte.

---

## 9. Lançamento com o JP PLAYS

Um beta tester com 14 milhões de inscritos não é um beta tester. É o canal de aquisição inteiro dos
primeiros seis meses, e ele só dispara uma vez.

### Fase 0 — Construir corpus antes de divulgar (bloqueante)

O produto só tem valor no dia 1 se o corpus já estiver cheio. Rodar 30 a 45 dias de indexação antes
de qualquer anúncio, priorizando gaming BR e verticais adjacentes ao público do JP. Meta: 3.000 a
5.000 canais no mínimo, idealmente 9.000. Um usuário que chega e encontra o próprio nicho já mapeado
converte. Um que encontra tela vazia não volta nunca. Em paralelo: solicitar a extensão de cota (leva
semanas).

**Densidade específica para gaming BR:** 800 a 1.000 canais só nessa vertical, incluindo os
concorrentes diretos do JP e os canais pequenos do nicho — que é onde os outliers mais puros aparecem.
Custo: ~9.000 unidades, um único dia de cota.

### Fase 1 — Founding Members, 200 vagas

Criador a R$ 49 e Pro a R$ 127, travados vitaliciamente, pagos **anual e à vista**. Objetivos: caixa
antecipado para bancar a indexação e a infraestrutura, e um núcleo de usuários com interesse real no
sucesso do produto para servir de base de feedback. Expira por vaga preenchida, não por data.

### Fase 2 — O JP como sócio comercial, não como cortesia

O erro caro seria dar uma conta grátis, colher um depoimento e seguir. Isso queima o ativo.

- **Comissão recorrente de 35%, vitalícia**, sobre tudo que entrar pelo link ou cupom dele. Com 400
  assinantes de R$ 179, são cerca de R$ 25 mil por mês passivos. Isso o transforma em vendedor, não em
  favor.
- **Landing dedicada** em `beviewer.com/jp`, com a análise real do canal dele exposta como prova:
  "este vídeo do JP fez 54× a mediana do canal — a plataforma achou em 8 segundos". É prova social e
  conteúdo ao mesmo tempo.
- **Alternativa:** rev-share global ou participação simbólica, se ele quiser entrar como
  sócio-embaixador.

### Fase 3 — A rede de amigos dele

Não distribuir 10 contas grátis. Oferecer: **Pro vitalício para o criador, desde que a produtora dele
assine o Estúdio.** O criador vira porta de entrada dentro da empresa, e quem paga é o CNPJ — que não
cancela por R$ 449.

### Observação sobre capacidade

No modelo indexado, **não é necessário waitlist**. O pico de tráfego de um canal de 14 milhões não
derruba nada: são leituras de PostgreSQL. Esta é a diferença mais concreta entre as duas
arquiteturas, e ela vale exatamente no dia em que mais importa.

### Alerta de concentração

Não construir o roadmap ao redor de um único canal. O JP serve para validar e para o pico inicial de
tráfego, mas o cliente ideal provável **não** é o canal de 14 milhões — esses têm equipe e verba para
Spotter Studio. É o canal de 10 mil a 500 mil inscritos, que ainda pesquisa pauta na mão. Criador e
Pro devem ser desenhados para esse perfil.

---

## 10. Métricas de controle

| Métrica | Alvo | O que fazer se desviar |
|---|---|---|
| Cobertura de nicho (% de buscas com corpus suficiente) | > 80% | Redirecionar a fila de indexação, não o marketing |
| Tempo até o primeiro item salvo na Pauta | < 5 min | Otimizar onboarding e primeira tela |
| ≥ 5 itens salvos na primeira semana | > 40% dos novos | Melhor preditor de retenção disponível |
| Churn no mês 2 | < 10% | Os alertas não estão bons o suficiente |
| Custo de cota por assinante | **deve cair** mês a mês | Se subir, a estratégia de frescor está mal calibrada |
| Conversão grátis → pago | 3% a 5% | Revisar o ponto de fricção do plano gratuito |
| Adesão ao plano anual | > 30% | Revisar o desconto e a comunicação |

**Teste de sensibilidade de preço:** rodar Van Westendorp com os primeiros 100 usuários — perguntar a
partir de que preço é caro demais e a partir de que preço é barato a ponto de gerar desconfiança. A
hipótese é que o piso de desconfiança está acima de R$ 49.

---

## 11. Roadmap de execução

**Semana 1**
- Solicitar extensão de cota (bloqueante, leva semanas)
- Modelar o schema em PostgreSQL
- Escrever o worker de indexação com contabilidade de cota por chamada

**Semana 2**
- Definir as 30 verticais e escrever as queries de descoberta de cada uma
- Curar as sementes manuais (20 a 30 canais por vertical)
- Rodar a descoberta inicial (~15.000 unidades)

**Semanas 2 a 4**
- Indexação inicial dos 9.000 canais (~81.000 unidades, ~8 dias)
- Implementar cálculo de baseline separado para Shorts e longos
- Materializar a tabela de outliers

**Semana 4**
- Migrar a busca do front-end para o índice
- Implementar as camadas de refresh (A/B/C)
- Implementar a fila de pedidos de indexação

**Semana 5**
- Nova tabela de preços no site, com toggle mensal/anual e detecção de moeda
- Alertas de outlier por e-mail
- Exportação CSV e PDF white-label

**Semana 6**
- Programa Founding Members no ar
- Landing dedicada do JP
- Sistema de afiliados com rastreamento de cupom

**Semana 7 em diante**
- Lançamento
- Expansão contínua do corpus por grafo e por demanda

**Se o cronograma com o JP for inegociável:** é possível lançar com corpus parcial cobrindo apenas
gaming BR com alta densidade e expandir por vertical depois. O que não se pode fazer é lançar com
corpus vazio — seria o pior dos dois mundos.

---

## 12. Riscos e mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| Extensão de cota negada ou demorada | Alto | Solicitar já; operar 9.000 canais cabe na cota padrão |
| Corpus vazio no dia do lançamento | Crítico | Fase 0 obrigatória; densidade em gaming BR primeiro |
| Mudança nos termos da API do YouTube | Alto | Usar apenas dados públicos e endpoints documentados; manter o corpus como cache legítimo, não redistribuição |
| Dependência de um único canal de aquisição | Médio | Rankings públicos e SEO em paralelo desde o lançamento |
| Churn alto no mês 2 | Alto | Alertas de outlier como motor de hábito; plano anual |
| Concorrente com corpus maior | Médio | Profundidade por vertical vale mais que amplitude; foco no mercado BR primeiro |
| Custo de infraestrutura crescendo com o corpus | Baixo | PostgreSQL escala barato; monitorar custo por assinante |

---

## 13. Anexo: tabela de custos por endpoint

**YouTube Data API v3 — custo em unidades de cota**

| Endpoint | Custo | Retorno | Uso no BEVIEWER |
|---|---|---|---|
| `search.list` | **100** | até 50 resultados | Apenas descoberta, em background |
| `channels.list` | 1 | até 50 canais | Metadados e filtro de entrada |
| `playlistItems.list` | 1 | até 50 itens | Listagem de uploads |
| `videos.list` | 1 | até 50 vídeos | Estatísticas e duração |
| `playlists.list` | 1 | até 50 playlists | Não utilizado |
| `commentThreads.list` | 1 | até 100 comentários | Não utilizado |

**Cota padrão:** 10.000 unidades por dia, por projeto do Google Cloud.

**Observação importante sobre OAuth:** autenticar o usuário via OAuth **não aumenta a cota**. A cota é
por projeto do Google Cloud, não por usuário autenticado. Conectar a conta do criador serve para
acessar dados privados dele através da **YouTube Analytics API** (retenção, CTR, impressões) — o que é
um excelente diferencial de plano Pro — mas não adiciona nenhuma unidade ao orçamento diário. Qualquer
plano de escala que dependa disso precisa ser refeito.

**Fórmulas de referência:**

```
Carga inicial de canal  = 1 + ceil(V/50) + ceil(V/50)     [V = vídeos a indexar]
                        = 9 unidades para V = 200
                        = 41 unidades para V = 1.000

Refresh incremental     = 2 unidades (fixo)

Descoberta por vertical = 100 × número de queries
                        = 500 unidades para 5 queries (~250 canais)

Capacidade diária       = (10.000 − custo_manutenção) ÷ 9 canais novos
Custo de manutenção     = 2 × (canais_A + canais_B/3 + canais_C/7)
```

---

*Documento vivo. Revisar quando o corpus ultrapassar 50.000 canais, quando a extensão de cota for
aprovada, ou quando a base de assinantes passar de 500.*
