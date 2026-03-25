import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function toPage(value: string | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return Math.floor(parsed);
}

function toPageSize(value: string | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 20;
  }

  return Math.max(1, Math.min(100, Math.floor(parsed)));
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const page = toPage(url.searchParams.get("page"));
  const pageSize = toPageSize(url.searchParams.get("pageSize"));
  const verification = url.searchParams.get("verification");
  const payment = url.searchParams.get("payment");

  let query = supabase
    .from("winners")
    .select(
      "id, draw_id, user_id, prize_tier, prize_amount, verification_status, payment_status, proof_url, created_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (verification === "pending" || verification === "approved" || verification === "rejected") {
    query = query.eq("verification_status", verification);
  }

  if (payment === "pending" || payment === "paid") {
    query = query.eq("payment_status", payment);
  }

  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;

  const { data, error, count } = await query.range(start, end);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data,
    paging: {
      page,
      pageSize,
      total: count ?? 0,
    },
  });
}
