import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env/server";

type SubscriptionPlanType = "monthly" | "yearly";

type LemonSqueezyWebhookPayload = {
  meta?: {
    event_name?: string;
    custom_data?: Record<string, unknown>;
  };
  data?: {
    id?: string | number;
    attributes?: {
      status?: string;
      customer_id?: string | number | null;
      renews_at?: string | null;
      ends_at?: string | null;
      cancelled?: boolean | null;
      user_email?: string | null;
      variant_id?: string | number | null;
    };
  };
};

export async function POST(request: Request) {
  const signature = request.headers.get("x-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing x-signature header." }, { status: 400 });
  }

  const body = await request.text();

  if (!isValidWebhookSignature(body, signature, serverEnv.LEMONSQUEEZY_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  const payload = JSON.parse(body) as LemonSqueezyWebhookPayload;
  const eventName = payload.meta?.event_name ?? "";

  if (!eventName.startsWith("subscription_")) {
    return NextResponse.json({ received: true, ignored: `Event ${eventName || "unknown"} is not a subscription event.` });
  }

  const subscriptionId = readString(payload.data?.id);

  if (!subscriptionId) {
    return NextResponse.json({ received: true, ignored: "No subscription id in payload." });
  }

  const attributes = payload.data?.attributes;
  const customData = payload.meta?.custom_data ?? {};
  const customerId = readString(attributes?.customer_id);
  const userEmail = readString(attributes?.user_email) ?? readString(customData.user_email);
  const supabaseAdmin = createSupabaseAdminClient();

  let userId = readString(customData.user_id);

  if (!userId) {
    userId = await resolveUserId(supabaseAdmin, subscriptionId, customerId, userEmail);
  }

  if (!userId) {
    console.error(`Lemon Squeezy webhook: unable to resolve user_id for subscription ${subscriptionId}`);
    return NextResponse.json({ received: true, ignored: "Unable to resolve user." });
  }

  const mappedStatus = mapLemonSqueezyStatus(attributes?.status);
  const resolvedPlanType =
    readPlanType(customData.plan_type) ??
    inferPlanTypeFromVariant(attributes?.variant_id) ??
    "monthly";

  const { error } = await supabaseAdmin.from("subscriptions").upsert(
    {
      user_id: userId,
      plan_type: resolvedPlanType,
      status: mappedStatus,
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: customerId,
      current_period_start: null,
      current_period_end: toIso(attributes?.renews_at) ?? toIso(attributes?.ends_at),
      cancel_at_period_end: Boolean(attributes?.cancelled) || mappedStatus === "cancelled" || mappedStatus === "expired",
    },
    {
      onConflict: "stripe_subscription_id",
    },
  );

  if (error) {
    console.error(`Lemon Squeezy webhook upsert failed for subscription ${subscriptionId}: ${error.message}`);
    return NextResponse.json({ error: "Failed to sync subscription." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

function isValidWebhookSignature(payload: string, receivedSignature: string, secret: string) {
  const normalizedReceived = receivedSignature.replace(/^sha256=/i, "").trim();
  const digest = createHmac("sha256", secret).update(payload).digest("hex");

  const expectedBuffer = Buffer.from(digest);
  const actualBuffer = Buffer.from(normalizedReceived);

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

async function resolveUserId(
  supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>,
  subscriptionId: string,
  customerId: string | null,
  userEmail: string | null,
) {
  const { data: bySubscription } = await supabaseAdmin
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();

  if (bySubscription?.user_id) {
    return bySubscription.user_id;
  }

  if (customerId) {
    const { data: byCustomer } = await supabaseAdmin
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .order("updated_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (byCustomer?.user_id) {
      return byCustomer.user_id;
    }
  }

  if (userEmail) {
    const { data: byEmail } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("email", userEmail)
      .maybeSingle();

    if (byEmail?.id) {
      return byEmail.id;
    }
  }

  return null;
}

function mapLemonSqueezyStatus(status: string | undefined) {
  switch (status) {
    case "active":
    case "on_trial":
      return "active" as const;
    case "cancelled":
      return "cancelled" as const;
    case "expired":
      return "expired" as const;
    case "paused":
    case "past_due":
    case "unpaid":
    default:
      return "past_due" as const;
  }
}

function readPlanType(value: unknown): SubscriptionPlanType | null {
  if (value === "monthly" || value === "yearly") {
    return value;
  }

  return null;
}

function inferPlanTypeFromVariant(variantIdValue: unknown): SubscriptionPlanType | null {
  const variantId = readString(variantIdValue);

  if (!variantId) {
    return null;
  }

  if (variantId === serverEnv.LEMONSQUEEZY_MONTHLY_VARIANT_ID) {
    return "monthly";
  }

  if (variantId === serverEnv.LEMONSQUEEZY_YEARLY_VARIANT_ID) {
    return "yearly";
  }

  return null;
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
