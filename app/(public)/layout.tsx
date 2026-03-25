import type { ReactNode } from "react";
import { PublicHeader } from "@/components/shell/public-header";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PublicHeader />
      <main className="mx-auto w-[min(1120px,95%)] flex-1 py-8">{children}</main>
    </>
  );
}
