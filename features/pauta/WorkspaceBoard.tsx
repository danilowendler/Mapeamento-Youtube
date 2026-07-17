"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Bookmark,
  Check,
  ChevronDown,
  FolderInput,
  Plus,
  Star,
  Undo2,
} from "lucide-react";
import { ScoreBadge } from "@/features/results/ScoreBadge";
import { CategoryHeader } from "@/features/pauta/CategoryHeader";
import {
  createCategory,
  moveChannelRef,
  moveFavorite,
  type FolderKind,
} from "@/features/pauta/actions";
import { formatCompactCount } from "@/utils/format";

export type WorkspaceFolder = {
  id: string;
  name: string;
  kind: FolderKind;
};

export type VideoItem = {
  videoId: string;
  title: string;
  channelTitle: string;
  score: number;
  thumbnailUrl: string | null;
  folderId: string | null;
};

export type ChannelItem = {
  channelId: string;
  title: string;
  subscriberCount: number | null;
  thumbnailUrl: string | null;
  folderId: string | null;
};

type DragItem = { type: "video" | "channel"; id: string };

const KIND_LABEL: Record<FolderKind, string> = {
  pautas: "Pautas",
  referencias: "Referências",
};

/**
 * Glifo de pasta do Workspace: corpo em duas camadas sobre os tokens
 * do canvas + etiqueta colorida que declara o tipo (cinza = Pautas,
 * azul = Referências). Selecionada, a frente "abre" clareando.
 */
function FolderGlyph({ kind, open }: { kind: FolderKind; open: boolean }) {
  const accent =
    kind === "referencias"
      ? "var(--color-data-series)"
      : "var(--color-muted-soft)";
  return (
    <svg width="48" height="38" viewBox="0 0 48 38" aria-hidden="true">
      {/* corpo (trás, com a aba) */}
      <path
        d="M3 8a3 3 0 0 1 3-3h11l4 4h21a3 3 0 0 1 3 3v18a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8Z"
        fill="var(--color-canvas-elevated)"
        stroke={open ? "var(--color-muted)" : "var(--color-hairline)"}
      />
      {/* frente — clareia quando a pasta está aberta/selecionada */}
      <path
        d="M3 14h42v13a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V14Z"
        fill={open ? "var(--color-muted)" : "var(--color-canvas)"}
        fillOpacity={open ? 0.4 : 0.45}
      />
      {/* etiqueta: a cor diz o tipo da pasta */}
      <rect x="9" y="22" width="15" height="3.5" rx="1.75" fill={accent} />
    </svg>
  );
}
const KIND_FOR_TYPE: Record<DragItem["type"], FolderKind> = {
  video: "pautas",
  channel: "referencias",
};

/**
 * Workspace (M10.5, lote B5 — prints 05/06), desenhado para quem
 * chega sem contexto: todo card declara seu tipo, todo movimento tem
 * dois caminhos (arrastar OU o seletor "Mover para"), alvos inválidos
 * se apagam durante o arrasto e os estados vazios ensinam de onde os
 * itens vêm.
 */
export function WorkspaceBoard({
  folders,
  videos,
  channels,
}: {
  folders: WorkspaceFolder[];
  videos: VideoItem[];
  channels: ChannelItem[];
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<DragItem | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Map<string, string | null>>(
    new Map(),
  );
  const [error, setError] = useState<string | undefined>();
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Formulário de criação
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState<FolderKind | null>(null);
  const [createError, setCreateError] = useState<string | undefined>();

  const keyOf = (item: DragItem) => `${item.type}:${item.id}`;
  const folderOf = (item: DragItem, original: string | null) =>
    overrides.has(keyOf(item)) ? (overrides.get(keyOf(item)) ?? null) : original;

  const knownIds = new Set(folders.map((f) => f.id));
  const locate = (item: DragItem, raw: string | null) => {
    const id = folderOf(item, raw);
    return id !== null && knownIds.has(id) ? id : null;
  };

  const looseVideos = videos.filter(
    (v) => locate({ type: "video", id: v.videoId }, v.folderId) === null,
  );
  const looseChannels = channels.filter(
    (c) => locate({ type: "channel", id: c.channelId }, c.folderId) === null,
  );

  const countOf = (folder: WorkspaceFolder) =>
    folder.kind === "pautas"
      ? videos.filter(
          (v) => locate({ type: "video", id: v.videoId }, v.folderId) === folder.id,
        ).length
      : channels.filter(
          (c) =>
            locate({ type: "channel", id: c.channelId }, c.folderId) ===
            folder.id,
        ).length;

  function move(item: DragItem, folderId: string | null) {
    setError(undefined);
    setOverrides((current) => {
      const next = new Map(current);
      next.set(keyOf(item), folderId);
      return next;
    });
    startTransition(async () => {
      const result =
        item.type === "video"
          ? await moveFavorite(item.id, folderId)
          : await moveChannelRef(item.id, folderId);
      if (result.error) {
        setOverrides((current) => {
          const next = new Map(current);
          next.delete(keyOf(item));
          return next;
        });
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function submitCreate(kind: FolderKind) {
    setCreateError(undefined);
    setCreating(kind);
    startTransition(async () => {
      const result = await createCategory(newName, kind);
      setCreating(null);
      if (result.error) {
        setCreateError(result.error);
        return;
      }
      setNewName("");
      router.refresh();
    });
  }

  const selected = folders.find((f) => f.id === selectedId) ?? null;
  const selectedItems: (VideoItem | ChannelItem)[] = selected
    ? selected.kind === "pautas"
      ? videos.filter(
          (v) =>
            locate({ type: "video", id: v.videoId }, v.folderId) === selected.id,
        )
      : channels.filter(
          (c) =>
            locate({ type: "channel", id: c.channelId }, c.folderId) ===
            selected.id,
        )
    : [];

  const hasAnything = videos.length > 0 || channels.length > 0;

  /* ---- handlers de drop por pasta ---- */
  function folderDropProps(folder: WorkspaceFolder) {
    const accepts = dragging !== null && KIND_FOR_TYPE[dragging.type] === folder.kind;
    return {
      onDragOver: (event: React.DragEvent) => {
        if (!accepts) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setDropTarget(folder.id);
      },
      onDragLeave: () => {
        setDropTarget((current) => (current === folder.id ? null : current));
      },
      onDrop: (event: React.DragEvent) => {
        if (!accepts || !dragging) return;
        event.preventDefault();
        move(dragging, folder.id);
        setDragging(null);
        setDropTarget(null);
      },
    };
  }

  function dragProps(item: DragItem) {
    return {
      draggable: true,
      onDragStart: (event: React.DragEvent) => {
        event.dataTransfer.setData("text/plain", keyOf(item));
        event.dataTransfer.effectAllowed = "move";
        setDragging(item);
      },
      onDragEnd: () => {
        setDragging(null);
        setDropTarget(null);
      },
    };
  }

  /**
   * Menu compacto "Mover" (substitui o select nativo, que estourava o
   * card). Um aberto por vez; fecha em clique fora.
   */
  const moveMenu = (
    item: DragItem,
    current: string | null,
    kind: FolderKind,
  ) => {
    const key = keyOf(item);
    const open = openMenuKey === key;
    const options = folders.filter((f) => f.kind === kind);
    const destinations: { id: string | null; label: string }[] = [
      { id: null, label: "Soltos" },
      ...options.map((f) => ({ id: f.id as string | null, label: f.name })),
    ];
    return (
      <span
        className="relative inline-flex"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setOpenMenuKey(open ? null : key)}
          aria-haspopup="menu"
          aria-expanded={open}
          title="Mover para uma pasta"
          className={`flex cursor-pointer items-center gap-xxxs rounded-full border px-xxs py-xxxs text-caption transition-colors ${
            open
              ? "border-muted text-ink"
              : "border-hairline text-body hover:border-muted hover:text-ink"
          }`}
        >
          <FolderInput size={12} strokeWidth={1.6} />
          Mover
          <ChevronDown
            size={12}
            strokeWidth={1.6}
            className={`transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
        {open && (
          <span
            role="menu"
            aria-label="Mover para"
            className="animate-bubble-in absolute right-0 top-full z-30 mt-xxxs flex w-[180px] flex-col gap-xxxs rounded-md border border-hairline bg-canvas-elevated p-xxs"
          >
            {destinations.map((destination) => {
              const active = current === destination.id;
              return (
                <button
                  key={destination.id ?? "soltos"}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpenMenuKey(null);
                    if (!active) move(item, destination.id);
                  }}
                  className={`flex w-full cursor-pointer items-center gap-xxs rounded-sm px-xs py-xxs text-left text-body-sm transition-colors ${
                    active
                      ? "text-ink"
                      : "text-body hover:bg-canvas/60 hover:text-ink"
                  }`}
                >
                  <span className="truncate">{destination.label}</span>
                  {active && (
                    <Check
                      size={14}
                      strokeWidth={2}
                      className="ml-auto shrink-0 text-success"
                    />
                  )}
                </button>
              );
            })}
            {options.length === 0 && (
              <span className="px-xs py-xxs text-caption text-muted">
                crie uma pasta de {KIND_LABEL[kind]} acima
              </span>
            )}
          </span>
        )}
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-sm">
      {error && <p className="text-body-sm text-warning">{error}</p>}
      {/* Fecha o menu "Mover" aberto em qualquer clique fora dele
          (os gatilhos/menus barram a propagação do pointerdown) */}
      {openMenuKey !== null && (
        <span
          aria-hidden="true"
          className="fixed inset-0 z-20"
          onPointerDown={() => setOpenMenuKey(null)}
        />
      )}

      {/* Criação de pastas — os dois tipos lado a lado, com explicação */}
      <div className="flex flex-col gap-xxs rounded-md border border-hairline p-sm">
        <div className="flex flex-wrap items-center gap-xxs">
          <label htmlFor="new-folder" className="sr-only">
            Nome da nova pasta
          </label>
          <input
            id="new-folder"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            maxLength={40}
            placeholder="Nome da nova pasta"
            className="h-[40px] w-full max-w-[320px] rounded-sm border border-hairline bg-canvas px-xxs text-body-md text-ink transition-[border-color,box-shadow] duration-200 placeholder:text-muted focus:border-muted focus:shadow-[0_0_0_3px_rgba(255,255,255,0.05)] focus-visible:outline-none"
          />
          <button
            type="button"
            onClick={() => submitCreate("pautas")}
            disabled={creating !== null || newName.trim().length === 0}
            className="flex h-[40px] cursor-pointer items-center gap-xxxs rounded-full border border-hairline px-xs text-caption-upper uppercase text-body transition-colors hover:border-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={14} strokeWidth={2} />
            {creating === "pautas" ? "Criando…" : "Pasta de Pautas"}
          </button>
          <button
            type="button"
            onClick={() => submitCreate("referencias")}
            disabled={creating !== null || newName.trim().length === 0}
            className="flex h-[40px] cursor-pointer items-center gap-xxxs rounded-full border border-hairline px-xs text-caption-upper uppercase text-body transition-colors hover:border-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={14} strokeWidth={2} />
            {creating === "referencias" ? "Criando…" : "Pasta de Referências"}
          </button>
        </div>
        <p className="text-caption text-muted">
          Pastas de <span className="text-body">Pautas</span> guardam vídeos
          favoritados · pastas de{" "}
          <span className="text-body">Referências</span> guardam canais
          salvos.
        </p>
        {createError && (
          <p className="text-body-sm text-warning">{createError}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-sm md:grid-cols-[1fr_300px]">
        {/* Coluna principal: pastas + soltos, no ambiente de trabalho
            com a grade técnica de fundo (print 05) */}
        <div className="flex min-w-0 flex-col gap-sm rounded-md border border-hairline bg-technical-grid p-sm">
          <section aria-label="Pastas" className="flex flex-col gap-xxs">
            <h2 className="text-caption-upper uppercase text-muted-soft">
              Pastas
            </h2>
            {folders.length === 0 ? (
              <p className="rounded-md border border-dashed border-hairline bg-canvas p-sm text-body-sm text-body">
                Você ainda não tem pastas — crie a primeira acima para
                organizar suas ideias.
              </p>
            ) : (
              <ul className="grid grid-cols-2 gap-xxs sm:grid-cols-3">
                {folders.map((folder) => {
                  const isDrop = dropTarget === folder.id;
                  const rejected =
                    dragging !== null &&
                    KIND_FOR_TYPE[dragging.type] !== folder.kind;
                  const isSelected = selectedId === folder.id;
                  return (
                    <li key={folder.id}>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedId(isSelected ? null : folder.id)
                        }
                        {...folderDropProps(folder)}
                        className={`group flex w-full cursor-pointer flex-col items-center gap-xxs rounded-md border p-xs pt-sm text-center transition-[border-color,background-color,transform] duration-200 ${
                          isDrop
                            ? "border-data-series bg-data-series/10"
                            : isSelected
                              ? "border-muted bg-canvas-elevated/40"
                              : "border-hairline bg-canvas hover:-translate-y-[2px] hover:border-muted"
                        } ${rejected ? "opacity-40" : ""}`}
                        title={
                          rejected
                            ? `Este item não entra aqui — ${
                                folder.kind === "pautas"
                                  ? "esta pasta guarda vídeos"
                                  : "esta pasta guarda canais"
                              }`
                            : undefined
                        }
                      >
                        <FolderGlyph kind={folder.kind} open={isSelected} />
                        <span className="w-full truncate text-title-sm text-ink">
                          {folder.name}
                        </span>
                        <span
                          className={`rounded-full border px-xxs py-[2px] text-caption-upper uppercase ${
                            folder.kind === "referencias"
                              ? "border-data-series/40 text-data-series"
                              : "border-hairline text-muted-soft"
                          }`}
                        >
                          {KIND_LABEL[folder.kind]} · {countOf(folder)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section
            aria-label="Itens soltos"
            className="flex flex-col gap-xxs"
          >
            <h2 className="text-caption-upper uppercase text-muted-soft">
              Soltos — arraste para uma pasta
            </h2>
            <p className="text-caption text-muted">
              Sem pressa: dá para arrastar cada card ou usar o seletor
              “Mover para” dele.
            </p>

            {!hasAnything ? (
              <div className="flex flex-col gap-xs rounded-md border border-dashed border-hairline bg-canvas p-sm">
                <p className="flex items-start gap-xxs text-body-sm text-body">
                  <Star
                    size={16}
                    strokeWidth={1.6}
                    className="mt-[2px] shrink-0 text-focus-ring"
                  />
                  Favorite oportunidades (☆) em qualquer pesquisa — elas
                  aparecem aqui como cards de vídeo.
                </p>
                <p className="flex items-start gap-xxs text-body-sm text-body">
                  <Bookmark
                    size={16}
                    strokeWidth={1.6}
                    className="mt-[2px] shrink-0 text-data-series"
                  />
                  Nos resultados, clique em “salvar” ao lado de qualquer
                  canal (na fileira de canais analisados ou nos
                  relacionados) — ele vira um card de canal aqui.
                </p>
                <Link
                  href="/app"
                  className="w-fit text-body-sm text-ink underline"
                >
                  Começar um mapeamento
                </Link>
              </div>
            ) : looseVideos.length === 0 && looseChannels.length === 0 ? (
              <p className="rounded-md border border-dashed border-hairline bg-canvas p-sm text-body-sm text-body">
                Tudo organizado — novos favoritos e canais salvos chegam
                aqui.
              </p>
            ) : (
              <ul className="grid grid-cols-2 gap-xxs md:grid-cols-3 lg:grid-cols-4">
                {looseVideos.map((video) => (
                  <li
                    key={video.videoId}
                    {...dragProps({ type: "video", id: video.videoId })}
                    title="Arraste para uma pasta de Pautas"
                    className={`group flex cursor-grab flex-col rounded-md border border-hairline bg-canvas transition-colors hover:border-muted active:cursor-grabbing ${
                      dragging?.id === video.videoId ? "opacity-50" : ""
                    }`}
                  >
                    <a
                      href={`https://www.youtube.com/watch?v=${video.videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Assistir no YouTube"
                      className="relative block aspect-video w-full overflow-hidden rounded-t-md bg-canvas-elevated"
                    >
                      {video.thumbnailUrl && (
                        <Image
                          src={video.thumbnailUrl}
                          alt=""
                          fill
                          sizes="(max-width: 768px) 50vw, 220px"
                          className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                        />
                      )}
                      <span className="absolute right-xxs top-xxs">
                        <ScoreBadge score={video.score} />
                      </span>
                    </a>
                    <div className="flex flex-1 flex-col gap-xxxs p-xxs">
                      <a
                        href={`https://www.youtube.com/watch?v=${video.videoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="line-clamp-2 text-body-sm text-ink hover:underline"
                      >
                        {video.title}
                      </a>
                      <p className="truncate text-caption text-muted">
                        {video.channelTitle}
                      </p>
                      <div className="mt-auto flex flex-wrap items-center justify-between gap-xxs pt-xxxs">
                        <span className="rounded-full border border-hairline px-xxs text-caption-upper uppercase text-muted-soft">
                          vídeo
                        </span>
                        {moveMenu(
                          { type: "video", id: video.videoId },
                          locate(
                            { type: "video", id: video.videoId },
                            video.folderId,
                          ),
                          "pautas",
                        )}
                      </div>
                    </div>
                  </li>
                ))}
                {looseChannels.map((channel) => (
                  <li
                    key={channel.channelId}
                    {...dragProps({ type: "channel", id: channel.channelId })}
                    title="Arraste para uma pasta de Referências"
                    className={`flex cursor-grab flex-col justify-between gap-xxs rounded-md border border-hairline bg-canvas p-xxs transition-colors hover:border-muted active:cursor-grabbing ${
                      dragging?.id === channel.channelId ? "opacity-50" : ""
                    }`}
                  >
                    <a
                      href={`https://www.youtube.com/channel/${channel.channelId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Abrir canal no YouTube"
                      className="flex items-center gap-xxs"
                    >
                      <span className="relative block h-[36px] w-[36px] shrink-0 overflow-hidden rounded-full bg-canvas-elevated">
                        {channel.thumbnailUrl ? (
                          <Image
                            src={channel.thumbnailUrl}
                            alt=""
                            fill
                            sizes="36px"
                            className="object-cover"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-body-sm text-ink">
                            {channel.title.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-1 block text-body-sm text-ink hover:underline">
                          {channel.title}
                        </span>
                        <span className="block text-caption text-muted">
                          {channel.subscriberCount !== null
                            ? `${formatCompactCount(channel.subscriberCount)} inscritos`
                            : "canal de referência"}
                        </span>
                      </span>
                    </a>
                    <div className="flex items-center justify-between gap-xxs">
                      <span className="rounded-full border border-hairline px-xxs text-caption-upper uppercase text-data-series">
                        canal
                      </span>
                      {moveMenu(
                        { type: "channel", id: channel.channelId },
                        locate(
                          { type: "channel", id: channel.channelId },
                          channel.folderId,
                        ),
                        "referencias",
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Painel lateral: conteúdo da pasta selecionada */}
        <aside
          aria-label="Conteúdo da pasta selecionada"
          className="h-fit rounded-md border border-hairline p-sm md:sticky md:top-md"
        >
          {selected === null ? (
            <p className="text-body-sm text-body">
              Clique numa pasta para ver o que tem dentro — e para
              renomeá-la ou excluí-la.
            </p>
          ) : (
            <div className="flex flex-col gap-xs">
              <CategoryHeader
                key={selected.id}
                id={selected.id}
                name={selected.name}
                count={selectedItems.length}
                noun={
                  selected.kind === "pautas"
                    ? ["vídeo", "vídeos"]
                    : ["canal", "canais"]
                }
              />
              {selectedItems.length === 0 ? (
                <p className="text-body-sm text-body">
                  Pasta vazia — arraste um card de{" "}
                  {selected.kind === "pautas" ? "vídeo" : "canal"} até ela,
                  ou use o “Mover para” do card.
                </p>
              ) : (
                <ul className="flex flex-col gap-xxs">
                  {selectedItems.map((item) => {
                    const isVideo = "videoId" in item;
                    const drag: DragItem = isVideo
                      ? { type: "video", id: item.videoId }
                      : { type: "channel", id: item.channelId };
                    return (
                      <li
                        key={drag.id}
                        className="flex items-center justify-between gap-xxs border-b border-hairline pb-xxs"
                      >
                        <div className="min-w-0">
                          <a
                            href={
                              isVideo
                                ? `https://www.youtube.com/watch?v=${item.videoId}`
                                : `https://www.youtube.com/channel/${item.channelId}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Abrir no YouTube"
                            className="line-clamp-1 text-body-sm text-ink hover:underline"
                          >
                            {item.title}
                          </a>
                          <p className="truncate text-caption text-muted">
                            {isVideo
                              ? item.channelTitle
                              : item.subscriberCount !== null
                                ? `${formatCompactCount(item.subscriberCount)} inscritos`
                                : "canal"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => move(drag, null)}
                          title="Devolver para os Soltos"
                          className="flex shrink-0 cursor-pointer items-center gap-xxxs rounded-full border border-hairline px-xxs py-xxxs text-caption text-body transition-colors hover:border-muted hover:text-ink"
                        >
                          <Undo2 size={12} strokeWidth={1.6} />
                          soltar
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
