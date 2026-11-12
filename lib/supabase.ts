import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(url && key);

/** Client usato dai componenti: mantiene la sessione dell'utente. */
export const supabase: SupabaseClient = createClient(
  url || "https://placeholder.supabase.co",
  key || "placeholder",
);

/** Client senza sessione, per il route handler dell'export. */
export function serverClient(): SupabaseClient {
  return createClient(url || "https://placeholder.supabase.co", key || "placeholder", {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
