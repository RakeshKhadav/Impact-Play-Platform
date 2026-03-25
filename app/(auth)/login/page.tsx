import Link from "next/link";
import { LoginForm } from "@/features/auth/login-form";

export default function LoginPage() {
  return (
    <section>
      <p className="font-data text-xs uppercase tracking-[0.16em] text-muted">Subscriber Access</p>
      <h1 className="font-display mt-3 text-3xl font-bold tracking-[-0.02em] text-on-surface">Welcome back</h1>
      <p className="mt-2 text-sm text-muted">Sign in to manage your scores, draw entries, and impact settings.</p>

      <div className="mt-6">
        <LoginForm />
      </div>

      <p className="mt-6 text-sm text-muted">
        New to the platform? <Link href="/signup" className="font-semibold text-[var(--primary)]">Create an account</Link>
      </p>
    </section>
  );
}
