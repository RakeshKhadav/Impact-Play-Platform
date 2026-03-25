import Link from "next/link";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40">
      <div className="glass-nav mx-auto mt-4 flex w-[min(1120px,95%)] items-center justify-between rounded-[1.5rem] px-5 py-3 ghost-border">
        <Link href="/" className="font-display text-lg font-bold tracking-[-0.02em] text-[var(--on-surface)]">
          Precision Philanthropy
        </Link>
        <nav className="flex items-center gap-4 text-sm text-muted">
          <Link href="/charities" className="hover:text-[var(--on-surface)]">
            Charities
          </Link>
          <Link href="/donate" className="hover:text-[var(--on-surface)]">
            Donate
          </Link>
          <Link href="/login" className="hover:text-[var(--on-surface)]">
            Login
          </Link>
          <Link
            href="/signup"
            className="rounded-2xl bg-[var(--primary)] px-4 py-2 font-semibold text-white transition hover:brightness-110"
          >
            Subscribe
          </Link>
        </nav>
      </div>
    </header>
  );
}
