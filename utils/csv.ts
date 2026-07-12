/**
 * Gerador de CSV no padrão do Excel brasileiro: separador ";"
 * (vírgula é decimal em pt-BR) e BOM UTF-8 para acentuação correta.
 */

const SEPARATOR = ";";
export const CSV_BOM = "﻿";

export function escapeCsvValue(value: string | number | null): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[";\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function buildCsv(
  headers: string[],
  rows: (string | number | null)[][],
  footerLines: string[] = [],
): string {
  const lines = [
    headers.map(escapeCsvValue).join(SEPARATOR),
    ...rows.map((row) => row.map(escapeCsvValue).join(SEPARATOR)),
  ];
  if (footerLines.length > 0) {
    lines.push("", ...footerLines.map(escapeCsvValue));
  }
  return CSV_BOM + lines.join("\r\n");
}
