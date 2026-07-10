const compactPtBr = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  compactDisplay: "short",
  maximumFractionDigits: 1,
});

/**
 * Formata contagens (views, inscritos) no padrão compacto pt-BR
 * exibido nos cards de resultado: 987 · "12,4 mil" · "1,2 mi".
 * O separador número-unidade é U+00A0 (não-quebrável), preservando
 * a unidade junto do número em qualquer quebra de linha.
 */
export function formatCompactCount(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "—";
  return compactPtBr.format(value);
}

/**
 * Formata o multiplicador de outlier exibido no badge de score: "18×".
 * Uma casa decimal apenas abaixo de 10 (3,5× informa; 18,3× é ruído).
 */
export function formatScoreMultiplier(score: number): string {
  if (!Number.isFinite(score) || score <= 0) return "—";
  const rounded = score < 10 ? Math.round(score * 10) / 10 : Math.round(score);
  return `${rounded.toLocaleString("pt-BR")}×`;
}
