import "server-only";

import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getSessionUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient();

  const authResult = await Promise.race([
    supabase.auth.getUser(),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
  ]);

  if (authResult === null) {
    console.error("Auth check timed out while fetching session user.");
    return null;
  }

  const {
    data: { user },
  } = authResult;

  return user;
}

export async function requireUser(): Promise<User> {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") {
    redirect("/dashboard");
  }

  return user;
}

export async function withProtectedAction<T>(
  callback: (ctx: { user: User; supabase: Awaited<ReturnType<typeof createSupabaseServerClient>> }) => Promise<T>,
): Promise<T> {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  return callback({ user, supabase });
}

export async function withAdminAction<T>(
  callback: (ctx: { user: User; supabase: Awaited<ReturnType<typeof createSupabaseServerClient>> }) => Promise<T>,
): Promise<T> {
  const user = await requireAdmin();
  const supabase = await createSupabaseServerClient();

  return callback({ user, supabase });
}
