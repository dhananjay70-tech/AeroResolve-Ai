import { Link } from "react-router-dom";
import { Ticket } from "lucide-react";
import GlassCard from "./GlassCard";
import StatusBadge from "./StatusBadge";

function formatTime(value) {
  if (!value) return "--:--";
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(value) {
  if (!value) return "--";
  return new Date(value).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="text-white/45">{label}</span>
      <span className="truncate font-medium text-white/85">{value}</span>
    </div>
  );
}

// Dense booking facts for the sidebar - "View Full Booking" links out to the
// dedicated Booking Details page for the full journey timeline.
export default function BookingSummary({ booking, customer }) {
  if (!booking) return null;
  const { flight } = booking;
  const isDelayed = flight?.status === "delayed" && flight?.delayMinutes > 0;
  const updatedDeparture = isDelayed
    ? new Date(new Date(flight.departureTime).getTime() + flight.delayMinutes * 60000)
    : null;

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-white/70">
          <Ticket size={14} />
          My Booking
        </p>
        <StatusBadge status={flight?.status} />
      </div>

      <div className="mt-3 divide-y divide-white/5">
        <Row label="PNR" value={booking.pnr} />
        <Row label="Passenger" value={customer?.name} />
        <Row label="Tier" value={customer?.loyaltyTier} />
        <Row label="Flight" value={flight?.flightNumber} />
        <Row label="Route" value={flight?.origin && flight?.destination ? `${flight.origin} → ${flight.destination}` : "--"} />
        <Row label="Date" value={formatDate(flight?.departureTime)} />
        <Row label="Scheduled" value={formatTime(flight?.departureTime)} />
        {updatedDeparture && <Row label="Updated" value={formatTime(updatedDeparture)} />}
      </div>

      <Link
        to="/booking"
        className="mt-3 block text-center text-xs font-semibold text-violet-300 hover:text-violet-200"
      >
        View Full Booking →
      </Link>
    </GlassCard>
  );
}
