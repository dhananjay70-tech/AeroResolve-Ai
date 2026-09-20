import GlassCard from "./GlassCard";
import CustomerCard from "./CustomerCard";
import StatusBadge from "./StatusBadge";
import FlightPath from "./FlightPath";

// Same static, category-only copy pattern already used in
// DisruptionBanner.jsx's REASON_COPY - not per-booking invented data.
const ISSUE_COPY = {
  cancelled: "Airline cancellation",
  delayed: "Flight delay",
};

function formatDate(value) {
  if (!value) return "--";
  return new Date(value).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(value) {
  if (!value) return "--";
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function Row({ label, value, className = "" }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-3 py-1 text-sm">
      <span className="text-white/45">{label}</span>
      <span className={`truncate font-medium ${className}`}>{value}</span>
    </div>
  );
}

// Compact grouped cards instead of one long case-context card: PNR/route,
// then flight status/disruption facts, each scannable on its own.
export default function CaseContextPanel({ customer, booking, flight, className = "" }) {
  const isCancelled = flight?.status === "cancelled";
  const isDelayed = flight?.status === "delayed" && flight?.delayMinutes > 0;
  const disruptionLabel = isCancelled
    ? "Cancelled"
    : isDelayed
      ? `Delayed ${Math.floor(flight.delayMinutes / 60)}h ${flight.delayMinutes % 60}m`
      : "None";
  const issue = isCancelled ? ISSUE_COPY.cancelled : isDelayed ? ISSUE_COPY.delayed : null;
  const updatedDeparture = isDelayed
    ? new Date(new Date(flight.departureTime).getTime() + flight.delayMinutes * 60000)
    : null;

  return (
    <div className={`space-y-4 ${className}`}>
      <CustomerCard customer={customer} />

      <GlassCard className="p-5">
        <p className="text-xs uppercase tracking-widest text-white/40">Case</p>
        <p className="text-lg font-bold">{booking?.pnr}</p>

        {flight?.origin && flight?.destination && (
          <div className="mt-4">
            <FlightPath origin={flight.origin} destination={flight.destination} status={flight.status} />
          </div>
        )}

        <div className="mt-4 divide-y divide-white/5">
          <Row label="Flight" value={flight?.flightNumber} />
          <Row label="Travel date" value={formatDate(flight?.departureTime)} />
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-white/40">Status</p>
          <StatusBadge status={flight?.status} />
        </div>
        <div className="mt-3 divide-y divide-white/5">
          <Row label="Scheduled" value={formatTime(flight?.departureTime)} />
          {updatedDeparture && (
            <Row label="Updated" value={formatTime(updatedDeparture)} className="text-amber-300" />
          )}
          <Row
            label="Disruption"
            value={disruptionLabel}
            className={isCancelled || isDelayed ? "text-amber-300" : "text-emerald-300"}
          />
          {issue && <Row label="Reason" value={issue} />}
        </div>
      </GlassCard>
    </div>
  );
}
