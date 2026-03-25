import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { lemonSqueezyFetch } from "@/lib/lemonsqueezy/server";

type LemonSqueezySubscriptionResponse = {
  data?: {
    attributes?: {
      customer_portal_url?: string;
      urls?: {
        customer_portal?: string;
        customer_portal_url?: string;
        update_payment_method?: string;
      };
    };
  };
};

type LemonSqueezyCustomerResponse = {
  data?: {
    attributes?: {
      urls?: {
        customer_portal?: string;
        customer_portal_url?: string;
      };
      customer_portal_url?: string;
    };
  };
};

export async function GET() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", serverEnv.NEXT_PUBLIC_APP_URL));
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("stripe_subscription_id, stripe_customer_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!subscription?.stripe_subscription_id) {
    return NextResponse.redirect(
      new URL(`/subscribe?error=${encodeURIComponent("No subscription found for billing portal access.")}`, serverEnv.NEXT_PUBLIC_APP_URL),
    );
  }

  try {
    const subscriptionResponse = await lemonSqueezyFetch<LemonSqueezySubscriptionResponse>(
      `/subscriptions/${subscription.stripe_subscription_id}`,
    );

    const subscriptionPortalUrl = extractPortalUrl(subscriptionResponse);

    if (subscriptionPortalUrl) {
      return NextResponse.redirect(subscriptionPortalUrl);
    }

    if (subscription.stripe_customer_id) {
      const customerResponse = await lemonSqueezyFetch<LemonSqueezyCustomerResponse>(
        `/customers/${subscription.stripe_customer_id}`,
      );
      const customerPortalUrl = extractPortalUrl(customerResponse);

      if (customerPortalUrl) {
        return NextResponse.redirect(customerPortalUrl);
      }
    }

    return NextResponse.redirect(
      new URL(
        `/subscribe?error=${encodeURIComponent("Billing portal URL is not available yet. Please try again shortly.")}`,
        serverEnv.NEXT_PUBLIC_APP_URL,
      ),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to open billing portal.";
    return NextResponse.redirect(new URL(`/subscribe?error=${encodeURIComponent(message)}`, serverEnv.NEXT_PUBLIC_APP_URL));
  }
}

function extractPortalUrl(payload: {
  data?: {
    attributes?: {
      customer_portal_url?: string;
      urls?: {
        customer_portal?: string;
        customer_portal_url?: string;
        update_payment_method?: string;
      };
    };
  };
}) {
  const attributes = payload.data?.attributes;

  const candidates = [
    attributes?.urls?.customer_portal,
    attributes?.urls?.customer_portal_url,
    attributes?.customer_portal_url,
    attributes?.urls?.update_payment_method,
  ];

  return candidates.find((value) => typeof value === "string" && value.startsWith("http")) ?? null;
}
