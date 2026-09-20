import { UserRound } from "lucide-react";
import GlassCard from "./GlassCard";

const TIER_STYLES = {
  platinum: "text-cyan-300 bg-cyan-500/15 border-cyan-500/30",
  gold: "text-amber-300 bg-amber-500/15 border-amber-500/30",
  silver: "text-slate-300 bg-slate-400/15 border-slate-400/30",
};

export default function CustomerCard({ customer, compact = false }) {
  if (!customer) return null;
  const tierStyle = TIER_STYLES[customer.loyaltyTier?.toLowerCase()] || TIER_STYLES.silver;

  return (
    <GlassCard className={compact ? "p-4" : "p-6"}>
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-violet-500/15 text-violet-300">
          <UserRound size={20} />
        </div>
        <div>
          <p className="font-semibold text-white/90">{customer.name}</p>
          <span
            className={`mt-1 inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${tierStyle}`}
          >
            {customer.loyaltyTier} Member
          </span>
        </div>
      </div>
    </GlassCard>
  );
}
