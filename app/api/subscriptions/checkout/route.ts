import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env/server";
import {
  getLemonSqueezyPlanVariantId,
  getLemonSqueezyStoreId,
  isLemonSqueezyTestMode,
  lemonSqueezyFetch,
  type BillingPlanType,
} from "@/lib/lemonsqueezy/server";

const checkoutSchema = z.object({
  planType: z.enum(["monthly", "yearly"]),
});

type LemonSqueezyCheckoutResponse = {
  data?: {
    attributes?: {
      url?: string;
    };
  };
};

type CreateCheckoutResult =
  | {
      checkoutUrl: string;
      planType: BillingPlanType;
    }
  | {
      error: string;
    };

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const parsed = checkoutSchema.safeParse({
    planType: requestUrl.searchParams.get("planType"),
  });

  if (!parsed.success) {
    return NextResponse.redirect(new URL(`/subscribe?error=${encodeURIComponent("Invalid plan type.")}`, serverEnv.NEXT_PUBLIC_APP_URL));
  }

  const result = await createLemonSqueezyCheckout(parsed.data.planType);

  if ("error" in result) {
    return NextResponse.redirect(
      new URL(`/subscribe?error=${encodeURIComponent(result.error)}`, serverEnv.NEXT_PUBLIC_APP_URL),
    );
  }

  return NextResponse.redirect(result.checkoutUrl);
}

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);

  const parsed = checkoutSchema.safeParse({
    planType: json?.planType,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid plan type." }, { status: 400 });
  }

  const result = await createLemonSqueezyCheckout(parsed.data.planType);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}

async function createLemonSqueezyCheckout(planType: BillingPlanType): Promise<CreateCheckoutResult> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "You must be logged in to subscribe." };
  }

  const variantId = getLemonSqueezyPlanVariantId(planType);

  try {
    const payload = {
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            email: user.email ?? undefined,
            name: user.user_metadata?.full_name ?? undefined,
            custom: {
              user_id: user.id,
              plan_type: planType,
              user_email: user.email ?? "",
            },
          },
          product_options: {
            redirect_url: `${serverEnv.NEXT_PUBLIC_APP_URL}/subscribe/success`,
            receipt_button_text: "Return to Precision Philanthropy",
            receipt_link_url: `${serverEnv.NEXT_PUBLIC_APP_URL}/dashboard`,
          },
          checkout_options: {
            embed: false,
            media: false,
            logo: true,
          },
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          test_mode: isLemonSqueezyTestMode(),
        },
        relationships: {
          store: {
            data: {
              type: "stores",
              id: getLemonSqueezyStoreId(),
            },
          },
          variant: {
            data: {
              type: "variants",
              id: variantId,
            },
          },
        },
      },
    };

    const response = await lemonSqueezyFetch<LemonSqueezyCheckoutResponse>("/checkouts", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const checkoutUrl = response.data?.attributes?.url;

    if (!checkoutUrl) {
      return { error: "Lemon Squeezy checkout URL was not returned." };
    }

    return { checkoutUrl, planType };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Lemon Squeezy error";

    if (message.includes('"pointer":"/data/relationships/variant"') && message.includes("404")) {
      return {
        error: `Invalid Lemon Squeezy ${planType} variant id (${variantId}). Update ${
          planType === "monthly" ? "LEMONSQUEEZY_MONTHLY_VARIANT_ID" : "LEMONSQUEEZY_YEARLY_VARIANT_ID"
        } in .env.local.`,
      };
    }

    return {
      error: message,
    };
  }
}
