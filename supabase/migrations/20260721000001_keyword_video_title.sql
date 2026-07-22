-- Bloco 2, item 4 · "Vídeo que casou" (T5) com cobertura 100%.
-- Guarda o título do vídeo que trouxe o canal para a busca já no
-- keyword_results (capturado do snippet do search.list), para não
-- depender do vídeo estar coletado em `videos`. Coluna aditiva e
-- nullable — linhas antigas seguem nulas e a página cai no join com
-- `videos` como fallback; buscas novas (ou re-buscadas após 72 h)
-- ficam com cobertura total. Sem backfill.

alter table public.keyword_results
  add column video_title text;
