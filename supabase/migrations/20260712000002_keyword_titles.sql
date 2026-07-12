-- M6.1 · Canais relacionados devem exibir canais AINDA NÃO coletados
-- (que é o caso típico) — o título vem do próprio resultado da busca.
alter table public.keyword_results
  add column channel_title text not null default '';
