"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withAdminAction } from "@/lib/auth/guards";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { createSupabaseServerClient } from "@/lib/supabase/server";

type CharityFormState = {
  error: string;
  success: string;
};

const baseCharitySchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1500).optional(),
});

const updateCharitySchema = baseCharitySchema.extend({
  charityId: z.string().uuid(),
});

const deleteCharitySchema = z.object({
  charityId: z.string().uuid(),
});

type AdminSupabase = Awaited<ReturnType<typeof createSupabaseServerClient>>;

function toOptionalString(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function parseTags(formData: FormData): string[] {
  const raw = formData.getAll("tags");
  return Array.from(
    new Set(
      raw
        .filter((v): v is string => typeof v === "string")
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 0),
    ),
  ).slice(0, 12);
}

const CHARITY_IMAGES_BUCKET = "charity-images";

async function uploadCharityImage(file: File, charitySlug: string, kind: "logo" | "cover"): Promise<string | null> {
  if (!file || file.size === 0) {
    return null;
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const path = `${charitySlug}/${kind}-${Date.now()}.${ext}`;

  const admin = createSupabaseAdminClient();

  const { error } = await admin.storage.from(CHARITY_IMAGES_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type,
  });

  if (error) {
    throw new Error(`Image upload failed: ${error.message}`);
  }

  const { data: urlData } = admin.storage.from(CHARITY_IMAGES_BUCKET).getPublicUrl(path);
  return urlData.publicUrl;
}

async function ensureUniqueSlug(baseSlug: string, charityIdToExclude: string | null, supabase: AdminSupabase) {
  let candidate = baseSlug;

  for (let suffix = 1; suffix <= 40; suffix += 1) {
    let query = supabase.from("charities").select("id").eq("slug", candidate).limit(1);

    if (charityIdToExclude) {
      query = query.neq("id", charityIdToExclude);
    }

    const { data: existing, error } = await query.maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!existing) {
      return candidate;
    }

    candidate = `${baseSlug}-${suffix + 1}`;
  }

  throw new Error("Could not generate a unique slug for this charity.");
}

export async function addCharityAction(_prevState: CharityFormState, formData: FormData): Promise<CharityFormState> {
  const parsed = baseCharitySchema.safeParse({
    name: formData.get("name"),
    description: toOptionalString(formData.get("description")),
  });

  if (!parsed.success) {
    return {
      error: "Please fill all required fields.",
      success: "",
    };
  }

  try {
    await withAdminAction(async ({ supabase }) => {
      const baseSlug = slugify(parsed.data.name);
      if (!baseSlug) {
        throw new Error("Charity name must include letters or numbers.");
      }

      const slug = await ensureUniqueSlug(baseSlug, null, supabase);

      // Handle file uploads
      const logoFile = formData.get("logoFile") as File | null;
      const coverFile = formData.get("coverFile") as File | null;

      const logoUrl = logoFile && logoFile.size > 0 ? await uploadCharityImage(logoFile, slug, "logo") : null;
      const coverUrl = coverFile && coverFile.size > 0 ? await uploadCharityImage(coverFile, slug, "cover") : null;

      const tags = parseTags(formData);

      const { error } = await supabase.from("charities").insert({
        name: parsed.data.name,
        slug,
        description: parsed.data.description ?? null,
        website_url: null,
        logo_url: logoUrl,
        cover_image_url: coverUrl,
        tags,
        upcoming_events: null,
        featured: false,
        is_active: true,
        is_published: true,
      });

      if (error) {
        throw new Error(error.message);
      }
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to create charity.",
      success: "",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/charities");
  revalidatePath("/");
  revalidatePath("/charities");

  return {
    error: "",
    success: "Charity added successfully.",
  };
}

export async function updateCharityAction(
  _prevState: CharityFormState,
  formData: FormData,
): Promise<CharityFormState> {
  const parsed = updateCharitySchema.safeParse({
    charityId: formData.get("charityId"),
    name: formData.get("name"),
    description: toOptionalString(formData.get("description")),
  });

  if (!parsed.success) {
    return {
      error: "Invalid charity update payload.",
      success: "",
    };
  }

  try {
    await withAdminAction(async ({ supabase }) => {
      const baseSlug = slugify(parsed.data.name);
      if (!baseSlug) {
        throw new Error("Charity name must include letters or numbers.");
      }

      const slug = await ensureUniqueSlug(baseSlug, parsed.data.charityId, supabase);

      // Handle file uploads — only update if a new file is provided
      const logoFile = formData.get("logoFile") as File | null;
      const coverFile = formData.get("coverFile") as File | null;

      const updatePayload: Record<string, unknown> = {
        name: parsed.data.name,
        slug,
        description: parsed.data.description ?? null,
        tags: parseTags(formData),
      };

      if (logoFile && logoFile.size > 0) {
        updatePayload.logo_url = await uploadCharityImage(logoFile, slug, "logo");
      }

      if (coverFile && coverFile.size > 0) {
        updatePayload.cover_image_url = await uploadCharityImage(coverFile, slug, "cover");
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase
        .from("charities")
        .update(updatePayload as any)
        .eq("id", parsed.data.charityId);

      if (error) {
        throw new Error(error.message);
      }
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to update charity.",
      success: "",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/charities");
  revalidatePath("/");
  revalidatePath("/charities");

  return {
    error: "",
    success: "Charity updated.",
  };
}

export async function deleteCharityAction(
  _prevState: CharityFormState,
  formData: FormData,
): Promise<CharityFormState> {
  const parsed = deleteCharitySchema.safeParse({
    charityId: formData.get("charityId"),
  });

  if (!parsed.success) {
    return {
      error: "Invalid charity id.",
      success: "",
    };
  }

  try {
    await withAdminAction(async ({ supabase }) => {
      const { error } = await supabase.from("charities").delete().eq("id", parsed.data.charityId);

      if (error) {
        throw new Error(error.message);
      }
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to delete charity.",
      success: "",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/charities");
  revalidatePath("/");
  revalidatePath("/charities");

  return {
    error: "",
    success: "Charity deleted.",
  };
}
