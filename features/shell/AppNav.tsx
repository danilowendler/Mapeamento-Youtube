"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/app", label: "Nova Pesquisa" },
  { href: "/app/historico", label: "Histórico" },
  { href: "/app/pauta", label: "Minha Pauta" },
  { href: "/app/conta", label: "Conta" },
] as const;

/** Navegação do shell: sidebar no desktop, barra inferior no mobile. */
export function AppNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-10 flex border-t border-hairline bg-canvas md:static md:w-[220px] md:flex-col md:border-t-0 md:border-r md:px-xs md:py-md"
    >
      {links.map(({ href, label }) => {
        const active =
          href === "/app" ? pathname === "/app" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-1 items-center justify-center px-xs py-xs text-nav-link uppercase transition-colors md:flex-none md:justify-start ${
              active ? "text-ink" : "text-muted-soft hover:text-body"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
