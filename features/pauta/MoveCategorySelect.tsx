"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { moveFavorite } from "@/features/pauta/actions";

export type CategoryOption = { id: string; name: string };

/**
 * Select nativo para mover um favorito entre categorias. Otimista no
 * próprio controle (o select já mostra o destino); o card muda de
 * seção no revalidate do server action.
 */
export function MoveCategorySelect({
  videoId,
  current,
  options,
}: {
  videoId: string;
  current: string | null;
  options: CategoryOption[];
}) {
  const router = useRouter();
  const [value, setValue] = useState(current ?? "");
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function move(next: string) {
    const previous = value;
    setValue(next);
    setError(undefined);
    startTransition(async () => {
      const result = await moveFavorite(videoId, next === "" ? null : next);
      if (result.error) {
        setValue(previous);
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-xxs">
      <label
        htmlFor={`move-${videoId}`}
        className="text-caption text-muted-soft"
      >
        Categoria
      </label>
      <select
        id={`move-${videoId}`}
        value={value}
        disabled={pending}
        onChange={(event) => move(event.target.value)}
        className="h-[32px] cursor-pointer rounded-sm border border-hairline bg-canvas px-xxs text-body-sm text-body disabled:opacity-50"
      >
        <option value="">Geral</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
      {error && <span className="text-body-sm text-warning">{error}</span>}
    </div>
  );
}
