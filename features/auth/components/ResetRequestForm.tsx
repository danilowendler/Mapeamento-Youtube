"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/Button";
import { FormMessage } from "@/components/FormMessage";
import { Input } from "@/components/Input";
import {
  requestPasswordReset,
  type AuthActionState,
} from "@/features/auth/actions";

const initialState: AuthActionState = {};

export function ResetRequestForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordReset,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-sm">
      <h1 className="font-display text-display-md text-ink">Recuperar senha</h1>
      <p className="text-body-md text-body">
        Informe seu e-mail e enviaremos um link para redefinir a senha.
      </p>
      <FormMessage error={state.error} success={state.success} />
      <Input
        id="email"
        name="email"
        type="email"
        label="E-mail"
        autoComplete="email"
        required
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Enviando..." : "Enviar link"}
      </Button>
      <p className="text-center text-body-sm">
        <Link href="/login" className="text-body hover:text-ink">
          Voltar ao login
        </Link>
      </p>
    </form>
  );
}
