import { RefreshCw } from "lucide-react";
import GlassCard from "./GlassCard";
import ActionButton from "./ActionButton";

export default function ErrorState({
  title = "Unable to load this right now.",
  message,
  onRetry,
  retryLabel = "Try Again",
  className = "p-8 text-center",
}) {
  return (
    <GlassCard className={className}>
      <p className="text-white/70">{title}</p>
      {message && <p className="mt-1 text-sm text-white/40">{message}</p>}
      {onRetry && (
        <ActionButton icon={RefreshCw} variant="secondary" className="mx-auto mt-5" onClick={onRetry}>
          {retryLabel}
        </ActionButton>
      )}
    </GlassCard>
  );
}
