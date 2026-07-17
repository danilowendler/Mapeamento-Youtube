-- M10.5 lote B4 · Faixas de score e formatos materializados por canal
-- na pesquisa (Dashboard: "Faixas de score" e "Formatos"). Mesma
-- técnica da 20260712000006: o pipeline já calcula os scores; contar
-- por faixa/formato na análise é grátis.

alter table public.search_results
  add column opps_3_10 int,
  add column opps_10_30 int,
  add column opps_30_plus int,
  add column opps_short int,
  add column opps_long int;

comment on column public.search_results.opps_3_10 is
  'Oportunidades com score 3–10× no momento da análise (faixas do design system).';
comment on column public.search_results.opps_30_plus is
  'Oportunidades 30×+ — a faixa que veste vermelho na UI.';

-- Backfill aproximado com os scores ATUAIS do corpus (mesma ressalva
-- documentada na migration 20260712000006).
update public.search_results sr
set opps_3_10 = v.b1,
    opps_10_30 = v.b2,
    opps_30_plus = v.b3,
    opps_short = v.s,
    opps_long = v.l
from (
  select channel_id,
    count(*) filter (where score < 10)::int as b1,
    count(*) filter (where score >= 10 and score < 30)::int as b2,
    count(*) filter (where score >= 30)::int as b3,
    count(*) filter (where is_short)::int as s,
    count(*) filter (where not is_short)::int as l
  from public.videos
  where score >= 3
  group by channel_id
) v
where v.channel_id = sr.channel_id
  and sr.status = 'ready'
  and sr.opps_3_10 is null;

update public.search_results
set opps_3_10 = 0,
    opps_10_30 = 0,
    opps_30_plus = 0,
    opps_short = 0,
    opps_long = 0
where status = 'ready'
  and opps_3_10 is null;
