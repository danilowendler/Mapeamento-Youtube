"use client";

import { useEffect, useState } from "react";

const ROTATE_MS = 3500;

/**
 * Entrada estilo chat da Nova Pesquisa (M10, lote 2). Estética de
 * conversa, promessa determinística: quem interpreta o texto é o
 * SearchForm (parseChannelInput / match de nicho / keyword) — nenhum
 * LLM envolvido. Adaptação da referência do 21st.dev aos tokens do
 * DESIGN-ferrari.md: sem gradiente, sem som, sem cantos arredondados.
 */
export function ChatSearchInput({
  examples,
  pending,
  onSend,
}: {
  examples: string[];
  pending: boolean;
  onSend: (text: string) => void;
}) {
  const [value, setValue] = useState("");
  const [exampleIndex, setExampleIndex] = useState(0);
  const [sent, setSent] = useState<string | null>(null);

  // Placeholder rotativo — pausa enquanto o usuário digita
  useEffect(() => {
    if (value) return;
    const id = setInterval(
      () => setExampleIndex((i) => (i + 1) % examples.length),
      ROTATE_MS,
    );
    return () => clearInterval(id);
  }, [value, examples.length]);

  const trimmed = value.trim();
  const canSend = trimmed.length >= 2 && !pending;

  function send() {
    if (!canSend) return;
    setSent(trimmed);
    onSend(trimmed);
    setValue("");
  }

  return (
    <div className="flex flex-col gap-xs">
      {pending && sent && (
        <div aria-live="polite" className="flex flex-col gap-xxs">
          <p className="animate-bubble-in max-w-[85%] self-end rounded-sm border border-hairline bg-canvas-elevated/60 px-xs py-xxs text-body-md text-ink">
            {sent}
          </p>
          <p className="animate-bubble-in self-start text-body-sm text-body">
            Iniciando o mapeamento…
          </p>
        </div>
      )}

      <div className="flex items-center gap-xxs rounded-sm border border-hairline bg-canvas p-xxs transition-colors focus-within:border-muted">
        <div className="relative min-w-0 flex-1">
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                event.preventDefault();
                send();
              }
            }}
            disabled={pending}
            aria-label="O que você quer mapear? Tema, @canal ou nicho"
            className="h-[40px] w-full bg-transparent px-xxs text-body-md text-ink disabled:opacity-50"
          />
          {!value && (
            <span
              key={exampleIndex}
              aria-hidden="true"
              className="animate-placeholder-in pointer-events-none absolute inset-y-0 left-xxs flex items-center text-body-md text-muted"
            >
              ex.: {examples[exampleIndex]}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={send}
          disabled={!canSend}
          aria-label="Enviar"
          className={`flex h-[40px] w-[40px] shrink-0 cursor-pointer items-center justify-center rounded-sm transition-colors disabled:cursor-not-allowed ${
            canSend
              ? "bg-primary text-on-primary active:bg-primary-active"
              : "border border-hairline text-muted"
          }`}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M8 13V3M8 3L3.5 7.5M8 3l4.5 4.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="square"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
