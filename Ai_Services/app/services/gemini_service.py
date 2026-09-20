import json
from typing import Any, Optional

from google import genai
from google.genai import errors, types

from app.config import get_logger, settings

logger = get_logger(__name__)

RESPONSE_SYSTEM_PROMPT = """You are a customer-facing airline support assistant.
Use ONLY the supplied customer, booking, flight, and policy information.
Do not invent policies, compensation, actions, dates, prices, or flight details.
The backend policy result is authoritative.
Explain the result clearly and naturally.
If an action was successfully performed, tell the customer.
If an action is not allowed or requires escalation, explain that clearly.
Never claim an action happened unless the backend confirms it.

The facts include "user_message" - the customer's current question - and
"conversation_history" - prior turns in this same conversation, oldest
first. Your reply must:
- Directly answer THIS question, not a generic restatement of every fact you have.
  For example, if asked specifically about a refund, lead with refund eligibility (yes/no
  and why, from the facts) rather than re-listing every entitlement. If asked about
  rebooking, lead with rebooking. If asked broadly ("what are my options"), then summarize
  everything relevant.
- If a follow-up question depends on something said earlier (e.g. "and how long does that
  take?"), use conversation_history to resolve what "that" refers to instead of guessing.
- Never repeat the exact same message you already gave earlier in conversation_history
  unless the customer is asking the same thing again - vary the phrasing and focus to match
  the current question.

Rules:
- Only state entitlements/options/amounts that appear in the provided facts. Never invent
  compensation, upgrades, or policy exceptions that are not present in the facts.
- If an escalation was created, say the request has been sent for supervisor review and why.
- If a supervisor_call is present with a real callStatus (not "NOT_CONFIGURED"), mention a
  supervisor is being called now. If supervisor_call is missing or NOT_CONFIGURED, do not claim a
  call is happening - only say the request was sent for review.
- If the customer asked for something not covered by the facts and no escalation was created,
  explain politely that it is outside standard policy.
- Be warm but concise. No markdown, no bullet lists, plain prose."""


def _detect_response_focus(message: str) -> str:
    """Which already-computed fact the customer's question is actually
    about - used only to pick what the deterministic fallback leads with
    when Gemini is unavailable. Never decides policy or invents an
    entitlement; it only selects among facts the backend already returned.
    Gemini gets the same `user_message` directly and reasons about it
    itself instead of going through this classifier."""
    text = (message or "").lower()
    if any(w in text for w in ("refund", "money back", "reimburse")):
        return "refund"
    if any(w in text for w in ("rebook", "re-book", "another flight", "reschedule", "change my flight")):
        return "rebook"
    if any(
        w in text
        for w in ("meal", "voucher", "lounge", "hotel", "accommodation", "eligible", "eligibility", "support", "compensation")
    ):
        return "support"
    return "options"


class GeminiService:
    """Thin, isolated wrapper around the Gemini API.

    generate_customer_message() is the ONLY method in this service - and the
    ONLY place in the whole AI service - that calls
    self._client.aio.models.generate_content(...). Intent classification is
    handled locally (see app/graph/nodes.py) so each chat request makes
    exactly one Gemini call.
    """

    def __init__(self):
        self._model = settings.GEMINI_MODEL
        self._client: Optional[genai.Client] = None
        if settings.GEMINI_API_KEY:
            self._client = genai.Client(api_key=settings.GEMINI_API_KEY)
        else:
            logger.warning("GEMINI_API_KEY not set; falling back to deterministic responses.")

    @property
    def is_configured(self) -> bool:
        return self._client is not None

    async def generate_customer_message(self, facts: dict[str, Any]) -> tuple[str, bool]:
        """Returns (message, used_fallback) so callers can tell a real Gemini
        reply apart from the deterministic fallback without re-deriving it."""
        if not self._client:
            return self._deterministic_message(facts), True

        try:
            prompt = f"{RESPONSE_SYSTEM_PROMPT}\n\nFacts (JSON): {json.dumps(facts, default=str)}"
            # Single attempt - no internal retry. Retrying a 429 just burns
            # more of the free-tier quota, so any failure (rate limit,
            # timeout, API error) falls straight through to the
            # deterministic fallback below instead of calling Gemini again.
            response = await self._client.aio.models.generate_content(
                model=self._model,
                contents=prompt,
                config=types.GenerateContentConfig(temperature=0.4),
            )
            text = (response.text or "").strip()
            if text:
                return text, False
            return self._deterministic_message(facts), True
        except errors.APIError as exc:
            # 429 RESOURCE_EXHAUSTED and 503 UNAVAILABLE are expected,
            # recoverable conditions - the Gemini SDK already applies its own
            # retry/backoff before raising, so we do not retry again here.
            # Log a short line (no traceback) and fall straight through to
            # the deterministic fallback.
            if exc.code == 429 or exc.status == "RESOURCE_EXHAUSTED":
                logger.warning("Gemini rate limit reached; using fallback.")
            elif exc.code == 503 or exc.status == "UNAVAILABLE":
                logger.warning("Gemini temporarily unavailable; using fallback.")
            else:
                logger.exception("Gemini response generation failed; using fallback.")
            return self._deterministic_message(facts), True
        except Exception:
            logger.exception("Gemini response generation failed; using fallback.")
            return self._deterministic_message(facts), True

    @staticmethod
    def _deterministic_message(facts: dict[str, Any]) -> str:
        """A safe, factual message used when Gemini is unavailable or fails.

        Still varies by what the customer actually asked (see
        _detect_response_focus) even though it can't reason freely like
        Gemini - it only ever selects among fields already present on the
        real backend `resolution`, never invents new ones.
        """
        if facts.get("error"):
            return facts["error"]

        name = (facts.get("customer") or {}).get("name", "there")
        resolution = facts.get("resolution") or {}
        entitlement = resolution.get("entitlement")
        focus = _detect_response_focus(facts.get("user_message"))

        if facts.get("escalation"):
            call_status = (facts.get("supervisor_call") or {}).get("callStatus")
            if call_status and call_status != "NOT_CONFIGURED":
                return (
                    f"Hi {name}. I've escalated this and I'm calling a supervisor now to walk "
                    "them through your case - they'll be with you shortly."
                )
            return (
                f"Hi {name}. This request is outside standard policy, so I've sent it to a "
                "supervisor for review."
            )

        if entitlement == "AIRLINE_CANCELLATION":
            options = resolution.get("options") or []
            can_refund = "FULL_REFUND" in options
            can_rebook = "REBOOK_NEXT_AVAILABLE_WITHIN_24H" in options
            priority = bool((resolution.get("loyalty") or {}).get("priorityRebooking"))

            if focus == "refund":
                if can_refund:
                    return (
                        f"Hi {name}. Yes - since your flight was cancelled, you're eligible for "
                        "a full refund to your original payment method."
                    )
                return f"Hi {name}. A refund isn't available for this case under standard policy."
            if focus == "rebook":
                if can_rebook:
                    priority_note = (
                        " As a priority member, your rebooking will be handled first." if priority else ""
                    )
                    return (
                        f"Hi {name}. Yes - you can rebook onto the next available flight within "
                        f"24 hours at no extra cost.{priority_note}"
                    )
                return f"Hi {name}. Rebooking isn't available for this case under standard policy."
            if focus == "support":
                return (
                    f"Hi {name}. For a cancelled flight, standard policy offers a free rebooking "
                    "within 24 hours or a full refund - there's no separate meal, lounge, or "
                    "hotel entitlement for a cancellation."
                )
            return (
                f"Hi {name}. Your flight was cancelled. You can choose a free rebooking on "
                "the next available flight within 24 hours, or a full refund to your original "
                "payment method."
            )

        if entitlement == "DELAY":
            entitlements = resolution.get("entitlements", [])
            items = ", ".join(e["type"].replace("_", " ").lower() for e in entitlements)
            if focus == "refund":
                return (
                    f"Hi {name}. A refund isn't offered for a delay under standard policy; "
                    f"for this delay you're eligible for: {items}."
                )
            if focus == "rebook":
                return (
                    f"Hi {name}. There's no separate rebooking for a delay - you stay on your "
                    f"current flight; you're eligible for: {items}."
                )
            if focus == "support":
                return f"Hi {name}. For this delay, you're eligible for: {items}."
            return f"Hi {name}. Your flight is delayed. You're eligible for: {items}."

        return f"Hi {name}. I don't see any active disruption on this booking right now."


gemini_service = GeminiService()
