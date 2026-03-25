import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function formatMoney(value: unknown) {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) {
    return "0";
  }

  return numberValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();

  const [
    { count: activeSubscribers },
    { count: charityPartners },
    { data: latestPublishedDraw },
    { data: featuredCharities },
  ] = await Promise.all([
    supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("charities").select("id", { count: "exact", head: true }).eq("is_active", true).eq("is_published", true),
    supabase
      .from("draws")
      .select("id, title, draw_month, charity_pool, winner_pool")
      .eq("status", "published")
      .order("draw_month", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("charities")
      .select("id, name, slug, description, tags")
      .eq("is_active", true)
      .eq("is_published", true)
      .eq("featured", true)
      .order("updated_at", { ascending: false })
      .limit(3),
  ]);

  const metrics = [
    { label: "Latest Charity Pool", value: `$${formatMoney(latestPublishedDraw?.charity_pool ?? 0)}` },
    { label: "Active Subscribers", value: String(activeSubscribers ?? 0) },
    { label: "Charity Partners", value: String(charityPartners ?? 0) },
  ];

  return (
    <div>
      <section className="hero-gradient overflow-hidden rounded-[2rem] p-8 text-white ambient-shadow md:p-12">
        <p className="font-data text-sm uppercase tracking-[0.16em] text-white/80">Impact Engine</p>
        <h1 className="font-display mt-3 max-w-3xl text-4xl font-bold tracking-[-0.02em] md:text-6xl">
          Where every score funds change.
        </h1>
        <p className="mt-5 max-w-2xl text-base text-white/85 md:text-lg">
          Precision Philanthropy combines score tracking, PRD-tiered monthly draws, and transparent contribution flows in one premium platform.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/signup">
            <Button className="bg-white text-[var(--primary)] hover:brightness-95">Start Subscription</Button>
          </Link>
          <Link href="/charities">
            <Button variant="secondary" className="border-white/35 text-white hover:bg-white/10">
              Explore Charities
            </Button>
          </Link>
        </div>
      </section>

      <section className="major-section-gap grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.label} className="surface-feature">
            <p className="text-sm text-muted">{metric.label}</p>
            <p className="font-data mt-3 text-3xl font-medium text-on-surface">{metric.value}</p>
          </Card>
        ))}
      </section>

      <section className="major-section-gap grid gap-6 md:grid-cols-2">
        <Card className="surface-feature p-8">
          <h2 className="font-display text-2xl font-bold tracking-[-0.02em]">How it works</h2>
          <ol className="mt-5 space-y-3 text-sm text-muted">
            <li>1. Subscribe monthly or yearly.</li>
            <li>2. Keep your latest five Stableford scores updated.</li>
            <li>3. Enter tiered monthly draws while funding your selected charity.</li>
          </ol>
          {latestPublishedDraw ? (
            <p className="mt-5 text-xs text-muted font-data">
              Latest published draw: {latestPublishedDraw.title} · Winner pool ${formatMoney(latestPublishedDraw.winner_pool)}
            </p>
          ) : null}
        </Card>

        <Card className="surface-mid p-8">
          <h2 className="font-display text-2xl font-bold tracking-[-0.02em]">Featured Spotlights</h2>
          <div className="mt-4 space-y-3">
            {(featuredCharities ?? []).length === 0 ? (
              <p className="text-sm text-muted">Featured charities will appear here after admin publishing.</p>
            ) : (
              featuredCharities?.map((charity) => (
                <div key={charity.id} className="rounded-2xl bg-[var(--surface-container-lowest)] p-3">
                  <p className="font-semibold text-on-surface">{charity.name}</p>
                  <p className="mt-1 text-xs text-muted">{charity.description?.slice(0, 130) ?? "Partner profile"}</p>
                  {(charity.tags ?? []).length > 0 ? (
                    <p className="mt-1 text-xs text-muted">{(charity.tags ?? []).join(", ")}</p>
                  ) : null}
                  <Link href={`/charities/${charity.slug}`} className="mt-2 inline-block text-xs font-semibold text-[var(--primary)]">
                    Open profile
                  </Link>
                </div>
              ))
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
