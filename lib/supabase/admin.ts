import "server-only";

import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env/server";
import type { Database } from "@/lib/supabase/types";

export function createSupabaseAdminClient() {
  return createClient<Database>(serverEnv.NEXT_PUBLIC_SUPABASE_URL, serverEnv.SUPABASE_ADMIN_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
