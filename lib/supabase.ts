import { createClient, SupabaseClient } from "@supabase/supabase-js";

export function getSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

export async function batchUpsert(
  supabase: AnySupabaseClient,
  table: string,
  rows: Record<string, unknown>[],
  batchSize = 100
) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    await supabase.from(table).upsert(batch as any);
  }
}

export async function batchInsert(
  supabase: AnySupabaseClient,
  table: string,
  rows: Record<string, unknown>[],
  batchSize = 100
) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    await supabase.from(table).insert(batch as any);
  }
}

export async function batchDelete(
  supabase: AnySupabaseClient,
  table: string,
  ids: string[],
  batchSize = 100
) {
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    await supabase.from(table).delete().in("id", batch);
  }
}
