import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import GlassCard from "./GlassCard";

export default function ResolutionCard({
  icon: Icon,
  title,
  description,
  status,
  ctaLabel = "Continue",
  onAction,
  loading = false,
  disabled = false,
}) {
  return (
    <GlassCard tilt className="flex h-full flex-col justify-between p-5">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/15 text-blue-300">
            <Icon size={18} />
          </div>
          {status && (
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
              {status}
            </span>
          )}
        </div>
        <p className="mt-4 font-bold text-white/90">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-white/55">{description}</p>
      </div>

      {onAction && (
        <motion.button
          whileHover={disabled ? undefined : { x: 3 }}
          onClick={onAction}
          disabled={disabled || loading}
          className="mt-5 flex items-center gap-1.5 text-sm font-semibold text-violet-300 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
        >
          {loading ? "Processing…" : ctaLabel}
          {!loading && <ArrowRight size={15} />}
        </motion.button>
      )}
    </GlassCard>
  );
}
