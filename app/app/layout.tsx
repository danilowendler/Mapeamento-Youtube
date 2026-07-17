import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BrandMark } from "@/components/BrandMark";
import { SettingsModal } from "@/features/settings/SettingsModal";
import { AppNavMobile } from "@/features/shell/AppNav";
import { AppSidebar } from "@/features/shell/AppSidebar";
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

  // Tema do shell (B6): cookie lido no servidor = zero flash. A
  // landing fica fora do escopo do data-theme (escura por identidade).
  const themeCookie = (await cookies()).get("bv-theme")?.value;
  const theme =
    themeCookie === "light" || themeCookie === "system"
      ? themeCookie
      : "dark";

  return (
    <div
      data-theme={theme}
      className="flex min-h-screen bg-canvas text-body transition-colors duration-200"
    >
      {/* Sidebar (desktop) — identidade, navegação e popover do usuário */}
      <AppSidebar
        name={name}
        initial={initial}
        planName={plan.name}
        isFree={plan.code === "free"}
      />

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

      {/* Modal de Configurações (?settings=…) — substitui /app/conta */}
      <Suspense fallback={null}>
        <SettingsModal theme={theme} />
      </Suspense>
    </div>
  );
}
