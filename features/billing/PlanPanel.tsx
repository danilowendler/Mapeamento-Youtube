"use client";

import { useState } from "react";
import { Button } from "@/components/Button";

type PlanInfo = {
  code: string;
  name: string;
  subscriptionStatus: "active" | "past_due" | "canceled" | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  usage: { used: number; limit: number };
};

const PLAN_CARDS = [
  {
    code: "criador",
    name: "Criador",
    price: "R$ 49/mês",
    bullets: ["30 pesquisas/mês", "20 canais por pesquisa", "Favoritos e exportação"],
  },
  {
    code: "pro",
    name: "Pro",
    price: "R$ 99/mês",
    bullets: ["100 pesquisas/mês", "50 canais por pesquisa", "Favoritos e exportação"],
  },
] as const;

/** Painel de plano da tela Conta (doc 7): estado atual + upgrade + portal. */
export function PlanPanel({ plan }: { plan: PlanInfo }) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();

  async function go(endpoint: string, body?: unknown, key = endpoint) {
    setPending(key);
    setError(undefined);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await response.json();
      if (!response.ok || !data.url) {
        setError(data.error ?? "Algo deu errado. Tente novamente.");
        return;
      }
      window.location.assign(data.url);
    } catch {
      setError("Falha de rede. Tente novamente.");
      setPending(null);
    }
  }

  const isSubscriber = plan.code !== "free";

  return (
    <section id="planos" className="flex flex-col gap-sm">
      <h2 className="text-title-md text-ink">Plano</h2>

      {plan.subscriptionStatus === "past_due" && (
        <p className="border border-warning/40 px-xs py-xxs text-body-sm text-warning">
          Não conseguimos renovar seu pagamento. Atualize o cartão para não
          voltar ao plano gratuito.
        </p>
      )}

      <div className="flex flex-col gap-xxs border border-hairline p-sm">
        <p className="text-body-md text-ink">
          {plan.name}
          {plan.cancelAtPeriodEnd && plan.currentPeriodEnd && (
            <span className="text-body-sm text-warning">
              {" "}
              · cancela em{" "}
              {new Date(plan.currentPeriodEnd).toLocaleDateString("pt-BR")}
            </span>
          )}
        </p>
        <p className="text-body-sm text-body">
          {plan.usage.used} de {plan.usage.limit} pesquisas usadas neste mês
        </p>
        {isSubscriber && (
          <div className="mt-xxs">
            <Button
              variant="outline"
              onClick={() => go("/api/billing/portal")}
              disabled={pending !== null}
            >
              {pending === "/api/billing/portal"
                ? "Abrindo…"
                : "Gerenciar assinatura"}
            </Button>
          </div>
        )}
      </div>

      {error && <p className="text-body-sm text-warning">{error}</p>}

      {plan.code !== "pro" && (
        <div className="grid gap-xs md:grid-cols-2">
          {PLAN_CARDS.filter((card) => card.code !== plan.code).map((card) => (
            <div
              key={card.code}
              className="flex flex-col gap-xs border border-hairline p-sm"
            >
              <div className="flex items-baseline justify-between">
                <h3 className="text-title-md text-ink">{card.name}</h3>
                <span className="text-body-md text-ink">{card.price}</span>
              </div>
              <ul className="flex flex-col gap-xxxs text-body-sm text-body">
                {card.bullets.map((bullet) => (
                  <li key={bullet}>· {bullet}</li>
                ))}
              </ul>
              <Button
                onClick={() =>
                  go("/api/billing/checkout", { plan: card.code }, card.code)
                }
                disabled={pending !== null}
              >
                {pending === card.code
                  ? "Abrindo checkout…"
                  : `Assinar ${card.name}`}
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
