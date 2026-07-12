-- M6 · Planos, consumo transacional, afinidade de nichos e eventos

-- ============================================================
-- plans — catálogo de planos (doc 7 §7.2; limites em jsonb
-- versionado: mudar limite não exige migration nem deploy)
-- ============================================================
create table public.plans (
  code text primary key,
  name text not null,
  price_cents int not null default 0,
  stripe_price_id text,
  limits jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.plans enable row level security;

create policy "plans_read_authenticated"
  on public.plans for select
  to authenticated
  using (true);

insert into public.plans (code, name, price_cents, limits) values
  ('free', 'Gratuito', 0,
   '{"searches_per_month": 3, "channels_per_search": 5, "history_days": 7, "favorites": false, "export": false}')
on conflict (code) do nothing;

-- ============================================================
-- usage_periods — contadores por ciclo (ADR-006: enforcement
-- transacional no banco, nunca só na UI)
-- ============================================================
create table public.usage_periods (
  user_id uuid not null references auth.users (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  searches_used int not null default 0,
  primary key (user_id, period_start)
);

alter table public.usage_periods enable row level security;

create policy "usage_select_own"
  on public.usage_periods for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Escrita exclusiva via try_consume_search() e service role.

-- ============================================================
-- try_consume_search() — consumo atômico de 1 pesquisa do ciclo.
-- Usa auth.uid() internamente (usuário não consome crédito alheio).
-- Retorna o nº de pesquisas restantes, ou -1 se o limite estourou.
-- O UPDATE condicional (searches_used < limite) torna a operação
-- imune a corrida: N chamadas paralelas consomem no máximo o limite.
-- ============================================================
create or replace function public.try_consume_search()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_limit int;
  v_start date := (date_trunc('month', now()))::date;
  v_end date := (date_trunc('month', now()) + interval '1 month')::date;
  v_used int;
begin
  v_user := (select auth.uid());
  if v_user is null then
    return -1;
  end if;

  -- M7: trocar por lookup do plano ativo em subscriptions
  select (limits ->> 'searches_per_month')::int into v_limit
  from public.plans
  where code = 'free';

  insert into public.usage_periods (user_id, period_start, period_end)
  values (v_user, v_start, v_end)
  on conflict (user_id, period_start) do nothing;

  update public.usage_periods
  set searches_used = searches_used + 1
  where user_id = v_user
    and period_start = v_start
    and searches_used < v_limit;

  if not found then
    return -1;
  end if;

  select searches_used into v_used
  from public.usage_periods
  where user_id = v_user and period_start = v_start;

  return greatest(v_limit - v_used, 0);
end;
$$;

revoke execute on function public.try_consume_search() from public, anon;
grant execute on function public.try_consume_search() to authenticated;

-- ============================================================
-- channel_niche_affinity — malha de canais relacionados (doc 5)
-- Alimentada a cada pesquisa de nicho; leitura para relacionados.
-- ============================================================
create table public.channel_niche_affinity (
  channel_id text not null references public.channels (youtube_id) on delete cascade,
  niche_id uuid not null references public.niches (id) on delete cascade,
  strength numeric not null default 1,
  last_seen_at timestamptz not null default now(),
  primary key (channel_id, niche_id)
);

create index channel_niche_affinity_niche_idx
  on public.channel_niche_affinity (niche_id, strength desc);

alter table public.channel_niche_affinity enable row level security;

create policy "affinity_read_authenticated"
  on public.channel_niche_affinity for select
  to authenticated
  using (true);

-- Reforço atômico de afinidade (pipeline)
create or replace function public.bump_channel_niche_affinity(
  p_channel_id text,
  p_niche_id uuid
) returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.channel_niche_affinity (channel_id, niche_id)
  values (p_channel_id, p_niche_id)
  on conflict (channel_id, niche_id) do update
  set strength = public.channel_niche_affinity.strength + 1,
      last_seen_at = now();
$$;

revoke execute on function public.bump_channel_niche_affinity(text, uuid)
  from public, anon, authenticated;

-- ============================================================
-- product_events — instrumentação do funil (doc 1 §1.7, doc 8 §8.5)
-- ============================================================
create table public.product_events (
  id bigint generated always as identity primary key,
  user_id uuid,
  name text not null,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index product_events_name_created_idx
  on public.product_events (name, created_at desc);

alter table public.product_events enable row level security;
-- Sem policies: escrita/leitura exclusivas do service role.
