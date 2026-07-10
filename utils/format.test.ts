import { describe, expect, it } from "vitest";
import { formatCompactCount, formatScoreMultiplier } from "./format";

// Nas contagens compactas, o separador número-unidade emitido pelo
// Intl pt-BR é U+00A0 (espaço não-quebrável) — por isso o escape  .
describe("formatCompactCount", () => {
  it("mantém números pequenos por extenso", () => {
    expect(formatCompactCount(987)).toBe("987");
  });

  it("compacta milhares no padrão pt-BR", () => {
    expect(formatCompactCount(12400)).toBe("12,4 mil");
    expect(formatCompactCount(438000)).toBe("438 mil");
  });

  it("compacta milhões no padrão pt-BR", () => {
    expect(formatCompactCount(1200000)).toBe("1,2 mi");
  });

  it("devolve travessão para valores inválidos", () => {
    expect(formatCompactCount(-1)).toBe("—");
    expect(formatCompactCount(Number.NaN)).toBe("—");
  });
});

describe("formatScoreMultiplier", () => {
  it("usa uma casa decimal abaixo de 10", () => {
    expect(formatScoreMultiplier(3.47)).toBe("3,5×");
  });

  it("arredonda para inteiro a partir de 10", () => {
    expect(formatScoreMultiplier(18.3)).toBe("18×");
  });

  it("devolve travessão para valores inválidos", () => {
    expect(formatScoreMultiplier(0)).toBe("—");
    expect(formatScoreMultiplier(Number.NaN)).toBe("—");
  });
});
