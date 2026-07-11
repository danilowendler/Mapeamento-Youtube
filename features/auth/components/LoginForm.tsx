"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/Button";
import { FormMessage } from "@/components/FormMessage";
import { Input } from "@/components/Input";
import { signIn, type AuthActionState } from "@/features/auth/actions";

const initialState: AuthActionState = {};

export function LoginForm({ next, erro }: { next?: string; erro?: string }) {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  const externalError =
    erro === "oauth"
      ? "Não foi possível entrar com o Google. Tente novamente."
      : erro === "link-invalido"
        ? "Link expirado ou inválido. Faça login ou peça um novo link."
        : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-sm">
      <h1 className="text-display-md text-ink">Entrar</h1>
      <FormMessage error={state.error ?? externalError} />
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Input
        id="email"
        name="email"
        type="email"
        label="E-mail"
        autoComplete="email"
        required
      />
      <Input
        id="password"
        name="password"
        type="password"
        label="Senha"
        autoComplete="current-password"
        required
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Entrando..." : "Entrar"}
      </Button>
      <div className="flex items-center justify-between text-body-sm">
        <Link href="/recuperar-senha" className="text-body hover:text-ink">
          Esqueci minha senha
        </Link>
        <Link href="/cadastro" className="text-body hover:text-ink">
          Criar conta
        </Link>
      </div>
    </form>
  );
}
