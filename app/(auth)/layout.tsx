import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto grid min-h-screen w-[min(500px,92%)] place-items-center py-12">
      <div className="surface-feature ambient-shadow w-full rounded-[1.75rem] p-8">{children}</div>
    </main>
  );
}
