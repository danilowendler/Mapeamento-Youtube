-- =============================================================
-- Funil de ativação do BEVIEWER (item 5B)
-- Rode no SQL editor do Supabase, no projeto de PRODUÇÃO.
-- Só leitura — nada é alterado. Reutiliza dados que já existem
-- (profiles, searches, search_results, favorites), sem novo evento.
--
-- Os quatro passos da ativação:
--   1. Cadastro           → profiles.created_at (todo usuário tem)
--   2. Fez ≥ 1 pesquisa    → searches
--   3. Achou oportunidade  → search_results.opportunities > 0 (o "aha")
--   4. Favoritou           → favorites (sinal de retenção)
-- =============================================================

-- 1) Visão geral: contagens absolutas + taxas de passagem entre passos.
--    A menor taxa aponta o maior vazamento do onboarding.
with cadastros as (
  select id as user_id from public.profiles
),
pesquisou as (
  select distinct user_id from public.searches
),
achou_oportunidade as (
  select distinct s.user_id
  from public.searches s
  join public.search_results r on r.search_id = s.id
  where r.opportunities > 0
),
favoritou as (
  select distinct user_id from public.favorites
)
select
  (select count(*) from cadastros)          as cadastros,
  (select count(*) from pesquisou)          as fizeram_pesquisa,
  (select count(*) from achou_oportunidade) as acharam_oportunidade,
  (select count(*) from favoritou)          as favoritaram,
  round(100.0 * (select count(*) from pesquisou)
        / nullif((select count(*) from cadastros), 0), 1)
                                            as pct_cadastro_para_pesquisa,
  round(100.0 * (select count(*) from achou_oportunidade)
        / nullif((select count(*) from pesquisou), 0), 1)
                                            as pct_pesquisa_para_oportunidade,
  round(100.0 * (select count(*) from favoritou)
        / nullif((select count(*) from achou_oportunidade), 0), 1)
                                            as pct_oportunidade_para_favorito;


-- 2) Cadastrados que NUNCA pesquisaram — costuma ser o maior vazamento.
--    Se esta lista for grande, o problema é onboarding/ativação inicial:
--    o usuário se cadastra e não chega a rodar a primeira análise.
select p.id, p.display_name, p.created_at
from public.profiles p
left join public.searches s on s.user_id = p.id
where s.id is null
order by p.created_at desc;
image.png

-- 3) Pesquisaram mas NUNCA acharam oportunidade — se for grande, o
--    problema é qualidade do resultado (o "aha" não chega) e não o
--    onboarding. Cruze com os canais/keywords dessas pesquisas.
select distinct p.id, p.display_name
from public.profiles p
join public.searches s on s.user_id = p.id
where not exists (
  select 1 from public.search_results r
  where r.search_id = s.id and r.opportunities > 0
);


-- 4) Tempo até a 1ª pesquisa (mediana, em horas). Quanto menor, mais
--    rápido o usuário chega ao valor — quanto do onboarding "cola".
select round(
  percentile_cont(0.5) within group (
    order by extract(epoch from (first_search - signup)) / 3600.0
  )::numeric, 1
) as horas_ate_1a_pesquisa_mediana
from (
  select p.created_at as signup, min(s.created_at) as first_search
  from public.profiles p
  join public.searches s on s.user_id = p.id
  group by p.id, p.created_at
) t;
