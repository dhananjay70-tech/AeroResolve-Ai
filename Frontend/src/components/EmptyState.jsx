import { Sparkles } from "lucide-react";
import GlassCard from "./GlassCard";
import ActionButton from "./ActionButton";

export default function EmptyState({
  icon: Icon = Sparkles,
  title,
  description,
  actionLabel,
  onAction,
  className = "p-10 text-center",
}) {
  return (
    <GlassCard className={className}>
      <Icon className="mx-auto mb-3 text-violet-300" size={22} />
      <p className="font-semibold text-white/80">{title}</p>
      {description && (
        <p className="mx-auto mt-1 max-w-sm text-sm text-white/45">{description}</p>
      )}
      {actionLabel && onAction && (
        <ActionButton className="mx-auto mt-5" onClick={onAction}>
          {actionLabel}
        </ActionButton>
      )}
    </GlassCard>
  );
}
