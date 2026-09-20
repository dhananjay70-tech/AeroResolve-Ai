// Purely descriptive, like timelineSteps.js/resolutionMessage.js before it -
// every step reflects a real state transition already observed by the page
// (a fetch resolved, a response arrived). No internal reasoning or
// chain-of-thought is represented here, only high-level, already-true facts.
export function deriveAgentStateMachine({
  booking,
  customer,
  flight,
  resolution,
  resolutionPending,
  actionPending = false,
  aiEscalation,
  completedActionType,
}) {
  const understand = Boolean(booking || customer);
  const contextLoaded = Boolean(customer) && Boolean(booking);
  const verified = Boolean(flight);
  const policyEvaluated = resolution !== null && resolution !== undefined;
  const customerChooses = resolution?.entitlement === "AIRLINE_CANCELLATION" && resolution?.customerChooses;

  const decided = customerChooses ? Boolean(completedActionType) : policyEvaluated;
  const acted = Boolean(aiEscalation) || Boolean(completedActionType) || (policyEvaluated && !customerChooses);
  const verifiedResult = acted && !actionPending && !resolutionPending;

  function status(done, active = false) {
    if (done) return "done";
    if (active) return "active";
    return "pending";
  }

  return [
    { key: "understand", label: "UNDERSTAND", status: status(understand) },
    { key: "context", label: "CONTEXT", status: status(contextLoaded) },
    { key: "verify", label: "VERIFY", status: status(verified) },
    { key: "policy", label: "POLICY", status: status(policyEvaluated, resolutionPending) },
    { key: "decide", label: "DECIDE", status: status(decided, policyEvaluated && !decided) },
    { key: "act", label: "ACT", status: status(acted, actionPending) },
    { key: "result", label: "VERIFY RESULT", status: status(verifiedResult, actionPending) },
  ];
}
