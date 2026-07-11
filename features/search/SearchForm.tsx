"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { FormMessage } from "@/components/FormMessage";
import { parseChannelInput } from "@/utils/youtube";

const MAX_CHANNELS = 20;

/**
 * Campo inteligente da Nova Pesquisa (doc 6 §6.3): um canal por
 * linha — URL, @handle ou ID. Feedback de validade por linha antes
 * do envio; nomes livres apontam para o M5 (busca).
 */
export function SearchForm() {
  const router = useRouter();
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

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
          line,
          valid: parsed !== null && parsed.kind !== "name",
          isName: parsed?.kind === "name",
        };
      }),
    [lines],
  );

  const validCount = analysis.filter((a) => a.valid).length;
  const hasInvalid = analysis.some((a) => !a.valid);

  async function submit() {
    setError(undefined);
    setSubmitting(true);
    try {
      const response = await fetch("/api/searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: lines }),
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
          {validCount} de {MAX_CHANNELS} canais
          {hasInvalid && (
            <span className="text-warning">
              {" "}
              · linhas inválidas serão recusadas
            </span>
          )}
        </p>
      </div>

      {analysis.some((a) => a.isName) && (
        <p className="border border-hairline px-xs py-xxs text-body-sm text-body">
          Nomes livres (ex.: “Manual do Mundo”) exigem busca e chegam na
          próxima versão — por enquanto use a URL ou o @handle do canal.
        </p>
      )}

      <FormMessage error={error} />

      <Button
        onClick={submit}
        disabled={
          submitting ||
          lines.length === 0 ||
          hasInvalid ||
          lines.length > MAX_CHANNELS
        }
      >
        {submitting ? "Iniciando..." : "Mapear canais"}
      </Button>
    </div>
  );
}
