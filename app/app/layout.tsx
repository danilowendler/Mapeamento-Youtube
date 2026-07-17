import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandMark } from "@/components/BrandMark";
import { AppNavMobile, AppNavSidebar } from "@/features/shell/AppNav";
import { createClient } from "@/lib/supabase/server";
import { getEffectivePlan } from "@/services/planService";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();

  // Gate do beta fechado (dormente — decisão de 11/07/2026)
  if (process.env.BETA_INVITE_REQUIRED === "1") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("beta_access")
      .single();
    if (!profile?.beta_access) redirect("/convite");
  }

  const [{ data: profile }, plan] = await Promise.all([
    supabase.from("profiles").select("display_name").single(),
    getEffectivePlan(supabase),
  ]);
  const name = profile?.display_name ?? "Criador";
  const initial = name.trim().charAt(0).toUpperCase() || "•";

  return (
    <div className="flex min-h-screen">
      {/* Sidebar (desktop) — identidade, navegação e quem sou eu */}
      <aside className="sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col border-r border-hairline md:flex">
        <Link
          href="/app"
          className="flex h-[64px] items-center border-b border-hairline px-sm"
        >
          <BrandMark />
        </Link>

        <AppNavSidebar />

        <div className="mt-auto flex items-center gap-xs border-t border-hairline p-sm">
          <span
            aria-hidden="true"
            className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full bg-canvas-elevated text-title-sm text-ink"
          >
            {initial}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-body-sm text-ink">
              {name}
            </span>
            <span className="block text-caption-upper uppercase text-muted-soft">
              plano {plan.name}
            </span>
          </span>
        </div>
      </aside>

      {/* Barra superior (mobile) */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[56px] items-center justify-between border-b border-hairline px-xs md:hidden">
          <Link href="/app">
            <BrandMark />
          </Link>
          <span className="rounded-full border border-hairline px-xxs py-xxxs text-caption-upper uppercase text-muted-soft">
            {plan.name}
          </span>
        </header>

        <main className="flex-1 px-xs pb-super pt-md md:px-xl md:pb-xl">
          {children}
        </main>
      </div>

      <AppNavMobile />
    </div>
  );
}
