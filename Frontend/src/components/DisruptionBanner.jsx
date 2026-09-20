import { AlertTriangle, Clock } from "lucide-react";
import GlassCard from "./GlassCard";
import FlightPath from "./FlightPath";

const REASON_COPY = {
  cancelled: "Your flight has been cancelled due to operational reasons.",
  delayed: "Your flight has been delayed. Here's what AeroResolve can do for you.",
};

// Kept in sync with WelcomeHeader.jsx's STATE_STYLES - see the stateLabel
// comment in Dashboard.jsx for why "Resolved" never appears here.
const STATE_STYLES = {
  "Action Required": "bg-amber-500/15 text-amber-300 border-amber-500/30",
  Reviewing: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  "Resolution Available": "bg-violet-500/15 text-violet-300 border-violet-500/30",
  "Support Applied": "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  "Request Confirmed": "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
};

function formatTime(value) {
  if (!value) return "--:--";
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function DisruptionBanner({ flight, customer, stateLabel }) {
  if (!flight) return null;
  const status = flight.status?.toLowerCase();
  if (status !== "cancelled" && !(status === "delayed" && flight.delayMinutes > 0)) {
    return null;
  }

  const isCancelled = status === "cancelled";
  const updatedDeparture = !isCancelled
    ? new Date(new Date(flight.departureTime).getTime() + flight.delayMinutes * 60000)
    : null;

  return (
    <GlassCard
      className="border-l-2 border-l-rose-400/60 p-5 sm:p-6"
      style={{ borderLeftColor: isCancelled ? "#fb7185" : "#fbbf24" }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              isCancelled ? "bg-rose-500/15 text-rose-300" : "bg-amber-500/15 text-amber-300"
            }`}
          >
            <AlertTriangle size={18} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Flight Context</p>
            <p className="text-base font-bold">Flight Disruption Command Center</p>
            <p className="mt-1 max-w-xl text-sm text-white/60">{REASON_COPY[status]}</p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          {stateLabel && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                STATE_STYLES[stateLabel] || "bg-white/8 text-white/60 border-white/15"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {stateLabel}
            </span>
          )}
          {!isCancelled && (
            <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-300">
              <Clock size={16} />
              Delayed by {Math.floor(flight.delayMinutes / 60)}h {flight.delayMinutes % 60}m
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 border-t border-white/10 pt-5">
        <FlightPath origin={flight.origin} destination={flight.destination} status={flight.status} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-white/10 pt-5 text-sm sm:grid-cols-3">
        <Fact label="Status" value={flight.status} capitalize />
        <Fact label="Flight" value={flight.flightNumber} />
        <Fact label="Scheduled departure" value={formatTime(flight.departureTime)} />
        {!isCancelled && <Fact label="Updated departure" value={formatTime(updatedDeparture)} />}
        {customer?.loyaltyTier && <Fact label="Membership tier" value={customer.loyaltyTier} />}
      </div>
    </GlassCard>
  );
}

function Fact({ label, value, capitalize = false }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-white/40">{label}</p>
      <p className={`mt-1 font-semibold text-white/85 ${capitalize ? "capitalize" : ""}`}>{value}</p>
    </div>
  );
}
