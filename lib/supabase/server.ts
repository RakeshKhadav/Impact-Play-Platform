import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { serverEnv } from "@/lib/env/server";
import type { Database } from "@/lib/supabase/types";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(serverEnv.NEXT_PUBLIC_SUPABASE_URL, serverEnv.SUPABASE_PUBLIC_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // In Server Components, setting cookies can throw. This is expected.
        }
      },
    },
  });
}
