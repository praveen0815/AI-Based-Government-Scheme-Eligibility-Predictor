import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-action text-white shadow-sm hover:bg-action-hover",
  secondary: "border border-line bg-surface text-ink-900 hover:border-[#C5CDC7] hover:bg-sage",
  ghost: "text-ink-700 hover:bg-sage hover:text-ink-900",
  danger: "border border-red-200 bg-surface text-danger hover:bg-red-50",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; children: ReactNode }) {
  return (
    <button
      className={`btn-text inline-flex min-h-12 items-center justify-center rounded-[12px] px-5 py-3.5 transition duration-150 disabled:cursor-not-allowed disabled:opacity-70 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
