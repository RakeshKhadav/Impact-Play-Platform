import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { AddCharityForm } from "@/features/admin/charities/add-charity-form";
import { CreateDrawForm } from "@/features/admin/draws/create-draw-form";
import { DrawRowActions } from "@/features/admin/draws/draw-row-actions";
import { WINNER_PROOF_BUCKET } from "@/features/winners/constants";

function formatMoney(value: unknown) {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) {
    return "0.00";
  }

  return numberValue.toFixed(2);
}

export default async function AdminPage() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();

  const [
    { count: userCount },
    { count: charityCount },
    { count: drawCount },
    { count: activeSubscriberCount },
    { count: pendingWinnerCount },
    { data: draws },
    { data: pendingWinners },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("charities").select("id", { count: "exact", head: true }),
    supabase.from("draws").select("id", { count: "exact", head: true }),
    supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("winners").select("id", { count: "exact", head: true }).eq("verification_status", "pending"),
    supabase
      .from("draws")
      .select(
        "id, draw_month, title, status, logic_mode, weighted_seed, winner_pool, five_match_pool, four_match_pool, three_match_pool, five_match_rollover_out, eligible_count",
      )
      .order("draw_month", { ascending: false })
      .limit(6),
    supabase
      .from("winners")
      .select("id, draw_id, user_id, prize_tier, prize_amount, verification_status, payment_status, proof_url, created_at")
      .eq("verification_status", "pending")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const pendingWinnerUserIds = Array.from(new Set((pendingWinners ?? []).map((winner) => winner.user_id)));
  const { data: pendingWinnerProfiles } = pendingWinnerUserIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", pendingWinnerUserIds)
    : { data: [] as Array<{ id: string; full_name: string | null; email: string }> };

  const profileById = new Map((pendingWinnerProfiles ?? []).map((profile) => [profile.id, profile]));
  const admin = createSupabaseAdminClient();

  const pendingWinnerLinks = await Promise.all(
    (pendingWinners ?? []).map(async (winner) => {
      let proofLink: string | null = null;

      if (winner.proof_url) {
        if (winner.proof_url.startsWith("http://") || winner.proof_url.startsWith("https://")) {
          proofLink = winner.proof_url;
        } else {
          const { data } = await admin.storage.from(WINNER_PROOF_BUCKET).createSignedUrl(winner.proof_url, 60 * 15);
          proofLink = data?.signedUrl ?? null;
        }
      }

      return {
        ...winner,
        proofLink,
      };
    }),
  );

  return (
    <section className="grid gap-4 md:grid-cols-4">
      <Card>
        <p className="text-sm text-muted">Users</p>
        <p className="font-data mt-3 text-3xl">{userCount ?? 0}</p>
      </Card>
      <Card>
        <p className="text-sm text-muted">Active Subscribers</p>
        <p className="font-data mt-3 text-3xl">{activeSubscriberCount ?? 0}</p>
      </Card>
      <Card>
        <p className="text-sm text-muted">Charities</p>
        <p className="font-data mt-3 text-3xl">{charityCount ?? 0}</p>
      </Card>
      <Card>
        <p className="text-sm text-muted">Pending Verifications</p>
        <p className="font-data mt-3 text-3xl">{pendingWinnerCount ?? 0}</p>
      </Card>

      <Card className="md:col-span-2">
        <h2 className="font-display text-2xl font-bold tracking-[-0.02em]">Create Draw</h2>
        <p className="mt-2 text-sm text-muted">PRD tier split and rollover are auto-computed by draw engine v2.</p>
        <div className="mt-5">
          <CreateDrawForm />
        </div>
      </Card>

      <Card className="md:col-span-2">
        <h2 className="font-display text-2xl font-bold tracking-[-0.02em]">Add Charity</h2>
        <p className="mt-2 text-sm text-muted">Create a new charity and publish it to the public directory.</p>
        <div className="mt-5">
          <AddCharityForm />
        </div>
      </Card>

      <Card className="md:col-span-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-bold tracking-[-0.02em]">Recent Draws</h2>
          <Link href="/admin/draws">
            <Button variant="secondary" className="text-xs">
              Open Draw Module
            </Button>
          </Link>
        </div>

        <div className="mt-4 space-y-3">
          {(draws ?? []).length === 0 ? (
            <p className="text-sm text-muted">No draws created yet.</p>
          ) : (
            draws?.map((draw) => (
              <div key={draw.id} className="surface-mid rounded-2xl p-3">
                <p className="font-semibold text-on-surface">{draw.title}</p>
                <p className="font-data mt-1 text-xs text-muted">
                  {new Date(draw.draw_month).toDateString()} · {draw.status.toUpperCase()} · {draw.logic_mode.toUpperCase()}
                </p>
                <p className="mt-2 text-xs text-muted">
                  Winner {formatMoney(draw.winner_pool)} · 5-M {formatMoney(draw.five_match_pool)} · 4-M {formatMoney(draw.four_match_pool)} · 3-M {formatMoney(draw.three_match_pool)}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Eligible {draw.eligible_count} · Rollover Out {formatMoney(draw.five_match_rollover_out)}
                  {draw.weighted_seed ? ` · Seed ${draw.weighted_seed}` : ""}
                </p>
                <div className="mt-3">
                  <DrawRowActions
                    drawId={draw.id}
                    status={draw.status}
                    logicMode={draw.logic_mode}
                    weightedSeed={draw.weighted_seed}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="md:col-span-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-bold tracking-[-0.02em]">Winner Queue</h2>
          <Link href="/admin/winners">
            <Button variant="secondary" className="text-xs">
              Open Winner Module
            </Button>
          </Link>
        </div>

        <div className="mt-4 space-y-3">
          {pendingWinnerLinks.length === 0 ? (
            <p className="text-sm text-muted">No pending winner verification records.</p>
          ) : (
            pendingWinnerLinks.map((winner) => {
              const profile = profileById.get(winner.user_id);
              return (
                <div key={winner.id} className="surface-mid rounded-2xl p-3">
                  <p className="font-semibold text-on-surface">{profile?.full_name || profile?.email || winner.user_id}</p>
                  <p className="mt-1 text-xs text-muted">
                    {winner.prize_tier.replace("_", " ").toUpperCase()} · Prize {formatMoney(winner.prize_amount)}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {winner.verification_status.toUpperCase()} · Payment {winner.payment_status.toUpperCase()} · {new Date(winner.created_at).toDateString()}
                  </p>
                  {winner.proofLink ? (
                    <a href={winner.proofLink} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold text-[var(--primary)]">
                      Open uploaded PDF
                    </a>
                  ) : (
                    <p className="mt-2 text-xs text-muted">No proof uploaded yet.</p>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="mt-4">
          <Link href="/admin/analytics">
            <Button>Go to Analytics</Button>
          </Link>
        </div>
      </Card>

      <Card className="md:col-span-4">
        <p className="text-sm text-muted">
          Admin modules available: users, subscriptions, scores, draws, charities, winners, analytics.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/admin/users"><Button variant="secondary" className="text-xs">Users</Button></Link>
          <Link href="/admin/subscriptions"><Button variant="secondary" className="text-xs">Subscriptions</Button></Link>
          <Link href="/admin/scores"><Button variant="secondary" className="text-xs">Scores</Button></Link>
          <Link href="/admin/draws"><Button variant="secondary" className="text-xs">Draws</Button></Link>
          <Link href="/admin/charities"><Button variant="secondary" className="text-xs">Charities</Button></Link>
          <Link href="/admin/winners"><Button variant="secondary" className="text-xs">Winners</Button></Link>
          <Link href="/admin/analytics"><Button variant="secondary" className="text-xs">Analytics</Button></Link>
        </div>
      </Card>

      <Card className="md:col-span-4">
        <p className="text-sm text-muted">Total draws tracked</p>
        <p className="font-data mt-3 text-3xl">{drawCount ?? 0}</p>
      </Card>
    </section>
  );
}