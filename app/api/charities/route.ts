import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function toLimit(value: string | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 50;
  }

  return Math.max(1, Math.min(200, Math.floor(parsed)));
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const url = new URL(request.url);

  const q = url.searchParams.get("q")?.trim();
  const tag = url.searchParams.get("tag")?.trim().toLowerCase();
  const featured = url.searchParams.get("featured") === "1";
  const limit = toLimit(url.searchParams.get("limit"));

  let query = supabase
    .from("charities")
    .select("id, name, slug, description, logo_url, cover_image_url, website_url, featured, tags, total_raised, upcoming_events")
    .eq("is_active", true)
    .eq("is_published", true)
    .order("featured", { ascending: false })
    .order("name", { ascending: true })
    .limit(limit);

  if (featured) {
    query = query.eq("featured", true);
  }

  if (q) {
    query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
  }

  if (tag) {
    query = query.contains("tags", [tag]);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
