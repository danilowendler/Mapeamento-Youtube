import { createClient } from "@supabase/supabase-js";

/**
 * Cliente com service role — bypassa RLS. Uso EXCLUSIVO em código de
 * servidor do pipeline (jobs, services de coleta). Nunca importar em
 * componentes ou código que chegue ao bundle do cliente (doc 8 §8.1).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Supabase service role não configurado.");
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
