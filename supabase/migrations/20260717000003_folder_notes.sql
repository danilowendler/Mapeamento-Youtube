-- M10.5 lote B5.4 · Notas do Workspace (spec
-- docs/superpowers/specs/2026-07-17-pasta-dedicada-workspace-design.md)
-- Bloco de notas por pasta + nota por canal. A nota por vídeo já
-- existe (favorites.note, M8) e ganha UI agora. As policies de update
-- por dono já cobrem as três colunas — nenhuma policy nova.

alter table public.pauta_categories
  add column notes text;

comment on column public.pauta_categories.notes is
  'Bloco de notas da pasta (página dedicada do Workspace). Máx. aplicado no service layer (2000 chars).';

alter table public.channel_refs
  add column note text;

comment on column public.channel_refs.note is
  'Nota do usuário sobre o canal de referência. Máx. no service layer (500 chars).';
