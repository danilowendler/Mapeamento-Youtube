import { redirect } from "next/navigation";

/**
 * A página Conta foi substituída pelo modal de Configurações (M10.5,
 * lote B2). A rota permanece só para não quebrar links antigos e
 * return_urls do Stripe já emitidas — redireciona para o modal.
 */
export default function ContaPage() {
  redirect("/app?settings=perfil");
}
