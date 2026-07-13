"use client";

import { useState, useTransition } from "react";
import { createCategory } from "@/features/pauta/actions";

/** Criação inline de categoria da pauta (M10, lote 4). */
export function NewCategoryForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-fit cursor-pointer border border-hairline px-xs py-xxs text-nav-link uppercase text-body transition-colors hover:border-muted hover:text-ink"
      >
        + Nova categoria
      </button>
    );
  }

  function submit() {
    setError(undefined);
    startTransition(async () => {
      const result = await createCategory(name);
      if (result.error) {
        setError(result.error);
        return;
      }
      setName("");
      setOpen(false);
    });
  }

  return (
    <form
      className="flex flex-col gap-xxs"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="flex items-center gap-xxs">
        <label htmlFor="new-category" className="sr-only">
          Nome da categoria
        </label>
        <input
          id="new-category"
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={40}
          placeholder="ex.: Próximo mês, Shorts…"
          className="h-[40px] w-full max-w-[320px] rounded-sm border border-hairline bg-canvas px-xxs text-body-md text-ink placeholder:text-muted"
        />
        <button
          type="submit"
          disabled={pending || name.trim().length === 0}
          className="h-[40px] cursor-pointer bg-primary px-xs text-button-label uppercase text-on-primary transition-colors active:bg-primary-active disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Criando…" : "Criar"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setName("");
            setError(undefined);
          }}
          className="h-[40px] cursor-pointer px-xxs text-nav-link uppercase text-muted-soft transition-colors hover:text-ink"
        >
          Cancelar
        </button>
      </div>
      {error && <p className="text-body-sm text-warning">{error}</p>}
    </form>
  );
}
