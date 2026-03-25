"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withAdminAction } from "@/lib/auth/guards";

type UserAdminState = {
  error: string;
  success: string;
};

const updateUserSchema = z.object({
  userId: z.string().uuid(),
  fullName: z.string().trim().max(120).optional(),
  role: z.enum(["subscriber", "admin"]),
});

export async function updateUserProfileAction(_prevState: UserAdminState, formData: FormData): Promise<UserAdminState> {
  const parsed = updateUserSchema.safeParse({
    userId: formData.get("userId"),
    fullName: (formData.get("fullName") as string | null)?.trim() || undefined,
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return {
      error: "Invalid user payload.",
      success: "",
    };
  }

  try {
    await withAdminAction(async ({ supabase }) => {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: parsed.data.fullName ?? null,
          role: parsed.data.role,
        })
        .eq("id", parsed.data.userId);

      if (error) {
        throw new Error(error.message);
      }
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to update user.",
      success: "",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/users");

  return {
    error: "",
    success: "User updated.",
  };
}