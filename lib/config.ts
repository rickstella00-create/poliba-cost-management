/**
 * Fase sperimentale (default): il sito è aperto, chiunque abbia il link può
 * inserire e modificare i dati senza account.
 *
 * Per riaccendere il login basta impostare NEXT_PUBLIC_AUTH_ENABLED=true e
 * richiudere le policy del database con supabase/lock-down.sql.
 */
export const AUTH_ENABLED = process.env.NEXT_PUBLIC_AUTH_ENABLED === "true";
