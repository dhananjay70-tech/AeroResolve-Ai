from app.config import get_logger
from app.graph.state import AgentState
from app.services.backend_client import BackendClientError
from app.services.gemini_service import gemini_service
from app.tools import action_tools, booking_tools, customer_tools, policy_tools, voice_tools

logger = get_logger(__name__)

GENERIC_ERROR_MESSAGE = "Sorry, I'm unable to retrieve your booking right now. Please try again."
NOT_FOUND_MESSAGE = "I couldn't find a booking for that PNR. Could you double-check it?"
MISSING_PNR_MESSAGE = "Could you share your PNR/booking reference so I can look into this?"

# Local, deterministic routing only - no policy decisions are made here.
# The backend policy engine (called in check_policy_and_resolve) remains the
# only source of truth for entitlements and escalation eligibility.
_DISRUPTION_KEYWORDS = [
    "cancel", "cancelled", "cancellation", "refund", "rebook", "reschedule",
    "delay", "delayed", "late", "flight status",
    "hotel", "lounge", "meal", "voucher",
]

# Mirrors the categories the Node policy engine already treats as outside
# standard policy (policyService.checkProhibitedAction) - used only to route
# to the escalation node, never to decide the outcome of the escalation.
_UNSUPPORTED_REQUEST_KEYWORDS = [
    "free upgrade", "upgrade for free", "business class upgrade", "first class upgrade",
    "compensation beyond", "extra compensation", "additional compensation",
    "waive the fare", "waive fare", "waive the difference", "waive the full",
    "different payment method", "different card", "different account", "different bank",
    "legal action", "sue you", "lawsuit", "formal complaint", "my lawyer", "take this to court",
]

# Customer explicitly asking for a human/supervisor (India-only outbound
# supervisor calling - see handle_escalation). Routing only: the decision to
# actually place a call still goes through the Node backend/voiceService.
_MANAGER_REQUEST_KEYWORDS = [
    "manager", "supervisor", "talk to a human", "speak to a human", "real person",
    "human agent", "escalate this", "escalate my", "please escalate",
]


def _safe_error_message(exc: BackendClientError) -> str:
    if exc.status_code == 404:
        return NOT_FOUND_MESSAGE
    return GENERIC_ERROR_MESSAGE


def classify_intent_local(message: str) -> str:
    text = message.lower()
    if any(word in text for word in _DISRUPTION_KEYWORDS):
        return "disruption_inquiry"
    return "general_inquiry"


def detect_unsupported_request_local(message: str) -> bool:
    text = message.lower()
    return any(phrase in text for phrase in _UNSUPPORTED_REQUEST_KEYWORDS)


def detect_manager_request_local(message: str) -> bool:
    text = message.lower()
    return any(phrase in text for phrase in _MANAGER_REQUEST_KEYWORDS)


async def understand_intent(state: AgentState) -> dict:
    pnr = (state.get("pnr") or "").strip()
    # The checkpointer (workflow.py) restores `history` from the previous
    # turn in this same conversation before this node runs - append the new
    # turn onto it rather than overwrite, so it accumulates across requests.
    history = list(state.get("history") or [])
    history.append({"role": "user", "content": state["user_message"]})

    if not pnr:
        logger.info("Chat request received without a PNR.")
        return {"pnr": None, "error": MISSING_PNR_MESSAGE, "history": history}

    logger.info("Chat request received for PNR=%s", pnr)
    intent = classify_intent_local(state["user_message"])
    unsupported_request = detect_unsupported_request_local(state["user_message"])
    manager_requested = detect_manager_request_local(state["user_message"])
    logger.info(
        "Intent classified locally: intent=%s unsupported=%s manager_requested=%s",
        intent, unsupported_request, manager_requested,
    )
    return {
        "pnr": pnr,
        "intent": intent,
        "unsupported_request": unsupported_request,
        "manager_requested": manager_requested,
        "history": history,
    }


async def load_context(state: AgentState) -> dict:
    pnr = state["pnr"]
    try:
        customer = await customer_tools.get_customer_info(pnr)
        booking = await booking_tools.get_booking_info(pnr)
    except BackendClientError as exc:
        logger.warning("load_context failed for PNR=%s: %s", pnr, exc.message)
        return {"error": _safe_error_message(exc)}

    return {"customer": customer, "booking": booking, "flight": booking.get("flight")}


async def check_policy_and_resolve(state: AgentState) -> dict:
    pnr = state["pnr"]
    try:
        result = await policy_tools.check_and_resolve(
            pnr, state["user_message"], state.get("conversation_id")
        )
    except BackendClientError as exc:
        logger.warning("check_policy_and_resolve failed for PNR=%s: %s", pnr, exc.message)
        return {"error": _safe_error_message(exc)}

    resolution = result.get("resolution")
    logger.info("Policy resolution completed: entitlement=%s", (resolution or {}).get("entitlement"))
    return {
        "conversation_id": result.get("conversationId"),
        "available_actions": resolution,
        "applied_actions": result.get("appliedActions"),
    }


async def handle_escalation(state: AgentState) -> dict:
    booking = state.get("booking")
    if not booking:
        return {}

    manager_requested = state.get("manager_requested", False)
    reason = (
        f"Customer requested a supervisor: {state['user_message']}"
        if manager_requested
        else f"Customer request outside standard policy: {state['user_message']}"
    )
    try:
        escalation = await action_tools.create_escalation(
            booking["id"],
            reason,
            {"type": "CUSTOMER_REQUEST", "pnr": state["pnr"], "message": state["user_message"]},
        )
    except BackendClientError as exc:
        logger.warning("Escalation creation failed for PNR=%s: %s", state["pnr"], exc.message)
        return {}

    logger.info("Escalation created id=%s for PNR=%s", escalation.get("id"), state["pnr"])
    result: dict = {"escalation": escalation}

    if not manager_requested:
        return result

    # The customer explicitly asked for a human, so the escalation is
    # followed by a real outbound call to the supervisor - Node owns the
    # Exotel credentials and the actual call; failures here never undo the
    # escalation that was just created above.
    try:
        supervisor_call = await voice_tools.request_supervisor_call(escalation["id"])
        logger.info(
            "Supervisor call status=%s for escalation=%s",
            supervisor_call.get("callStatus"), escalation.get("id"),
        )
        result["supervisor_call"] = supervisor_call
    except BackendClientError as exc:
        logger.warning("Supervisor call request failed for escalation=%s: %s", escalation.get("id"), exc.message)

    return result


async def generate_response(state: AgentState) -> dict:
    if state.get("error"):
        return {"response": state["error"]}

    history = state.get("history") or []
    # `history` already ends with the current user turn (appended in
    # understand_intent) - conversation_history is everything said BEFORE
    # it, so the current question is only ever represented once in the
    # prompt, in `user_message`.
    facts = {
        "user_message": state.get("user_message"),
        "conversation_history": history[:-1],
        "customer": state.get("customer"),
        "flight": state.get("flight"),
        "resolution": state.get("available_actions"),
        "applied_actions": state.get("applied_actions"),
        "escalation": state.get("escalation"),
        "supervisor_call": state.get("supervisor_call"),
    }
    logger.info("Calling Gemini once for final response.")
    message, used_fallback = await gemini_service.generate_customer_message(facts)
    logger.info("Gemini fallback response generated." if used_fallback else "Gemini response generated.")

    history = history + [{"role": "assistant", "content": message}]
    return {"response": message, "history": history}
