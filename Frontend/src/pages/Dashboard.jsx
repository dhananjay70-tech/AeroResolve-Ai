import { useEffect, useRef, useState } from "react";
import { agentApi, bookingApi, customerApi } from "../services/api";
import { pnrStorage } from "../utils/storage";
import { escalationStorage } from "../utils/escalationStorage";
import { ACTION_COPY } from "../utils/actionCopy";
import { useAuth } from "../hooks/useAuth";
import { useNotifications } from "../hooks/useNotifications";
import WelcomeHeader from "../components/WelcomeHeader";
import BookingTracker from "../components/BookingTracker";
import CallingAgentHero from "../components/CallingAgentHero";
import AIAssistantPreview from "../components/AIAssistantPreview";
import FlightStatusCard from "../components/FlightStatusCard";
import DisruptionBanner from "../components/DisruptionBanner";
import ResolutionPanel from "../components/ResolutionPanel";
import ResolutionTimeline from "../components/ResolutionTimeline";
import AgentStatusPanel from "../components/AgentStatusPanel";
import BookingSummary from "../components/BookingSummary";
import EscalationStatus from "../components/EscalationStatus";
import ConfirmationModal from "../components/ConfirmationModal";
import EscalationModal from "../components/EscalationModal";
import LoadingSkeleton from "../components/LoadingSkeleton";
import ErrorState from "../components/ErrorState";
import EmptyState from "../components/EmptyState";
import GlassCard from "../components/GlassCard";
import { ShieldCheck } from "lucide-react";

const DISRUPTION_QUESTION = "What are my options for this disruption?";

function describeResolution(resolution) {
  if (resolution.entitlement === "AIRLINE_CANCELLATION") {
    return "Rebooking and refund options are available for your cancelled flight.";
  }
  if (resolution.entitlement === "DELAY") {
    return "Delay entitlements have been applied to your booking.";
  }
  return "A resolution is available for your booking.";
}

export default function Dashboard() {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const trackerInputRef = useRef(null);
  const notifiedRef = useRef({ disruption: null, resolution: null });

  const [pnrInput, setPnrInput] = useState(pnrStorage.get() || "");
  const [booking, setBooking] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [resolution, setResolution] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [aiEscalation, setAiEscalation] = useState(null);
  const [supervisorCall, setSupervisorCall] = useState(null);
  const [aiPreview, setAiPreview] = useState(null);

  const [loading, setLoading] = useState(false);
  const [resolutionLoading, setResolutionLoading] = useState(false);
  const [error, setError] = useState("");

  const [actionModal, setActionModal] = useState(null);
  const [actionStatus, setActionStatus] = useState("idle");
  const [actionErrorMessage, setActionErrorMessage] = useState("");
  const [actionSuccessMessage, setActionSuccessMessage] = useState("");
  const [completedActionType, setCompletedActionType] = useState(null);

  const [escalateOpen, setEscalateOpen] = useState(false);

  async function lookupBooking(pnr) {
    if (!pnr) return;
    setLoading(true);
    setError("");
    setResolution(null);
    setCompletedActionType(null);
    setActionModal(null);
    setAiEscalation(null);
    setSupervisorCall(null);
    setAiPreview(null);
    try {
      const [bookingRes, customerRes] = await Promise.all([
        bookingApi.getByPnr(pnr),
        customerApi.getByPnr(pnr),
      ]);
      setBooking(bookingRes.data);
      setCustomer(customerRes.data);
      pnrStorage.set(pnr);

      const flight = bookingRes.data.flight;
      const isDisrupted =
        flight?.status === "cancelled" || (flight?.status === "delayed" && flight?.delayMinutes > 0);
      if (isDisrupted) {
        const dedupeKey = `${pnr}:${flight.status}`;
        if (notifiedRef.current.disruption !== dedupeKey) {
          notifiedRef.current.disruption = dedupeKey;
          addNotification({
            type: "disruption",
            title: "Flight disruption detected",
            message: `${flight.flightNumber} is ${flight.status}.`,
            pnr,
          });
        }
        fetchResolution(pnr);
      }
    } catch (err) {
      setError(err.message);
      setBooking(null);
      setCustomer(null);
    } finally {
      setLoading(false);
    }
  }

  async function fetchResolution(pnr) {
    setResolutionLoading(true);
    try {
      const res = await agentApi.chat(pnr, DISRUPTION_QUESTION);
      setResolution(res.data.resolution);
      setConversationId(res.data.conversationId);
      if (res.data.aiMessage) {
        setAiPreview({ customerMessage: DISRUPTION_QUESTION, aiMessage: res.data.aiMessage });
      }

      if (res.data.resolution && res.data.resolution.entitlement !== "NONE") {
        const dedupeKey = `${pnr}:${res.data.resolution.entitlement}`;
        if (notifiedRef.current.resolution !== dedupeKey) {
          notifiedRef.current.resolution = dedupeKey;
          addNotification({
            type: "resolution",
            title: "Resolution available",
            message: describeResolution(res.data.resolution),
            pnr,
          });
        }
      }
      if (res.data.escalation) {
        setAiEscalation(res.data.escalation);
        escalationStorage.set(pnr, res.data.escalation.id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setResolutionLoading(false);
    }
  }

  useEffect(() => {
    if (pnrStorage.get()) {
      lookupBooking(pnrStorage.get());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        addNotification({
          type: "escalation",
          title: "Escalation submitted",
          message: "Your request has been sent for supervisor review.",
          pnr: booking.pnr,
        });
      }

      setCompletedActionType(actionModal.type);
      setActionSuccessMessage(res.data.aiMessage || "Your request has been confirmed.");
      addNotification({
        type: "action",
        title: "Action completed",
        message: res.data.aiMessage || `${actionModal.title} confirmed.`,
        pnr: booking.pnr,
      });
      setActionStatus("success");
    } catch (err) {
      setActionErrorMessage(err.message);
      setActionStatus("error");
    }
  }

  function handleEscalationCreated(escalation) {
    setAiEscalation(escalation);
    if (booking?.pnr) escalationStorage.set(booking.pnr, escalation.id);
  }

  const flight = booking?.flight;
  const isCancelled = flight?.status === "cancelled";
  const isDelayed = flight?.status === "delayed" && flight?.delayMinutes > 0;
  const isDisrupted = isCancelled || isDelayed;
  const customerChooses = resolution?.entitlement === "AIRLINE_CANCELLATION" && resolution?.customerChooses;
  const actionPending = actionStatus === "loading";

  // Resolution status is deliberately never "Resolved" here: the backend has
  // no case/resolution-status field at all (flight.status stays
  // "delayed"/"cancelled" forever, regardless of entitlements or actions -
  // see policyService/actionService). So this only ever describes what the
  // AI agent has done about the disruption, never claims the disruption
  // itself is fixed - the flight-status chip next to it says that instead.
  let stateLabel;
  if (isDisrupted) {
    if (customerChooses) {
      stateLabel = completedActionType ? "Request Confirmed" : "Resolution Available";
    } else if (resolution && resolution.entitlement !== "NONE") {
      stateLabel = "Support Applied";
    } else if (resolutionLoading) {
      stateLabel = "Reviewing";
    } else {
      stateLabel = "Action Required";
    }
  }

  return (
    <div className="space-y-4">
      <WelcomeHeader user={user} customer={customer} booking={booking} flight={flight} stateLabel={stateLabel} />

      <GlassCard className="p-4 sm:p-5">
        <BookingTracker
          value={pnrInput}
          onChange={setPnrInput}
          onSearch={lookupBooking}
          loading={loading}
          inputRef={trackerInputRef}
        />
      </GlassCard>

      {!loading && error && (
        <ErrorState
          title="Unable to load booking details."
          message={error}
          onRetry={() => lookupBooking(pnrInput.trim().toUpperCase())}
        />
      )}

      {!loading && !error && !booking && (
        <EmptyState
          title="No booking loaded yet"
          description="Enter a PNR above to view your AI resolution agent for this case."
        />
      )}

      {loading && !booking && (
        <div className="space-y-4">
          <LoadingSkeleton variant="card" className="h-40" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <LoadingSkeleton variant="card" className="h-56 lg:col-span-2" />
            <LoadingSkeleton variant="card" className="h-56" />
          </div>
        </div>
      )}

      {booking && (
        <>
          {/* 1. AI CALLING AGENT — hero, full width, above everything else */}
          <CallingAgentHero
            booking={booking}
            customer={customer}
            flight={flight}
            escalation={aiEscalation}
            call={supervisorCall}
            onEscalationCreated={handleEscalationCreated}
            onCallStatusChange={setSupervisorCall}
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-start">
            {/* MAIN: AI Assistant, Resolution Actions, Timeline, Flight context */}
            <div className="space-y-4 lg:col-span-2">
              <AIAssistantPreview
                booking={booking}
                flight={flight}
                resolution={resolution}
                conversationId={conversationId}
                preview={aiPreview}
                loading={isDisrupted && resolutionLoading}
              />

              <GlassCard className="p-5 sm:p-6">
                <p className="text-sm font-semibold text-white/70">Resolution Actions</p>
                <div className="mt-4">
                  {!isDisrupted ? (
                    <div className="flex items-center gap-3 p-2">
                      <ShieldCheck className="shrink-0 text-emerald-300" size={20} />
                      <p className="text-sm text-white/70">
                        No active disruptions on this booking. Have a great flight!
                      </p>
                    </div>
                  ) : resolutionLoading ? (
                    <LoadingSkeleton variant="card" className="h-32" />
                  ) : (
                    <ResolutionPanel
                      resolution={resolution}
                      onRebook={() => openActionModal("REBOOK")}
                      onRefund={() => openActionModal("REFUND")}
                      onEscalate={() => setEscalateOpen(true)}
                    />
                  )}
                </div>
              </GlassCard>

              {isDisrupted && (
                <ResolutionTimeline
                  flight={flight}
                  booking={booking}
                  customer={customer}
                  resolution={resolution}
                  resolutionLoading={resolutionLoading}
                  actionStatus={actionStatus}
                  completedActionType={completedActionType}
                />
              )}

              {isDisrupted ? (
                <DisruptionBanner flight={flight} customer={customer} stateLabel={stateLabel} />
              ) : (
                <FlightStatusCard flight={flight} />
              )}
            </div>

            {/* SIDEBAR: Agent Status, Escalation, Booking */}
            <div className="space-y-4">
              <AgentStatusPanel
                booking={booking}
                customer={customer}
                flight={flight}
                resolution={resolution}
                resolutionPending={resolutionLoading}
                actionPending={actionPending}
                aiEscalation={aiEscalation}
                completedActionType={completedActionType}
                customerChooses={customerChooses}
              />

              <EscalationStatus pnr={booking.pnr} customer={customer} />

              <BookingSummary booking={booking} customer={customer} />
            </div>
          </div>
        </>
      )}

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
        bookingId={booking?.id}
        pnr={booking?.pnr}
        onClose={() => setEscalateOpen(false)}
        onSuccess={(escalation) => {
          setAiEscalation(escalation);
          setEscalateOpen(false);
        }}
      />
    </div>
  );
}
