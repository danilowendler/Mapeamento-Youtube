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

/** Duração de vídeo: "12:34" ou "1:02:10". */
export function formatDuration(totalSeconds: number | null): string {
  if (totalSeconds === null || !Number.isFinite(totalSeconds)) return "—";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const mm = hours > 0 ? String(minutes).padStart(2, "0") : String(minutes);
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

const relativePtBr = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

/** Data relativa curta em pt-BR: "há 3 meses", "há 2 anos". */
export function formatRelativeDate(
  date: Date,
  now: Date = new Date(),
): string {
  const diffDays = Math.round(
    (date.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
  );
  const abs = Math.abs(diffDays);
  if (abs < 30) return relativePtBr.format(diffDays, "day");
  if (abs < 365) return relativePtBr.format(Math.round(diffDays / 30), "month");
  return relativePtBr.format(Math.round(diffDays / 365), "year");
}
