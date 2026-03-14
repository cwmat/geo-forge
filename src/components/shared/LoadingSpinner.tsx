interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  label?: string;
}

const sizes = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-10 w-10",
};

export function LoadingSpinner({ size = "md", label }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`${sizes[size]} animate-spin rounded-full border-2 border-surface-3 border-t-accent`}
      />
      {label && <span className="text-sm text-text-secondary">{label}</span>}
    </div>
  );
}
