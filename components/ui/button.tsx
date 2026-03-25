import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "hero-gradient text-white ambient-shadow hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--secondary)]",
  secondary:
    "bg-transparent text-[var(--primary)] ghost-border hover:bg-[color-mix(in_srgb,var(--primary)_8%,white)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--secondary)]",
  ghost:
    "bg-transparent text-[var(--primary)] hover:bg-[color-mix(in_srgb,var(--primary)_8%,white)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--secondary)]",
};

export function Button({ className, variant = "primary", type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-2xl px-6 py-3 text-sm font-semibold transition",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
