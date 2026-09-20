// Purely descriptive, like resolutionMessage.js - derives timeline step
// status from state the app already fetched. Nothing here decides policy or
// invents progress; it only reflects facts already in booking/resolution.
export function deriveTimelineSteps({
  flight,
  booking,
  customer,
  resolution,
  resolutionLoading,
  actionStatus,
  completedActionType,
}) {
  const isDisrupted =
    flight?.status === "cancelled" || (flight?.status === "delayed" && flight?.delayMinutes > 0);
  const bookingVerified = Boolean(booking && customer);
  const policyEvaluated = resolution !== null && resolution !== undefined;
  const customerChooses = resolution?.entitlement === "AIRLINE_CANCELLATION" && resolution?.customerChooses;

  const resolutionSelected = customerChooses ? Boolean(completedActionType) : policyEvaluated;
  const actionCompleted = customerChooses
    ? Boolean(completedActionType) && actionStatus === "success"
    : policyEvaluated;

  function status(done, active = false) {
    if (done) return "done";
    if (active) return "active";
    return "pending";
  }

  return [
    { key: "detected", label: "Disruption detected", status: status(isDisrupted) },
    { key: "verified", label: "Booking verified", status: status(bookingVerified) },
    {
      key: "policy",
      label: "Policy evaluated",
      status: status(policyEvaluated, resolutionLoading),
    },
    {
      key: "selected",
      label: customerChooses ? "Choose a resolution" : "Resolution selected",
      status: status(resolutionSelected, policyEvaluated && !resolutionSelected),
    },
    {
      key: "completed",
      label: "Action completed",
      status: status(actionCompleted, actionStatus === "loading"),
    },
  ];
}
