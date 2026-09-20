import { motion } from "framer-motion";
import { Bot, Gauge, MapPin, ScrollText, Sparkles, Ticket } from "lucide-react";
import GlassCard from "./GlassCard";
import AgentLiveStatus from "./AgentLiveStatus";
import StatusBadge from "./StatusBadge";

function resolutionLabel(resolution, customerChooses) {
  if (!resolution) return "Analyzing";
  if (customerChooses) return "Awaiting Decision";
  if (resolution.entitlement === "NONE" || !resolution.entitlement) return "No Disruption";
  return "Support Applied";
}

// Stat chips only ever render fields that are actually present on the real
// booking/customer/resolution objects already loaded by Chat.jsx - nothing
// here is placeholder copy.
function StatChip({ icon: Icon, label, value, delay = 0 }) {
  if (!value) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      className="glass flex items-center gap-2.5 rounded-xl px-3.5 py-2.5"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300">
        <Icon size={13} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[10px] font-semibold uppercase tracking-widest text-white/35">{label}</p>
        <p className="truncate text-sm font-bold text-white/90">{value}</p>
      </div>
    </motion.div>
  );
}

// The Agent Command Center's hero: a cinematic header for the active case,
// built entirely from real data already fetched by Chat.jsx - flight/PNR
// status, loyalty tier and resolution/agent state - not placeholder copy.
export default function AgentHeader({
  customer,
  pnr,
  flight,
  resolution,
  customerChooses,
  mode,
  active,
  onOpenTrace,
}) {
  return (
    <GlassCard className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-violet-300">
            <Sparkles size={11} />
            AI Resolution Workspace
          </span>

          <h1 className="mt-2.5 text-xl font-extrabold tracking-tight sm:text-2xl">
            <span className="text-gradient">AeroResolve AI</span>
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <AgentLiveStatus active={active} mode={mode} />
            {pnr && (
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                Case: {pnr}
                {customer?.name ? ` · ${customer.name}` : ""}
              </span>
            )}
            {onOpenTrace && (
              <button
                type="button"
                onClick={onOpenTrace}
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/60 hover:text-white cursor-pointer"
              >
                <ScrollText size={12} />
                View Agent Trace
              </button>
            )}
          </div>
        </div>

        {flight?.status && <StatusBadge status={flight.status} />}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatChip icon={Ticket} label="Flight" value={flight?.flightNumber} delay={0.05} />
        <StatChip
          icon={MapPin}
          label="Route"
          value={flight?.origin && flight?.destination ? `${flight.origin} → ${flight.destination}` : null}
          delay={0.1}
        />
        <StatChip icon={Gauge} label="Tier" value={customer?.loyaltyTier ? `${customer.loyaltyTier} Member` : null} delay={0.15} />
        <StatChip icon={Bot} label="Resolution" value={resolutionLabel(resolution, customerChooses)} delay={0.2} />
      </div>
    </GlassCard>
  );
}
