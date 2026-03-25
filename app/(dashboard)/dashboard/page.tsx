import { requireUser } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getLatestSubscriptionForUser } from "@/lib/subscriptions/status";
import { WINNER_PROOF_BUCKET } from "@/features/winners/constants";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

function formatMoney(value: unknown) {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) {
    return "0.00";
  }

  return numberValue.toFixed(2);
}

async function buildProofLink(proofUrl: string) {
  if (proofUrl.startsWith("http://") || proofUrl.startsWith("https://")) {
    return proofUrl;
  }

  const admin = createSupabaseAdminClient();
  const { data } = await admin.storage.from(WINNER_PROOF_BUCKET).createSignedUrl(proofUrl, 60 * 15);
  return data?.signedUrl ?? null;
}

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  const [profileResult, scoresResult, charitiesResult, subscriptionState, upcomingDrawResult, participantsResult, winnersResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, charity_id, charity_contribution_percentage")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("golf_scores")
        .select("id, score, score_date")
        .eq("user_id", user.id)
        .order("score_date", { ascending: false })
        .limit(5),
      supabase
        .from("charities")
        .select("id, name")
        .eq("is_active", true)
        .eq("is_published", true)
        .order("name", { ascending: true }),
      getLatestSubscriptionForUser(supabase, user.id, { userEmail: user.email, syncFromProvider: true }),
      supabase
        .from("draws")
        .select(
          "id, title, draw_month, status, logic_mode, winner_pool, five_match_pool, four_match_pool, three_match_pool, five_match_rollover_out, draw_numbers, entry_cutoff_at",
        )
        .in("status", ["draft", "simulated"])
        .order("draw_month", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("draw_participants")
        .select("id, draw_id, match_count, prize_tier, prize_amount, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(24),
      supabase
        .from("winners")
        .select(
          "id, draw_id, prize_tier, prize_amount, verification_status, proof_url, payment_status, payment_reference, payment_paid_at, created_at",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(24),
    ]);

  const profile = profileResult.data;
  const scores = scoresResult.data ?? [];
  const charities = charitiesResult.data ?? [];
  const subscription = subscriptionState.subscription;
  const upcomingDraw = upcomingDrawResult.data;
  const participants = participantsResult.data ?? [];
  const winners = winnersResult.data ?? [];

  const drawIds = Array.from(new Set([...participants.map((row) => row.draw_id), ...winners.map((row) => row.draw_id)]));
  const { data: drawRows } = drawIds.length
    ? await supabase
      .from("draws")
      .select("id, title, draw_month, status")
      .in("id", drawIds)
    : { data: [] as Array<{ id: string; title: string; draw_month: string; status: "draft" | "simulated" | "published" }> };

  const drawById = (drawRows ?? []).reduce((acc, draw) => {
    acc[draw.id] = draw;
    return acc;
  }, {} as Record<string, any>);

  const winnersWithProof = await Promise.all(
    winners.map(async (winner) => ({
      ...winner,
      proofLink: winner.proof_url ? await buildProofLink(winner.proof_url) : null,
    })),
  );

  const totals = {
    drawsEntered: participants.length,
    threeMatches: participants.filter((row) => row.prize_tier === "three_match").length,
    fourMatches: participants.filter((row) => row.prize_tier === "four_match").length,
    fiveMatches: participants.filter((row) => row.prize_tier === "five_match").length,
    totalWon: winners.reduce((acc, winner) => acc + Number(winner.prize_amount ?? 0), 0),
    totalPaid: winners
      .filter((winner) => winner.payment_status === "paid")
      .reduce((acc, winner) => acc + Number(winner.prize_amount ?? 0), 0),
    totalPending: winners
      .filter((winner) => winner.payment_status === "pending")
      .reduce((acc, winner) => acc + Number(winner.prize_amount ?? 0), 0),
  };

  const diagnostics = [
    profileResult.error?.message,
    scoresResult.error?.message,
    charitiesResult.error?.message,
    upcomingDrawResult.error?.message,
    participantsResult.error?.message,
    winnersResult.error?.message,
    subscriptionState.error?.message,
  ].filter(Boolean) as string[];

  return (
    <DashboardClient
      profile={profile}
      scores={scores}
      charities={charities}
      subscriptionState={subscriptionState}
      upcomingDraw={upcomingDraw}
      participants={participants}
      drawsMap={drawById}
      winnersWithProof={winnersWithProof}
      totals={totals}
      diagnostics={diagnostics}
    />
  );
}