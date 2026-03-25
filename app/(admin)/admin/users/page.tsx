import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { UserRowActions } from "@/features/admin/users/user-row-actions";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { q } = await searchParams;
  const queryText = q?.trim();

  let query = supabase
    .from("profiles")
    .select("id, full_name, email, role, created_at")
    .order("created_at", { ascending: false })
    .limit(60);

  if (queryText) {
    query = query.or(`full_name.ilike.%${queryText}%,email.ilike.%${queryText}%`);
  }

  const { data: users, error } = await query;

  return (
    <section className="grid gap-4">
      <Card>
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em]">Users</h1>
        <p className="mt-2 text-sm text-muted">Search and update profile basics and role assignments.</p>

        <form className="mt-4 grid gap-2 md:grid-cols-[1fr_auto] md:items-end">
          <input
            name="q"
            defaultValue={queryText ?? ""}
            placeholder="Search name or email"
            className="h-[46px] rounded-2xl bg-[var(--surface-container-high)] px-4 text-sm text-on-surface outline-none focus:ring-2 focus:ring-[var(--secondary)]"
          />
          <button type="submit" className="h-[46px] rounded-2xl bg-[var(--primary)] px-5 text-sm font-semibold text-white">
            Search
          </button>
        </form>
      </Card>

      <Card>
        {error ? <p className="text-sm text-[var(--error)]">{error.message}</p> : null}
        <div className="space-y-3">
          {(users ?? []).map((user) => (
            <div key={user.id} className="surface-mid rounded-2xl p-3">
              <p className="font-semibold text-on-surface">{user.email}</p>
              <p className="mt-1 text-xs text-muted">Joined {new Date(user.created_at).toDateString()}</p>
              <div className="mt-3">
                <UserRowActions userId={user.id} fullName={user.full_name} role={user.role} />
              </div>
            </div>
          ))}

          {(users ?? []).length === 0 ? <p className="text-sm text-muted">No users found.</p> : null}
        </div>
      </Card>
    </section>
  );
}