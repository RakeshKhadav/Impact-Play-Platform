import { createSupabaseServerClient } from "@/lib/supabase/server";
import { HomeClient } from "@/components/landing/home-client";

function formatMoney(value: unknown) {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) return "0";
  return numberValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
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
      .select("id, title, draw_month, charity_pool, winner_pool, eligible_count")
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
      .limit(5),
  ]);

  const metrics = [
    { label: "Total Raised", value: `₹${formatMoney((latestPublishedDraw?.charity_pool ?? 0) * 12)}` }, // Simplified lifetime estimation for visual MVP
    { label: "Lives Impacted", value: (latestPublishedDraw?.eligible_count ?? 0).toLocaleString() }, // Mock impact multiplier
    { label: "Monthly Prize Pool", value: `₹${formatMoney(latestPublishedDraw?.winner_pool ?? 0)}` },
  ];

  return <HomeClient metrics={metrics} featuredCharities={featuredCharities ?? []} latestDraw={latestPublishedDraw} />;
}
