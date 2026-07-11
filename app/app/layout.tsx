import Link from "next/link";
import { AppNav } from "@/features/shell/AppNav";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-[64px] items-center border-b border-hairline px-xs md:px-md">
        <Link href="/app" className="text-title-md text-ink">
          Mapeamento Inteligente
        </Link>
      </header>
      <div className="flex flex-1">
        <AppNav />
        <main className="flex-1 px-xs pb-super pt-md md:px-md md:pb-md">
          {children}
        </main>
      </div>
    </div>
  );
}
