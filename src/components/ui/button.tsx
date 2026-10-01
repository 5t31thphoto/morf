import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "outline" | "danger";

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }
>(function Button({ className, variant = "primary", ...props }, ref) {
  const styles: Record<Variant, string> = {
    primary: "bg-fg text-bg hover:bg-fg/90",
    ghost: "bg-transparent text-fg hover:bg-raised",
    outline: "border border-line bg-transparent text-fg hover:bg-raised",
    danger: "bg-fault/15 text-fault hover:bg-fault/25",
  };
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-sm px-4 text-sm font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
});
