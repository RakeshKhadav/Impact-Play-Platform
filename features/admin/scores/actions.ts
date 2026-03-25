"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withAdminAction } from "@/lib/auth/guards";

type ScoreAdminState = {
  error: string;
  success: string;
};

const updateScoreSchema = z.object({
  scoreId: z.string().uuid(),
  score: z.coerce.number().int().min(1).max(45),
  scoreDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const deleteScoreSchema = z.object({
  scoreId: z.string().uuid(),
});

export async function updateScoreAdminAction(_prevState: ScoreAdminState, formData: FormData): Promise<ScoreAdminState> {
  const parsed = updateScoreSchema.safeParse({
    scoreId: formData.get("scoreId"),
    score: formData.get("score"),
    scoreDate: formData.get("scoreDate"),
  });

  if (!parsed.success) {
    return {
      error: "Invalid score payload.",
      success: "",
    };
  }

  try {
    await withAdminAction(async ({ supabase }) => {
      const { error } = await supabase
        .from("golf_scores")
        .update({
          score: parsed.data.score,
          score_date: parsed.data.scoreDate,
        })
        .eq("id", parsed.data.scoreId);

      if (error) {
        throw new Error(error.message);
      }
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to update score.",
      success: "",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/scores");
  revalidatePath("/dashboard");

  return {
    error: "",
    success: "Score updated.",
  };
}

export async function deleteScoreAdminAction(_prevState: ScoreAdminState, formData: FormData): Promise<ScoreAdminState> {
  const parsed = deleteScoreSchema.safeParse({
    scoreId: formData.get("scoreId"),
  });

  if (!parsed.success) {
    return {
      error: "Invalid score id.",
      success: "",
    };
  }

  try {
    await withAdminAction(async ({ supabase }) => {
      const { error } = await supabase.from("golf_scores").delete().eq("id", parsed.data.scoreId);

      if (error) {
        throw new Error(error.message);
      }
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to delete score.",
      success: "",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/scores");
  revalidatePath("/dashboard");

  return {
    error: "",
    success: "Score deleted.",
  };
}