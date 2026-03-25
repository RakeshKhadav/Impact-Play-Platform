import Link from "next/link";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getLatestSubscriptionForUser } from "@/lib/subscriptions/status";
import { LemonSqueezySubscribeButton } from "@/features/subscriptions/lemonsqueezy-subscribe-button";
import { Button } from "@/components/ui/button";

export default async function SubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { subscription, hasAccess } = await getLatestSubscriptionForUser(supabase, user.id, { userEmail: user.email, syncFromProvider: true });
  const { error } = await searchParams;

  return (
    <section className="grid gap-5 md:grid-cols-2">
      {error ? (
        <Card className="md:col-span-2 bg-[color-mix(in_srgb,var(--error)_14%,white)]">
          <p className="font-data text-xs uppercase tracking-[0.12em] text-on-surface">Billing Error</p>
          <p className="mt-2 text-sm text-on-surface">{decodeURIComponent(error)}</p>
        </Card>
      ) : null}

      <Card className="md:col-span-2">
        <p className="text-sm text-muted">Current subscription</p>
        <p className="font-data mt-3 text-3xl text-on-surface">{subscription?.status ?? "inactive"}</p>
        <p className="mt-2 text-sm text-muted">
          Access: {hasAccess ? "Active" : "Restricted"}
          {subscription?.current_period_end ? ` · Renews/ends ${new Date(subscription.current_period_end).toDateString()}` : ""}
        </p>
        {subscription?.stripe_subscription_id ? (
          <div className="mt-4">
            <Link href="/api/subscriptions/portal">
              <Button variant="secondary">Manage Billing</Button>
            </Link>
          </div>
        ) : null}
      </Card>

      <Card>
        <p className="font-display text-2xl font-bold tracking-[-0.02em]">Monthly</p>
        <p className="font-data mt-3 text-3xl">₹299</p>
        <p className="mt-2 text-sm text-muted">Flexible monthly billing with full platform access.</p>
        <div className="mt-5">
          <LemonSqueezySubscribeButton planType="monthly" label="Choose Monthly" />
        </div>
      </Card>

      <Card>
        <p className="font-display text-2xl font-bold tracking-[-0.02em]">Yearly</p>
        <p className="font-data mt-3 text-3xl">₹2999</p>
        <p className="mt-2 text-sm text-muted">Save with annual billing and uninterrupted membership.</p>
        <div className="mt-5">
          <LemonSqueezySubscribeButton planType="yearly" label="Choose Yearly" />
        </div>
      </Card>

      <Card className="md:col-span-2">
        <p className="text-sm text-muted">
          Need to return to your dashboard? <Link href="/dashboard" className="text-[var(--primary)] font-semibold">Go back</Link>
        </p>
      </Card>
    </section>
  );
}

