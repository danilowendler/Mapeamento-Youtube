import { signInWithGoogle } from "@/features/auth/actions";

/** Botão "continuar com Google" — dispara o fluxo OAuth via server action. */
export function GoogleButton() {
  return (
    <form action={signInWithGoogle}>
      <button
        type="submit"
        className="inline-flex h-[48px] w-full cursor-pointer items-center justify-center gap-xxs border border-hairline bg-canvas-elevated text-button-label uppercase text-ink transition-colors duration-150 active:bg-canvas"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M21.35 11.1H12v2.9h5.4c-.5 2.4-2.6 3.9-5.4 3.9a6 6 0 1 1 0-12c1.5 0 2.9.6 3.9 1.5l2.2-2.2A9 9 0 1 0 12 21c5.2 0 8.9-3.7 8.9-8.9 0-.3 0-.7-.1-1z"
          />
        </svg>
        Continuar com Google
      </button>
    </form>
  );
}
