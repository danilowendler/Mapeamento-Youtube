"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { FormMessage } from "@/components/FormMessage";
import { parseChannelInput } from "@/utils/youtube";

const MAX_CHANNELS = 20;

export type NicheOption = {
  slug: string;
  name: string;
  description: string | null;
};

type Mode = "niche" | "keyword" | "channels";

type Payload =
  | { mode: "channels"; inputs: string[] }
  | { mode: "keyword"; keyword: string }
  | { mode: "niche"; nicheSlug: string };

/**
 * Nova Pesquisa (doc 6 §6.3): três portas de entrada. Nichos é a
 * padrão — o onboarding É o produto acontecendo (doc 6 §6.2).
 */
export function SearchForm({ niches }: { niches: NicheOption[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("niche");
  const [raw, setRaw] = useState("");
  const [keyword, setKeyword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState<string | false>(false);

  const lines = useMemo(
    () =>
      raw
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    [raw],
  );
  const analysis = useMemo(
    () =>
      lines.map((line) => {
        const parsed = parseChannelInput(line);
        return {
          valid: parsed !== null && parsed.kind !== "name",
          isName: parsed?.kind === "name",
        };
      }),
    [lines],
  );
  const hasInvalid = analysis.some((a) => !a.valid);

  async function submit(payload: Payload, key: string) {
    setError(undefined);
    setSubmitting(key);
    try {
      const response = await fetch("/api/searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error ?? "Erro ao criar a pesquisa.");
        return;
      }
      router.push(`/app/pesquisas/${body.id}`);
    } catch {
      setError("Falha de rede. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-sm">
      <div role="tablist" className="flex border-b border-hairline">
        {(
          [
            { key: "niche", label: "Nichos" },
            { key: "keyword", label: "Palavra-chave" },
            { key: "channels", label: "Canais" },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            aria-selected={mode === key}
            onClick={() => setMode(key)}
            className={`cursor-pointer px-xs py-xxs text-nav-link uppercase transition-colors ${
              mode === key
                ? "border-b-2 border-ink text-ink"
                : "text-muted-soft hover:text-body"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <FormMessage error={error} />

      {mode === "niche" && (
        <div className="flex flex-col gap-xs">
          <p className="text-body-sm text-body">
            Escolha um nicho e receba as oportunidades dos canais que
            dominam o tema.
          </p>
          <ul className="grid grid-cols-1 gap-xxs sm:grid-cols-2 md:grid-cols-3">
            {niches.map((niche) => (
              <li key={niche.slug}>
                <button
                  onClick={() =>
                    submit({ mode: "niche", nicheSlug: niche.slug }, niche.slug)
                  }
                  disabled={Boolean(submitting)}
                  className="group flex h-full w-full cursor-pointer flex-col gap-xxxs border border-hairline px-xs py-xs text-left transition-colors hover:border-muted hover:bg-canvas-elevated/25 disabled:opacity-50"
                >
                  <span className="flex w-full items-center justify-between text-title-sm text-ink">
                    {submitting === niche.slug ? "Iniciando…" : niche.name}
                    <span
                      aria-hidden="true"
                      className="text-muted opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      →
                    </span>
                  </span>
                  {niche.description && (
                    <span className="line-clamp-2 text-caption text-muted">
                      {niche.description}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {mode === "keyword" && (
        <form
          className="flex flex-col gap-xs"
          onSubmit={(event) => {
            event.preventDefault();
            submit({ mode: "keyword", keyword }, "keyword");
          }}
        >
          <div className="flex flex-col gap-xxs">
            <label
              htmlFor="keyword"
              className="text-caption-upper uppercase text-muted-soft"
            >
              Palavra-chave ou tema
            </label>
            <input
              id="keyword"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="ex.: renda extra, receitas fit, inglês para viagem…"
              className="h-[48px] rounded-sm border border-hairline bg-canvas px-xs text-body-md text-ink placeholder:text-muted"
            />
          </div>
          <Button
            type="submit"
            disabled={Boolean(submitting) || keyword.trim().length < 2}
          >
            {submitting === "keyword" ? "Iniciando…" : "Mapear tema"}
          </Button>
        </form>
      )}

      {mode === "channels" && (
        <div className="flex flex-col gap-xs">
          <div className="flex flex-col gap-xxs">
            <label
              htmlFor="channels"
              className="text-caption-upper uppercase text-muted-soft"
            >
              Canais — um por linha (URL, @handle ou ID)
            </label>
            <textarea
              id="channels"
              value={raw}
              onChange={(event) => setRaw(event.target.value)}
              rows={6}
              placeholder={"@manualdomundo\nhttps://youtube.com/@coisadenerd"}
              className="rounded-sm border border-hairline bg-canvas px-xs py-xs font-mono text-body-md text-ink placeholder:text-muted"
            />
            <p className="text-body-sm text-body">
              {analysis.filter((a) => a.valid).length} de {MAX_CHANNELS} canais
              {hasInvalid && (
                <span className="text-warning">
                  {" "}
                  · use URL ou @handle (nomes livres: use a aba
                  Palavra-chave)
                </span>
              )}
            </p>
          </div>
          <Button
            onClick={() =>
              submit({ mode: "channels", inputs: lines }, "channels")
            }
            disabled={
              Boolean(submitting) ||
              lines.length === 0 ||
              hasInvalid ||
              lines.length > MAX_CHANNELS
            }
          >
            {submitting === "channels" ? "Iniciando…" : "Mapear canais"}
          </Button>
        </div>
      )}
    </div>
  );
}
