import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createSupabaseServerClient();

  const { data: draw, error: drawError } = await supabase
    .from("draws")
    .select(
      "id, draw_month, title, status, logic_mode, draw_numbers, winner_pool, five_match_pool, four_match_pool, three_match_pool, five_match_rollover_in, five_match_rollover_out, published_at, eligible_count",
    )
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  if (drawError) {
    return NextResponse.json({ error: drawError.message }, { status: 500 });
  }

  if (!draw) {
    return NextResponse.json({ error: "Draw not found." }, { status: 404 });
  }

  const { data: participants, error: participantError } = await supabase
    .from("draw_participants")
    .select("id, user_id, match_count, prize_tier, prize_amount")
    .eq("draw_id", draw.id)
    .neq("prize_tier", "none")
    .order("prize_amount", { ascending: false });

  if (participantError) {
    return NextResponse.json({ error: participantError.message }, { status: 500 });
  }

  return NextResponse.json({
    data: {
      draw,
      participants,
    },
  });
}
