-- M10 lote 4 · Categorias da Minha Pauta (doc 9, M10 item 4)
-- Coleções nomeadas pelo usuário para agrupar favoritos.
-- Sem categoria (category_id null) = "Geral" na UI.

create table public.pauta_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 40),
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index pauta_categories_user_position_idx
  on public.pauta_categories (user_id, position);

-- Nome único por usuário (insensível a caixa/espaços nas pontas)
create unique index pauta_categories_user_name_key
  on public.pauta_categories (user_id, lower(trim(name)));

alter table public.pauta_categories enable row level security;

create policy "pauta_categories_select_own"
  on public.pauta_categories for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "pauta_categories_insert_own"
  on public.pauta_categories for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "pauta_categories_update_own"
  on public.pauta_categories for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "pauta_categories_delete_own"
  on public.pauta_categories for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Vínculo do favorito com a categoria. Excluir a categoria devolve os
-- favoritos ao "Geral" (set null) — nunca apaga o favorito.
alter table public.favorites
  add column category_id uuid
    references public.pauta_categories (id) on delete set null;

-- Índice para o on delete set null e para o agrupamento da página
create index favorites_category_idx
  on public.favorites (category_id);

-- favorites nasceu sem policy de update (M8 só tinha select/insert/
-- delete); mover entre categorias exige update — restrito ao dono.
create policy "favorites_update_own"
  on public.favorites for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
