import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("charities")
    .select(
      "id, name, slug, description, logo_url, cover_image_url, website_url, featured, tags, total_raised, upcoming_events",
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .eq("is_published", true)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Charity not found." }, { status: 404 });
  }

  return NextResponse.json({ data });
}
