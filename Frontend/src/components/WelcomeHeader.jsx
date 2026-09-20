// Labels describe what the AI agent has done, never that the disruption
// itself is fixed - see the stateLabel comment in Dashboard.jsx.
const STATE_STYLES = {
  "Action Required": "bg-amber-500/15 text-amber-300 border-amber-500/30",
  Reviewing: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  "Resolution Available": "bg-violet-500/15 text-violet-300 border-violet-500/30",
  "Support Applied": "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  "Request Confirmed": "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function statusLine(isDisrupted, hasBooking) {
  if (isDisrupted) return "Your flight disruption is being handled by AeroResolve AI.";
  if (hasBooking) return "Your AI agent is monitoring this booking for disruptions.";
  return "Track a booking to see real-time disruption status.";
}

export default function WelcomeHeader({ user, customer, booking, flight, stateLabel }) {
  const name = customer?.name?.split(" ")[0] || user?.fullName?.split(" ")[0] || "traveller";
  const isDisrupted =
    flight?.status === "cancelled" || (flight?.status === "delayed" && flight?.delayMinutes > 0);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">
            {greeting()}, {name}
          </h1>
          <p className="mt-1 text-sm text-white/55">{statusLine(isDisrupted, Boolean(booking))}</p>
        </div>

        {stateLabel && (
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
              STATE_STYLES[stateLabel] || "bg-white/8 text-white/60 border-white/15"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {stateLabel}
          </span>
        )}
      </div>

      {(customer || booking || flight) && (
        <div className="mt-5 flex flex-wrap gap-2 text-xs">
          {customer?.loyaltyTier && (
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-medium text-white/60">
              {customer.loyaltyTier} Member
            </span>
          )}
          {booking?.status && (
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-medium capitalize text-white/60">
              Booking {booking.status}
            </span>
          )}
          {flight?.status && (
            <span
              className={`rounded-full border px-3 py-1.5 font-medium capitalize ${
                isDisrupted
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              }`}
            >
              {isDisrupted ? `Flight ${flight.status}` : "No active disruption"}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
