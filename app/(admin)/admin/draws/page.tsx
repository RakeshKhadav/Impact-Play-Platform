import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CreateDrawForm } from "@/features/admin/draws/create-draw-form";
import { DrawRowActions } from "@/features/admin/draws/draw-row-actions";

function formatMoney(value: unknown) {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) {
    return "0.00";
  }

  return numberValue.toFixed(2);
}

export default async function AdminDrawsPage() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();

  const { data: draws, error } = await supabase
    .from("draws")
    .select(
      "id, draw_month, title, status, logic_mode, weighted_seed, draw_numbers, winner_pool, five_match_pool, four_match_pool, three_match_pool, five_match_rollover_in, five_match_rollover_out, eligible_count, active_subscriber_count_snapshot, simulated_at, published_at",
    )
    .order("draw_month", { ascending: false })
    .limit(36);

  const drawIds = (draws ?? []).map((draw) => draw.id);

  const { data: participants } = drawIds.length
    ? await supabase
        .from("draw_participants")
        .select("draw_id, prize_tier")
        .in("draw_id", drawIds)
    : { data: [] as Array<{ draw_id: string; prize_tier: "none" | "three_match" | "four_match" | "five_match" }> };

  const countsByDraw = new Map<string, { three: number; four: number; five: number }>();

  for (const participant of participants ?? []) {
    const existing = countsByDraw.get(participant.draw_id) ?? { three: 0, four: 0, five: 0 };

    if (participant.prize_tier === "three_match") {
      existing.three += 1;
    }

    if (participant.prize_tier === "four_match") {
      existing.four += 1;
    }

    if (participant.prize_tier === "five_match") {
      existing.five += 1;
    }

    countsByDraw.set(participant.draw_id, existing);
  }

  return (
    <section className="grid gap-4">
      <Card>
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em]">Draws</h1>
        <p className="mt-2 text-sm text-muted">
          Configure mode, simulate participant tiers, publish outcomes, and preserve rollover semantics.
        </p>
        <div className="mt-5">
          <CreateDrawForm />
        </div>
      </Card>

      <Card>
        {error ? <p className="text-sm text-[var(--error)]">{error.message}</p> : null}

        <div className="space-y-3">
          {(draws ?? []).map((draw) => {
            const counts = countsByDraw.get(draw.id) ?? { three: 0, four: 0, five: 0 };

            return (
              <div key={draw.id} className="surface-mid rounded-2xl p-3">
                <p className="font-semibold text-on-surface">{draw.title}</p>
                <p className="font-data mt-1 text-xs text-muted">
                  {new Date(draw.draw_month).toDateString()} · {draw.status.toUpperCase()} · {draw.logic_mode.toUpperCase()}
                </p>

                <p className="mt-2 text-xs text-muted">
                  Winner pool {formatMoney(draw.winner_pool)} · 5-M {formatMoney(draw.five_match_pool)} · 4-M {formatMoney(draw.four_match_pool)} · 3-M {formatMoney(draw.three_match_pool)}
                </p>

                <p className="mt-1 text-xs text-muted">
                  Eligible {draw.eligible_count}/{draw.active_subscriber_count_snapshot} · Tier winners 5:{counts.five} 4:{counts.four} 3:{counts.three}
                </p>

                <p className="mt-1 text-xs text-muted">
                  Rollover in {formatMoney(draw.five_match_rollover_in)} · out {formatMoney(draw.five_match_rollover_out)}
                </p>

                <p className="mt-1 text-xs text-muted font-data">
                  Draw numbers: {(draw.draw_numbers ?? []).length ? draw.draw_numbers?.join(" - ") : "not simulated"}
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
            );
          })}

          {(draws ?? []).length === 0 ? <p className="text-sm text-muted">No draws found.</p> : null}
        </div>
      </Card>
    </section>
  );
}