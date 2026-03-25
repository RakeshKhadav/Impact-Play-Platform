"use server";

import { revalidatePath } from "next/cache";
import { withProtectedAction } from "@/lib/auth/guards";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { WINNER_PROOF_BUCKET, WINNER_PROOF_MAX_BYTES } from "@/features/winners/constants";

type WinnerProofState = {
  error: string;
  success: string;
};

export async function submitWinnerProofAction(
  _prevState: WinnerProofState,
  formData: FormData,
): Promise<WinnerProofState> {
  const winnerId = readString(formData.get("winnerId"));
  const proofFile = formData.get("proofFile");

  if (!winnerId) {
    return {
      error: "Invalid winner record.",
      success: "",
    };
  }

  if (!(proofFile instanceof File) || proofFile.size === 0) {
    return {
      error: "Please select a PDF file.",
      success: "",
    };
  }

  if (!isPdf(proofFile)) {
    return {
      error: "Only PDF documents are allowed.",
      success: "",
    };
  }

  if (proofFile.size > WINNER_PROOF_MAX_BYTES) {
    return {
      error: "PDF must be 10MB or smaller.",
      success: "",
    };
  }

  try {
    await withProtectedAction(async ({ user, supabase }) => {
      const { data: winner, error: winnerError } = await supabase
        .from("winners")
        .select("id, user_id, verification_status, proof_url")
        .eq("id", winnerId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (winnerError) {
        throw new Error(winnerError.message);
      }

      if (!winner) {
        throw new Error("Winner record not found for this account.");
      }

      if (winner.verification_status !== "pending") {
        throw new Error("Proof can only be submitted while verification is pending.");
      }

      const admin = createSupabaseAdminClient();

      // Clean previous uploaded file (if this winner is re-uploading before review).
      if (winner.proof_url && !winner.proof_url.startsWith("http")) {
        await admin.storage.from(WINNER_PROOF_BUCKET).remove([winner.proof_url]);
      }

      const objectPath = buildObjectPath(user.id, winner.id, proofFile.name);
      const bytes = await proofFile.arrayBuffer();

      const { error: uploadError } = await admin.storage.from(WINNER_PROOF_BUCKET).upload(objectPath, bytes, {
        contentType: "application/pdf",
        upsert: true,
      });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { error: updateError } = await admin
        .from("winners")
        .update({
          proof_url: objectPath,
        })
        .eq("id", winner.id)
        .eq("user_id", user.id)
        .eq("verification_status", "pending");

      if (updateError) {
        throw new Error(updateError.message);
      }
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to submit proof.",
      success: "",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/admin");

  return {
    error: "",
    success: "PDF uploaded successfully.",
  };
}

function readString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isPdf(file: File) {
  const name = file.name.toLowerCase();
  return file.type === "application/pdf" || name.endsWith(".pdf");
}

function buildObjectPath(userId: string, winnerId: string, originalName: string) {
  const name = originalName.toLowerCase().replace(/[^a-z0-9._-]/g, "-");
  const safeName = name.endsWith(".pdf") ? name : `${name}.pdf`;
  return `${userId}/${winnerId}/${Date.now()}-${safeName}`;
}
