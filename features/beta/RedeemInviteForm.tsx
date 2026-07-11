"use client";

import { useActionState } from "react";
import { Button } from "@/components/Button";
import { FormMessage } from "@/components/FormMessage";
import { Input } from "@/components/Input";
import { redeemInvite, type RedeemState } from "./actions";

const initialState: RedeemState = {};

export function RedeemInviteForm() {
  const [state, formAction, pending] = useActionState(
    redeemInvite,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-sm">
      <FormMessage error={state.error} />
      <Input
        id="code"
        name="code"
        type="text"
        label="Código de convite"
        autoComplete="off"
        required
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Validando..." : "Entrar no beta"}
      </Button>
    </form>
  );
}
