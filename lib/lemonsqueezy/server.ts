import "server-only";

import { serverEnv } from "@/lib/env/server";

const LEMONSQUEEZY_API_BASE = "https://api.lemonsqueezy.com/v1";

export type BillingPlanType = "monthly" | "yearly";

function clean(value: string) {
  return value.trim();
}

export function getLemonSqueezyPlanVariantId(planType: BillingPlanType): string {
  if (planType === "monthly") {
    return clean(serverEnv.LEMONSQUEEZY_MONTHLY_VARIANT_ID);
  }

  return clean(serverEnv.LEMONSQUEEZY_YEARLY_VARIANT_ID);
}

export function isLemonSqueezyTestMode() {
  return serverEnv.LEMONSQUEEZY_TEST_MODE ?? true;
}

function getLemonSqueezyApiKey() {
  return clean(serverEnv.LEMONSQUEEZY_API_KEY);
}

export function getLemonSqueezyStoreId() {
  return clean(serverEnv.LEMONSQUEEZY_STORE_ID);
}

export async function lemonSqueezyFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${LEMONSQUEEZY_API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${getLemonSqueezyApiKey()}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Lemon Squeezy API error (${response.status}): ${body}`);
  }

  return (await response.json()) as T;
}
