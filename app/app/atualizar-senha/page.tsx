import { UpdatePasswordForm } from "@/features/auth/components/UpdatePasswordForm";

export const metadata = {
  title: "Nova senha · Mapeamento Inteligente",
};

export default function AtualizarSenhaPage() {
  return (
    <div className="mx-auto max-w-[720px] pt-xl">
      <UpdatePasswordForm />
    </div>
  );
}
