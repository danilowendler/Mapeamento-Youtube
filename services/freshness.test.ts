import { describe, expect, it } from "vitest";
import { decideFreshness } from "./freshness";

const now = new Date("2026-07-11T12:00:00Z");
const daysAgo = (days: number) =>
  new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

describe("decideFreshness (doc 3 §3.3)", () => {
  it("nunca coletado → collect_new", () => {
    expect(decideFreshness(null, now)).toBe("collect_new");
  });

  it("≤ 7 dias → fresh (cache hit, custo zero)", () => {
    expect(decideFreshness(daysAgo(0), now)).toBe("fresh");
    expect(decideFreshness(daysAgo(6.9), now)).toBe("fresh");
    expect(decideFreshness(daysAgo(7), now)).toBe("fresh");
  });

  it("7–30 dias → serve e agenda recoleta em background", () => {
    expect(decideFreshness(daysAgo(7.1), now)).toBe("refresh_in_background");
    expect(decideFreshness(daysAgo(30), now)).toBe("refresh_in_background");
  });

  it("> 30 dias → recoleta obrigatória antes de servir (conformidade)", () => {
    expect(decideFreshness(daysAgo(30.1), now)).toBe("recollect_required");
    expect(decideFreshness(daysAgo(365), now)).toBe("recollect_required");
  });
});
