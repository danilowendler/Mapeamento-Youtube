-- M8 · Favoritos ("Minha Pauta") — doc 5 §5.2
-- Matéria-prima da pauta do criador e sinal de qualidade do
-- algoritmo (North Star: oportunidades acionadas, doc 1 §1.7).
-- Gate por plano (favorites=true) é aplicado no service layer.

create table public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  video_id text not null references public.videos (youtube_id) on delete cascade,
  search_id uuid references public.searches (id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  primary key (user_id, video_id)
);

create index favorites_user_created_idx
  on public.favorites (user_id, created_at desc);

alter table public.favorites enable row level security;

create policy "favorites_select_own"
  on public.favorites for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "favorites_insert_own"
  on public.favorites for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "favorites_delete_own"
  on public.favorites for delete
  to authenticated
  using ((select auth.uid()) = user_id);
