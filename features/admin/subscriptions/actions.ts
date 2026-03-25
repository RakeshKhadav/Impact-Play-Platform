"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withAdminAction } from "@/lib/auth/guards";
import { syncSubscriptionsFromProviderForUser } from "@/lib/subscriptions/status";

type SubscriptionAdminState = {
  error: string;
  success: string;
};

const updateStatusSchema = z.object({
  subscriptionId: z.string().uuid(),
  status: z.enum(["active", "cancelled", "expired", "past_due"]),
});

const refreshSchema = z.object({
  userId: z.string().uuid(),
  userEmail: z.string().email(),
});

export async function updateSubscriptionStatusAction(
  _prevState: SubscriptionAdminState,
  formData: FormData,
): Promise<SubscriptionAdminState> {
  const parsed = updateStatusSchema.safeParse({
    subscriptionId: formData.get("subscriptionId"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return {
      error: "Invalid subscription payload.",
      success: "",
    };
  }

  try {
    await withAdminAction(async ({ supabase }) => {
      const { error } = await supabase
        .from("subscriptions")
        .update({
          status: parsed.data.status,
        })
        .eq("id", parsed.data.subscriptionId);

      if (error) {
        throw new Error(error.message);
      }
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to update subscription.",
      success: "",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/subscriptions");
  revalidatePath("/dashboard");

  return {
    error: "",
    success: "Subscription status updated.",
  };
}

export async function refreshSubscriptionFromProviderAction(
  _prevState: SubscriptionAdminState,
  formData: FormData,
): Promise<SubscriptionAdminState> {
  const parsed = refreshSchema.safeParse({
    userId: formData.get("userId"),
    userEmail: formData.get("userEmail"),
  });

  if (!parsed.success) {
    return {
      error: "Invalid refresh payload.",
      success: "",
    };
  }

  try {
    await withAdminAction(async () => {
      await syncSubscriptionsFromProviderForUser(parsed.data.userId, parsed.data.userEmail);
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to refresh from provider.",
      success: "",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/subscriptions");
  revalidatePath("/dashboard");

  return {
    error: "",
    success: "Subscription refreshed from Lemon Squeezy.",
  };
}