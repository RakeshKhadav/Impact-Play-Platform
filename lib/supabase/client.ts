"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { clientEnv } from "@/lib/env/client";
import type { Database } from "@/lib/supabase/types";

let browserClient: SupabaseClient<Database> | undefined;

export function createSupabaseBrowserClient(): SupabaseClient<Database> {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      clientEnv.NEXT_PUBLIC_SUPABASE_URL,
      clientEnv.SUPABASE_PUBLIC_KEY,
    );
  }

  return browserClient;
}
