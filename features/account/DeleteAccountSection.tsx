"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/Button";
import { FormMessage } from "@/components/FormMessage";
import { Input } from "@/components/Input";
import { deleteAccount, type DeleteAccountState } from "./actions";

const initialState: DeleteAccountState = {};

/** Zona de perigo da Conta: exclusão definitiva com dupla confirmação. */
export function DeleteAccountSection() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    deleteAccount,
    initialState,
  );

  return (
    <section className="flex flex-col gap-xs border-t border-hairline pt-md">
      <h2 className="text-title-md text-ink">Excluir conta</h2>
      <p className="text-body-sm text-body">
        Remove permanentemente sua conta, pesquisas, favoritos e histórico.
        Assinaturas ativas são canceladas na hora. Esta ação não pode ser
        desfeita.
      </p>

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-fit cursor-pointer border border-warning/50 px-xs py-xxs text-caption-upper uppercase text-warning hover:border-warning"
        >
          Quero excluir minha conta
        </button>
      ) : (
        <form
          action={formAction}
          className="flex max-w-[400px] flex-col gap-xs border border-warning/40 p-sm"
        >
          <FormMessage error={state.error} />
          <Input
            id="confirmation"
            name="confirmation"
            type="text"
            label='Digite "EXCLUIR" para confirmar'
            autoComplete="off"
            required
          />
          <div className="flex items-center gap-xs">
            <Button type="submit" disabled={pending}>
              {pending ? "Excluindo…" : "Excluir definitivamente"}
            </Button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="cursor-pointer text-body-sm text-body hover:text-ink"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
