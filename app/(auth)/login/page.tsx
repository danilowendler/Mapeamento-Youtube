import { GoogleButton } from "@/features/auth/components/GoogleButton";
import { LoginForm } from "@/features/auth/components/LoginForm";

export const metadata = { title: "Entrar · Mapeamento Inteligente" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; erro?: string }>;
}) {
  const { next, erro } = await searchParams;

  return (
    <div className="flex flex-col gap-sm">
      <LoginForm next={next} erro={erro} />
      <div className="flex items-center gap-xs" aria-hidden="true">
        <span className="h-px flex-1 bg-hairline" />
        <span className="text-caption-upper uppercase text-muted">ou</span>
        <span className="h-px flex-1 bg-hairline" />
      </div>
      <GoogleButton />
    </div>
  );
}
