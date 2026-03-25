import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { upsertScoreAction } from "@/features/scores/actions";
import { updateCharityPreferenceAction } from "@/features/profile/actions";
import { getLatestSubscriptionForUser } from "@/lib/subscriptions/status";
import { WinnerProofForm } from "@/features/winners/winner-proof-form";
import { WINNER_PROOF_BUCKET } from "@/features/winners/constants";

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

  const drawById = new Map((drawRows ?? []).map((draw) => [draw.id, draw]));

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
    <div className="grid gap-5 md:grid-cols-2">
      {diagnostics.length > 0 ? (
        <Card className="md:col-span-2 bg-[color-mix(in_srgb,var(--warning)_14%,white)]">
          <p className="font-data text-xs uppercase tracking-[0.12em] text-on-surface">Data Diagnostics</p>
          <ul className="mt-3 list-disc pl-5 text-sm text-on-surface">
            {diagnostics.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      {!subscriptionState.hasAccess ? (
        <Card className="md:col-span-2 bg-[color-mix(in_srgb,var(--primary)_9%,white)]">
          <p className="font-data text-xs uppercase tracking-[0.12em] text-on-surface">Membership Required</p>
          <p className="mt-2 text-sm text-on-surface">
            Activate subscription to enter draws with your latest five scores and unlock payout eligibility.
          </p>
          <div className="mt-4">
            <Link href="/subscribe">
              <Button>Subscribe Now</Button>
            </Link>
          </div>
        </Card>
      ) : null}

      <Card>
        <p className="text-sm text-muted">Subscription</p>
        <p className="font-data mt-3 text-2xl text-on-surface">{subscription?.status ?? "inactive"}</p>
        <p className="mt-2 text-sm text-muted">
          Renewal: {subscription?.current_period_end ? new Date(subscription.current_period_end).toDateString() : "N/A"}
        </p>
      </Card>

      <Card>
        <p className="text-sm text-muted">Member</p>
        <p className="mt-3 text-2xl font-display tracking-[-0.02em]">{profile?.full_name ?? user.email}</p>
        <p className="mt-2 text-sm text-muted">Participation, scores, and charity preferences are all managed here.</p>
      </Card>

      <Card>
        <p className="text-sm text-muted">Upcoming Draw</p>
        {upcomingDraw ? (
          <>
            <p className="mt-3 text-xl font-display tracking-[-0.02em] text-on-surface">{upcomingDraw.title}</p>
            <p className="mt-2 text-sm text-muted">
              {new Date(upcomingDraw.draw_month).toDateString()} · {upcomingDraw.status.toUpperCase()} · {upcomingDraw.logic_mode.toUpperCase()}
            </p>
            <p className="font-data mt-3 text-xs text-on-surface">
              Pools: 5-M {formatMoney(upcomingDraw.five_match_pool)} / 4-M {formatMoney(upcomingDraw.four_match_pool)} / 3-M {formatMoney(upcomingDraw.three_match_pool)}
            </p>
          </>
        ) : (
          <p className="mt-3 text-sm text-muted">No upcoming draft/simulated draw at the moment.</p>
        )}
      </Card>

      <Card>
        <p className="text-sm text-muted">Participation Summary</p>
        <p className="font-data mt-3 text-2xl text-on-surface">{totals.drawsEntered}</p>
        <p className="mt-2 text-sm text-muted">Draw entries recorded for this account.</p>
        <p className="mt-3 text-xs text-muted font-data">3-Match {totals.threeMatches} · 4-Match {totals.fourMatches} · 5-Match {totals.fiveMatches}</p>
      </Card>

      <Card>
        <p className="text-sm text-muted">Winnings</p>
        <p className="font-data mt-3 text-2xl text-on-surface">{formatMoney(totals.totalWon)}</p>
        <p className="mt-2 text-xs text-muted font-data">
          Paid {formatMoney(totals.totalPaid)} · Pending {formatMoney(totals.totalPending)}
        </p>
      </Card>

      <Card className="md:col-span-2">
        <h2 className="font-display text-2xl font-bold tracking-[-0.02em]">Participation History</h2>
        <div className="mt-4 space-y-2">
          {participants.map((row) => {
            const draw = drawById.get(row.draw_id);
            return (
              <div key={row.id} className="surface-mid rounded-2xl p-3">
                <p className="font-semibold text-on-surface">{draw?.title ?? "Draw"}</p>
                <p className="mt-1 text-xs text-muted">
                  {draw?.draw_month ? new Date(draw.draw_month).toDateString() : "Unknown date"} ·
                  Tier {row.prize_tier.replace("_", " ").toUpperCase()} · Match count {row.match_count}
                </p>
                <p className="mt-1 text-xs text-muted font-data">Prize projection {formatMoney(row.prize_amount)}</p>
              </div>
            );
          })}
          {participants.length === 0 ? <p className="text-sm text-muted">No participation records yet.</p> : null}
        </div>
      </Card>

      <Card className="md:col-span-2">
        <h2 className="font-display text-2xl font-bold tracking-[-0.02em]">Winnings Detail</h2>
        <div className="mt-4 space-y-3">
          {winnersWithProof.map((winner) => {
            const draw = drawById.get(winner.draw_id);
            return (
              <div key={winner.id} className="surface-mid rounded-2xl p-3">
                <p className="font-semibold text-on-surface">{draw?.title ?? "Draw"}</p>
                <p className="mt-1 text-xs text-muted">
                  {winner.prize_tier.replace("_", " ").toUpperCase()} · Verification {winner.verification_status.toUpperCase()} · Payment {winner.payment_status.toUpperCase()}
                </p>
                <p className="mt-1 text-xs text-muted font-data">
                  Amount {formatMoney(winner.prize_amount)}
                  {winner.payment_reference ? ` · Ref ${winner.payment_reference}` : ""}
                </p>

                {winner.proofLink ? (
                  <a href={winner.proofLink} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold text-[var(--primary)]">
                    Open uploaded PDF proof
                  </a>
                ) : (
                  <p className="mt-2 text-xs text-muted">No proof uploaded yet.</p>
                )}

                {winner.verification_status === "pending" ? <WinnerProofForm winnerId={winner.id} /> : null}
              </div>
            );
          })}

          {winnersWithProof.length === 0 ? <p className="text-sm text-muted">No winner records yet.</p> : null}
        </div>
      </Card>

      <Card className="md:col-span-2">
        <h2 className="font-display text-2xl font-bold tracking-[-0.02em]">Add Golf Score</h2>
        <form action={upsertScoreAction} className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div>
            <label htmlFor="score" className="mb-2 block text-sm text-muted">
              Stableford score (1-45)
            </label>
            <Input id="score" name="score" type="number" min={1} max={45} required mono />
          </div>
          <div>
            <label htmlFor="scoreDate" className="mb-2 block text-sm text-muted">
              Date
            </label>
            <Input id="scoreDate" name="scoreDate" type="date" required mono />
          </div>
          <Button type="submit" disabled={!subscriptionState.hasAccess}>
            {subscriptionState.hasAccess ? "Save Score" : "Subscription Required"}
          </Button>
        </form>

        <div className="mt-5 grid gap-2 md:grid-cols-5">
          {scores.map((score) => (
            <div key={score.id} className="surface-mid rounded-2xl p-3">
              <p className="font-data text-lg">{score.score}</p>
              <p className="mt-1 text-xs text-muted">{new Date(score.score_date).toDateString()}</p>
            </div>
          ))}
          {scores.length === 0 ? <p className="text-sm text-muted md:col-span-5">No scores saved yet.</p> : null}
        </div>
      </Card>

      <Card className="md:col-span-2">
        <h2 className="font-display text-2xl font-bold tracking-[-0.02em]">Charity Preference</h2>
        <form action={updateCharityPreferenceAction} className="mt-4 grid gap-3 md:grid-cols-[2fr_1fr_auto] md:items-end">
          <div>
            <label htmlFor="charityId" className="mb-2 block text-sm text-muted">
              Charity
            </label>
            <select
              id="charityId"
              name="charityId"
              defaultValue={profile?.charity_id ?? ""}
              className="h-[46px] w-full rounded-2xl bg-[var(--surface-container-high)] px-4 text-sm text-on-surface outline-none focus:ring-2 focus:ring-[var(--secondary)]"
              required
            >
              <option value="" disabled>
                Select a charity
              </option>
              {charities.map((charity) => (
                <option key={charity.id} value={charity.id}>
                  {charity.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="contributionPercentage" className="mb-2 block text-sm text-muted">
              Contribution %
            </label>
            <Input
              id="contributionPercentage"
              name="contributionPercentage"
              type="number"
              min={10}
              max={100}
              defaultValue={profile?.charity_contribution_percentage ?? 10}
              required
              mono
            />
          </div>
          <Button type="submit">Update</Button>
        </form>
      </Card>
    </div>
  );
}