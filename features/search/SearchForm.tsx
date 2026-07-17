"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ChevronDown, LayoutGrid, Link2 } from "lucide-react";
import { Button } from "@/components/Button";
import { FormMessage } from "@/components/FormMessage";
import { ChatSearchInput } from "@/features/search/ChatSearchInput";
import { parseChannelInput } from "@/utils/youtube";

const MAX_CHANNELS = 20;

export type NicheOption = {
  slug: string;
  name: string;
  description: string | null;
};

type Payload =
  | { mode: "channels"; inputs: string[] }
  | { mode: "keyword"; keyword: string }
  | { mode: "niche"; nicheSlug: string };

type Panel = "niches" | "channels" | null;

/**
 * Mapping (M10.5, lote B3 — prints 01–03): chat central como porta
 * única + dois caminhos assistidos em dropdowns exclusivos (Nichos
 * prontos / Colar link de um canal). Submit e parse determinístico
 * preservados do formato anterior.
 */
export function SearchForm({ niches }: { niches: NicheOption[] }) {
  const router = useRouter();
  const [raw, setRaw] = useState("");
  const [openPanel, setOpenPanel] = useState<Panel>(null);
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

  /**
   * Roteamento determinístico da entrada de chat: @handle/URL/ID →
   * canais; nome exato de nicho → nicho; senão keyword.
   */
  function sendChat(text: string) {
    const parsed = parseChannelInput(text);
    if (parsed && parsed.kind !== "name") {
      submit({ mode: "channels", inputs: [text] }, "chat");
      return;
    }
    const niche = niches.find(
      (n) =>
        n.name.localeCompare(text, "pt-BR", { sensitivity: "base" }) === 0,
    );
    if (niche) {
      submit({ mode: "niche", nicheSlug: niche.slug }, "chat");
      return;
    }
    submit({ mode: "keyword", keyword: text }, "chat");
  }

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

  function toggle(panel: Exclude<Panel, null>) {
    setOpenPanel((current) => (current === panel ? null : panel));
  }

  const toggleClass = (active: boolean) =>
    `flex cursor-pointer items-center gap-xxs rounded-full border border-hairline px-xs py-xxs text-caption-upper uppercase transition-colors ${
      active ? "text-ink" : "text-muted-soft hover:text-ink"
    }`;

  return (
    <div className="flex flex-col gap-sm">
      <FormMessage error={error} />

      <ChatSearchInput
        placeholder="Digite um tema, palavra-chave ou pergunta…"
        pending={submitting === "chat"}
        onSend={sendChat}
      />

      <div className="flex flex-wrap justify-center gap-xxs">
        <button
          type="button"
          onClick={() => toggle("niches")}
          aria-expanded={openPanel === "niches"}
          aria-controls="panel-niches"
          className={toggleClass(openPanel === "niches")}
        >
          <LayoutGrid size={16} strokeWidth={1.6} />
          Nichos prontos
          <ChevronDown
            size={16}
            strokeWidth={1.6}
            className={`transition-transform duration-200 ${
              openPanel === "niches" ? "rotate-180" : ""
            }`}
          />
        </button>
        <button
          type="button"
          onClick={() => toggle("channels")}
          aria-expanded={openPanel === "channels"}
          aria-controls="panel-channels"
          className={toggleClass(openPanel === "channels")}
        >
          <Link2 size={16} strokeWidth={1.6} />
          Colar link de um canal
          <ChevronDown
            size={16}
            strokeWidth={1.6}
            className={`transition-transform duration-200 ${
              openPanel === "channels" ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {openPanel === "niches" && (
        <section
          id="panel-niches"
          aria-label="Nichos prontos"
          className="animate-bubble-in flex flex-col gap-xs rounded-md border border-hairline p-sm"
        >
          <p className="text-body-sm text-body">
            Receba as oportunidades dos canais que dominam o tema.
          </p>
          <ul className="grid grid-cols-1 gap-xxs sm:grid-cols-2 md:grid-cols-3">
            {niches.map((niche) => (
              <li key={niche.slug}>
                <button
                  onClick={() =>
                    submit({ mode: "niche", nicheSlug: niche.slug }, niche.slug)
                  }
                  disabled={Boolean(submitting)}
                  className="group flex h-full w-full cursor-pointer flex-col gap-xxxs rounded-sm border border-hairline px-xs py-xs text-left transition-colors hover:border-muted hover:bg-canvas-elevated/25 disabled:opacity-50"
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
        </section>
      )}

      {openPanel === "channels" && (
        <section
          id="panel-channels"
          aria-label="Colar link de um canal"
          className="animate-bubble-in flex flex-col gap-xs rounded-md border border-hairline p-sm"
        >
          <label htmlFor="channels" className="text-body-sm text-body">
            Cole os canais — um por linha (URL, @handle ou ID).
          </label>
          <textarea
            id="channels"
            value={raw}
            onChange={(event) => setRaw(event.target.value)}
            rows={5}
            placeholder={"@manualdomundo\nhttps://youtube.com/@coisadenerd"}
            className="rounded-sm border border-hairline bg-canvas px-xs py-xs font-mono text-body-md text-ink placeholder:text-muted"
          />
          <div className="flex flex-wrap items-center justify-between gap-xs">
            <p className="text-body-sm text-body">
              {analysis.filter((a) => a.valid).length} de {MAX_CHANNELS} canais
              {hasInvalid && (
                <span className="text-warning">
                  {" "}
                  · use URL ou @handle (nomes livres: use o chat)
                </span>
              )}
            </p>
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
        </section>
      )}
    </div>
  );
}
