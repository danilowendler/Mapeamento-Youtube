-- M9 · Rate limiting persistente (doc 8 §8.2)
-- Janela fixa por chave, consistente entre instâncias serverless.

create table public.rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  count int not null default 0
);

alter table public.rate_limits enable row level security;
-- Sem policies: acesso exclusivo via função/service role.

create or replace function public.check_rate_limit(
  p_key text,
  p_max int,
  p_window_seconds int
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.rate_limits%rowtype;
begin
  insert into public.rate_limits (key, window_start, count)
  values (p_key, now(), 0)
  on conflict (key) do nothing;

  select * into v_row
  from public.rate_limits
  where key = p_key
  for update;

  if now() - v_row.window_start > make_interval(secs => p_window_seconds) then
    update public.rate_limits
    set window_start = now(), count = 1
    where key = p_key;
    return true;
  end if;

  if v_row.count >= p_max then
    return false;
  end if;

  update public.rate_limits
  set count = count + 1
  where key = p_key;
  return true;
end;
$$;

revoke execute on function public.check_rate_limit(text, int, int)
  from public, anon, authenticated;
