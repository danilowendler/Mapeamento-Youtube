"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  ChartColumn,
  ChevronRight,
  CircleHelp,
  CircleUser,
  FileText,
  Folder,
  Lock,
  LogOut,
  Mail,
  Palette,
  PanelLeft,
  PenLine,
  Settings,
  Sparkles,
} from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { signOut } from "@/features/auth/actions";
import { BRAND } from "@/lib/brand";
import { NAV_LINKS, isActive } from "./AppNav";

const STORAGE_KEY = "beviewer-sidebar-collapsed";
const NAV_ICONS = { "/app": PenLine, "/app/historico": ChartColumn, "/app/pauta": Folder } as const;

/* Store mínimo do estado recolhido, persistido em localStorage.
   useSyncExternalStore evita setState em effect e hidrata sem
   mismatch (server sempre expandido; cliente corrige no snapshot). */
let collapsedListeners: Array<() => void> = [];
function subscribeCollapsed(listener: () => void) {
  collapsedListeners.push(listener);
  return () => {
    collapsedListeners = collapsedListeners.filter((l) => l !== listener);
  };
}
function readCollapsed(): boolean {
  return localStorage.getItem(STORAGE_KEY) === "1";
}
function writeCollapsed(value: boolean) {
  localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  for (const listener of collapsedListeners) listener();
}

/**
 * Sidebar do BEVIEWER (M10.5, lote B1): recolhível estilo produtos de
 * IA (236px ↔ 72px, persistida em localStorage) + popover do usuário
 * no lugar do item "Conta" da nav. Régua vermelha segue marcando o
 * item ativo — o uso cirúrgico do acento.
 */
export function AppSidebar({
  name,
  initial,
  planName,
  isFree,
}: {
  name: string;
  initial: string;
  planName: string;
  isFree: boolean;
}) {
  const pathname = usePathname();
  const collapsed = useSyncExternalStore(
    subscribeCollapsed,
    readCollapsed,
    () => false,
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Clique fora / Esc fecham o popover
  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  function toggleCollapsed() {
    writeCollapsed(!collapsed);
  }

  const menuItemClass =
    "flex w-full cursor-pointer items-center gap-xxs rounded-sm px-xs py-xxs text-body-sm text-body transition-colors hover:bg-canvas/60 hover:text-ink";

  return (
    <aside
      className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-hairline transition-[width] duration-200 md:flex ${
        collapsed ? "w-[72px]" : "w-[236px]"
      }`}
    >
      <div
        className={`flex h-[64px] items-center border-b border-hairline ${
          collapsed ? "justify-center" : "justify-between pl-sm pr-xs"
        }`}
      >
        {!collapsed && (
          <Link href="/app" aria-label="Ir para o início">
            <BrandMark />
          </Link>
        )}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
          className="flex h-[32px] w-[32px] cursor-pointer items-center justify-center rounded-sm text-muted-soft transition-colors hover:bg-canvas-elevated/40 hover:text-ink"
        >
          <PanelLeft size={20} strokeWidth={1.6} />
        </button>
      </div>

      <nav aria-label="Navegação principal" className="flex flex-col py-xs">
        {NAV_LINKS.map(({ href, label }) => {
          const active = isActive(href, pathname);
          const Icon = NAV_ICONS[href as keyof typeof NAV_ICONS];
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              title={collapsed ? label : undefined}
              className={`relative flex items-center gap-xxs py-xs text-nav-link uppercase transition-colors ${
                collapsed ? "justify-center px-0" : "px-sm"
              } ${
                active
                  ? "text-ink"
                  : "text-muted-soft hover:bg-canvas-elevated/30 hover:text-ink"
              }`}
            >
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute inset-y-[10px] left-0 w-[2px] bg-primary"
                />
              )}
              <Icon size={20} strokeWidth={1.6} />
              {!collapsed && label}
            </Link>
          );
        })}
      </nav>

      <div ref={menuRef} className="relative mt-auto border-t border-hairline">
        {menuOpen && (
          <div
            role="menu"
            aria-label="Menu do usuário"
            className={`animate-pop-in absolute z-20 flex flex-col gap-xxxs rounded-lg border border-hairline bg-canvas-elevated p-xxs ${
              collapsed
                ? "bottom-xxs left-full ml-xxs w-[224px]"
                : "inset-x-xxs bottom-full mb-xxs"
            }`}
          >
            <div className="flex items-center gap-xxs px-xs py-xxs">
              <span
                aria-hidden="true"
                className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full bg-canvas text-body-sm text-ink"
              >
                {initial}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-body-sm text-ink">
                  {name}
                </span>
                <span className="block text-caption-upper uppercase text-muted-soft">
                  plano {planName}
                </span>
              </span>
            </div>
            <hr className="border-hairline" />
            {isFree && (
              <Link
                role="menuitem"
                href={`${pathname}?settings=plano`}
                onClick={() => setMenuOpen(false)}
                className={`${menuItemClass} text-ink`}
              >
                <Sparkles size={18} strokeWidth={1.6} />
                Conheça o plano Criador
              </Link>
            )}
            <Link
              role="menuitem"
              href={`${pathname}?settings=perfil`}
              onClick={() => setMenuOpen(false)}
              className={menuItemClass}
            >
              <CircleUser size={18} strokeWidth={1.6} />
              Perfil
            </Link>
            <Link
              role="menuitem"
              href={`${pathname}?settings=geral`}
              onClick={() => setMenuOpen(false)}
              className={menuItemClass}
            >
              <Palette size={18} strokeWidth={1.6} />
              Personalização
            </Link>
            <Link
              role="menuitem"
              href={`${pathname}?settings=geral`}
              onClick={() => setMenuOpen(false)}
              className={menuItemClass}
            >
              <Settings size={18} strokeWidth={1.6} />
              Configurações
            </Link>
            <hr className="border-hairline" />
            <button
              type="button"
              role="menuitem"
              onClick={() => setHelpOpen((open) => !open)}
              aria-expanded={helpOpen}
              className={menuItemClass}
            >
              <CircleHelp size={18} strokeWidth={1.6} />
              Ajuda
              <ChevronRight
                size={14}
                strokeWidth={1.6}
                className={`ml-auto transition-transform duration-200 ${
                  helpOpen ? "rotate-90" : ""
                }`}
              />
            </button>
            {helpOpen && (
              <div className="animate-bubble-in flex flex-col gap-xxxs">
                <Link
                  role="menuitem"
                  href="/termos"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMenuOpen(false)}
                  className={`${menuItemClass} pl-md`}
                >
                  <FileText size={16} strokeWidth={1.6} />
                  Termos de uso
                </Link>
                <Link
                  role="menuitem"
                  href="/privacidade"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMenuOpen(false)}
                  className={`${menuItemClass} pl-md`}
                >
                  <Lock size={16} strokeWidth={1.6} />
                  Política de privacidade
                </Link>
                <a
                  role="menuitem"
                  href={`mailto:${BRAND.contactEmail}`}
                  onClick={() => setMenuOpen(false)}
                  className={`${menuItemClass} pl-md`}
                >
                  <Mail size={16} strokeWidth={1.6} />
                  Falar com a gente
                </a>
              </div>
            )}
            <form action={signOut}>
              <button type="submit" role="menuitem" className={menuItemClass}>
                <LogOut size={18} strokeWidth={1.6} />
                Sair
              </button>
            </form>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            setHelpOpen(false);
            setMenuOpen((open) => !open);
          }}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          title={collapsed ? `${name} · plano ${planName}` : undefined}
          className={`group flex w-full cursor-pointer items-center gap-xs transition-colors hover:bg-canvas-elevated/30 ${
            collapsed ? "justify-center p-xs" : "p-sm"
          }`}
        >
          <span
            aria-hidden="true"
            className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full bg-canvas-elevated text-title-sm text-ink transition-transform duration-150 group-active:scale-90"
          >
            {initial}
          </span>
          {!collapsed && (
            <span className="min-w-0 text-left">
              <span className="block truncate text-body-sm text-ink">
                {name}
              </span>
              <span className="block text-caption-upper uppercase text-muted-soft">
                plano {planName}
              </span>
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}
