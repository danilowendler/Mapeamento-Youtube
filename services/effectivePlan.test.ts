import { describe, expect, it } from "vitest";
import { effectivePlanCode } from "./effectivePlan";

const NOW = new Date("2026-07-12T12:00:00Z");
const daysFromNow = (days: number) =>
  new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000);

describe("effectivePlanCode (doc 7 §7.4)", () => {
  it("sem assinatura → free", () => {
    expect(effectivePlanCode(null, NOW)).toBe("free");
  });

  it("ativa → plano contratado", () => {
    expect(
      effectivePlanCode(
        { planCode: "pro", status: "active", currentPeriodEnd: null },
        NOW,
      ),
    ).toBe("pro");
  });

  it("past_due dentro da graça de 7 dias → mantém o plano", () => {
    expect(
      effectivePlanCode(
        {
          planCode: "criador",
          status: "past_due",
          currentPeriodEnd: daysFromNow(-6),
        },
        NOW,
      ),
    ).toBe("criador");
  });

  it("past_due após a graça → free", () => {
    expect(
      effectivePlanCode(
        {
          planCode: "criador",
          status: "past_due",
          currentPeriodEnd: daysFromNow(-8),
        },
        NOW,
      ),
    ).toBe("free");
  });

  it("cancelada → free", () => {
    expect(
      effectivePlanCode(
        { planCode: "pro", status: "canceled", currentPeriodEnd: daysFromNow(10) },
        NOW,
      ),
    ).toBe("free");
  });
});
