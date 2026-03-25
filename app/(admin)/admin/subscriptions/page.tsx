import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SubscriptionRowActions } from "@/features/admin/subscriptions/subscription-row-actions";

export default async function AdminSubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { q, status } = await searchParams;

  let query = supabase
    .from("subscriptions")
    .select("id, user_id, plan_type, status, current_period_end, stripe_subscription_id, updated_at")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (status === "active" || status === "cancelled" || status === "expired" || status === "past_due") {
    query = query.eq("status", status);
  }

  const { data: subscriptions, error } = await query;

  const userIds = Array.from(new Set((subscriptions ?? []).map((subscription) => subscription.user_id)));
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, email, full_name").in("id", userIds)
    : { data: [] as Array<{ id: string; email: string; full_name: string | null }> };

  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const queryText = q?.trim().toLowerCase();

  const filtered = (subscriptions ?? []).filter((subscription) => {
    if (!queryText) {
      return true;
    }

    const profile = profileById.get(subscription.user_id);
    const haystack = `${profile?.email ?? ""} ${profile?.full_name ?? ""}`.toLowerCase();
    return haystack.includes(queryText);
  });

  return (
    <section className="grid gap-4">
      <Card>
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em]">Subscriptions</h1>
        <p className="mt-2 text-sm text-muted">Filter lifecycle state, adjust statuses, and refresh from Lemon Squeezy.</p>

        <form className="mt-4 grid gap-2 md:grid-cols-[2fr_1fr_auto] md:items-end">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search by email or name"
            className="h-[46px] rounded-2xl bg-[var(--surface-container-high)] px-4 text-sm text-on-surface outline-none focus:ring-2 focus:ring-[var(--secondary)]"
          />
          <select
            name="status"
            defaultValue={status ?? ""}
            className="h-[46px] rounded-2xl bg-[var(--surface-container-high)] px-4 text-sm text-on-surface outline-none focus:ring-2 focus:ring-[var(--secondary)]"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="cancelled">Cancelled</option>
            <option value="past_due">Past Due</option>
            <option value="expired">Expired</option>
          </select>
          <button type="submit" className="h-[46px] rounded-2xl bg-[var(--primary)] px-5 text-sm font-semibold text-white">
            Apply
          </button>
        </form>
      </Card>

      <Card>
        {error ? <p className="text-sm text-[var(--error)]">{error.message}</p> : null}
        <div className="space-y-3">
          {filtered.map((subscription) => {
            const profile = profileById.get(subscription.user_id);
            const email = profile?.email ?? "Unknown";

            return (
              <div key={subscription.id} className="surface-mid rounded-2xl p-3">
                <p className="font-semibold text-on-surface">{email}</p>
                <p className="mt-1 text-xs text-muted">
                  {subscription.plan_type.toUpperCase()} · {subscription.status.toUpperCase()} ·
                  Renewal {subscription.current_period_end ? new Date(subscription.current_period_end).toDateString() : "N/A"}
                </p>
                <p className="mt-1 text-xs text-muted font-data">
                  Provider ID: {subscription.stripe_subscription_id ?? "not-synced"}
                </p>
                <div className="mt-3">
                  <SubscriptionRowActions
                    subscriptionId={subscription.id}
                    userId={subscription.user_id}
                    userEmail={email}
                    status={subscription.status}
                  />
                </div>
              </div>
            );
          })}

          {filtered.length === 0 ? <p className="text-sm text-muted">No subscriptions match this filter.</p> : null}
        </div>
      </Card>
    </section>
  );
}