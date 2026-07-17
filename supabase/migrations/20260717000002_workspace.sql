-- M10.5 lote B5 · Workspace (ex-Minha Pauta): pastas tipadas +
-- canais de referência salvos.
-- Pautas guardam vídeos (favorites.category_id); Referências guardam
-- canais (channel_refs.folder_id). A regra de tipo (vídeo só em pasta
-- de Pautas, canal só em Referências) é aplicada no service layer
-- (mesmo padrão ADR-006) — CHECK não alcança outra tabela.

alter table public.pauta_categories
  add column kind text not null default 'pautas'
    check (kind in ('pautas', 'referencias'));

comment on column public.pauta_categories.kind is
  'pautas = guarda vídeos favoritados; referencias = guarda canais salvos.';

-- Canais de referência do usuário ("salvar canal" nos resultados).
-- Espelha favorites: RLS por dono, exclusão de pasta devolve ao Soltos.
create table public.channel_refs (
  user_id uuid not null references auth.users (id) on delete cascade,
  channel_id text not null references public.channels (youtube_id) on delete cascade,
  folder_id uuid references public.pauta_categories (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, channel_id)
);

create index channel_refs_user_created_idx
  on public.channel_refs (user_id, created_at desc);

create index channel_refs_folder_idx
  on public.channel_refs (folder_id);

alter table public.channel_refs enable row level security;

create policy "channel_refs_select_own"
  on public.channel_refs for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "channel_refs_insert_own"
  on public.channel_refs for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "channel_refs_update_own"
  on public.channel_refs for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "channel_refs_delete_own"
  on public.channel_refs for delete
  to authenticated
  using ((select auth.uid()) = user_id);
