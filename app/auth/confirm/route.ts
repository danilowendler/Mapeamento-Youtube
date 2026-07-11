import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Destino dos links de e-mail do Supabase (confirmação de conta e
 * redefinição de senha). Aceita dois formatos:
 *
 * - `?code=` — template PADRÃO do Supabase: o token é verificado no
 *   servidor deles, que redireciona para cá com um código PKCE;
 * - `?token_hash=&type=` — templates customizados (quando houver SMTP
 *   próprio, planejado para o M4), verificados diretamente aqui.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next");
  const next =
    nextParam && nextParam.startsWith("/app") ? nextParam : "/app";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return NextResponse.redirect(
    new URL("/login?erro=link-invalido", request.url),
  );
}
