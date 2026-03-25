import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function toMoney(value: unknown) {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) {
    return "0.00";
  }

  return numberValue.toFixed(2);
}

export default async function AdminAnalyticsPage() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();

  const [
    { count: totalUsers },
    { count: activeSubscribers },
    { count: totalDraws },
    { count: publishedDraws },
    { count: pendingVerification },
    { count: pendingPayouts },
    { data: draws },
    { data: winners },
    { data: charities },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("draws").select("id", { count: "exact", head: true }),
    supabase.from("draws").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("winners").select("id", { count: "exact", head: true }).eq("verification_status", "pending"),
    supabase.from("winners").select("id", { count: "exact", head: true }).eq("payment_status", "pending"),
    supabase
      .from("draws")
      .select("winner_pool, charity_pool, five_match_rollover_out, status")
      .order("draw_month", { ascending: false })
      .limit(120),
    supabase.from("winners").select("prize_amount, payment_status").limit(3000),
    supabase.from("charities").select("total_raised").limit(200),
  ]);

  const totalWinnerPools = (draws ?? []).reduce((acc, draw) => acc + Number(draw.winner_pool ?? 0), 0);
  const totalCharityPools = (draws ?? []).reduce((acc, draw) => acc + Number(draw.charity_pool ?? 0), 0);
  const totalRolloverOut = (draws ?? []).reduce((acc, draw) => acc + Number(draw.five_match_rollover_out ?? 0), 0);

  const totalPrizes = (winners ?? []).reduce((acc, winner) => acc + Number(winner.prize_amount ?? 0), 0);
  const totalPaidPrizes = (winners ?? [])
    .filter((winner) => winner.payment_status === "paid")
    .reduce((acc, winner) => acc + Number(winner.prize_amount ?? 0), 0);

  const totalRaisedTracked = (charities ?? []).reduce((acc, charity) => acc + Number(charity.total_raised ?? 0), 0);

  return (
    <section className="grid gap-4 md:grid-cols-3">
      <Card>
        <p className="text-sm text-muted">Total users</p>
        <p className="font-data mt-3 text-3xl">{totalUsers ?? 0}</p>
      </Card>
      <Card>
        <p className="text-sm text-muted">Active subscribers</p>
        <p className="font-data mt-3 text-3xl">{activeSubscribers ?? 0}</p>
      </Card>
      <Card>
        <p className="text-sm text-muted">Published draws</p>
        <p className="font-data mt-3 text-3xl">{publishedDraws ?? 0}</p>
      </Card>

      <Card>
        <p className="text-sm text-muted">Total draws</p>
        <p className="font-data mt-3 text-3xl">{totalDraws ?? 0}</p>
      </Card>
      <Card>
        <p className="text-sm text-muted">Pending verification</p>
        <p className="font-data mt-3 text-3xl">{pendingVerification ?? 0}</p>
      </Card>
      <Card>
        <p className="text-sm text-muted">Pending payouts</p>
        <p className="font-data mt-3 text-3xl">{pendingPayouts ?? 0}</p>
      </Card>

      <Card>
        <p className="text-sm text-muted">Winner pools tracked</p>
        <p className="font-data mt-3 text-3xl">${toMoney(totalWinnerPools)}</p>
      </Card>
      <Card>
        <p className="text-sm text-muted">Charity pools tracked</p>
        <p className="font-data mt-3 text-3xl">${toMoney(totalCharityPools)}</p>
      </Card>
      <Card>
        <p className="text-sm text-muted">5-match rollover total</p>
        <p className="font-data mt-3 text-3xl">${toMoney(totalRolloverOut)}</p>
      </Card>

      <Card>
        <p className="text-sm text-muted">Total prizes</p>
        <p className="font-data mt-3 text-3xl">${toMoney(totalPrizes)}</p>
      </Card>
      <Card>
        <p className="text-sm text-muted">Paid prizes</p>
        <p className="font-data mt-3 text-3xl">${toMoney(totalPaidPrizes)}</p>
      </Card>
      <Card>
        <p className="text-sm text-muted">Charity raised tracked</p>
        <p className="font-data mt-3 text-3xl">${toMoney(totalRaisedTracked)}</p>
      </Card>
    </section>
  );
}