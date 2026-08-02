/**
 * PLACEHOLDER — this file is GENERATED, do not edit by hand (Mandamiento V + IX).
 *
 * The real types come from the Supabase project once the migrations of FASE 2
 * are applied:
 *
 *   supabase gen types typescript --linked > src/types/database.types.ts
 *
 * Until then this permissive shape lets the app typecheck. The moment the first
 * migration lands, regenerate this file — leaving the placeholder in place would
 * silently disable type safety on every query.
 *
 * Designed schema: `docs/DB_SCHEMA.md`
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
