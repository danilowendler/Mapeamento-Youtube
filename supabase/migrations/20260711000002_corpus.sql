-- M2 · Corpus global + infraestrutura de coleta (docs 3 e 5)
-- Zona de leitura ampla (authenticated) e escrita exclusiva do
-- pipeline (service role). Nenhum dado pessoal aqui.

-- ============================================================
-- channels — canais do YouTube conhecidos pelo corpus
-- ============================================================
create table public.channels (
  youtube_id text primary key,
  handle text,
  title text not null default '',
  description text,
  thumbnail_url text,
  subscriber_count bigint,
  video_count bigint,
  view_count bigint,
  uploads_playlist_id text,
  country text,
  default_language text,
  first_collected_at timestamptz not null default now(),
  refreshed_at timestamptz,
  collection_status text not null default 'pending'
    check (collection_status in ('pending', 'collecting', 'ready', 'failed'))
);

comment on table public.channels is
  'Corpus global. refreshed_at governa frescor/expurgo (doc 3 §3.3: 7d cache, 30d obrigatório).';

create index channels_refreshed_at_idx on public.channels (refreshed_at);
create unique index channels_handle_idx on public.channels (lower(handle))
  where handle is not null;

alter table public.channels enable row level security;

create policy "channels_read_authenticated"
  on public.channels for select
  to authenticated
  using (true);
-- Sem policies de escrita: só o service role (bypassa RLS) escreve.

-- ============================================================
-- videos — vídeos coletados, com score calculado no refresh
-- ============================================================
create table public.videos (
  youtube_id text primary key,
  channel_id text not null references public.channels (youtube_id) on delete cascade,
  title text not null default '',
  thumbnail_url text,
  published_at timestamptz,
  duration_seconds int,
  is_short boolean not null default false,
  view_count bigint,
  like_count bigint,
  comment_count bigint,
  score numeric,          -- multiplicador vs. baseline (calculado no M3)
  baseline_views bigint,  -- mediana usada no cálculo (auditável)
  age_bucket text
    check (age_bucket in ('14d-3m', '3m-12m', '12m+')),
  refreshed_at timestamptz not null default now()
);

comment on column public.videos.is_short is
  'duration_seconds <= 180. Shorts e longos nunca se misturam (doc 3 §3.6).';

create index videos_channel_format_published_idx
  on public.videos (channel_id, is_short, published_at desc);
create index videos_channel_score_idx
  on public.videos (channel_id, score desc);

alter table public.videos enable row level security;

create policy "videos_read_authenticated"
  on public.videos for select
  to authenticated
  using (true);

-- ============================================================
-- collection_jobs — rastreio operacional do pipeline
-- ============================================================
create table public.collection_jobs (
  id uuid primary key default gen_random_uuid(),
  channel_id text references public.channels (youtube_id) on delete set null,
  search_id uuid, -- FK adicionada no M3, quando searches existir
  status text not null default 'running'
    check (status in ('running', 'completed', 'failed')),
  mode text not null default 'full' check (mode in ('full', 'incremental')),
  videos_upserted int,
  quota_units_spent int,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index collection_jobs_channel_idx
  on public.collection_jobs (channel_id, started_at desc);

-- Operacional: nenhum acesso de usuário (RLS sem policies).
alter table public.collection_jobs enable row level security;

-- ============================================================
-- quota_ledger — livro-razão do orçamento de cota (doc 3 §3.4)
-- ============================================================
create table public.quota_ledger (
  id bigint generated always as identity primary key,
  quota_day date not null,
  priority smallint not null check (priority between 1 and 4),
  operation text not null,
  units int not null check (units > 0),
  created_at timestamptz not null default now()
);

comment on column public.quota_ledger.quota_day is
  'Dia de cota no fuso America/Los_Angeles — a cota do YouTube reseta à meia-noite do Pacífico.';

create index quota_ledger_day_idx on public.quota_ledger (quota_day);

alter table public.quota_ledger enable row level security;

-- ============================================================
-- reserve_quota() — reserva atômica de unidades (token bucket)
-- Prioridades: 1 pagante · 2 gratuito · 3 recoleta · 4 manutenção.
-- Prioridades 3-4 respeitam a reserva estratégica de 15% (doc 3 §3.4).
-- ============================================================
create or replace function public.reserve_quota(
  p_units int,
  p_priority smallint,
  p_operation text
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day date;
  v_total bigint;
  v_daily_limit constant int := 10000;
  v_maintenance_cap constant int := 8500; -- 10000 - 15% de reserva
begin
  if p_units <= 0 or p_priority not between 1 and 4 then
    return false;
  end if;

  v_day := (now() at time zone 'America/Los_Angeles')::date;

  -- Serializa reservas do dia (evita corrida entre jobs paralelos).
  perform pg_advisory_xact_lock(hashtext('quota_' || v_day::text));

  select coalesce(sum(units), 0) into v_total
  from public.quota_ledger
  where quota_day = v_day;

  if v_total + p_units > v_daily_limit then
    return false;
  end if;

  if p_priority >= 3 and v_total + p_units > v_maintenance_cap then
    return false;
  end if;

  insert into public.quota_ledger (quota_day, priority, operation, units)
  values (v_day, p_priority, p_operation, p_units);

  return true;
end;
$$;

-- Só o pipeline (service role) reserva cota.
revoke execute on function public.reserve_quota(int, smallint, text)
  from public, anon, authenticated;
