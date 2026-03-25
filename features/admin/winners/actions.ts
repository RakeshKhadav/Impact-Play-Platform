"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withAdminAction } from "@/lib/auth/guards";

type WinnerAdminState = {
  error: string;
  success: string;
};

const reviewSchema = z.object({
  winnerId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  notes: z.string().trim().max(600).optional(),
});

const payoutSchema = z.object({
  winnerId: z.string().uuid(),
  paymentReference: z.string().trim().min(2).max(160),
});

export async function reviewWinnerAction(_prevState: WinnerAdminState, formData: FormData): Promise<WinnerAdminState> {
  const parsed = reviewSchema.safeParse({
    winnerId: formData.get("winnerId"),
    decision: formData.get("decision"),
    notes: (formData.get("notes") as string | null)?.trim() || undefined,
  });

  if (!parsed.success) {
    return {
      error: "Invalid review payload.",
      success: "",
    };
  }

  try {
    await withAdminAction(async ({ user, supabase }) => {
      const nowIso = new Date().toISOString();

      const { error } = await supabase
        .from("winners")
        .update({
          verification_status: parsed.data.decision,
          verification_notes: parsed.data.notes ?? null,
          verification_reviewed_by: user.id,
          verification_reviewed_at: nowIso,
        })
        .eq("id", parsed.data.winnerId);

      if (error) {
        throw new Error(error.message);
      }
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to review winner.",
      success: "",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/winners");
  revalidatePath("/dashboard");

  return {
    error: "",
    success: "Winner review updated.",
  };
}

export async function markWinnerPaidAction(_prevState: WinnerAdminState, formData: FormData): Promise<WinnerAdminState> {
  const parsed = payoutSchema.safeParse({
    winnerId: formData.get("winnerId"),
    paymentReference: formData.get("paymentReference"),
  });

  if (!parsed.success) {
    return {
      error: "Invalid payout payload.",
      success: "",
    };
  }

  try {
    await withAdminAction(async ({ supabase }) => {
      const { data: winner, error: winnerError } = await supabase
        .from("winners")
        .select("id, verification_status")
        .eq("id", parsed.data.winnerId)
        .maybeSingle();

      if (winnerError || !winner) {
        throw new Error(winnerError?.message ?? "Winner record not found.");
      }

      if (winner.verification_status !== "approved") {
        throw new Error("Winner must be approved before payout is marked paid.");
      }

      const nowIso = new Date().toISOString();

      const { error } = await supabase
        .from("winners")
        .update({
          payment_status: "paid",
          payment_reference: parsed.data.paymentReference,
          payment_paid_at: nowIso,
          payout_reference: parsed.data.paymentReference,
          payout_at: nowIso,
        })
        .eq("id", parsed.data.winnerId);

      if (error) {
        throw new Error(error.message);
      }
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to update payout.",
      success: "",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/winners");
  revalidatePath("/dashboard");

  return {
    error: "",
    success: "Winner marked paid.",
  };
}