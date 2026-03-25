"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withProtectedAction } from "@/lib/auth/guards";
import { getLatestSubscriptionForUser } from "@/lib/subscriptions/status";

const scoreSchema = z.object({
  scoreId: z.string().uuid().optional(),
  score: z.coerce.number().int().min(1).max(45),
  scoreDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function upsertScoreAction(formData: FormData) {
  const parsed = scoreSchema.safeParse({
    scoreId: formData.get("scoreId") || undefined,
    score: formData.get("score"),
    scoreDate: formData.get("scoreDate"),
  });

  if (!parsed.success) {
    throw new Error("Score must be a number from 1 to 45 with a valid date.");
  }

  await withProtectedAction(async ({ user, supabase }) => {
    const subscriptionState = await getLatestSubscriptionForUser(supabase, user.id, { userEmail: user.email, syncFromProvider: true });

    if (!subscriptionState.hasAccess) {
      throw new Error("An active subscription is required to add or edit scores.");
    }

    if (parsed.data.scoreId) {
      const { error } = await supabase
        .from("golf_scores")
        .update({
          score: parsed.data.score,
          score_date: parsed.data.scoreDate,
        })
        .eq("id", parsed.data.scoreId)
        .eq("user_id", user.id);

      if (error) {
        throw new Error(error.message);
      }

      return;
    }

    const { error } = await supabase.from("golf_scores").insert({
      user_id: user.id,
      score: parsed.data.score,
      score_date: parsed.data.scoreDate,
    });

    if (error) {
      throw new Error(error.message);
    }
  });

  revalidatePath("/dashboard");
}

