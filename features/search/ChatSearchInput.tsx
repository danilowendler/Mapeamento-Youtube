"use client";

import { useState } from "react";
import { ArrowUp, Search } from "lucide-react";

/**
 * Barra de chat do Mapping (M10.5, lote B3 — prints 01–03). Estética
 * de conversa, promessa determinística: quem interpreta o texto é o
 * SearchForm (parseChannelInput / match de nicho / keyword) — nenhum
 * LLM envolvido.
 */
export function ChatSearchInput({
  placeholder,
  pending,
  onSend,
}: {
  placeholder: string;
  pending: boolean;
  onSend: (text: string) => void;
}) {
  const [value, setValue] = useState("");
  const [sent, setSent] = useState<string | null>(null);

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
          <p className="animate-bubble-in max-w-[85%] self-end rounded-md border border-hairline bg-canvas-elevated/60 px-xs py-xxs text-body-md text-ink">
            {sent}
          </p>
          <p className="animate-bubble-in self-start text-body-sm text-body">
            Iniciando o mapeamento…
          </p>
        </div>
      )}

      <div className="flex items-center gap-xxs rounded-lg border border-hairline bg-canvas-elevated/25 p-xxs transition-colors focus-within:border-muted">
        <Search
          size={18}
          strokeWidth={1.6}
          aria-hidden="true"
          className="ml-xxs shrink-0 text-muted"
        />
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
          placeholder={placeholder}
          aria-label="O que você quer mapear? Tema, palavra-chave, @canal ou nicho"
          className="h-[44px] w-full min-w-0 flex-1 bg-transparent px-xxs text-body-md text-ink placeholder:text-muted disabled:opacity-50"
        />
        <button
          type="button"
          onClick={send}
          disabled={!canSend}
          aria-label="Enviar"
          className="flex h-[40px] w-[40px] shrink-0 cursor-pointer items-center justify-center rounded-sm bg-primary text-on-primary transition-colors active:bg-primary-active disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowUp size={18} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
