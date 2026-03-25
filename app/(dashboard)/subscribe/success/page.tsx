import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getLatestSubscriptionForUser } from "@/lib/subscriptions/status";

export default async function SubscribeSuccessPage() {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const subscriptionState = await getLatestSubscriptionForUser(supabase, user.id, {
    userEmail: user.email,
    syncFromProvider: true,
  });

  return (
    <section className="mx-auto w-full max-w-3xl">
      <Card>
        <p className="font-data text-xs uppercase tracking-[0.16em] text-muted">Subscription Complete</p>
        <h1 className="font-display mt-3 text-4xl font-bold tracking-[-0.02em]">Welcome to Premium Access</h1>
        <p className="mt-3 text-sm text-muted">
          {subscriptionState.hasAccess
            ? "Your membership is active. You now have premium dashboard access."
            : "Payment is received. We are finalizing membership sync with Lemon Squeezy; this usually takes a few seconds."}
        </p>
        <p className="mt-3 text-sm text-muted">Current status: {subscriptionState.subscription?.status ?? "pending"}</p>
        <div className="mt-6 flex gap-3">
          <Link href="/dashboard">
            <Button>Go to Dashboard</Button>
          </Link>
          <Link href="/subscribe">
            <Button variant="secondary">View Billing</Button>
          </Link>
        </div>
      </Card>
    </section>
  );
}
