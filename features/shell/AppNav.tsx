"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Itens de navegação do BEVIEWER (M10.5, lote B1): rotas inalteradas,
 * rótulos novos. "Settings" saiu da nav do desktop (vive no popover do
 * usuário — AppSidebar); no mobile permanece como 4º item.
 */
export const NAV_LINKS = [
  { href: "/app", label: "Mapping" },
  { href: "/app/historico", label: "Dashboard" },
  { href: "/app/pauta", label: "Workspace" },
] as const;

export function isActive(href: string, pathname: string): boolean {
  return href === "/app" ? pathname === "/app" : pathname.startsWith(href);
}

const MOBILE_LINKS = [
  ...NAV_LINKS,
  // Query relativa: abre o modal de Configurações sobre a página atual
  { href: "?settings=geral", label: "Settings" },
] as const;

/** Barra inferior (mobile). */
export function AppNavMobile() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-10 flex border-t border-hairline bg-canvas md:hidden"
    >
      {MOBILE_LINKS.map(({ href, label }) => {
        const active = isActive(href, pathname);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`relative flex flex-1 items-center justify-center px-xxs py-xs text-center text-caption-upper uppercase transition-colors ${
              active ? "text-ink" : "text-muted-soft"
            }`}
          >
            {active && (
              <span
                aria-hidden="true"
                className="absolute inset-x-[20%] top-0 h-[2px] bg-primary"
              />
            )}
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
