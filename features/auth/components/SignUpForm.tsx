"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/Button";
import { FormMessage } from "@/components/FormMessage";
import { Input } from "@/components/Input";
import { signUp, type AuthActionState } from "@/features/auth/actions";

const initialState: AuthActionState = {};

export function SignUpForm() {
  const [state, formAction, pending] = useActionState(signUp, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-sm">
      <h1 className="font-display text-display-md text-ink">Criar conta</h1>
      <FormMessage error={state.error} success={state.success} />
      <Input
        id="displayName"
        name="displayName"
        type="text"
        label="Nome"
        autoComplete="name"
        required
      />
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
        label="Senha (mínimo 8 caracteres)"
        autoComplete="new-password"
        minLength={8}
        required
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Criando..." : "Criar conta"}
      </Button>
      <p className="text-center text-caption text-muted">
        Ao criar a conta você concorda com os{" "}
        <Link href="/termos" className="underline hover:text-body">
          Termos de Uso
        </Link>{" "}
        e a{" "}
        <Link href="/privacidade" className="underline hover:text-body">
          Política de Privacidade
        </Link>
        .
      </p>
      <p className="text-center text-body-sm text-body">
        Já tem conta?{" "}
        <Link href="/login" className="text-ink">
          Entrar
        </Link>
      </p>
    </form>
  );
}
