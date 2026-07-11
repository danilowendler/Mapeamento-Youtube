import { redirect } from "next/navigation";
import { RedeemInviteForm } from "@/features/beta/RedeemInviteForm";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Convite · Mapeamento Inteligente" };

export default async function ConvitePage() {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("beta_access")
    .single();
  if (profile?.beta_access || process.env.BETA_INVITE_REQUIRED !== "1") {
    redirect("/app");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-xs">
      <main className="flex w-full max-w-[400px] flex-col gap-sm">
        <h1 className="text-display-md text-ink">Beta fechado</h1>
        <p className="text-body-md text-body">
          O Mapeamento Inteligente está em beta fechado. Informe seu código de
          convite para entrar.
        </p>
        <RedeemInviteForm />
      </main>
    </div>
  );
}
