-- M10 lote 3 · Materializa a contagem de oportunidades por canal
-- dentro de cada pesquisa. O pipeline já calcula os scores no momento
-- da análise (analysisService); contar ali é grátis — recomputar em
-- read-time no dashboard custaria uma varredura do corpus por pageview.

alter table public.search_results
  add column opportunities int;

comment on column public.search_results.opportunities is
  'Vídeos do canal com score >= 3 (corte doc 3 §3.6) no momento da análise desta pesquisa. Null = anterior à coluna e sem backfill.';

-- Backfill aproximado das pesquisas antigas com os scores ATUAIS do
-- corpus (scores mudam a cada recoleta; para histórico agregado por
-- semana a aproximação é aceitável e documentada).
update public.search_results sr
set opportunities = v.cnt
from (
  select channel_id, count(*)::int as cnt
  from public.videos
  where score >= 3
  group by channel_id
) v
where v.channel_id = sr.channel_id
  and sr.status = 'ready'
  and sr.opportunities is null;

update public.search_results
set opportunities = 0
where status = 'ready'
  and opportunities is null;
