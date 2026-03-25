import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { WinnerRowActions } from "@/features/admin/winners/winner-row-actions";
import { WINNER_PROOF_BUCKET } from "@/features/winners/constants";

function formatMoney(value: unknown) {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) {
    return "0.00";
  }

  return numberValue.toFixed(2);
}

export default async function AdminWinnersPage({
  searchParams,
}: {
  searchParams: Promise<{ verification?: string; payment?: string }>;
}) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { verification, payment } = await searchParams;

  let query = supabase
    .from("winners")
    .select(
      "id, draw_id, user_id, prize_tier, prize_amount, verification_status, verification_notes, payment_status, payment_reference, payment_paid_at, proof_url, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(120);

  if (verification === "pending" || verification === "approved" || verification === "rejected") {
    query = query.eq("verification_status", verification);
  }

  if (payment === "pending" || payment === "paid") {
    query = query.eq("payment_status", payment);
  }

  const { data: winners, error } = await query;

  const drawIds = Array.from(new Set((winners ?? []).map((winner) => winner.draw_id)));
  const userIds = Array.from(new Set((winners ?? []).map((winner) => winner.user_id)));

  const [{ data: draws }, { data: profiles }] = await Promise.all([
    drawIds.length
      ? supabase.from("draws").select("id, title, draw_month").in("id", drawIds)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string; draw_month: string }> }),
    userIds.length
      ? supabase.from("profiles").select("id, full_name, email").in("id", userIds)
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null; email: string }> }),
  ]);

  const drawById = new Map((draws ?? []).map((draw) => [draw.id, draw]));
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const admin = createSupabaseAdminClient();

  const rows = await Promise.all(
    (winners ?? []).map(async (winner) => {
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
    <section className="grid gap-4">
      <Card>
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em]">Winners</h1>
        <p className="mt-2 text-sm text-muted">Review verification queue and complete payout operations.</p>

        <form className="mt-4 grid gap-2 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <select
            name="verification"
            defaultValue={verification ?? ""}
            className="h-[46px] rounded-2xl bg-[var(--surface-container-high)] px-4 text-sm text-on-surface outline-none focus:ring-2 focus:ring-[var(--secondary)]"
          >
            <option value="">All verification states</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            name="payment"
            defaultValue={payment ?? ""}
            className="h-[46px] rounded-2xl bg-[var(--surface-container-high)] px-4 text-sm text-on-surface outline-none focus:ring-2 focus:ring-[var(--secondary)]"
          >
            <option value="">All payment states</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
          </select>
          <button type="submit" className="h-[46px] rounded-2xl bg-[var(--primary)] px-5 text-sm font-semibold text-white">
            Apply
          </button>
        </form>
      </Card>

      <Card>
        {error ? <p className="text-sm text-[var(--error)]">{error.message}</p> : null}

        <div className="space-y-3">
          {rows.map((winner) => {
            const draw = drawById.get(winner.draw_id);
            const profile = profileById.get(winner.user_id);

            return (
              <div key={winner.id} className="surface-mid rounded-2xl p-3">
                <p className="font-semibold text-on-surface">{profile?.full_name || profile?.email || winner.user_id}</p>
                <p className="mt-1 text-xs text-muted">
                  {draw?.title ?? winner.draw_id} · {winner.prize_tier.replace("_", " ").toUpperCase()} · Prize {formatMoney(winner.prize_amount)}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Verification {winner.verification_status.toUpperCase()} · Payment {winner.payment_status.toUpperCase()}
                </p>
                {winner.payment_reference ? (
                  <p className="mt-1 text-xs text-muted font-data">Payment ref: {winner.payment_reference}</p>
                ) : null}
                {winner.proofLink ? (
                  <a href={winner.proofLink} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold text-[var(--primary)]">
                    Open uploaded PDF
                  </a>
                ) : (
                  <p className="mt-2 text-xs text-muted">No uploaded proof yet.</p>
                )}

                <div className="mt-3">
                  <WinnerRowActions winner={winner} />
                </div>
              </div>
            );
          })}

          {rows.length === 0 ? <p className="text-sm text-muted">No winner records found.</p> : null}
        </div>
      </Card>
    </section>
  );
}