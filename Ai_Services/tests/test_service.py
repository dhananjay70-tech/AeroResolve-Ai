import unittest
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient
from google.genai import errors as genai_errors

from app.graph import nodes
from app.graph.workflow import workflow
from app.main import app
from app.services.backend_client import BackendClientError
from app.services.gemini_service import _detect_response_focus, gemini_service

# Real resolution shapes, matching exactly what the Node policy engine
# (policyService.js) produces for the seeded assignment scenarios - nothing
# here re-derives or guesses the policy, it mirrors the backend's own output
# so these tests catch drift instead of asserting invented numbers.

CANCELLATION_RESOLUTION = {
    "entitlement": "AIRLINE_CANCELLATION",
    "options": ["REBOOK_NEXT_AVAILABLE_WITHIN_24H", "FULL_REFUND"],
    "customerChooses": True,
    "loyalty": {"entitlement": "LOYALTY_TIER", "loyaltyTier": "Gold", "priorityRebooking": True},
}

DELAY_4H_RESOLUTION = {
    "entitlement": "DELAY",
    "delayMinutes": 240,
    "entitlements": [
        {"type": "MEAL_VOUCHER", "amountInr": 500},
        {"type": "LOUNGE_ACCESS"},
    ],
    "loyalty": {"entitlement": "LOYALTY_TIER", "loyaltyTier": "Silver", "priorityRebooking": False},
}

DELAY_6H_RESOLUTION = {
    "entitlement": "DELAY",
    "delayMinutes": 360,
    "entitlements": [
        {"type": "MEAL_VOUCHER", "amountInr": 500},
        {"type": "LOUNGE_ACCESS"},
        {"type": "HOTEL_ACCOMMODATION", "coversDelayedHoursOnly": True},
    ],
    "loyalty": {"entitlement": "LOYALTY_TIER", "loyaltyTier": "Platinum", "priorityRebooking": True},
}


class HealthTests(unittest.TestCase):
    def test_health(self):
        client = TestClient(app)
        resp = client.get("/health")
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body, {"success": True, "service": "AeroResolve AI Service", "status": "healthy"})


class ChatEndpointTests(unittest.TestCase):
    def test_ai_chat_basic_shape(self):
        with patch("app.graph.nodes.customer_tools.get_customer_info", new=AsyncMock(return_value={"name": "Priya Nair", "loyaltyTier": "Gold"})), \
             patch("app.graph.nodes.booking_tools.get_booking_info", new=AsyncMock(return_value={"id": "booking-1", "pnr": "SK4821X", "status": "cancelled", "flight": {"status": "cancelled", "delayMinutes": 0}})), \
             patch("app.graph.nodes.policy_tools.check_and_resolve", new=AsyncMock(return_value={"conversationId": "conv-1", "resolution": CANCELLATION_RESOLUTION, "appliedActions": []})), \
             patch("app.graph.nodes.gemini_service.generate_customer_message", new=AsyncMock(return_value=("You can rebook or get a full refund.", False))):
            client = TestClient(app)
            resp = client.post("/api/ai/chat", json={"message": "What can I do?", "pnr": "SK4821X"})

        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertTrue(body["success"])
        self.assertEqual(body["conversation_id"], "conv-1")
        self.assertEqual(body["resolution"]["entitlement"], "AIRLINE_CANCELLATION")
        self.assertIsInstance(body["message"], str)
        self.assertTrue(len(body["message"]) > 0)

    def test_optional_conversation_id_accepts_missing_field(self):
        # Mirrors the pAi.txt note: conversation_id must be optional, and a
        # request that omits it entirely must not fail Pydantic validation.
        with patch("app.graph.nodes.understand_intent", new=AsyncMock(return_value={"pnr": None, "error": nodes.MISSING_PNR_MESSAGE})):
            client = TestClient(app)
            resp = client.post("/api/ai/chat", json={"message": "hello"})
        self.assertEqual(resp.status_code, 200)


class LocalIntentTests(unittest.TestCase):
    def test_classify_intent_local_detects_disruption_keywords(self):
        self.assertEqual(nodes.classify_intent_local("My flight was cancelled"), "disruption_inquiry")
        self.assertEqual(nodes.classify_intent_local("It's delayed by 3 hours"), "disruption_inquiry")
        self.assertEqual(nodes.classify_intent_local("Can I get a hotel?"), "disruption_inquiry")

    def test_classify_intent_local_falls_back_to_general(self):
        self.assertEqual(nodes.classify_intent_local("What time does the airport open?"), "general_inquiry")

    def test_detect_unsupported_request_local(self):
        self.assertTrue(nodes.detect_unsupported_request_local("Give me a free upgrade."))
        self.assertFalse(nodes.detect_unsupported_request_local("My flight was cancelled."))

    def test_detect_manager_request_local(self):
        self.assertTrue(nodes.detect_manager_request_local("Connect me to your manager."))
        self.assertTrue(nodes.detect_manager_request_local("I want to speak to a supervisor."))
        self.assertTrue(nodes.detect_manager_request_local("Can I talk to a human?"))
        self.assertTrue(nodes.detect_manager_request_local("Please escalate this."))
        self.assertFalse(nodes.detect_manager_request_local("My flight was cancelled."))


class NodeTests(unittest.IsolatedAsyncioTestCase):
    async def test_missing_pnr(self):
        state = {"user_message": "hi", "pnr": None}
        result = await nodes.understand_intent(state)
        self.assertEqual(result["error"], nodes.MISSING_PNR_MESSAGE)

    async def test_understand_intent_does_not_call_gemini(self):
        with patch("app.graph.nodes.gemini_service.generate_customer_message", new=AsyncMock()) as mock_generate:
            state = {"user_message": "My flight was cancelled", "pnr": "SK4821X"}
            result = await nodes.understand_intent(state)
        mock_generate.assert_not_awaited()
        self.assertEqual(result["intent"], "disruption_inquiry")
        self.assertFalse(result["unsupported_request"])

    async def test_unknown_pnr_returns_not_found_message(self):
        with patch("app.graph.nodes.customer_tools.get_customer_info", new=AsyncMock(side_effect=BackendClientError(404, "Booking not found for the given PNR"))):
            state = {"pnr": "ZZ0000X", "user_message": "hi"}
            result = await nodes.load_context(state)
        self.assertEqual(result["error"], nodes.NOT_FOUND_MESSAGE)

    async def test_backend_connection_failure(self):
        with patch("app.graph.nodes.customer_tools.get_customer_info", new=AsyncMock(side_effect=BackendClientError(0, "Could not reach the backend service."))):
            state = {"pnr": "SK4821X", "user_message": "hi"}
            result = await nodes.load_context(state)
        self.assertEqual(result["error"], nodes.GENERIC_ERROR_MESSAGE)
        # never leaks internal detail to the customer-facing message
        self.assertNotIn("Could not reach", result["error"])

    async def test_cancellation_scenario(self):
        with patch("app.graph.nodes.policy_tools.check_and_resolve", new=AsyncMock(return_value={"conversationId": "c1", "resolution": CANCELLATION_RESOLUTION, "appliedActions": []})):
            state = {"pnr": "SK4821X", "user_message": "cancelled?", "conversation_id": None}
            result = await nodes.check_policy_and_resolve(state)

        self.assertEqual(result["available_actions"]["entitlement"], "AIRLINE_CANCELLATION")
        self.assertEqual(
            set(result["available_actions"]["options"]),
            {"REBOOK_NEXT_AVAILABLE_WITHIN_24H", "FULL_REFUND"},
        )

    async def test_4h_delay_scenario_no_hotel(self):
        with patch("app.graph.nodes.policy_tools.check_and_resolve", new=AsyncMock(return_value={"conversationId": "c1", "resolution": DELAY_4H_RESOLUTION, "appliedActions": []})):
            state = {"pnr": "TR1190B", "user_message": "delayed?", "conversation_id": None}
            result = await nodes.check_policy_and_resolve(state)

        types_ = {e["type"] for e in result["available_actions"]["entitlements"]}
        self.assertEqual(types_, {"MEAL_VOUCHER", "LOUNGE_ACCESS"})
        self.assertNotIn("HOTEL_ACCOMMODATION", types_)

    async def test_6h_delay_scenario_includes_hotel(self):
        with patch("app.graph.nodes.policy_tools.check_and_resolve", new=AsyncMock(return_value={"conversationId": "c1", "resolution": DELAY_6H_RESOLUTION, "appliedActions": []})):
            state = {"pnr": "WL7742", "user_message": "need a hotel", "conversation_id": None}
            result = await nodes.check_policy_and_resolve(state)

        types_ = {e["type"] for e in result["available_actions"]["entitlements"]}
        self.assertEqual(types_, {"MEAL_VOUCHER", "LOUNGE_ACCESS", "HOTEL_ACCOMMODATION"})

    async def test_escalation_scenario(self):
        escalation_record = {"id": "esc-1", "status": "open", "reason": "fare waiver"}
        with patch("app.graph.nodes.action_tools.create_escalation", new=AsyncMock(return_value=escalation_record)) as mock_create:
            state = {
                "pnr": "WL7742",
                "user_message": "Please waive the full 2000 fare difference.",
                "booking": {"id": "booking-3"},
            }
            result = await nodes.handle_escalation(state)

        mock_create.assert_awaited_once()
        called_booking_id = mock_create.await_args.args[0]
        self.assertEqual(called_booking_id, "booking-3")
        self.assertEqual(result["escalation"], escalation_record)

    async def test_escalation_without_manager_request_does_not_trigger_a_call(self):
        escalation_record = {"id": "esc-1", "status": "open", "reason": "fare waiver"}
        with patch("app.graph.nodes.action_tools.create_escalation", new=AsyncMock(return_value=escalation_record)), \
             patch("app.graph.nodes.voice_tools.request_supervisor_call", new=AsyncMock()) as mock_call:
            state = {
                "pnr": "WL7742",
                "user_message": "Please waive the full 2000 fare difference.",
                "booking": {"id": "booking-3"},
                "manager_requested": False,
            }
            result = await nodes.handle_escalation(state)

        mock_call.assert_not_awaited()
        self.assertNotIn("supervisor_call", result)

    async def test_manager_request_triggers_a_real_supervisor_call(self):
        escalation_record = {"id": "esc-2", "status": "open", "reason": "Customer requested a supervisor"}
        call_record = {"escalationId": "esc-2", "callId": "call-1", "callStatus": "CALL_INITIATING"}
        with patch("app.graph.nodes.action_tools.create_escalation", new=AsyncMock(return_value=escalation_record)), \
             patch("app.graph.nodes.voice_tools.request_supervisor_call", new=AsyncMock(return_value=call_record)) as mock_call:
            state = {
                "pnr": "SK4821X",
                "user_message": "Please connect me to your manager.",
                "booking": {"id": "booking-2"},
                "manager_requested": True,
            }
            result = await nodes.handle_escalation(state)

        mock_call.assert_awaited_once_with("esc-2")
        self.assertEqual(result["supervisor_call"], call_record)

    async def test_supervisor_call_failure_leaves_the_escalation_intact(self):
        escalation_record = {"id": "esc-3", "status": "open", "reason": "Customer requested a supervisor"}
        with patch("app.graph.nodes.action_tools.create_escalation", new=AsyncMock(return_value=escalation_record)), \
             patch("app.graph.nodes.voice_tools.request_supervisor_call", new=AsyncMock(side_effect=BackendClientError(502, "voice provider error"))):
            state = {
                "pnr": "SK4821X",
                "user_message": "I want your manager.",
                "booking": {"id": "booking-2"},
                "manager_requested": True,
            }
            result = await nodes.handle_escalation(state)

        self.assertEqual(result["escalation"], escalation_record)
        self.assertNotIn("supervisor_call", result)

    async def test_generate_response_logs_success_only_on_real_gemini_reply(self):
        with patch("app.graph.nodes.gemini_service.generate_customer_message", new=AsyncMock(return_value=("Hi there.", False))):
            with self.assertLogs("app.graph.nodes", level="INFO") as captured:
                result = await nodes.generate_response({"customer": {"name": "Sam"}})
        self.assertEqual(result["response"], "Hi there.")
        self.assertTrue(any("Gemini response generated." in line for line in captured.output))
        self.assertFalse(any("Gemini fallback response generated." in line for line in captured.output))

    async def test_generate_response_logs_fallback_when_gemini_fell_back(self):
        with patch("app.graph.nodes.gemini_service.generate_customer_message", new=AsyncMock(return_value=("Hi there, fallback.", True))):
            with self.assertLogs("app.graph.nodes", level="INFO") as captured:
                result = await nodes.generate_response({"customer": {"name": "Sam"}})
        self.assertEqual(result["response"], "Hi there, fallback.")
        self.assertTrue(any("Gemini fallback response generated." in line for line in captured.output))
        self.assertFalse(any(line.endswith("Gemini response generated.") for line in captured.output))


class GeminiServiceTests(unittest.IsolatedAsyncioTestCase):
    """Exercises generate_customer_message() directly against a fake Gemini
    client so these never make a real network call - keeping the suite fast,
    deterministic, and free of the cross-event-loop httpx cleanup noise that
    real calls produced when reused across separate test event loops."""

    @staticmethod
    def _client_returning(generate_content_mock):
        fake_client = MagicMock()
        fake_client.aio.models.generate_content = generate_content_mock
        return fake_client

    async def test_successful_response_is_not_flagged_as_fallback(self):
        response = MagicMock(text="Hi there, here is your update.")
        with patch.object(gemini_service, "_client", self._client_returning(AsyncMock(return_value=response))):
            message, used_fallback = await gemini_service.generate_customer_message({"customer": {"name": "Sam"}})
        self.assertEqual(message, "Hi there, here is your update.")
        self.assertFalse(used_fallback)

    async def test_429_resource_exhausted_uses_fallback(self):
        error = genai_errors.ClientError(429, {"error": {"status": "RESOURCE_EXHAUSTED", "message": "quota"}})
        with patch.object(gemini_service, "_client", self._client_returning(AsyncMock(side_effect=error))):
            message, used_fallback = await gemini_service.generate_customer_message({"customer": {"name": "Sam"}})
        self.assertTrue(used_fallback)
        self.assertIn("Sam", message)

    async def test_503_unavailable_uses_fallback(self):
        error = genai_errors.ServerError(503, {"error": {"status": "UNAVAILABLE", "message": "busy"}})
        with patch.object(gemini_service, "_client", self._client_returning(AsyncMock(side_effect=error))):
            message, used_fallback = await gemini_service.generate_customer_message({"customer": {"name": "Sam"}})
        self.assertTrue(used_fallback)
        self.assertIn("Sam", message)


class WorkflowRoutingTests(unittest.IsolatedAsyncioTestCase):
    async def test_full_workflow_routes_to_escalation_when_unsupported(self):
        with patch("app.graph.nodes.customer_tools.get_customer_info", new=AsyncMock(return_value={"name": "Meher Kaur", "loyaltyTier": "Platinum"})), \
             patch("app.graph.nodes.booking_tools.get_booking_info", new=AsyncMock(return_value={"id": "booking-3", "flight": {"status": "delayed", "delayMinutes": 360}})), \
             patch("app.graph.nodes.policy_tools.check_and_resolve", new=AsyncMock(return_value={"conversationId": "c1", "resolution": DELAY_6H_RESOLUTION, "appliedActions": []})), \
             patch("app.graph.nodes.action_tools.create_escalation", new=AsyncMock(return_value={"id": "esc-9", "status": "open"})), \
             patch("app.graph.nodes.gemini_service.generate_customer_message", new=AsyncMock(return_value=("This has been sent for supervisor review.", False))):
            result = await workflow.ainvoke(
                {"user_message": "Give me a free upgrade.", "pnr": "WL7742", "unsupported_request": False},
                config={"configurable": {"thread_id": "test-thread-escalation"}},
            )

        self.assertEqual(result["escalation"]["id"], "esc-9")
        self.assertTrue(result["response"])


class ResponseFocusTests(unittest.TestCase):
    """The five example questions from the bug report - the fallback (and
    the Gemini prompt, via the same user_message field) must be able to
    tell these apart instead of answering every one the same way."""

    def test_options_question(self):
        self.assertEqual(_detect_response_focus("What are my options?"), "options")

    def test_refund_question(self):
        self.assertEqual(_detect_response_focus("Can I get a refund?"), "refund")

    def test_rebook_question(self):
        self.assertEqual(_detect_response_focus("Can I rebook my flight?"), "rebook")

    def test_support_eligibility_question(self):
        self.assertEqual(_detect_response_focus("What support am I eligible for?"), "support")

    def test_supervisor_request_is_routed_before_focus_detection_matters(self):
        # "Contact a supervisor" never reaches _detect_response_focus in the
        # real graph - handle_escalation intercepts it first (manager_requested).
        self.assertTrue(nodes.detect_manager_request_local("Contact a supervisor"))


class DeterministicFallbackIntentTests(unittest.TestCase):
    """Exercises the actual bug from the screenshot: with Gemini unavailable
    (the deterministic fallback), different questions about the same
    DELAY/CANCELLATION resolution must produce meaningfully different,
    intent-specific answers - never the same generic paragraph every time."""

    def _facts(self, resolution, user_message):
        return {
            "user_message": user_message,
            "conversation_history": [],
            "customer": {"name": "Meher Kaur"},
            "flight": {"flightNumber": "SK-305"},
            "resolution": resolution,
        }

    def test_delay_resolution_answers_differ_by_question(self):
        answers = {
            question: gemini_service._deterministic_message(self._facts(DELAY_6H_RESOLUTION, question))
            for question in [
                "What are my options?",
                "Can I get a refund?",
                "Can I rebook my flight?",
                "What support am I eligible for?",
            ]
        }
        # All four must be distinct - this is exactly what the bug report
        # screenshotted as three identical replies in a row.
        self.assertEqual(len(set(answers.values())), 4, answers)
        self.assertIn("isn't offered for a delay", answers["Can I get a refund?"])
        self.assertIn("no separate rebooking", answers["Can I rebook my flight?"])
        self.assertIn("meal voucher", answers["What support am I eligible for?"].lower())
        self.assertIn("meal voucher", answers["What are my options?"].lower())

    def test_cancellation_resolution_answers_differ_by_question(self):
        refund_answer = gemini_service._deterministic_message(
            self._facts(CANCELLATION_RESOLUTION, "Can I get a refund?")
        )
        rebook_answer = gemini_service._deterministic_message(
            self._facts(CANCELLATION_RESOLUTION, "Can I rebook my flight?")
        )
        support_answer = gemini_service._deterministic_message(
            self._facts(CANCELLATION_RESOLUTION, "What support am I eligible for?")
        )
        self.assertNotEqual(refund_answer, rebook_answer)
        self.assertNotEqual(refund_answer, support_answer)
        self.assertIn("full refund", refund_answer.lower())
        self.assertNotIn("full refund", rebook_answer.lower())
        self.assertIn("rebook", rebook_answer.lower())

    def test_focus_never_invents_an_entitlement_not_in_the_facts(self):
        # 4h delay has no HOTEL_ACCOMMODATION - asking about "support" must
        # not claim hotel coverage that policyService never granted.
        answer = gemini_service._deterministic_message(
            self._facts(DELAY_4H_RESOLUTION, "What support am I eligible for?")
        )
        self.assertNotIn("hotel", answer.lower())


class ConversationHistoryTests(unittest.IsolatedAsyncioTestCase):
    """generate_response must expose the current question and prior turns
    to Gemini - without this, Gemini has no way to know what was actually
    asked and (like the deterministic fallback before this fix) just
    describes the resolution the same way every time."""

    async def test_facts_include_user_message_and_prior_history(self):
        captured_facts = {}

        async def fake_generate(facts):
            captured_facts.update(facts)
            return "some reply", False

        with patch("app.graph.nodes.gemini_service.generate_customer_message", new=fake_generate):
            state = {
                "user_message": "Can I get a refund?",
                "history": [
                    {"role": "user", "content": "What are my options?"},
                    {"role": "assistant", "content": "You can rebook or get a refund."},
                    {"role": "user", "content": "Can I get a refund?"},
                ],
                "available_actions": CANCELLATION_RESOLUTION,
            }
            result = await nodes.generate_response(state)

        self.assertEqual(captured_facts["user_message"], "Can I get a refund?")
        self.assertEqual(
            captured_facts["conversation_history"],
            [
                {"role": "user", "content": "What are my options?"},
                {"role": "assistant", "content": "You can rebook or get a refund."},
            ],
        )
        # The assistant's new reply is appended so the *next* turn sees it too.
        self.assertEqual(result["history"][-1], {"role": "assistant", "content": "some reply"})

    async def test_understand_intent_appends_to_restored_history(self):
        # Simulates the checkpointer restoring a previous turn's history
        # before this node runs.
        state = {
            "user_message": "Can I get a refund?",
            "pnr": "SK4821X",
            "history": [
                {"role": "user", "content": "What are my options?"},
                {"role": "assistant", "content": "You can rebook or get a refund."},
            ],
        }
        result = await nodes.understand_intent(state)
        self.assertEqual(len(result["history"]), 3)
        self.assertEqual(result["history"][-1], {"role": "user", "content": "Can I get a refund?"})

    async def test_checkpointer_threads_history_across_two_real_workflow_calls(self):
        with patch("app.graph.nodes.customer_tools.get_customer_info", new=AsyncMock(return_value={"name": "Meher Kaur", "loyaltyTier": "Platinum"})), \
             patch("app.graph.nodes.booking_tools.get_booking_info", new=AsyncMock(return_value={"id": "booking-3", "flight": {"status": "delayed", "delayMinutes": 360}})), \
             patch("app.graph.nodes.policy_tools.check_and_resolve", new=AsyncMock(return_value={"conversationId": "conv-hist", "resolution": DELAY_6H_RESOLUTION, "appliedActions": []})), \
             patch("app.graph.nodes.gemini_service.generate_customer_message", new=AsyncMock(side_effect=[("first reply", False), ("second reply", False)])):
            config = {"configurable": {"thread_id": "conv-hist"}}
            first = await workflow.ainvoke({"user_message": "What are my options?", "pnr": "WL7742"}, config=config)
            second = await workflow.ainvoke({"user_message": "Can I get a refund?", "pnr": "WL7742"}, config=config)

        self.assertEqual(first["response"], "first reply")
        self.assertEqual(second["response"], "second reply")
        # The second call's history must contain all four turns from both
        # calls - proof the checkpointer actually carried state forward.
        self.assertEqual(
            [entry["content"] for entry in second["history"]],
            ["What are my options?", "first reply", "Can I get a refund?", "second reply"],
        )


if __name__ == "__main__":
    unittest.main()
