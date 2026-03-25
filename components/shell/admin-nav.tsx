"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const adminLinks = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/subscriptions", label: "Subscriptions" },
  { href: "/admin/scores", label: "Scores" },
  { href: "/admin/draws", label: "Draws" },
  { href: "/admin/charities", label: "Charities" },
  { href: "/admin/winners", label: "Winners" },
  { href: "/admin/analytics", label: "Analytics" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="glass-nav rounded-[1.25rem] p-2 ghost-border">
      <div className="flex flex-wrap gap-2">
        {adminLinks.map((item) => {
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-xl px-3 py-2 text-xs font-semibold transition",
                active
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--surface-container-high)] text-muted hover:text-on-surface",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}