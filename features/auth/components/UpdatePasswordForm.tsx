"use client";

import { useActionState } from "react";
import { Button } from "@/components/Button";
import { FormMessage } from "@/components/FormMessage";
import { Input } from "@/components/Input";
import {
  updatePassword,
  type AuthActionState,
} from "@/features/auth/actions";

const initialState: AuthActionState = {};

export function UpdatePasswordForm() {
  const [state, formAction, pending] = useActionState(
    updatePassword,
    initialState,
  );

  return (
    <form action={formAction} className="flex max-w-[400px] flex-col gap-sm">
      <h1 className="font-display text-display-md text-ink">Nova senha</h1>
      <FormMessage error={state.error} />
      <Input
        id="password"
        name="password"
        type="password"
        label="Nova senha (mínimo 8 caracteres)"
        autoComplete="new-password"
        minLength={8}
        required
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Salvar nova senha"}
      </Button>
    </form>
  );
}
