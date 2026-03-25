"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type DonationActionState = {
  error: string;
  success: string;
};

const donationSchema = z.object({
  charityId: z.string().uuid(),
  amount: z.coerce.number().min(1).max(50000),
  donorName: z.string().trim().min(2).max(120),
  donorEmail: z.string().email(),
});

export async function createDonationAction(
  _prevState: DonationActionState,
  formData: FormData,
): Promise<DonationActionState> {
  const parsed = donationSchema.safeParse({
    charityId: formData.get("charityId"),
    amount: formData.get("amount"),
    donorName: formData.get("donorName"),
    donorEmail: formData.get("donorEmail"),
  });

  if (!parsed.success) {
    return {
      error: "Please fill in all fields correctly. Amount must be at least $1.",
      success: "",
    };
  }

  try {
    const supabase = await createSupabaseServerClient();

    // Check if the user is logged in (optional — donors can be guests)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // The independent_donations table may not be in the generated Supabase types.
    // Use schema-qualified query to avoid TS errors while the table still works at runtime.
    const untypedSupabase = supabase as unknown as {
      from: (table: string) => {
        insert: (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
      };
    };

    const { error: insertError } = await untypedSupabase.from("independent_donations").insert({
      charity_id: parsed.data.charityId,
      amount: parsed.data.amount,
      donor_name: parsed.data.donorName,
      donor_email: parsed.data.donorEmail,
      status: "completed",
      ...(user?.id ? { user_id: user.id } : {}),
    });

    if (insertError) {
      throw new Error(insertError.message);
    }

    // Increment the charity's total_raised counter
    const { data: charity } = await supabase
      .from("charities")
      .select("total_raised")
      .eq("id", parsed.data.charityId)
      .maybeSingle();

    if (charity) {
      await supabase
        .from("charities")
        .update({
          total_raised: Number(charity.total_raised ?? 0) + parsed.data.amount,
        })
        .eq("id", parsed.data.charityId);
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to process donation.",
      success: "",
    };
  }

  revalidatePath("/donate");
  revalidatePath("/charities");

  return {
    error: "",
    success: "Thank you for your generous donation! Your contribution has been recorded.",
  };
}
