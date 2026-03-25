import Link from "next/link";
import { Card } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DonationForm } from "@/features/donations/donation-form";

export default async function DonatePage() {
  const supabase = await createSupabaseServerClient();

  const { data: charities } = await supabase
    .from("charities")
    .select("id, name")
    .eq("is_active", true)
    .eq("is_published", true)
    .order("name", { ascending: true });

  return (
    <div>
      <section className="hero-gradient rounded-[2rem] p-8 text-white">
        <p className="font-data text-sm uppercase tracking-[0.16em] text-white/80">Independent Donation</p>
        <h1 className="font-display mt-3 text-4xl font-bold tracking-[-0.02em]">
          Make a direct impact.
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-white/80">
          Support any partner charity with a one-time donation. No subscription required — every contribution counts.
        </p>
      </section>

      <section className="major-section-gap grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-1">
          <h2 className="font-display text-2xl font-bold tracking-[-0.02em]">Donation Details</h2>
          <p className="mt-2 text-sm text-muted">
            Fill in the form below to record your donation. All donations are tracked and attributed to the selected charity.
          </p>
          <div className="mt-6">
            <DonationForm charities={charities ?? []} />
          </div>
        </Card>

        <Card className="md:col-span-1 surface-feature">
          <h2 className="font-display text-xl font-bold tracking-[-0.02em]">How It Works</h2>
          <ol className="mt-4 space-y-3 text-sm text-muted">
            <li>1. Choose a charity partner from the directory.</li>
            <li>2. Enter your donation amount.</li>
            <li>3. Your donation is recorded and the charity's total raised is updated instantly.</li>
          </ol>
          <div className="mt-6">
            <Link href="/charities" className="text-sm font-semibold text-[var(--primary)]">
              Browse the charity directory →
            </Link>
          </div>
        </Card>
      </section>
    </div>
  );
}
