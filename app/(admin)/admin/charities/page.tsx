import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AddCharityForm } from "@/features/admin/charities/add-charity-form";
import { CharityRowActions } from "@/features/admin/charities/charity-row-actions";

export default async function AdminCharitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { q } = await searchParams;

  let query = supabase
    .from("charities")
    .select("id, name, slug, description, tags, featured, is_published, is_active, updated_at")
    .order("featured", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(80);

  if (q?.trim()) {
    query = query.or(`name.ilike.%${q.trim()}%,description.ilike.%${q.trim()}%`);
  }

  const { data: charities, error } = await query;

  return (
    <section className="grid gap-4">
      <Card>
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em]">Charities</h1>
        <p className="mt-2 text-sm text-muted">Manage publish/active/featured state and rich profile metadata.</p>

        <form className="mt-4 grid gap-2 md:grid-cols-[1fr_auto] md:items-end">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search by charity name or description"
            className="h-[46px] rounded-2xl bg-[var(--surface-container-high)] px-4 text-sm text-on-surface outline-none focus:ring-2 focus:ring-[var(--secondary)]"
          />
          <button type="submit" className="h-[46px] rounded-2xl bg-[var(--primary)] px-5 text-sm font-semibold text-white">
            Search
          </button>
        </form>
      </Card>

      <Card>
        <h2 className="font-display text-xl font-bold tracking-[-0.02em]">Add Charity</h2>
        <div className="mt-4">
          <AddCharityForm />
        </div>
      </Card>

      <Card>
        {error ? <p className="text-sm text-[var(--error)]">{error.message}</p> : null}

        <div className="space-y-3">
          {(charities ?? []).map((charity) => (
            <div key={charity.id} className="surface-mid rounded-2xl p-3">
              <p className="font-semibold text-on-surface">{charity.name}</p>
              <p className="font-data mt-1 text-xs text-muted">/{charity.slug}</p>
              <p className="mt-1 text-xs text-muted">
                {(charity.tags ?? []).length > 0 ? (charity.tags ?? []).join(", ") : "No tags"} ·
                {charity.featured ? " Featured" : " Standard"} ·
                {charity.is_published ? " Published" : " Draft"} ·
                {charity.is_active ? " Active" : " Inactive"}
              </p>
              <div className="mt-3">
                <CharityRowActions charity={charity} />
              </div>
            </div>
          ))}

          {(charities ?? []).length === 0 ? <p className="text-sm text-muted">No charities found.</p> : null}
        </div>
      </Card>
    </section>
  );
}