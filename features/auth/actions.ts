"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AuthActionState = {
  error: string;
};

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const signupSchema = z.object({
  fullName: z.string().trim().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  charityId: z.string().uuid().optional(),
});

export async function loginAction(_prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Enter a valid email and password." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function signupAction(_prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const rawCharityId = (formData.get("charityId") as string | null)?.trim() || undefined;

  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    charityId: rawCharityId || undefined,
  });

  if (!parsed.success) {
    return { error: "Enter a valid name, email, and password (8+ chars)." };
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user) {
    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: data.user.id,
        full_name: parsed.data.fullName,
        email: parsed.data.email,
        role: "subscriber" as const,
        charity_id: parsed.data.charityId ?? null,
        charity_contribution_percentage: parsed.data.charityId ? 10 : undefined,
      },
      {
        onConflict: "id",
      },
    );

    if (profileError) {
      return { error: `Account created but profile sync failed: ${profileError.message}` };
    }
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
