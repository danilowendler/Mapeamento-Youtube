-- M1 · Zona do usuário: profiles (doc 5 §5.2)
-- 1:1 com auth.users, criado automaticamente por trigger no signup.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.profiles is
  'Perfil 1:1 com auth.users. Criado por trigger; RLS isola por usuário.';

-- RLS: usuário só enxerga e altera o próprio perfil (doc 8 §8.1).
alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Sem policy de insert/delete para usuários: criação é via trigger
-- (security definer) e remoção é via cascade da exclusão da conta.

-- Trigger de criação automática no signup.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

-- Defesa em profundidade: a função só deve rodar via trigger,
-- nunca ser invocável diretamente por clientes.
revoke execute on function public.handle_new_user()
  from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
