"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  refreshSubscriptionFromProviderAction,
  updateSubscriptionStatusAction,
} from "@/features/admin/subscriptions/actions";
import type { SubscriptionStatus } from "@/lib/supabase/types";

const initialState = {
  error: "",
  success: "",
};

export function SubscriptionRowActions({
  subscriptionId,
  userId,
  userEmail,
  status,
}: {
  subscriptionId: string;
  userId: string;
  userEmail: string;
  status: SubscriptionStatus;
}) {
  const [statusState, statusFormAction, statusPending] = useActionState(updateSubscriptionStatusAction, initialState);
  const [refreshState, refreshFormAction, refreshPending] = useActionState(refreshSubscriptionFromProviderAction, initialState);

  return (
    <div className="space-y-2">
      <form action={statusFormAction} className="grid gap-2 md:grid-cols-[1fr_auto] md:items-end">
        <input type="hidden" name="subscriptionId" value={subscriptionId} />
        <select
          name="status"
          defaultValue={status}
          className="h-[42px] rounded-2xl bg-[var(--surface-container-high)] px-3 text-xs text-on-surface outline-none focus:ring-2 focus:ring-[var(--secondary)]"
        >
          <option value="active">Active</option>
          <option value="cancelled">Cancelled</option>
          <option value="past_due">Past Due</option>
          <option value="expired">Expired</option>
        </select>
        <Button type="submit" variant="secondary" disabled={statusPending} className="h-[42px] text-xs">
          {statusPending ? "Saving..." : "Set"}
        </Button>
      </form>

      <form action={refreshFormAction}>
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="userEmail" value={userEmail} />
        <Button type="submit" disabled={refreshPending} className="h-[38px] text-xs">
          {refreshPending ? "Refreshing..." : "Refresh from Lemon Squeezy"}
        </Button>
      </form>

      {statusState.error ? <p className="text-xs text-[var(--error)]">{statusState.error}</p> : null}
      {refreshState.error ? <p className="text-xs text-[var(--error)]">{refreshState.error}</p> : null}
      {statusState.success ? <p className="text-xs text-[var(--success)]">{statusState.success}</p> : null}
      {refreshState.success ? <p className="text-xs text-[var(--success)]">{refreshState.success}</p> : null}
    </div>
  );
}