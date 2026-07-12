import { describe, expect, it } from "vitest";
import { buildCsv, escapeCsvValue } from "./csv";

describe("escapeCsvValue", () => {
  it("mantém valores simples", () => {
    expect(escapeCsvValue("abc")).toBe("abc");
    expect(escapeCsvValue(123)).toBe("123");
    expect(escapeCsvValue(null)).toBe("");
  });

  it("escapa separador, aspas e quebras de linha", () => {
    expect(escapeCsvValue("a;b")).toBe('"a;b"');
    expect(escapeCsvValue('disse "oi"')).toBe('"disse ""oi"""');
    expect(escapeCsvValue("linha1\nlinha2")).toBe('"linha1\nlinha2"');
  });
});

describe("buildCsv", () => {
  it("gera BOM + header + linhas com ; e CRLF", () => {
    const csv = buildCsv(
      ["canal", "views"],
      [
        ["Manual do Mundo", 123],
        ["Canal; estranho", 456],
      ],
      ["Gerado por Mapeamento Inteligente"],
    );
    expect(csv.charCodeAt(0)).toBe(0xfeff); // BOM
    const lines = csv.slice(1).split("\r\n");
    expect(lines[0]).toBe("canal;views");
    expect(lines[1]).toBe("Manual do Mundo;123");
    expect(lines[2]).toBe('"Canal; estranho";456');
    expect(lines[4]).toBe("Gerado por Mapeamento Inteligente");
  });
});
