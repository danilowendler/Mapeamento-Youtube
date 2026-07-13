import { GoogleButton } from "@/features/auth/components/GoogleButton";
import { SignUpForm } from "@/features/auth/components/SignUpForm";

export const metadata = { title: "Criar conta" };

export default function CadastroPage() {
  return (
    <div className="flex flex-col gap-sm">
      <SignUpForm />
      <div className="flex items-center gap-xs" aria-hidden="true">
        <span className="h-px flex-1 bg-hairline" />
        <span className="text-caption-upper uppercase text-muted">ou</span>
        <span className="h-px flex-1 bg-hairline" />
      </div>
      <GoogleButton />
    </div>
  );
}
