import Link from "next/link";
import { SignupForm } from "@/features/auth/signup-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SignupPage() {
  const supabase = await createSupabaseServerClient();

  const { data: charities } = await supabase
    .from("charities")
    .select("id, name")
    .eq("is_active", true)
    .eq("is_published", true)
    .order("name", { ascending: true });

  return (
    <section>
      <p className="font-data text-xs uppercase tracking-[0.16em] text-muted">Join Precision Philanthropy</p>
      <h1 className="font-display mt-3 text-3xl font-bold tracking-[-0.02em] text-on-surface">Create your account</h1>
      <p className="mt-2 text-sm text-muted">Start your subscription journey and direct your impact with every score.</p>

      <div className="mt-6">
        <SignupForm charities={charities ?? []} />
      </div>

      <p className="mt-6 text-sm text-muted">
        Already registered? <Link href="/login" className="font-semibold text-[var(--primary)]">Sign in</Link>
      </p>
    </section>
  );
}
