"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/app", label: "Nova Pesquisa" },
  { href: "/app/historico", label: "Histórico" },
  { href: "/app/pauta", label: "Minha Pauta" },
  { href: "/app/conta", label: "Conta" },
] as const;

function isActive(href: string, pathname: string): boolean {
  return href === "/app" ? pathname === "/app" : pathname.startsWith(href);
}

/**
 * Navegação lateral (desktop): item ativo marcado com a régua
 * vermelha — o mesmo uso cirúrgico do acento da landing.
 */
export function AppNavSidebar() {
  const pathname = usePathname();
  return (
    <nav aria-label="Navegação principal" className="flex flex-col py-xs">
      {links.map(({ href, label }) => {
        const active = isActive(href, pathname);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`relative flex items-center px-sm py-xs text-nav-link uppercase transition-colors ${
              active
                ? "text-ink"
                : "text-muted-soft hover:bg-canvas-elevated/30 hover:text-body"
            }`}
          >
            {active && (
              <span
                aria-hidden="true"
                className="absolute inset-y-[10px] left-0 w-[2px] bg-primary"
              />
            )}
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Barra inferior (mobile). */
export function AppNavMobile() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-10 flex border-t border-hairline bg-canvas md:hidden"
    >
      {links.map(({ href, label }) => {
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
