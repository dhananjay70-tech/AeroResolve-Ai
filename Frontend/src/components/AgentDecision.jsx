import GlassCard from "./GlassCard";
import ResolutionPanel from "./ResolutionPanel";

const ISSUE_COPY = {
  AIRLINE_CANCELLATION: "Flight cancellation detected.",
  DELAY: "Flight delay detected.",
};

export default function AgentDecision({ resolution, onRebook, onRefund, onEscalate }) {
  const hasResolution = Boolean(resolution) && resolution.entitlement !== "NONE";
  const resolutionCount =
    resolution?.entitlement === "AIRLINE_CANCELLATION"
      ? resolution.options?.length || 0
      : resolution?.entitlement === "DELAY"
        ? resolution.entitlements?.length || 0
        : 0;

  return (
    <GlassCard className="p-6">
      <p className="text-sm font-semibold text-white/70">Agent Decision</p>

      {hasResolution && (
        <div className="mt-2 space-y-0.5 text-sm text-white/60">
          <p>{ISSUE_COPY[resolution.entitlement] || "Disruption detected."}</p>
          <p>Policy evaluation completed.</p>
          <p>
            {resolutionCount} eligible resolution{resolutionCount === 1 ? "" : "s"} found.
          </p>
        </div>
      )}

      <div className="mt-5">
        <ResolutionPanel resolution={resolution} onRebook={onRebook} onRefund={onRefund} onEscalate={onEscalate} />
      </div>
    </GlassCard>
  );
}
