"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  CircleUser,
  CreditCard,
  KeyRound,
  LogOut,
  Monitor,
  Moon,
  Settings2,
  Shield,
  Sun,
  X,
} from "lucide-react";
import { Button } from "@/components/Button";
import { DeleteAccountSection } from "@/features/account/DeleteAccountSection";
import { signOut } from "@/features/auth/actions";
import { PlanPanel } from "@/features/billing/PlanPanel";
import {
  getSettingsData,
  updateDisplayName,
  type SettingsData,
} from "@/features/settings/actions";

const SECTIONS = [
  { key: "geral", label: "Geral", icon: Settings2 },
  { key: "perfil", label: "Perfil", icon: CircleUser },
  { key: "plano", label: "Plano & Cobrança", icon: CreditCard },
  { key: "conta", label: "Conta", icon: Shield },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

function isSection(value: string | null): value is SectionKey {
  return SECTIONS.some((s) => s.key === value);
}

export type ThemePref = "dark" | "light" | "system";

/**
 * Modal de Configurações (M10.5, lote B2) — substitui a página
 * /app/conta. Controlado pela query `?settings=<seção>` (linkável:
 * paywalls apontam para ?settings=plano). Dados carregados ao abrir.
 */
export function SettingsModal({ theme }: { theme: ThemePref }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const param = searchParams.get("settings");
  const section: SectionKey | null = isSection(param) ? param : null;
  const open = section !== null;

  const [data, setData] = useState<SettingsData | null>(null);
  const [loadError, setLoadError] = useState<string | undefined>();
  const panelRef = useRef<HTMLDivElement>(null);

  // Carrega os dados quando o modal abre (callback assíncrono)
  useEffect(() => {
    if (!open || data !== null) return;
    let alive = true;
    getSettingsData().then((result) => {
      if (!alive) return;
      if (result.data) setData(result.data);
      else setLoadError(result.error ?? "Erro ao carregar.");
    });
    return () => {
      alive = false;
    };
  }, [open, data]);

  // Esc fecha; foco inicial no painel; trava o scroll do body
  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") router.replace(pathname, { scroll: false });
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, pathname, router]);

  function close() {
    router.replace(pathname, { scroll: false });
  }

  function switchTo(key: SectionKey) {
    router.replace(`${pathname}?settings=${key}`, { scroll: false });
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-xs"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Configurações"
        tabIndex={-1}
        className="flex h-[min(640px,90dvh)] w-[min(880px,94vw)] flex-col overflow-hidden rounded-lg border border-hairline bg-canvas md:flex-row"
      >
        {/* Trilho de seções */}
        <div className="flex shrink-0 items-center gap-xxs overflow-x-auto border-b border-hairline p-xxs md:w-[220px] md:flex-col md:items-stretch md:border-b-0 md:border-r md:p-xs">
          <button
            type="button"
            onClick={close}
            aria-label="Fechar configurações"
            className="flex h-[32px] w-[32px] shrink-0 cursor-pointer items-center justify-center rounded-sm text-muted-soft transition-colors hover:bg-canvas-elevated/40 hover:text-ink md:mb-xs"
          >
            <X size={20} strokeWidth={1.6} />
          </button>
          {SECTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => switchTo(key)}
              aria-current={section === key ? "true" : undefined}
              className={`flex shrink-0 cursor-pointer items-center gap-xxs whitespace-nowrap rounded-sm px-xs py-xxs text-body-sm transition-colors ${
                section === key
                  ? "bg-canvas-elevated text-ink"
                  : "text-body hover:bg-canvas-elevated/40 hover:text-ink"
              }`}
            >
              <Icon size={18} strokeWidth={1.6} />
              {label}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-sm md:p-md">
          <h2 className="mb-sm text-title-md text-ink">
            {SECTIONS.find((s) => s.key === section)?.label}
          </h2>

          {loadError ? (
            <p className="text-body-sm text-warning">{loadError}</p>
          ) : data === null ? (
            <div className="flex animate-pulse flex-col gap-xs" aria-busy="true">
              <div className="h-[20px] w-[60%] rounded-sm bg-canvas-elevated" />
              <div className="h-[20px] w-[40%] rounded-sm bg-canvas-elevated" />
              <div className="h-[80px] w-full rounded-md bg-canvas-elevated/50" />
            </div>
          ) : (
            <>
              {section === "geral" && <GeralSection theme={theme} />}
              {section === "perfil" && <PerfilSection data={data} />}
              {section === "plano" && <PlanPanel plan={data.plan} />}
              {section === "conta" && <ContaSection />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-xs border-b border-hairline py-xs">
      <span className="text-body-md text-ink">{label}</span>
      <span className="flex items-center gap-xxs text-body-sm text-body">
        {children}
      </span>
    </div>
  );
}

const THEME_OPTIONS = [
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "light", label: "Claro", icon: Sun },
  { value: "system", label: "Sistema", icon: Monitor },
] as const;

/** Cookie lido pelo layout no servidor → próximo render já vem certo. */
function persistThemeCookie(next: ThemePref) {
  document.cookie = `bv-theme=${next}; path=/; max-age=31536000; SameSite=Lax`;
}

function GeralSection({ theme }: { theme: ThemePref }) {
  const router = useRouter();
  const [current, setCurrent] = useState<ThemePref>(theme);

  function apply(next: ThemePref) {
    setCurrent(next);
    persistThemeCookie(next);
    router.refresh();
  }

  return (
    <div className="flex flex-col">
      <Row label="Aparência">
        <span className="flex items-center gap-xxxs">
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => apply(value)}
              aria-pressed={current === value}
              className={`flex cursor-pointer items-center gap-xxxs rounded-full border px-xxs py-xxxs text-caption transition-colors ${
                current === value
                  ? "border-muted text-ink"
                  : "border-hairline text-body hover:text-ink"
              }`}
            >
              <Icon size={13} strokeWidth={1.6} />
              {label}
            </button>
          ))}
        </span>
      </Row>
      <Row label="Idioma">Português (Brasil)</Row>
    </div>
  );
}

function PerfilSection({ data }: { data: SettingsData }) {
  const [name, setName] = useState(data.displayName ?? "");
  const [feedback, setFeedback] = useState<
    { kind: "ok" | "error"; text: string } | undefined
  >();
  const [pending, startTransition] = useTransition();

  function save() {
    setFeedback(undefined);
    startTransition(async () => {
      const result = await updateDisplayName(name);
      setFeedback(
        result.error
          ? { kind: "error", text: result.error }
          : { kind: "ok", text: "Nome atualizado." },
      );
    });
  }

  return (
    <div className="flex flex-col gap-sm">
      <form
        className="flex flex-col gap-xxs"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <label
          htmlFor="settings-name"
          className="text-caption-upper uppercase text-muted-soft"
        >
          Nome de exibição
        </label>
        <div className="flex items-center gap-xxs">
          <input
            id="settings-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={60}
            className="h-[40px] w-full max-w-[320px] rounded-sm border border-hairline bg-canvas px-xxs text-body-md text-ink"
          />
          <Button
            type="submit"
            className="h-[40px] px-xs"
            disabled={pending || name.trim().length < 2}
          >
            {pending ? "Salvando…" : "Salvar"}
          </Button>
        </div>
        {feedback && (
          <p
            className={`text-body-sm ${
              feedback.kind === "error" ? "text-warning" : "text-success"
            }`}
          >
            {feedback.text}
          </p>
        )}
      </form>

      <div className="flex flex-col">
        <Row label="E-mail">{data.email ?? "—"}</Row>
        <Row label="Membro desde">
          {data.createdAt
            ? new Date(data.createdAt).toLocaleDateString("pt-BR")
            : "—"}
        </Row>
      </div>
    </div>
  );
}

function ContaSection() {
  return (
    <div className="flex flex-col gap-md">
      <div className="flex flex-wrap items-center gap-xs">
        <Link
          href="/app/atualizar-senha"
          className="flex items-center gap-xxs rounded-sm border border-hairline px-xs py-xxs text-body-sm text-body transition-colors hover:border-muted hover:text-ink"
        >
          <KeyRound size={16} strokeWidth={1.6} />
          Alterar senha
        </Link>
        <form action={signOut} className="ml-auto">
          <button
            type="submit"
            className="flex cursor-pointer items-center gap-xxs rounded-sm border border-hairline px-xs py-xxs text-body-sm text-body transition-colors hover:border-muted hover:text-ink"
          >
            <LogOut size={16} strokeWidth={1.6} />
            Sair
          </button>
        </form>
      </div>

      <DeleteAccountSection />
    </div>
  );
}
