import Link from "next/link";
import { logoutAction } from "@/features/auth/actions";

export function AppHeader({ isAdmin = false }: { isAdmin?: boolean }) {
  return (
    <header className="sticky top-0 z-40">
      <div className="glass-nav mx-auto mt-4 flex w-[min(1120px,95%)] items-center justify-between rounded-[1.5rem] px-5 py-3 ghost-border">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-display text-lg font-bold tracking-[-0.02em] text-[var(--on-surface)]">
            Precision Philanthropy
          </Link>
          <span className="rounded-full bg-[var(--surface-container-high)] px-3 py-1 font-data text-xs text-muted">
            {isAdmin ? "ADMIN" : "MEMBER"}
          </span>
        </div>

        <nav className="flex items-center gap-3 text-sm">
          <Link href={isAdmin ? "/admin" : "/dashboard"} className="text-muted hover:text-[var(--on-surface)]">
            Dashboard
          </Link>
          {!isAdmin ? (
            <Link href="/subscribe" className="text-muted hover:text-[var(--on-surface)]">
              Subscribe
            </Link>
          ) : null}
          <Link href="/charities" className="text-muted hover:text-[var(--on-surface)]">
            Charities
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-2xl bg-[var(--surface-container-high)] px-3 py-2 font-semibold text-[var(--on-surface)] transition hover:bg-[var(--surface-container-highest)]"
            >
              Logout
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
