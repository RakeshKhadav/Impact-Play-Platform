import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function toLimit(value: string | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 24;
  }

  return Math.max(1, Math.min(120, Math.floor(parsed)));
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const url = new URL(request.url);
  const limit = toLimit(url.searchParams.get("limit"));

  const { data, error } = await supabase
    .from("draws")
    .select(
      "id, draw_month, title, published_at, logic_mode, draw_numbers, winner_pool, five_match_pool, four_match_pool, three_match_pool, five_match_rollover_in, five_match_rollover_out, eligible_count, active_subscriber_count_snapshot",
    )
    .eq("status", "published")
    .order("draw_month", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const drawIds = (data ?? []).map((row) => row.id);
  const { data: participants } = drawIds.length
    ? await supabase.from("draw_participants").select("draw_id, prize_tier").in("draw_id", drawIds)
    : { data: [] as Array<{ draw_id: string; prize_tier: "none" | "three_match" | "four_match" | "five_match" }> };

  const countsByDraw = new Map<string, { five: number; four: number; three: number }>();

  for (const row of participants ?? []) {
    const count = countsByDraw.get(row.draw_id) ?? { five: 0, four: 0, three: 0 };

    if (row.prize_tier === "five_match") count.five += 1;
    if (row.prize_tier === "four_match") count.four += 1;
    if (row.prize_tier === "three_match") count.three += 1;

    countsByDraw.set(row.draw_id, count);
  }

  return NextResponse.json({
    data: (data ?? []).map((row) => ({
      ...row,
      five_match_winner_count: countsByDraw.get(row.id)?.five ?? 0,
      four_match_winner_count: countsByDraw.get(row.id)?.four ?? 0,
      three_match_winner_count: countsByDraw.get(row.id)?.three ?? 0,
    })),
  });
}
