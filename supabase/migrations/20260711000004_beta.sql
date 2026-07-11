-- M4 · Beta fechado: convites, gate de acesso e falhas visíveis

-- ============================================================
-- profiles.beta_access — gate de uso do app durante o beta
-- ============================================================
alter table public.profiles
  add column beta_access boolean not null default false;

-- Quem já está dentro (fundador/testes) não é trancado para fora.
update public.profiles set beta_access = true;

-- ============================================================
-- beta_invites — códigos de convite (uso único)
-- ============================================================
create table public.beta_invites (
  code text primary key,
  note text,
  used_by uuid references auth.users (id) on delete set null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.beta_invites is
  'Convites do beta fechado (estágio C). Sem acesso de usuário; resgate via redeem_beta_invite().';

alter table public.beta_invites enable row level security;
-- Sem policies: só service role e a função abaixo tocam nesta tabela.

-- ============================================================
-- redeem_beta_invite(code) — resgate atômico pelo próprio usuário
-- ============================================================
create or replace function public.redeem_beta_invite(p_code text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
begin
  v_user := (select auth.uid());
  if v_user is null then
    return false;
  end if;

  -- Consome o código apenas se ainda estiver livre (atômico)
  update public.beta_invites
  set used_by = v_user, used_at = now()
  where code = lower(trim(p_code)) and used_by is null;

  if not found then
    return false;
  end if;

  update public.profiles
  set beta_access = true
  where id = v_user;

  return true;
end;
$$;

-- Autenticados podem resgatar (a função valida tudo internamente)
revoke execute on function public.redeem_beta_invite(text) from public, anon;
grant execute on function public.redeem_beta_invite(text) to authenticated;

-- ============================================================
-- searches.failed_inputs — entradas que falharam, visíveis na UI
-- ============================================================
alter table public.searches
  add column failed_inputs jsonb not null default '[]'::jsonb;

-- Registro atômico de falha por entrada (pipeline)
create or replace function public.append_failed_input(
  p_search_id uuid,
  p_input text
) returns void
language sql
security definer
set search_path = ''
as $$
  update public.searches
  set failed_inputs = failed_inputs || to_jsonb(p_input)
  where id = p_search_id;
$$;

revoke execute on function public.append_failed_input(uuid, text)
  from public, anon, authenticated;
