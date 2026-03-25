import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  mono?: boolean;
};

export function Input({ className, mono = false, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "w-full rounded-2xl bg-[var(--surface-container-high)] px-4 py-3 text-sm text-[var(--on-surface)] outline-none ring-0 transition focus:border-transparent focus:ring-2 focus:ring-[var(--secondary)]",
        mono && "font-data",
        className,
      )}
      {...props}
    />
  );
}
