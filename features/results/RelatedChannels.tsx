"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SaveChannelButton } from "@/features/pauta/SaveChannelButton";
import { formatCompactCount } from "@/utils/format";
import type { RelatedChannel } from "@/services/relatedService";

/**
 * Canais relacionados (doc 3 §3.8): derivados das coaparições no
 * corpus. Um clique dispara uma nova pesquisa com o canal; o botão
 * "salvar" manda o canal para as Referências do Workspace (B5).
 */
export function RelatedChannels({
  related,
}: {
  related: (RelatedChannel & { saved: boolean })[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();

  if (related.length === 0) return null;

  async function mapChannel(channelId: string) {
    setPending(channelId);
    setError(undefined);
    try {
      const response = await fetch("/api/searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "channels", inputs: [channelId] }),
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
      setPending(null);
    }
  }

  return (
    <section className="flex flex-col gap-xs border-t border-hairline pt-md">
      <h2 className="text-title-md text-ink">Canais relacionados</h2>
      <p className="text-body-sm text-body">
        Canais que aparecem nos mesmos temas — descobertos pelo corpus da
        plataforma.
      </p>
      {error && <p className="text-body-sm text-warning">{error}</p>}
      <ul className="flex flex-wrap gap-xxs">
        {related.map((channel) => (
          <li
            key={channel.channelId}
            className="flex items-center gap-xxs rounded-full border border-hairline py-xxxs pl-xs pr-xxs transition-colors hover:border-muted"
          >
            <button
              onClick={() => mapChannel(channel.channelId)}
              disabled={pending !== null}
              className="flex cursor-pointer items-center gap-xxs py-xxxs text-body-sm disabled:opacity-50"
            >
              <span className="text-ink">{channel.title}</span>
              {channel.subscriberCount !== null && (
                <span className="text-muted-soft">
                  {formatCompactCount(channel.subscriberCount)}
                </span>
              )}
              <span className="text-caption-upper uppercase text-body">
                {pending === channel.channelId ? "…" : "mapear"}
              </span>
            </button>
            <SaveChannelButton
              channelId={channel.channelId}
              initialSaved={channel.saved}
              labeled
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
