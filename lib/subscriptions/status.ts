import "server-only";

import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import type { Database, SubscriptionPlanType, SubscriptionStatus } from "@/lib/supabase/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { lemonSqueezyFetch } from "@/lib/lemonsqueezy/server";
import { serverEnv } from "@/lib/env/server";

export type SubscriptionRecord = Database["public"]["Tables"]["subscriptions"]["Row"];

export type SubscriptionAccessResult = {
  subscription: SubscriptionRecord | null;
  hasAccess: boolean;
  error: PostgrestError | null;
};

type GetSubscriptionOptions = {
  userEmail?: string | null;
  syncFromProvider?: boolean;
};

type LemonSqueezySubscriptionListResponse = {
  data?: Array<{
    id?: string | number;
    attributes?: {
      status?: string;
      customer_id?: string | number | null;
      renews_at?: string | null;
      ends_at?: string | null;
      cancelled?: boolean | null;
      variant_id?: string | number | null;
      updated_at?: string | null;
      created_at?: string | null;
    };
  }>;
};

export async function getLatestSubscriptionForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
  options?: GetSubscriptionOptions,
): Promise<SubscriptionAccessResult> {
  const initial = await fetchSubscriptions(supabase, userId);

  if (initial.error) {
    return {
      subscription: null,
      hasAccess: false,
      error: initial.error,
    };
  }

  if (initial.hasAccess || !options?.syncFromProvider || !options.userEmail) {
    return {
      subscription: initial.subscription,
      hasAccess: initial.hasAccess,
      error: null,
    };
  }

  await syncSubscriptionsFromProviderForUser(userId, options.userEmail);

  const refreshed = await fetchSubscriptions(supabase, userId);

  if (refreshed.error) {
    return {
      subscription: initial.subscription,
      hasAccess: initial.hasAccess,
      error: refreshed.error,
    };
  }

  return {
    subscription: refreshed.subscription,
    hasAccess: refreshed.hasAccess,
    error: null,
  };
}

export function hasSubscriptionAccess(subscription: SubscriptionRecord | null): boolean {
  if (!subscription) {
    return false;
  }

  if (subscription.status === "active") {
    return true;
  }

  // Users keep access until period end if cancellation is scheduled.
  if (subscription.status === "cancelled" && subscription.current_period_end) {
    return new Date(subscription.current_period_end).getTime() > Date.now();
  }

  return false;
}

export async function syncSubscriptionsFromProviderForUser(userId: string, userEmail: string) {
  try {
    const response = await lemonSqueezyFetch<LemonSqueezySubscriptionListResponse>(
      `/subscriptions?filter[store_id]=${encodeURIComponent(serverEnv.LEMONSQUEEZY_STORE_ID)}&filter[user_email]=${encodeURIComponent(userEmail)}&page[size]=100`,
    );

    const subscriptions = response.data ?? [];
    const knownVariantIds = new Set([
      serverEnv.LEMONSQUEEZY_MONTHLY_VARIANT_ID.trim(),
      serverEnv.LEMONSQUEEZY_YEARLY_VARIANT_ID.trim(),
    ]);

    const admin = createSupabaseAdminClient();

    for (const item of subscriptions) {
      const subscriptionId = readString(item.id);
      const variantId = readString(item.attributes?.variant_id);

      if (!subscriptionId || !variantId || !knownVariantIds.has(variantId)) {
        continue;
      }

      const status = mapLemonSqueezyStatus(item.attributes?.status);
      const planType: SubscriptionPlanType =
        variantId === serverEnv.LEMONSQUEEZY_YEARLY_VARIANT_ID.trim() ? "yearly" : "monthly";

      const { error } = await admin.from("subscriptions").upsert(
        {
          user_id: userId,
          plan_type: planType,
          status,
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: readString(item.attributes?.customer_id),
          current_period_start: null,
          current_period_end: toIso(item.attributes?.renews_at) ?? toIso(item.attributes?.ends_at),
          cancel_at_period_end: Boolean(item.attributes?.cancelled) || status === "cancelled" || status === "expired",
        },
        {
          onConflict: "stripe_subscription_id",
        },
      );

      if (error) {
        console.error(`Subscription sync upsert failed for ${subscriptionId}: ${error.message}`);
      }
    }
  } catch (error) {
    console.error("Subscription sync from Lemon Squeezy failed", error);
  }
}

async function fetchSubscriptions(supabase: SupabaseClient<Database>, userId: string) {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return {
      subscription: null,
      hasAccess: false,
      error,
    };
  }

  const records = data ?? [];
  const accessRecord = records.find((record) => hasSubscriptionAccess(record)) ?? null;

  return {
    subscription: accessRecord ?? records[0] ?? null,
    hasAccess: Boolean(accessRecord),
    error: null,
  };
}

function mapLemonSqueezyStatus(status: string | undefined): SubscriptionStatus {
  switch (status) {
    case "active":
    case "on_trial":
      return "active";
    case "cancelled":
      return "cancelled";
    case "expired":
      return "expired";
    case "paused":
    case "past_due":
    case "unpaid":
    default:
      return "past_due";
  }
}

function readString(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return null;
}

function toIso(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}