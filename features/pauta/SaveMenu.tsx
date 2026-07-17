"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bookmark, Check, ChevronDown, Star } from "lucide-react";
import { setFavorite } from "@/features/favorites/actions";
import { setChannelRef } from "@/features/pauta/actions";

/**
 * Menu "Salvar" do card de oportunidade (M10.5, B5): um botão único e
 * autoexplicativo que abre as duas opções — vídeo na pauta, canal nas
 * referências — com estado visível e paywall não-hostil. Substitui a
 * estrela solta (decisão do time, 17/07/2026).
 */
export function SaveMenu({
  videoId,
  channelId,
  searchId,
  initialVideoSaved,
  initialChannelSaved,
}: {
  videoId: string;
  channelId: string;
  searchId?: string;
  initialVideoSaved: boolean;
  initialChannelSaved: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [videoSaved, setVideoSaved] = useState(initialVideoSaved);
  const [channelSaved, setChannelSaved] = useState(initialChannelSaved);
  const [message, setMessage] = useState<string | null>(null);
  const rootRef = useRef<HTMLSpanElement>(null);

  // Clique fora / Esc fecham o menu
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  /** O card inteiro é um link para o YouTube — nunca navegar. */
  function shield(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  async function toggleVideo(event: React.MouseEvent) {
    shield(event);
    const next = !videoSaved;
    setVideoSaved(next);
    setMessage(null);
    try {
      const result = await setFavorite(videoId, next, searchId);
      if (result.error) {
        setVideoSaved(!next);
        setMessage(result.error);
      }
    } catch {
      setVideoSaved(!next);
      setMessage("Falha de rede. Tente novamente.");
    }
  }

  async function toggleChannel(event: React.MouseEvent) {
    shield(event);
    const next = !channelSaved;
    setChannelSaved(next);
    setMessage(null);
    try {
      const result = await setChannelRef(channelId, next);
      if (result.error) {
        setChannelSaved(!next);
        setMessage(result.error);
      }
    } catch {
      setChannelSaved(!next);
      setMessage("Falha de rede. Tente novamente.");
    }
  }

  const anySaved = videoSaved || channelSaved;
  const rowClass =
    "flex w-full cursor-pointer items-center gap-xxs rounded-sm px-xs py-xxs text-body-sm text-body transition-colors hover:bg-canvas/60 hover:text-ink";

  return (
    <span ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        onClick={(event) => {
          shield(event);
          setOpen((current) => !current);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Salvar no Workspace"
        className={`flex cursor-pointer items-center gap-xxxs rounded-full border px-xxs py-xxxs text-caption transition-colors ${
          anySaved
            ? "border-data-series/60 text-data-series"
            : "border-hairline text-body hover:border-muted hover:text-ink"
        }`}
      >
        <Bookmark
          size={12}
          strokeWidth={1.6}
          fill={anySaved ? "currentColor" : "none"}
        />
        {anySaved ? "Salvo" : "Salvar"}
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
          aria-label="Salvar no Workspace"
          className="animate-bubble-in absolute right-0 top-full z-20 mt-xxs flex w-[240px] flex-col gap-xxxs rounded-md border border-hairline bg-canvas-elevated p-xxs text-left"
        >
          <button
            type="button"
            role="menuitem"
            onClick={toggleVideo}
            className={rowClass}
          >
            <Star
              size={16}
              strokeWidth={1.6}
              fill={videoSaved ? "currentColor" : "none"}
              className={videoSaved ? "text-focus-ring" : ""}
            />
            Vídeo na pauta
            {videoSaved && (
              <Check size={14} strokeWidth={2} className="ml-auto text-success" />
            )}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={toggleChannel}
            className={rowClass}
          >
            <Bookmark
              size={16}
              strokeWidth={1.6}
              fill={channelSaved ? "currentColor" : "none"}
              className={channelSaved ? "text-data-series" : ""}
            />
            Canal nas referências
            {channelSaved && (
              <Check size={14} strokeWidth={2} className="ml-auto text-success" />
            )}
          </button>

          {message && (
            <span className="flex flex-col gap-xxs border-t border-hairline px-xs py-xxs">
              <span className="text-body-sm text-ink">{message}</span>
              <span className="flex items-center gap-xs">
                <Link
                  href="/app?settings=plano"
                  className="text-body-sm text-primary"
                  onClick={(event) => event.stopPropagation()}
                >
                  Ver planos
                </Link>
                <button
                  type="button"
                  onClick={(event) => {
                    shield(event);
                    setMessage(null);
                  }}
                  className="cursor-pointer text-body-sm text-muted-soft"
                >
                  Fechar
                </button>
              </span>
            </span>
          )}
        </span>
      )}
    </span>
  );
}
