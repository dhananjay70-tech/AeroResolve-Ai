const FARE_DIFFERENCE_WAIVER_LIMIT = 1500;
const DELAY_MEAL_VOUCHER_THRESHOLD_MINUTES = 0;
const DELAY_LOUNGE_THRESHOLD_MINUTES = 180;
const DELAY_HOTEL_THRESHOLD_MINUTES = 300;
const MEAL_VOUCHER_AMOUNT_INR = 500;
const REFUND_PROCESSING_DAYS = 7;
const PRIORITY_TIERS = ["Gold", "Platinum"];

function evaluateAirlineCancellation() {
  return {
    entitlement: "AIRLINE_CANCELLATION",
    options: ["REBOOK_NEXT_AVAILABLE_WITHIN_24H", "FULL_REFUND"],
    customerChooses: true,
  };
}

function evaluateDelay(delayMinutes) {
  const entitlements = [];

  if (delayMinutes > DELAY_MEAL_VOUCHER_THRESHOLD_MINUTES) {
    entitlements.push({ type: "MEAL_VOUCHER", amountInr: MEAL_VOUCHER_AMOUNT_INR });
  }

  if (delayMinutes > DELAY_LOUNGE_THRESHOLD_MINUTES) {
    entitlements.push({ type: "LOUNGE_ACCESS" });
  }

  if (delayMinutes > DELAY_HOTEL_THRESHOLD_MINUTES) {
    entitlements.push({ type: "HOTEL_ACCOMMODATION", coversDelayedHoursOnly: true });
  }

  return { entitlement: "DELAY", delayMinutes, entitlements };
}

function evaluateAirlineCausedCancellationRefund() {
  return {
    entitlement: "AIRLINE_CAUSED_CANCELLATION_REFUND",
    refundType: "FULL",
    paymentMethod: "ORIGINAL_ONLY",
    processingBusinessDays: REFUND_PROCESSING_DAYS,
  };
}

function evaluateVoluntaryRebookingFareDifference(fareDifferenceInr) {
  const requiresEscalation = fareDifferenceInr > FARE_DIFFERENCE_WAIVER_LIMIT;

  return {
    entitlement: "VOLUNTARY_REBOOKING_FARE_DIFFERENCE",
    fareDifferenceInr,
    customerPaysDifference: true,
    requiresSupervisorEscalation: requiresEscalation,
  };
}

function evaluateLoyaltyTier(loyaltyTier) {
  return {
    entitlement: "LOYALTY_TIER",
    loyaltyTier,
    priorityRebooking: PRIORITY_TIERS.includes(loyaltyTier),
    additionalCompensation: false,
  };
}

function checkProhibitedAction(request) {
  const { type, fareDifferenceInr, disruptionCausedByAirline, refundToDifferentPaymentMethod, isLegalThreat } =
    request;

  if (type === "COMPENSATION_BEYOND_POLICY") {
    return { prohibited: true, reason: "Compensation beyond stated policy is not permitted." };
  }

  if (type === "WAIVE_FARE_DIFFERENCE" && fareDifferenceInr > FARE_DIFFERENCE_WAIVER_LIMIT) {
    return { prohibited: true, reason: "Fare difference above ₹1,500 cannot be waived by the agent." };
  }

  if (type === "EXCEPTION_REQUEST" && !disruptionCausedByAirline) {
    return { prohibited: true, reason: "Exceptions cannot be made for non-airline-caused disruptions." };
  }

  if (isLegalThreat) {
    return { prohibited: true, reason: "Legal threats or formal complaints require escalation." };
  }

  if (refundToDifferentPaymentMethod) {
    return { prohibited: true, reason: "Refunds can only be issued to the original payment method." };
  }

  return { prohibited: false, reason: null };
}

module.exports = {
  FARE_DIFFERENCE_WAIVER_LIMIT,
  evaluateAirlineCancellation,
  evaluateDelay,
  evaluateAirlineCausedCancellationRefund,
  evaluateVoluntaryRebookingFareDifference,
  evaluateLoyaltyTier,
  checkProhibitedAction,
};
