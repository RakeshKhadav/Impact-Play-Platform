import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "surface-feature ambient-shadow rounded-[1.5rem] p-6 text-[var(--on-surface)]",
        className,
      )}
      {...props}
    />
  );
}
