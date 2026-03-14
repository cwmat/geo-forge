import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
  children: ReactNode;
}

const variantStyles = {
  primary: "bg-accent text-surface-0 hover:bg-accent-hover font-medium",
  secondary: "border border-border bg-surface-2 text-text-primary hover:bg-surface-3",
  ghost: "text-text-secondary hover:bg-surface-2 hover:text-text-primary",
};

const sizeStyles = {
  sm: "px-2 py-1 text-xs",
  md: "px-3 py-1.5 text-sm",
};

export function Button({
  variant = "secondary",
  size = "sm",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center gap-1.5 rounded transition-colors ${variantStyles[variant]} ${sizeStyles[size]} ${className} disabled:pointer-events-none disabled:opacity-50`}
      {...props}
    >
      {children}
    </button>
  );
}
