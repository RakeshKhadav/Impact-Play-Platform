import type { ReactNode } from "react";
import { AppHeader } from "@/components/shell/app-header";
import { AdminNav } from "@/components/shell/admin-nav";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AppHeader isAdmin />
      <main className="mx-auto w-[min(1200px,95%)] flex-1 py-8">
        <AdminNav />
        <div className="mt-4">{children}</div>
      </main>
    </>
  );
}