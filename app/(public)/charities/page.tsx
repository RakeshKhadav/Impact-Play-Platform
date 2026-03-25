import Link from "next/link";
import { Card } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function CharitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; featured?: string; tag?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { q, featured, tag } = await searchParams;

  let query = supabase
    .from("charities")
    .select("id, name, slug, description, cover_image_url, featured, tags, total_raised")
    .eq("is_active", true)
    .eq("is_published", true)
    .order("featured", { ascending: false })
    .order("name", { ascending: true })
    .limit(120);

  if (featured === "1") {
    query = query.eq("featured", true);
  }

  if (q?.trim()) {
    query = query.or(`name.ilike.%${q.trim()}%,description.ilike.%${q.trim()}%`);
  }

  if (tag?.trim()) {
    query = query.contains("tags", [tag.trim().toLowerCase()]);
  }

  const { data: charities, error } = await query;

  return (
    <div>
      <section className="hero-gradient rounded-[2rem] p-8 text-white">
        <p className="font-data text-sm uppercase tracking-[0.16em] text-white/80">Charity Directory</p>
        <h1 className="font-display mt-3 text-4xl font-bold tracking-[-0.02em]">Choose where your subscription gives.</h1>
        <p className="mt-3 max-w-2xl text-sm text-white/80">Search by mission keywords and filter by featured partners or tags.</p>

        <form className="mt-5 grid gap-2 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search charities"
            className="h-[46px] rounded-2xl bg-white/12 px-4 text-sm text-white outline-none placeholder:text-white/65 focus:ring-2 focus:ring-white/60"
          />
          <input
            name="tag"
            defaultValue={tag ?? ""}
            placeholder="Tag, e.g. education"
            className="h-[46px] rounded-2xl bg-white/12 px-4 text-sm text-white outline-none placeholder:text-white/65 focus:ring-2 focus:ring-white/60"
          />
          <select
            name="featured"
            defaultValue={featured ?? ""}
            className="h-[46px] rounded-2xl bg-white/12 px-4 text-sm text-white outline-none focus:ring-2 focus:ring-white/60"
          >
            <option value="">All charities</option>
            <option value="1">Featured only</option>
          </select>
          <button type="submit" className="h-[46px] rounded-2xl bg-white px-5 text-sm font-semibold text-[var(--primary)]">
            Apply
          </button>
        </form>
      </section>

      <section className="major-section-gap grid gap-4 md:grid-cols-2">
        {error ? <p className="text-sm text-[var(--error)]">{error.message}</p> : null}

        {(charities ?? []).map((charity) => (
          <Card key={charity.id}>
            <p className="text-xs uppercase tracking-[0.1em] text-muted">{charity.featured ? "Featured" : "Partner"}</p>
            <h2 className="font-display mt-2 text-2xl font-bold tracking-[-0.02em]">{charity.name}</h2>
            <p className="mt-3 text-sm text-muted">{charity.description ?? "Profile details coming soon."}</p>
            {(charity.tags ?? []).length > 0 ? (
              <p className="mt-3 text-xs text-muted">Tags: {(charity.tags ?? []).join(", ")}</p>
            ) : null}
            <p className="font-data mt-3 text-sm text-on-surface">Raised: ${Number(charity.total_raised).toLocaleString()}</p>
            <div className="mt-4">
              <Link href={`/charities/${charity.slug}`} className="text-sm font-semibold text-[var(--primary)]">
                View full profile
              </Link>
            </div>
          </Card>
        ))}
      </section>

      {(charities ?? []).length === 0 ? (
        <section className="major-section-gap">
          <Card>
            <p className="text-sm text-muted">No charities matched your filters. Try a broader search.</p>
          </Card>
        </section>
      ) : null}
    </div>
  );
}