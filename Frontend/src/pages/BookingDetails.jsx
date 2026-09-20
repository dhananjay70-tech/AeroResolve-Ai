import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, MapPin, MessageCircle, Plane, PlaneLanding, PlaneTakeoff, ShieldCheck } from "lucide-react";
import { agentApi, bookingApi, customerApi } from "../services/api";
import { pnrStorage } from "../utils/storage";
import { escalationStorage } from "../utils/escalationStorage";
import { ACTION_COPY } from "../utils/actionCopy";
import GlassCard from "../components/GlassCard";
import CustomerCard from "../components/CustomerCard";
import StatusBadge from "../components/StatusBadge";
import ActionButton from "../components/ActionButton";
import ResolutionPanel from "../components/ResolutionPanel";
import SupervisorCallButton from "../components/SupervisorCallButton";
import ConfirmationModal from "../components/ConfirmationModal";
import EscalationModal from "../components/EscalationModal";
import LoadingScreen from "../components/LoadingScreen";
import LoadingSkeleton from "../components/LoadingSkeleton";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";

const DISRUPTION_QUESTION = "What are my options for this disruption?";

// Same category-only copy convention already used in DisruptionBanner.jsx -
// the backend has no per-booking disruption-reason text, only the flight
// status itself, so this is not per-booking invented data.
const REASON_COPY = {
  cancelled: "Cancelled by the airline for operational reasons.",
  delayed: "Delayed due to operational conditions.",
};

function formatTime(value) {
  if (!value) return "--:--";
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(value) {
  if (!value) return "--";
  return new Date(value).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
}

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="text-white/45">{label}</span>
      <span className="truncate font-medium text-white/85">{value}</span>
    </div>
  );
}

export default function BookingDetails() {
  const location = useLocation();
  const navigate = useNavigate();
  const pnr = location.state?.pnr || pnrStorage.get();

  const [booking, setBooking] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [resolution, setResolution] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [resolutionLoading, setResolutionLoading] = useState(false);
  const [aiEscalation, setAiEscalation] = useState(null);

  const [actionModal, setActionModal] = useState(null);
  const [actionStatus, setActionStatus] = useState("idle");
  const [actionErrorMessage, setActionErrorMessage] = useState("");
  const [actionSuccessMessage, setActionSuccessMessage] = useState("");
  const [completedActionType, setCompletedActionType] = useState(null);
  const [escalateOpen, setEscalateOpen] = useState(false);

  const fetchedForPnr = useRef(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [bookingRes, customerRes] = await Promise.all([
        bookingApi.getByPnr(pnr),
        customerApi.getByPnr(pnr),
      ]);
      setBooking(bookingRes.data);
      setCustomer(customerRes.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (pnr) load();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pnr]);

  useEffect(() => {
    if (!booking || fetchedForPnr.current === booking.pnr) return;
    const { flight } = booking;
    const isDisrupted =
      flight.status === "cancelled" || (flight.status === "delayed" && flight.delayMinutes > 0);
    if (!isDisrupted) return;

    fetchedForPnr.current = booking.pnr;
    setResolutionLoading(true);
    agentApi
      .chat(booking.pnr, DISRUPTION_QUESTION)
      .then((res) => {
        setResolution(res.data.resolution);
        setConversationId(res.data.conversationId);
        if (res.data.escalation) {
          setAiEscalation(res.data.escalation);
          escalationStorage.set(booking.pnr, res.data.escalation.id);
        }
      })
      .catch(() => {
        // Resolution is supporting detail here - the booking itself already
        // loaded successfully either way.
      })
      .finally(() => setResolutionLoading(false));
  }, [booking]);

  function openActionModal(type) {
    setActionModal({ type, ...ACTION_COPY[type] });
    setActionStatus("idle");
    setActionErrorMessage("");
  }

  function closeActionModal() {
    setActionModal(null);
    setActionStatus("idle");
    setActionErrorMessage("");
  }

  async function handleConfirmAction() {
    if (!actionModal || !booking) return;
    setActionStatus("loading");
    setActionErrorMessage("");
    try {
      const res = await agentApi.chat(booking.pnr, actionModal.message, conversationId);
      setResolution(res.data.resolution);
      setConversationId(res.data.conversationId);
      if (res.data.escalation) {
        setAiEscalation(res.data.escalation);
        escalationStorage.set(booking.pnr, res.data.escalation.id);
      }
      setCompletedActionType(actionModal.type);
      setActionSuccessMessage(res.data.aiMessage || "Your request has been confirmed.");
      setActionStatus("success");
    } catch (err) {
      setActionErrorMessage(err.message);
      setActionStatus("error");
    }
  }

  if (!pnr) {
    return (
      <EmptyState
        title="No booking selected"
        description="Look up a PNR from your dashboard first."
        actionLabel="Go to Dashboard"
        onAction={() => navigate("/dashboard")}
      />
    );
  }

  if (loading) return <LoadingScreen label="Loading booking details" />;

  if (error) {
    return <ErrorState title="Unable to load booking details." message={error} onRetry={load} />;
  }

  const { flight } = booking;
  const status = flight.status?.toLowerCase();
  const isCancelled = status === "cancelled";
  const isDelayed = status === "delayed" && flight.delayMinutes > 0;
  const isDisrupted = isCancelled || isDelayed;
  const updatedDeparture = isDelayed
    ? new Date(new Date(flight.departureTime).getTime() + flight.delayMinutes * 60000)
    : null;
  const departureLabel = isDelayed ? formatTime(updatedDeparture) : formatTime(flight.departureTime);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">Booking Details</h1>
        <p className="mt-1 text-sm text-white/50">Everything about your trip, in one place.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-start">
        {/* LEFT: compact info groups instead of one giant card */}
        <div className="space-y-4">
          <CustomerCard customer={customer} />

          <GlassCard className="p-5">
            <p className="text-xs uppercase tracking-widest text-white/40">Booking</p>
            <div className="mt-2 divide-y divide-white/5">
              <Row label="PNR" value={booking.pnr} />
              <Row label="Booking status" value={booking.status?.replace(/^\w/, (c) => c.toUpperCase())} />
              <Row label="Flight" value={flight.flightNumber} />
              <Row label="Route" value={`${flight.origin} → ${flight.destination}`} />
              <Row label="Travel date" value={formatDate(flight.departureTime)} />
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest text-white/40">Flight Status</p>
              <StatusBadge status={flight.status} />
            </div>
            {isDisrupted ? (
              <div className="mt-2 divide-y divide-white/5">
                <Row label="Scheduled departure" value={formatTime(flight.departureTime)} />
                {isDelayed && <Row label="Updated departure" value={formatTime(updatedDeparture)} />}
                {isDelayed && (
                  <Row
                    label="Delay duration"
                    value={`${Math.floor(flight.delayMinutes / 60)}h ${flight.delayMinutes % 60}m`}
                  />
                )}
                <Row label="Disruption reason" value={REASON_COPY[status]} />
              </div>
            ) : (
              <p className="mt-3 flex items-center gap-2 text-sm text-white/60">
                <ShieldCheck size={15} className="shrink-0 text-emerald-300" />
                No active disruption on this flight.
              </p>
            )}
          </GlassCard>
        </div>

        {/* CENTER/RIGHT: journey timeline + resolution & support */}
        <div className="space-y-4 lg:col-span-2">
          <GlassCard tilt className="p-6 sm:p-8">
            <p className="mb-6 text-sm font-semibold text-white/70">Flight Status Timeline</p>
            <div className="relative pl-8">
              <div className="absolute left-[13px] top-2 bottom-2 w-px bg-gradient-to-b from-violet-400/60 via-white/15 to-blue-400/60" />

              <TimelineStep icon={MapPin} label="Origin" title={flight.origin} />
              <TimelineStep
                icon={PlaneTakeoff}
                label="Departure"
                title={departureLabel}
                sublabel={isDelayed ? `Scheduled ${formatTime(flight.departureTime)}` : null}
                warn={isDelayed}
              />
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                className="relative mb-10 flex items-center gap-4"
              >
                <div className="absolute -left-8 flex h-7 w-7 items-center justify-center rounded-full btn-gradient text-white">
                  <Plane size={13} />
                </div>
                <div className="ml-1">
                  <p className="text-xs text-white/40">In transit</p>
                  <p className="font-semibold">Flight {flight.flightNumber}</p>
                </div>
              </motion.div>
              <TimelineStep icon={PlaneLanding} label="Arrival" title={formatTime(flight.arrivalTime)} />
              <TimelineStep icon={MapPin} label="Destination" title={flight.destination} last />
            </div>
          </GlassCard>

          <GlassCard className="p-5 sm:p-6">
            <p className="text-sm font-semibold text-white/70">Resolution &amp; Support</p>

            {!isDisrupted ? (
              <p className="mt-3 flex items-center gap-2 text-sm text-white/60">
                <ShieldCheck size={16} className="shrink-0 text-emerald-300" />
                No disruption on this booking - nothing to resolve right now.
              </p>
            ) : resolutionLoading ? (
              <LoadingSkeleton variant="card" className="mt-3 h-28" />
            ) : (
              <div className="mt-3">
                {completedActionType && (
                  <p className="mb-3 flex items-center gap-2 text-sm text-emerald-300">
                    <CheckCircle2 size={15} className="shrink-0" />
                    {ACTION_COPY[completedActionType]?.title} confirmed
                  </p>
                )}
                <ResolutionPanel
                  resolution={resolution}
                  onRebook={() => openActionModal("REBOOK")}
                  onRefund={() => openActionModal("REFUND")}
                  onEscalate={() => setEscalateOpen(true)}
                />
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-3 border-t border-white/10 pt-5">
              <ActionButton
                icon={MessageCircle}
                variant="secondary"
                onClick={() =>
                  navigate("/chat", { state: { pnr: booking.pnr, conversationId, resolution } })
                }
              >
                Open AI Assistant
              </ActionButton>
              <SupervisorCallButton
                booking={booking}
                pnr={booking.pnr}
                escalation={aiEscalation}
                reason="Customer requested supervisor assistance from My Booking."
                onEscalationCreated={(escalation) => {
                  setAiEscalation(escalation);
                  escalationStorage.set(booking.pnr, escalation.id);
                }}
              />
            </div>
          </GlassCard>
        </div>
      </div>

      <ConfirmationModal
        open={Boolean(actionModal)}
        title={actionModal?.title}
        whatWillHappen={actionModal?.whatWillHappen}
        whyAvailable={actionModal?.whyAvailable}
        whatHappensNext={actionModal?.whatHappensNext}
        status={actionStatus}
        successTitle={`${actionModal?.title || "Resolution"} confirmed`}
        successMessage={actionSuccessMessage}
        errorMessage={actionErrorMessage}
        onConfirm={handleConfirmAction}
        onClose={closeActionModal}
      />

      <EscalationModal
        open={escalateOpen}
        bookingId={booking.id}
        pnr={booking.pnr}
        onClose={() => setEscalateOpen(false)}
        onSuccess={(escalation) => {
          setAiEscalation(escalation);
          setEscalateOpen(false);
        }}
      />
    </div>
  );
}

function TimelineStep({ icon: Icon, label, title, sublabel, warn = false, last = false }) {
  return (
    <div className={`relative flex items-center gap-4 ${last ? "" : "mb-10"}`}>
      <div
        className={`absolute -left-8 flex h-7 w-7 items-center justify-center rounded-full glass ${
          warn ? "text-amber-300" : "text-violet-300"
        }`}
      >
        <Icon size={13} />
      </div>
      <div className="ml-1">
        <p className="text-xs text-white/40">{label}</p>
        <p className={`font-semibold ${warn ? "text-amber-300" : ""}`}>{title}</p>
        {sublabel && <p className="text-xs text-white/35 line-through">{sublabel}</p>}
      </div>
    </div>
  );
}
