"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { ChevronDown, FolderInput, PenLine, Undo2 } from "lucide-react";
import { CategoryHeader } from "@/features/pauta/CategoryHeader";
import { FolderGlyph } from "@/features/pauta/WorkspaceBoard";
import {
  moveChannelRef,
  moveFavorite,
  updateFolderNotes,
  updateItemNote,
  type FolderKind,
} from "@/features/pauta/actions";
import { ScoreBadge } from "@/features/results/ScoreBadge";
import { formatCompactCount } from "@/utils/format";

export type FolderInfo = {
  id: string;
  name: string;
  kind: FolderKind;
  notes: string | null;
};

export type FolderVideo = {
  videoId: string;
  title: string;
  channelTitle: string;
  score: number;
  thumbnailUrl: string | null;
  note: string | null;
  createdAt: string;
};

export type FolderChannel = {
  channelId: string;
  title: string;
  subscriberCount: number | null;
  thumbnailUrl: string | null;
  note: string | null;
  createdAt: string;
};

type SortKey = "recent" | "metric";
type SaveState = "idle" | "saving" | "saved" | "error";

const AUTOSAVE_MS = 800;

/**
 * Página dedicada da pasta (M10.5, B5.4 — spec 2026-07-17): o espaço
 * de trabalho onde o criador planeja (notas), organiza (mover/soltar)
 * e estuda (abrir no YouTube). O board fica com a triagem.
 */
export function FolderView({
  folder,
  siblings,
  videos,
  channels,
}: {
  folder: FolderInfo;
  /** Demais pastas do MESMO tipo (destinos do "Mover"). */
  siblings: { id: string; name: string }[];
  videos: FolderVideo[];
  channels: FolderChannel[];
}) {
  const router = useRouter();
  const [sort, setSort] = useState<SortKey>("recent");
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | undefined>();
  const [, startTransition] = useTransition();

  const isPautas = folder.kind === "pautas";
  const metricLabel = isPautas ? "Maior score" : "Mais inscritos";

  const visibleVideos = videos
    .filter((v) => !removed.has(`video:${v.videoId}`))
    .sort((a, b) =>
      sort === "metric"
        ? b.score - a.score
        : b.createdAt.localeCompare(a.createdAt),
    );
  const visibleChannels = channels
    .filter((c) => !removed.has(`channel:${c.channelId}`))
    .sort((a, b) =>
      sort === "metric"
        ? (b.subscriberCount ?? 0) - (a.subscriberCount ?? 0)
        : b.createdAt.localeCompare(a.createdAt),
    );
  const count = isPautas ? visibleVideos.length : visibleChannels.length;

  function move(type: "video" | "channel", id: string, target: string | null) {
    const key = `${type}:${id}`;
    setMoveError(undefined);
    setRemoved((current) => new Set(current).add(key));
    startTransition(async () => {
      const result =
        type === "video"
          ? await moveFavorite(id, target)
          : await moveChannelRef(id, target);
      if (result.error) {
        setRemoved((current) => {
          const next = new Set(current);
          next.delete(key);
          return next;
        });
        setMoveError(result.error);
        return;
      }
      router.refresh();
    });
  }

  const moveMenu = (type: "video" | "channel", id: string) => {
    const key = `${type}:${id}`;
    const open = openMenuKey === key;
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
            className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>
        {open && (
          <span
            role="menu"
            className="animate-bubble-in absolute right-0 top-full z-30 mt-xxxs flex w-[180px] flex-col gap-xxxs rounded-md border border-hairline bg-canvas-elevated p-xxs"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpenMenuKey(null);
                move(type, id, null);
              }}
              className="flex w-full cursor-pointer items-center gap-xxs rounded-sm px-xs py-xxs text-left text-body-sm text-body transition-colors hover:bg-canvas/60 hover:text-ink"
            >
              Soltos
            </button>
            {siblings.map((sibling) => (
              <button
                key={sibling.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpenMenuKey(null);
                  move(type, id, sibling.id);
                }}
                className="flex w-full cursor-pointer items-center gap-xxs rounded-sm px-xs py-xxs text-left text-body-sm text-body transition-colors hover:bg-canvas/60 hover:text-ink"
              >
                <span className="truncate">{sibling.name}</span>
              </button>
            ))}
            {siblings.length === 0 && (
              <span className="px-xs py-xxs text-caption text-muted">
                sem outras pastas deste tipo
              </span>
            )}
          </span>
        )}
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-md">
      {/* Fecha o menu Mover aberto em clique fora */}
      {openMenuKey !== null && (
        <span
          aria-hidden="true"
          className="fixed inset-0 z-20"
          onPointerDown={() => setOpenMenuKey(null)}
        />
      )}

      <header className="flex flex-wrap items-start justify-between gap-sm">
        <div className="flex items-center gap-sm">
          <span className="scale-[1.6]">
            <FolderGlyph kind={folder.kind} open />
          </span>
          <div className="flex min-w-0 flex-col gap-xxs">
            <CategoryHeader
              id={folder.id}
              name={folder.name}
              count={count}
              noun={isPautas ? ["vídeo", "vídeos"] : ["canal", "canais"]}
              afterDeleteHref="/app/pauta"
            />
            <span
              className={`w-fit rounded-full border px-xxs py-[2px] text-caption-upper uppercase ${
                isPautas
                  ? "border-hairline text-muted-soft"
                  : "border-data-series/40 text-data-series"
              }`}
            >
              {isPautas ? "Pautas" : "Referências"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-xxxs text-body-sm text-body">
          Ordenar
          {(["recent", "metric"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setSort(key)}
              aria-pressed={sort === key}
              className={`cursor-pointer rounded-full border px-xxs py-xxxs text-caption transition-colors ${
                sort === key
                  ? "border-muted text-ink"
                  : "border-hairline text-body hover:text-ink"
              }`}
            >
              {key === "recent" ? "Recentes" : metricLabel}
            </button>
          ))}
        </div>
      </header>

      <FolderNotes folderId={folder.id} initial={folder.notes} />

      {moveError && <p className="text-body-sm text-warning">{moveError}</p>}

      {count === 0 ? (
        <div className="flex flex-col gap-xxs rounded-md border border-dashed border-hairline p-sm">
          <p className="text-body-md text-body">
            Esta pasta está vazia — povoe-a a partir do Workspace:
            arraste um card de {isPautas ? "vídeo" : "canal"} até ela, ou
            use o “Mover ▾” de qualquer card.
          </p>
          <Link href="/app/pauta" className="w-fit text-body-sm text-ink underline">
            ‹ Voltar ao Workspace
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-xs sm:grid-cols-2 lg:grid-cols-3">
          {isPautas
            ? visibleVideos.map((video) => (
                <li
                  key={video.videoId}
                  className="group flex flex-col rounded-md border border-hairline bg-canvas transition-colors hover:border-muted"
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
                        sizes="(max-width: 768px) 100vw, 300px"
                        className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                      />
                    )}
                    <span className="absolute right-xxs top-xxs">
                      <ScoreBadge score={video.score} />
                    </span>
                  </a>
                  <div className="flex flex-1 flex-col gap-xxs p-xs">
                    <a
                      href={`https://www.youtube.com/watch?v=${video.videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="line-clamp-2 text-body-md text-ink hover:underline"
                    >
                      {video.title}
                    </a>
                    <p className="truncate text-caption text-muted">
                      {video.channelTitle}
                    </p>
                    <ItemNote
                      type="video"
                      id={video.videoId}
                      initial={video.note}
                    />
                    <div className="mt-auto flex flex-wrap items-center gap-xxs pt-xxxs">
                      {moveMenu("video", video.videoId)}
                      <button
                        type="button"
                        onClick={() => move("video", video.videoId, null)}
                        title="Devolver para os Soltos"
                        className="flex cursor-pointer items-center gap-xxxs rounded-full border border-hairline px-xxs py-xxxs text-caption text-body transition-colors hover:border-muted hover:text-ink"
                      >
                        <Undo2 size={12} strokeWidth={1.6} />
                        soltar
                      </button>
                    </div>
                  </div>
                </li>
              ))
            : visibleChannels.map((channel) => (
                <li
                  key={channel.channelId}
                  className="flex flex-col gap-xxs rounded-md border border-hairline bg-canvas p-xs transition-colors hover:border-muted"
                >
                  <a
                    href={`https://www.youtube.com/channel/${channel.channelId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Abrir canal no YouTube"
                    className="flex items-center gap-xxs"
                  >
                    <span className="relative block h-[44px] w-[44px] shrink-0 overflow-hidden rounded-full bg-canvas-elevated">
                      {channel.thumbnailUrl ? (
                        <Image
                          src={channel.thumbnailUrl}
                          alt=""
                          fill
                          sizes="44px"
                          className="object-cover"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-title-sm text-ink">
                          {channel.title.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-1 block text-body-md text-ink hover:underline">
                        {channel.title}
                      </span>
                      <span className="block text-caption text-muted">
                        {channel.subscriberCount !== null
                          ? `${formatCompactCount(channel.subscriberCount)} inscritos`
                          : "canal de referência"}
                      </span>
                    </span>
                  </a>
                  <ItemNote
                    type="channel"
                    id={channel.channelId}
                    initial={channel.note}
                  />
                  <div className="mt-auto flex flex-wrap items-center gap-xxs pt-xxxs">
                    {moveMenu("channel", channel.channelId)}
                    <button
                      type="button"
                      onClick={() => move("channel", channel.channelId, null)}
                      title="Devolver para os Soltos"
                      className="flex cursor-pointer items-center gap-xxxs rounded-full border border-hairline px-xxs py-xxxs text-caption text-body transition-colors hover:border-muted hover:text-ink"
                    >
                      <Undo2 size={12} strokeWidth={1.6} />
                      soltar
                    </button>
                  </div>
                </li>
              ))}
        </ul>
      )}
    </div>
  );
}

/** Indicador compacto de autosave. */
function SaveHint({ state }: { state: SaveState }) {
  if (state === "idle") return null;
  return (
    <span
      aria-live="polite"
      className={`text-caption ${
        state === "error" ? "text-warning" : "text-muted-soft"
      }`}
    >
      {state === "saving" ? "salvando…" : state === "saved" ? "salvo ✓" : "erro ao salvar"}
    </span>
  );
}

/** Bloco de notas da pasta, com autosave (debounce + blur). */
function FolderNotes({
  folderId,
  initial,
}: {
  folderId: string;
  initial: string | null;
}) {
  const [value, setValue] = useState(initial ?? "");
  const [state, setState] = useState<SaveState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function persist(text: string) {
    setState("saving");
    updateFolderNotes(folderId, text)
      .then((result) => setState(result.error ? "error" : "saved"))
      .catch(() => setState("error"));
  }

  function onChange(text: string) {
    setValue(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => persist(text), AUTOSAVE_MS);
  }

  function onBlur() {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
      persist(value);
    }
  }

  return (
    <section
      aria-label="Notas da pasta"
      className="flex flex-col gap-xxs rounded-md border border-hairline bg-canvas-elevated/20 p-xs"
    >
      <div className="flex items-center justify-between gap-xs">
        <span className="flex items-center gap-xxxs text-caption-upper uppercase text-muted-soft">
          <PenLine size={12} strokeWidth={1.6} />
          Notas da pasta
        </span>
        <SaveHint state={state} />
      </div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        maxLength={2000}
        rows={3}
        placeholder="Ideias, pauta da semana, o que gravar primeiro… (salva sozinho)"
        className="resize-y rounded-sm bg-transparent text-body-md text-ink transition-[box-shadow] duration-200 placeholder:text-muted focus:shadow-[0_0_0_3px_rgba(255,255,255,0.05)] focus-visible:outline-none"
      />
    </section>
  );
}

/** Nota curta por item: colapsada em "adicionar nota…", expande ao clicar. */
function ItemNote({
  type,
  id,
  initial,
}: {
  type: "video" | "channel";
  id: string;
  initial: string | null;
}) {
  const [value, setValue] = useState(initial ?? "");
  const [editing, setEditing] = useState(false);
  const [state, setState] = useState<SaveState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function persist(text: string) {
    setState("saving");
    updateItemNote(type, id, text)
      .then((result) => setState(result.error ? "error" : "saved"))
      .catch(() => setState("error"));
  }

  function onChange(text: string) {
    setValue(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => persist(text), AUTOSAVE_MS);
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        title={value ? "Editar nota" : "Adicionar nota"}
        className={`flex w-full cursor-text items-start gap-xxxs rounded-sm border border-dashed border-hairline px-xxs py-xxxs text-left text-body-sm transition-colors hover:border-muted ${
          value ? "text-body" : "text-muted"
        }`}
      >
        <PenLine size={12} strokeWidth={1.6} className="mt-[3px] shrink-0" />
        <span className="line-clamp-2">
          {value || "adicionar nota…"}
        </span>
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-xxxs">
      <textarea
        autoFocus
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => {
          if (timer.current) {
            clearTimeout(timer.current);
            timer.current = null;
            persist(value);
          }
          setEditing(false);
        }}
        maxLength={500}
        rows={2}
        placeholder="ex.: usar esse gancho no vídeo de sexta…"
        className="resize-none rounded-sm border border-hairline bg-canvas px-xxs py-xxxs text-body-sm text-ink transition-[border-color,box-shadow] duration-200 placeholder:text-muted focus:border-muted focus:shadow-[0_0_0_3px_rgba(255,255,255,0.05)] focus-visible:outline-none"
      />
      <div className="flex justify-end">
        <SaveHint state={state} />
      </div>
    </div>
  );
}
