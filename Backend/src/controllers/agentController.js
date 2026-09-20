const { eq } = require("drizzle-orm");
const { db, schema } = require("../db");
const bookingService = require("../services/bookingService");
const policyService = require("../services/policyService");
const actionService = require("../services/actionService");
const { success } = require("../utils/response");
const { AppError } = require("../middleware/errorMiddleware");
const env = require("../config/env");

// Prototype resolution logic: deterministic, policy-driven, and does not
// depend on an LLM. The AI_Services layer (LangGraph + Gemini) will later
// call into this same backend, which remains the source of truth for policy
// decisions.
function resolveFromBooking(booking, customer) {
  if (booking.status === "cancelled") {
    return {
      ...policyService.evaluateAirlineCancellation(),
      loyalty: policyService.evaluateLoyaltyTier(customer.loyaltyTier),
    };
  }

  const delayMinutes = booking.flight?.delayMinutes ?? 0;

  if (delayMinutes > 0) {
    return {
      ...policyService.evaluateDelay(delayMinutes),
      loyalty: policyService.evaluateLoyaltyTier(customer.loyaltyTier),
    };
  }

  return {
    entitlement: "NONE",
    message: "No active disruption found for this booking.",
    loyalty: policyService.evaluateLoyaltyTier(customer.loyaltyTier),
  };
}

async function applyResolution(bookingId, resolution) {
  const appliedActions = [];

  if (resolution.entitlement === "DELAY") {
    for (const entitlement of resolution.entitlements) {
      if (entitlement.type === "MEAL_VOUCHER") {
        appliedActions.push(
          await actionService.issueMealVoucher(bookingId, { amountInr: entitlement.amountInr })
        );
      }
      if (entitlement.type === "LOUNGE_ACCESS") {
        appliedActions.push(await actionService.grantLoungeAccess(bookingId));
      }
      if (entitlement.type === "HOTEL_ACCOMMODATION") {
        appliedActions.push(await actionService.arrangeHotel(bookingId, {}));
      }
    }
  }

  return appliedActions;
}

async function chat(req, res, next) {
  try {
    const { pnr, message, conversationId } = req.body;

    const booking = await bookingService.getBookingByPnr(pnr);

    const [customer] = await db
      .select()
      .from(schema.customers)
      .where(eq(schema.customers.id, booking.customerId));

    let conversation;
    if (conversationId) {
      [conversation] = await db
        .select()
        .from(schema.conversations)
        .where(eq(schema.conversations.id, conversationId));
    }
    if (!conversation) {
      [conversation] = await db
        .insert(schema.conversations)
        .values({ userId: req.user.id, bookingId: booking.id })
        .returning();
    }

    await db.insert(schema.messages).values({
      conversationId: conversation.id,
      role: "user",
      content: message,
    });

    const resolution = resolveFromBooking(booking, customer);
    const appliedActions = await applyResolution(booking.id, resolution);

    const [agentMessage] = await db
      .insert(schema.messages)
      .values({
        conversationId: conversation.id,
        role: "agent",
        content: JSON.stringify(resolution),
      })
      .returning();

    success(res, {
      conversationId: conversation.id,
      message: agentMessage,
      resolution,
      appliedActions,
    });
  } catch (err) {
    next(err);
  }
}

// Proxies the customer-facing chat to the Python AI Service (LangGraph +
// Gemini), which itself calls back into this same Node backend's existing
// APIs (customer/booking/chat/escalation) for every fact and every action.
// This endpoint does not duplicate any policy or persistence logic - Node
// remains the source of truth via /api/agent/chat, which the AI service
// calls as a tool.
async function aiChat(req, res, next) {
  try {
    const { pnr, message, conversationId } = req.body;

    // Generous timeout: Gemini's own client retries transient upstream
    // errors (e.g. 503 "high demand") internally with backoff before
    // giving up, which can push a single call well past typical latency.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    let aiResponse;
    try {
      aiResponse = await fetch(`${env.AI_SERVICE_URL}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          pnr,
          ...(conversationId ? { conversation_id: conversationId } : {}),
        }),
        signal: controller.signal,
      });
    } catch (err) {
      throw new AppError("The AI assistant is temporarily unavailable. Please try again.", 503);
    } finally {
      clearTimeout(timeout);
    }

    let body = {};
    try {
      body = await aiResponse.json();
    } catch {
      // fall through to the generic error below
    }

    if (!aiResponse.ok || !body.success) {
      throw new AppError(
        body.message || "The AI assistant is temporarily unavailable. Please try again.",
        aiResponse.ok ? 422 : 502
      );
    }

    success(res, {
      conversationId: body.conversation_id,
      aiMessage: body.message,
      resolution: body.resolution,
      escalation: body.escalation,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { chat, aiChat };
