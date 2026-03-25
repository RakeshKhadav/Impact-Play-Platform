import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ScoreRowActions } from "@/features/admin/scores/score-row-actions";

export default async function AdminScoresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { q } = await searchParams;

  const { data: scores, error } = await supabase
    .from("golf_scores")
    .select("id, user_id, score, score_date, created_at")
    .order("score_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(120);

  const userIds = Array.from(new Set((scores ?? []).map((score) => score.user_id)));
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, email, full_name").in("id", userIds)
    : { data: [] as Array<{ id: string; email: string; full_name: string | null }> };

  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const queryText = q?.trim().toLowerCase();

  const filtered = (scores ?? []).filter((score) => {
    if (!queryText) {
      return true;
    }

    const profile = profileById.get(score.user_id);
    const haystack = `${profile?.email ?? ""} ${profile?.full_name ?? ""}`.toLowerCase();
    return haystack.includes(queryText);
  });

  return (
    <section className="grid gap-4">
      <Card>
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em]">Scores</h1>
        <p className="mt-2 text-sm text-muted">Review and correct user score history with 1-45 guardrails.</p>

        <form className="mt-4 grid gap-2 md:grid-cols-[1fr_auto] md:items-end">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search by user email or name"
            className="h-[46px] rounded-2xl bg-[var(--surface-container-high)] px-4 text-sm text-on-surface outline-none focus:ring-2 focus:ring-[var(--secondary)]"
          />
          <button type="submit" className="h-[46px] rounded-2xl bg-[var(--primary)] px-5 text-sm font-semibold text-white">
            Search
          </button>
        </form>
      </Card>

      <Card>
        {error ? <p className="text-sm text-[var(--error)]">{error.message}</p> : null}
        <div className="space-y-3">
          {filtered.map((score) => {
            const profile = profileById.get(score.user_id);

            return (
              <div key={score.id} className="surface-mid rounded-2xl p-3">
                <p className="font-semibold text-on-surface">{profile?.email ?? score.user_id}</p>
                <p className="mt-1 text-xs text-muted">
                  Stored {new Date(score.created_at).toDateString()} · Current date {new Date(score.score_date).toDateString()}
                </p>
                <div className="mt-3">
                  <ScoreRowActions scoreId={score.id} score={score.score} scoreDate={score.score_date} />
                </div>
              </div>
            );
          })}

          {filtered.length === 0 ? <p className="text-sm text-muted">No score records found.</p> : null}
        </div>
      </Card>
    </section>
  );
}