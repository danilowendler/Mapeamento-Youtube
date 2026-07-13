import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";

export default function LegalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="mx-auto flex min-h-screen max-w-[720px] flex-col gap-md px-xs py-xl">
      <Link href="/">
        <BrandMark />
      </Link>
      <main className="flex flex-col gap-sm [&_h1]:text-display-md [&_h1]:text-ink [&_h2]:mt-sm [&_h2]:text-title-md [&_h2]:text-ink [&_p]:text-body-md [&_p]:leading-relaxed [&_p]:text-body [&_li]:text-body-md [&_li]:text-body [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-xxs [&_ul]:pl-xs">
        {children}
      </main>
      <footer className="border-t border-hairline pt-sm text-body-sm text-muted">
        <Link href="/termos" className="hover:text-body">
          Termos de Uso
        </Link>
        {" · "}
        <Link href="/privacidade" className="hover:text-body">
          Política de Privacidade
        </Link>
      </footer>
    </div>
  );
}
