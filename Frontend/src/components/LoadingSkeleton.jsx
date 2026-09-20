const VARIANTS = {
  card: "h-40 w-full",
  line: "h-3.5 w-full",
  stat: "h-16 w-full",
};

export default function LoadingSkeleton({ variant = "card", lines = 3, className = "" }) {
  if (variant === "line") {
    return (
      <div role="status" aria-busy="true" aria-label="Loading" className={`space-y-2.5 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`animate-pulse rounded-lg bg-white/8 ${VARIANTS.line}`}
            style={{ width: i === lines - 1 ? "60%" : "100%" }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading"
      className={`glass animate-pulse rounded-2xl ${VARIANTS[variant] || VARIANTS.card} ${className}`}
    />
  );
}
