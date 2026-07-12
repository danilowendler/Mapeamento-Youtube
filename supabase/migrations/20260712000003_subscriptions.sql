-- M7 · Billing: assinaturas, planos pagos e idempotência de webhooks

-- ============================================================
-- Planos pagos (doc 7 §7.2). stripe_price_id é preenchido pelo
-- script scripts/setup-stripe-products.mjs após criar os preços.
-- ============================================================
insert into public.plans (code, name, price_cents, limits) values
  ('criador', 'Criador', 4900,
   '{"searches_per_month": 30, "channels_per_search": 20, "history_days": 3650, "favorites": true, "export": true}'),
  ('pro', 'Pro', 9900,
   '{"searches_per_month": 100, "channels_per_search": 50, "history_days": 3650, "favorites": true, "export": true}')
on conflict (code) do nothing;

-- ============================================================
-- subscriptions — fonte de verdade local do billing (doc 5 §5.2).
-- Escrita EXCLUSIVA dos webhooks (service role); services leem daqui,
-- nunca da API do Stripe em request path (doc 4 §4.4).
-- ============================================================
create table public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text not null unique,
  stripe_subscription_id text unique,
  plan_code text not null references public.plans (code),
  status text not null check (status in ('active', 'past_due', 'canceled')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "subscriptions_select_own"
  on public.subscriptions for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- ============================================================
-- processed_stripe_events — idempotência de webhooks (doc 7 §7.4)
-- ============================================================
create table public.processed_stripe_events (
  id text primary key, -- event id do Stripe (evt_...)
  type text not null,
  created_at timestamptz not null default now()
);

alter table public.processed_stripe_events enable row level security;

-- ============================================================
-- try_consume_search() v2 — o limite vem do plano EFETIVO:
-- assinatura ativa, ou past_due dentro da graça de 7 dias após o
-- fim do período pago (doc 7 §7.4); caso contrário, free.
-- ============================================================
create or replace function public.try_consume_search()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_plan text := 'free';
  v_limit int;
  v_start date := (date_trunc('month', now()))::date;
  v_end date := (date_trunc('month', now()) + interval '1 month')::date;
  v_used int;
begin
  v_user := (select auth.uid());
  if v_user is null then
    return -1;
  end if;

  select s.plan_code into v_plan
  from public.subscriptions s
  where s.user_id = v_user
    and (
      s.status = 'active'
      or (
        s.status = 'past_due'
        and now() < coalesce(s.current_period_end, now()) + interval '7 days'
      )
    );
  v_plan := coalesce(v_plan, 'free');

  select (limits ->> 'searches_per_month')::int into v_limit
  from public.plans
  where code = v_plan;

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
