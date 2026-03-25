"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withProtectedAction } from "@/lib/auth/guards";

const onboardingSchema = z.object({
  fullName: z.string().trim().min(2),
});

const charityPreferenceSchema = z.object({
  charityId: z.string().uuid(),
  contributionPercentage: z.coerce.number().min(10).max(100),
});

export async function completeOnboardingProfileAction(formData: FormData) {
  const parsed = onboardingSchema.safeParse({
    fullName: formData.get("fullName"),
  });

  if (!parsed.success) {
    throw new Error("Invalid profile fields.");
  }

  await withProtectedAction(async ({ user, supabase }) => {
    const { error } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        email: user.email ?? "",
        full_name: parsed.data.fullName,
      },
      {
        onConflict: "id",
      },
    );

    if (error) {
      throw new Error(error.message);
    }
  });

  revalidatePath("/dashboard");
}

export async function updateCharityPreferenceAction(formData: FormData) {
  const parsed = charityPreferenceSchema.safeParse({
    charityId: formData.get("charityId"),
    contributionPercentage: formData.get("contributionPercentage"),
  });

  if (!parsed.success) {
    throw new Error("Charity preference is invalid.");
  }

  await withProtectedAction(async ({ user, supabase }) => {
    const { error } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        email: user.email ?? "",
        charity_id: parsed.data.charityId,
        charity_contribution_percentage: parsed.data.contributionPercentage,
      },
      {
        onConflict: "id",
      },
    );

    if (error) {
      throw new Error(error.message);
    }
  });

  revalidatePath("/dashboard");
}
