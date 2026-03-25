import type { ReactNode } from "react";
import { AppHeader } from "@/components/shell/app-header";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AppHeader />
      <main className="mx-auto w-[min(1120px,95%)] flex-1 py-8">{children}</main>
    </>
  );
}
