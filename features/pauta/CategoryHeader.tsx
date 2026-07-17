"use client";

import { useState, useTransition } from "react";
import { deleteCategory, renameCategory } from "@/features/pauta/actions";

/**
 * Cabeçalho de uma categoria da pauta: nome + contagem + renomear/
 * excluir em duas etapas inline (nada de window.confirm). Excluir
 * devolve os favoritos ao "Geral" — nunca apaga um favorito.
 */
export function CategoryHeader({
  id,
  name,
  count,
  noun = ["ideia", "ideias"],
}: {
  id: string;
  name: string;
  count: number;
  noun?: [string, string];
}) {
  const [mode, setMode] = useState<"view" | "rename" | "confirm-delete">(
    "view",
  );
  const [draft, setDraft] = useState(name);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function submitRename() {
    setError(undefined);
    startTransition(async () => {
      const result = await renameCategory(id, draft);
      if (result.error) {
        setError(result.error);
        return;
      }
      setMode("view");
    });
  }

  function submitDelete() {
    setError(undefined);
    startTransition(async () => {
      const result = await deleteCategory(id);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-xxs">
      <div className="flex flex-wrap items-baseline justify-between gap-xxs border-b border-hairline pb-xxs">
        {mode === "rename" ? (
          <form
            className="flex items-center gap-xxs"
            onSubmit={(event) => {
              event.preventDefault();
              submitRename();
            }}
          >
            <label htmlFor={`rename-${id}`} className="sr-only">
              Novo nome da categoria
            </label>
            <input
              id={`rename-${id}`}
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={40}
              className="h-[32px] rounded-sm border border-hairline bg-canvas px-xxs text-body-md text-ink"
            />
            <button
              type="submit"
              disabled={pending || draft.trim().length === 0}
              className="cursor-pointer text-nav-link uppercase text-ink disabled:opacity-50"
            >
              {pending ? "Salvando…" : "Salvar"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("view");
                setDraft(name);
                setError(undefined);
              }}
              className="cursor-pointer text-nav-link uppercase text-muted-soft hover:text-ink"
            >
              Cancelar
            </button>
          </form>
        ) : (
          <h2 className="text-title-md text-ink">
            {name}{" "}
            <span className="text-body-sm font-normal text-muted-soft">
              · {count} {count === 1 ? noun[0] : noun[1]}
            </span>
          </h2>
        )}

        {mode === "view" && (
          <span className="flex items-center gap-xs">
            <button
              type="button"
              onClick={() => setMode("rename")}
              className="cursor-pointer text-caption-upper uppercase text-muted-soft transition-colors hover:text-ink"
            >
              Renomear
            </button>
            <button
              type="button"
              onClick={() => setMode("confirm-delete")}
              className="cursor-pointer text-caption-upper uppercase text-muted-soft transition-colors hover:text-ink"
            >
              Excluir
            </button>
          </span>
        )}

        {mode === "confirm-delete" && (
          <span className="flex items-center gap-xs">
            <span className="text-body-sm text-body">
              Os favoritos voltam ao Geral.
            </span>
            <button
              type="button"
              onClick={submitDelete}
              disabled={pending}
              className="cursor-pointer text-caption-upper uppercase text-warning disabled:opacity-50"
            >
              {pending ? "Excluindo…" : "Confirmar exclusão"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("view");
                setError(undefined);
              }}
              className="cursor-pointer text-caption-upper uppercase text-muted-soft hover:text-ink"
            >
              Cancelar
            </button>
          </span>
        )}
      </div>
      {error && <p className="text-body-sm text-warning">{error}</p>}
    </div>
  );
}
