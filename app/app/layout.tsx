import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/features/shell/AppNav";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Gate do beta fechado (ativado por env — doc 09, M4)
  if (process.env.BETA_INVITE_REQUIRED === "1") {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("beta_access")
      .single();
    if (!profile?.beta_access) redirect("/convite");
  }

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
