import { Plane } from "lucide-react";
import GlassCard from "./GlassCard";
import StatusBadge from "./StatusBadge";
import FlightPath from "./FlightPath";

function formatTime(value) {
  if (!value) return "--:--";
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function FlightStatusCard({ flight }) {
  if (!flight) return null;

  return (
    <GlassCard tilt className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
            <Plane size={20} />
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight">{flight.flightNumber}</p>
            <p className="text-sm text-white/50">
              {flight.origin} → {flight.destination}
            </p>
          </div>
        </div>
        <StatusBadge status={flight.status} />
      </div>

      <div className="mt-6">
        <FlightPath origin={flight.origin} destination={flight.destination} status={flight.status} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-white/40">Departure</p>
          <p className="font-semibold text-white/90">{formatTime(flight.departureTime)}</p>
        </div>
        <div>
          <p className="text-white/40">Arrival</p>
          <p className="font-semibold text-white/90">{formatTime(flight.arrivalTime)}</p>
        </div>
      </div>
    </GlassCard>
  );
}
