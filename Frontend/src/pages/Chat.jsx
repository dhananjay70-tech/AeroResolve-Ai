import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { agentApi, bookingApi, customerApi } from "../services/api";
import { pnrStorage } from "../utils/storage";
import { escalationStorage } from "../utils/escalationStorage";
import { formatResolutionMessage } from "../utils/resolutionMessage";
import { ACTION_COPY } from "../utils/actionCopy";
import { deriveAgentStateMachine } from "../utils/agentStateMachine";
import { useNotifications } from "../hooks/useNotifications";
import AgentHeader from "../components/AgentHeader";
import CaseContextPanel from "../components/CaseContextPanel";
import AgentWorkspace from "../components/AgentWorkspace";
import ToolRuntime from "../components/ToolRuntime";
import ExecutionTimeline from "../components/ExecutionTimeline";
import AgentEscalationState from "../components/AgentEscalationState";
import CustomerConversation from "../components/CustomerConversation";
import SupervisorCallButton from "../components/SupervisorCallButton";
import GlassCard from "../components/GlassCard";
import AgentTraceDrawer from "../components/AgentTraceDrawer";
import ConfirmationModal from "../components/ConfirmationModal";
import EscalationModal from "../components/EscalationModal";
import LoadingScreen from "../components/LoadingScreen";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import { callStatusMeta } from "../utils/callStatus";

let messageId = 0;
const nextId = () => `msg-${Date.now()}-${messageId++}`;
let traceId = 0;
const nextTraceId = () => `trace-${Date.now()}-${traceId++}`;

const SUGGESTED_PROMPTS = [
  "What are my options?",
  "Can I get a refund?",
  "Can I rebook my flight?",
  "What support am I eligible for?",
];

function makeMessage(role, content) {
  return { id: nextId(), role, content, timestamp: Date.now() };
}

export default function Chat() {
  const location = useLocation();
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const pnr = location.state?.pnr || pnrStorage.get();

  const [booking, setBooking] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [messages, setMessages] = useState([]);
  const [resolution, setResolution] = useState(location.state?.resolution || null);
  const [conversationId, setConversationId] = useState(location.state?.conversationId || null);
  const [isTyping, setIsTyping] = useState(false);
  const [aiEscalation, setAiEscalation] = useState(null);
  const [supervisorCall, setSupervisorCall] = useState(null);

  const [escalateOpen, setEscalateOpen] = useState(false);
  const [traceOpen, setTraceOpen] = useState(false);
  const [traceLog, setTraceLog] = useState([]);

  const [actionModal, setActionModal] = useState(null);
  const [actionStatus, setActionStatus] = useState("idle");
  const [actionErrorMessage, setActionErrorMessage] = useState("");
  const [actionSuccessMessage, setActionSuccessMessage] = useState("");
  const [completedActionType, setCompletedActionType] = useState(null);

  const hasBootstrapped = useRef(false);

  // Every entry below is appended at the moment a real API call this page
  // made actually resolved, with the real facts it returned - see
  // AgentTraceDrawer.jsx for how it's rendered.
  function pushTrace(event, detail, status = "done") {
    setTraceLog((prev) => {
      if (prev[0]?.event === event && prev[0]?.status === status && prev[0]?.detail === detail) return prev;
      return [{ id: nextTraceId(), time: Date.now(), event, detail, status }, ...prev];
    });
  }

  async function load() {
    if (!pnr) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [bookingRes, customerRes] = await Promise.all([
        bookingApi.getByPnr(pnr),
        customerApi.getByPnr(pnr),
      ]);
      setBooking(bookingRes.data);
      setCustomer(customerRes.data);
      pushTrace("get_booking()", `${bookingRes.data.pnr} verified`);
      pushTrace("get_customer()", `${customerRes.data.name} loaded`);
      pushTrace(
        "get_flight_status()",
        `${bookingRes.data.flight.flightNumber} → ${bookingRes.data.flight.status.toUpperCase()}`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pnr]);

  useEffect(() => {
    if (!booking || !customer || hasBootstrapped.current) return;
    hasBootstrapped.current = true;

    const firstName = customer.name?.split(" ")[0];

    if (resolution) {
      setMessages([makeMessage("agent", formatResolutionMessage(resolution, firstName, booking.flight))]);
      if (location.state?.prefill) {
        sendMessage(location.state.prefill);
      }
      return;
    }

    const flight = booking.flight;
    const isDisrupted =
      flight.status === "cancelled" || (flight.status === "delayed" && flight.delayMinutes > 0);

    if (isDisrupted) {
      sendMessage("Hello, can you help me with my flight disruption?", true);
    } else if (location.state?.prefill) {
      sendMessage(location.state.prefill);
    } else {
      setMessages([
        makeMessage(
          "agent",
          `Hi ${firstName}. Your booking ${booking.pnr} looks all set — no active disruptions. Let me know if there's anything I can help with.`
        ),
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking, customer]);

  function handleEscalationReceived(escalation, supervisorCallResult) {
    setAiEscalation(escalation);
    escalationStorage.set(pnr, escalation.id);
    pushTrace("create_escalation()", "Escalation created");
    addNotification({
      type: "escalation",
      title: "Escalation submitted",
      message: "Your request has been sent for supervisor review.",
      pnr,
    });
    if (supervisorCallResult) {
      setSupervisorCall(supervisorCallResult);
      pushTrace("supervisor_call()", supervisorCallResult.message || supervisorCallResult.callStatus, "active");
    }
  }

  function handleCallStatusChange(call) {
    if (!call) return;
    setSupervisorCall(call);
    pushTrace("supervisor_call()", call.callStatus);
  }

  function recordPolicyResult(resolutionResult) {
    if (!resolutionResult) return;
    pushTrace("evaluate_policy()", resolutionResult.entitlement || "NONE");
    if (resolutionResult.entitlement === "AIRLINE_CANCELLATION") {
      pushTrace("Resolution generated", (resolutionResult.options || []).join(" / "));
      if (resolutionResult.customerChooses) pushTrace("Waiting for customer", "", "active");
    } else if (resolutionResult.entitlement === "DELAY") {
      pushTrace(
        "Resolution generated",
        (resolutionResult.entitlements || []).map((e) => e.type).join(" / ")
      );
    }
  }

  async function sendMessage(text, silent = false) {
    if (!silent) {
      setMessages((prev) => [...prev, makeMessage("user", text)]);
    }
    setIsTyping(true);
    try {
      const res = await agentApi.chat(pnr, text, conversationId);
      setConversationId(res.data.conversationId);
      setResolution(res.data.resolution);
      recordPolicyResult(res.data.resolution);
      if (res.data.escalation) handleEscalationReceived(res.data.escalation, res.data.supervisor_call);
      const firstName = customer?.name?.split(" ")[0];
      const content =
        res.data.aiMessage || formatResolutionMessage(res.data.resolution, firstName, booking?.flight);
      setMessages((prev) => [...prev, makeMessage("agent", content)]);
    } catch (err) {
      setMessages((prev) => [...prev, makeMessage("agent", `AI Assistant temporarily unavailable. ${err.message}`)]);
    } finally {
      setIsTyping(false);
    }
  }

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
    if (!actionModal) return;
    const toolName = actionModal.type === "REBOOK" ? "rebook_flight()" : "request_refund()";
    setActionStatus("loading");
    setActionErrorMessage("");
    pushTrace(toolName, "Executing…", "active");
    try {
      const res = await agentApi.chat(pnr, actionModal.message, conversationId);
      setConversationId(res.data.conversationId);
      setResolution(res.data.resolution);
      if (res.data.escalation) handleEscalationReceived(res.data.escalation, res.data.supervisor_call);

      const agentContent =
        res.data.aiMessage ||
        formatResolutionMessage(res.data.resolution, customer?.name?.split(" ")[0], booking?.flight);
      setMessages((prev) => [...prev, makeMessage("user", actionModal.message), makeMessage("agent", agentContent)]);

      setCompletedActionType(actionModal.type);
      setActionSuccessMessage(agentContent);
      pushTrace(toolName, "Completed");
      pushTrace("Request confirmed", agentContent);
      addNotification({
        type: "action",
        title: "Action completed",
        message: agentContent,
        pnr,
      });
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

  if (loading) return <LoadingScreen label="Preparing your agent" />;

  if (error) {
    return <ErrorState title="Unable to load your booking." message={error} onRetry={load} />;
  }

  const { flight } = booking;
  const customerChooses = resolution?.entitlement === "AIRLINE_CANCELLATION" && resolution?.customerChooses;

  let mode = "AGENT ACTIVE";
  let statusText = "Analyzing request";
  if (aiEscalation && ["CALL_CONNECTED", "AI_HANDLING", "SUPERVISOR_TAKEOVER"].includes(supervisorCall?.callStatus)) {
    mode = "HUMAN HANDOFF";
    statusText = "Supervisor connected — AI is explaining the case.";
  } else if (aiEscalation && ["CALL_INITIATING", "CALL_RINGING"].includes(supervisorCall?.callStatus)) {
    mode = "CALL INITIATING";
    statusText = "Calling supervisor…";
  } else if (aiEscalation) {
    mode = "SUPERVISOR REVIEW";
    statusText = "Escalation created — awaiting supervisor review";
  } else if (actionStatus === "loading") {
    mode = "EXECUTING ACTION";
    statusText = `Executing ${actionModal?.type === "REBOOK" ? "rebooking" : "refund"}…`;
  } else if (completedActionType) {
    // Never "resolved" - the flight's own status never changes on the
    // backend, so this only confirms the request was submitted.
    mode = "REQUEST CONFIRMED";
    statusText = "Your request has been confirmed.";
  } else if (customerChooses) {
    mode = "WAITING FOR CUSTOMER";
    statusText = "Waiting for customer decision.";
  } else if (isTyping) {
    statusText = "Evaluating available resolution…";
  } else if (resolution && resolution.entitlement !== "NONE") {
    mode = "SUPPORT APPLIED";
    statusText = "Entitlements applied for this disruption.";
  } else if (resolution) {
    statusText = "No active disruption on this booking.";
  }

  const agentSteps = deriveAgentStateMachine({
    booking,
    customer,
    flight,
    resolution,
    resolutionPending: isTyping,
    actionPending: actionStatus === "loading",
    aiEscalation,
    completedActionType,
  });

  const executionSteps = actionModal
    ? [
        { label: "Booking verified", status: "done" },
        { label: "Policy verified", status: "done" },
        {
          label: actionModal.type === "REBOOK" ? "rebook_flight()" : "request_refund()",
          status: actionStatus === "success" ? "done" : "active",
        },
      ]
    : undefined;

  return (
    <div className="space-y-4">
      <AgentHeader
        customer={customer}
        pnr={booking.pnr}
        flight={flight}
        resolution={resolution}
        customerChooses={customerChooses}
        mode={mode}
        active={isTyping}
        onOpenTrace={() => setTraceOpen(true)}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[240px_1fr] lg:items-start lg:grid-cols-[280px_1fr_340px]">
        {/* LEFT: Case Context */}
        <div className="md:col-span-1 lg:col-span-1">
          <CaseContextPanel customer={customer} booking={booking} flight={flight} />
        </div>

        {/* CENTER: Customer Conversation - a compact, bounded-height chat
            workspace (not stretched to match sibling columns), so it never
            takes over the page. */}
        <div className="md:col-span-1 lg:col-span-1">
          <CustomerConversation
            messages={messages}
            onSend={sendMessage}
            isTyping={isTyping}
            primary
            caseLabel={`Case: ${booking.pnr}${flight?.origin && flight?.destination ? ` · ${flight.origin} → ${flight.destination}` : ""}`}
            promptRow={
              <div className="flex flex-wrap items-center gap-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => sendMessage(prompt)}
                    disabled={isTyping}
                    className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/55 hover:border-violet-400/40 hover:text-white disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {prompt}
                  </button>
                ))}
                <SupervisorCallButton
                  booking={booking}
                  pnr={pnr}
                  escalation={aiEscalation}
                  reason="Customer requested supervisor assistance from the AI Assistant."
                  variant="ghost"
                  className="rounded-full! border-white/10! px-3! py-1! text-xs! font-normal! text-violet-300"
                  onEscalationCreated={(escalation) => handleEscalationReceived(escalation)}
                  onCallStarted={(call) => handleCallStatusChange(call)}
                >
                  Contact a supervisor
                </SupervisorCallButton>
              </div>
            }
          />
        </div>

        {/* RIGHT: Agent Decision / Policy / Supervisor Connection / Tool Runtime */}
        <div className="space-y-4 md:col-span-2 lg:col-span-1">
          <AgentWorkspace
            statusText={statusText}
            steps={agentSteps}
            resolution={resolution}
            onRebook={() => openActionModal("REBOOK")}
            onRefund={() => openActionModal("REFUND")}
            onEscalate={() => setEscalateOpen(true)}
          />

          <GlassCard className="p-5">
            <p className="mb-3 text-sm font-semibold text-white/70">Supervisor Connection</p>
            {aiEscalation ? (
              <div className="flex items-center gap-2 text-sm text-white/75">
                <span>{callStatusMeta(supervisorCall?.callStatus || "NOT_STARTED").icon}</span>
                <span>{callStatusMeta(supervisorCall?.callStatus || "NOT_STARTED").label}</span>
              </div>
            ) : (
              <>
                <p className="mb-3 text-sm text-white/50">
                  Supervisor assistance is available for this case.
                </p>
                <SupervisorCallButton
                  booking={booking}
                  pnr={pnr}
                  reason="Customer requested supervisor assistance from the AI Assistant."
                  onEscalationCreated={(escalation) => handleEscalationReceived(escalation)}
                  onCallStarted={(call) => handleCallStatusChange(call)}
                  className="w-full"
                />
              </>
            )}
          </GlassCard>

          <ToolRuntime
            booking={booking}
            customer={customer}
            flight={flight}
            resolution={resolution}
            resolutionPending={isTyping}
            pendingActionType={actionStatus === "loading" ? actionModal?.type : null}
            completedActionType={completedActionType}
            aiEscalation={aiEscalation}
            supervisorCall={supervisorCall}
          />
        </div>
      </div>

      <ExecutionTimeline steps={agentSteps} />

      {aiEscalation && (
        <AgentEscalationState
          escalation={aiEscalation}
          customer={customer}
          initialCall={supervisorCall}
          onCallStatusChange={handleCallStatusChange}
          onView={() => navigate("/escalations", { state: { escalationId: aiEscalation.id } })}
        />
      )}

      <ConfirmationModal
        open={Boolean(actionModal)}
        title={actionModal?.title}
        whatWillHappen={actionModal?.whatWillHappen}
        whyAvailable={actionModal?.whyAvailable}
        whatHappensNext={actionModal?.whatHappensNext}
        status={actionStatus}
        executionSteps={executionSteps}
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
        onSuccess={(escalation) => navigate("/escalations", { state: { escalationId: escalation.id } })}
      />

      <AgentTraceDrawer open={traceOpen} onClose={() => setTraceOpen(false)} traceLog={traceLog} />
    </div>
  );
}
