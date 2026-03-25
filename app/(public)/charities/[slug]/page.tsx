import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type EventItem = {
  title?: string;
  date?: string;
  location?: string;
  note?: string;
};

function normalizeEvents(value: unknown): EventItem[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter((item) => item && typeof item === "object") as EventItem[];
  }

  if (typeof value === "object") {
    return [value as EventItem];
  }

  return [];
}

export default async function CharityProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: charity, error } = await supabase
    .from("charities")
    .select(
      "id, name, slug, description, logo_url, cover_image_url, website_url, featured, tags, total_raised, upcoming_events",
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .eq("is_published", true)
    .maybeSingle();

  if (error || !charity) {
    notFound();
  }

  const events = normalizeEvents(charity.upcoming_events);

  return (
    <div>
      <section className="hero-gradient rounded-[2rem] p-8 text-white">
        <p className="font-data text-xs uppercase tracking-[0.16em] text-white/80">
          {charity.featured ? "Featured Partner" : "Partner Charity"}
        </p>
        <h1 className="font-display mt-3 text-4xl font-bold tracking-[-0.02em]">{charity.name}</h1>
        <p className="font-data mt-3 text-sm">Total raised: ${Number(charity.total_raised).toLocaleString()}</p>
        {(charity.tags ?? []).length > 0 ? <p className="mt-2 text-sm text-white/80">Tags: {(charity.tags ?? []).join(", ")}</p> : null}
      </section>

      <section className="major-section-gap grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <h2 className="font-display text-2xl font-bold tracking-[-0.02em]">About</h2>
          <p className="mt-3 text-sm text-muted">{charity.description ?? "Detailed mission profile coming soon."}</p>
          {charity.website_url ? (
            <a
              href={charity.website_url}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block text-sm font-semibold text-[var(--primary)]"
            >
              Visit official website
            </a>
          ) : null}
        </Card>

        <Card>
          <h2 className="font-display text-xl font-bold tracking-[-0.02em]">Upcoming Events</h2>
          <div className="mt-3 space-y-3">
            {events.length > 0 ? (
              events.map((event, index) => (
                <div key={`${event.title ?? "event"}-${index}`} className="surface-mid rounded-2xl p-3">
                  <p className="text-sm font-semibold text-on-surface">{event.title ?? "Community event"}</p>
                  <p className="mt-1 text-xs text-muted">
                    {event.date ?? "Date TBA"}
                    {event.location ? ` · ${event.location}` : ""}
                  </p>
                  {event.note ? <p className="mt-1 text-xs text-muted">{event.note}</p> : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted">No events published yet.</p>
            )}
          </div>
        </Card>
      </section>

      <section className="major-section-gap">
        <Link href="/charities" className="text-sm font-semibold text-[var(--primary)]">
          Back to directory
        </Link>
      </section>
    </div>
  );
}
