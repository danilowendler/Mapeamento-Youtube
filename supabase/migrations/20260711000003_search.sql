-- M3 · Pesquisas, resultados e baselines do motor de outliers
-- searches/search_results: zona do usuário (RLS por dono).
-- channel_baselines: corpus (leitura ampla, escrita service role).

-- ============================================================
-- channel_baselines — medianas pré-calculadas (doc 3 §3.6)
-- ============================================================
create table public.channel_baselines (
  channel_id text not null references public.channels (youtube_id) on delete cascade,
  format text not null check (format in ('short', 'long')),
  age_bucket text not null check (age_bucket in ('14d-3m', '3m-12m', '12m+', 'all')),
  median_views bigint not null,
  sample_size int not null,
  computed_at timestamptz not null default now(),
  primary key (channel_id, format, age_bucket)
);

comment on table public.channel_baselines is
  'Mediana de views por canal × formato × faixa de idade. sample_size < 10 = baixa confiança. Bucket "all" = mediana geral do formato (fallback).';

alter table public.channel_baselines enable row level security;

create policy "baselines_read_authenticated"
  on public.channel_baselines for select
  to authenticated
  using (true);

-- ============================================================
-- searches — pesquisas do usuário (doc 5 §5.2)
-- ============================================================
create table public.searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('channel', 'channel_list', 'keyword', 'niche')),
  input jsonb not null,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'partial', 'failed')),
  channels_total int not null default 0,
  channels_done int not null default 0,
  quota_units_spent int not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index searches_user_created_idx
  on public.searches (user_id, created_at desc);

alter table public.searches enable row level security;

create policy "searches_select_own"
  on public.searches for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "searches_insert_own"
  on public.searches for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- Updates de progresso são exclusivos do pipeline (service role).

-- ============================================================
-- search_results — um registro por canal dentro de uma pesquisa
-- ============================================================
create table public.search_results (
  search_id uuid not null references public.searches (id) on delete cascade,
  channel_id text not null references public.channels (youtube_id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'collecting', 'ready', 'failed')),
  top_score numeric,
  error text,
  completed_at timestamptz,
  primary key (search_id, channel_id)
);

alter table public.search_results enable row level security;

create policy "search_results_select_own"
  on public.search_results for select
  to authenticated
  using (
    exists (
      select 1 from public.searches s
      where s.id = search_results.search_id
        and s.user_id = (select auth.uid())
    )
  );

-- Escrita exclusiva do pipeline (service role).

-- ============================================================
-- Vínculo pendente do M2 + Realtime
-- ============================================================
alter table public.collection_jobs
  add constraint collection_jobs_search_id_fkey
  foreign key (search_id) references public.searches (id) on delete set null;

-- Progresso atômico da pesquisa (chamado pelo pipeline a cada canal)
create or replace function public.bump_search_progress(
  p_search_id uuid,
  p_units int
) returns void
language sql
security definer
set search_path = ''
as $$
  update public.searches
  set channels_done = channels_done + 1,
      quota_units_spent = quota_units_spent + greatest(p_units, 0)
  where id = p_search_id;
$$;

revoke execute on function public.bump_search_progress(uuid, int)
  from public, anon, authenticated;

-- Realtime: o frontend assina mudanças destas tabelas para os
-- resultados progressivos (ADR-004). RLS vale também no Realtime.
alter publication supabase_realtime add table public.searches;
alter publication supabase_realtime add table public.search_results;
