import Link from "next/link";
import { Button } from "@/components/Button";
import { signOut } from "@/features/auth/actions";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Conta · Mapeamento Inteligente" };

export default async function ContaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, created_at")
    .single();

  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-md pt-xl">
      <h1 className="text-display-lg text-ink">Conta</h1>

      <dl className="flex flex-col gap-xs border border-hairline p-sm">
        <div>
          <dt className="text-caption-upper uppercase text-muted">Nome</dt>
          <dd className="text-body-md text-ink">
            {profile?.display_name ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-caption-upper uppercase text-muted">E-mail</dt>
          <dd className="text-body-md text-ink">{user?.email ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-caption-upper uppercase text-muted">Desde</dt>
          <dd className="text-body-md text-ink">
            {profile?.created_at
              ? new Date(profile.created_at).toLocaleDateString("pt-BR")
              : "—"}
          </dd>
        </div>
      </dl>

      <div className="flex flex-wrap items-center gap-xs">
        <Link
          href="/app/atualizar-senha"
          className="text-body-sm text-body hover:text-ink"
        >
          Alterar senha
        </Link>
        <form action={signOut} className="ml-auto">
          <Button variant="outline" type="submit">
            Sair
          </Button>
        </form>
      </div>
    </div>
  );
}
