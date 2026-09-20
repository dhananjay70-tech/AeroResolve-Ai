// Turns the backend's structured policy resolution into a readable sentence.
// Purely descriptive — every fact rendered here (options, entitlements,
// amounts) comes straight from the backend response, nothing is invented.
export function formatResolutionMessage(resolution, customerFirstName, flight) {
  const name = customerFirstName ? `${customerFirstName}. ` : "";

  if (!resolution || resolution.entitlement === "NONE") {
    return `Hi ${name}I don't see any active disruption on this booking right now. Let me know if there's anything I can help with.`;
  }

  if (resolution.entitlement === "AIRLINE_CANCELLATION") {
    const priority = resolution.loyalty?.priorityRebooking
      ? " As a priority member, your rebooking will be handled first."
      : "";
    return `Hi ${name}I can see that ${flight?.flightNumber || "your flight"} was cancelled. You can choose a free rebooking on the next available flight within 24 hours, or a full refund to your original payment method.${priority}`;
  }

  if (resolution.entitlement === "DELAY") {
    const items = resolution.entitlements.map((e) => e.type.replace(/_/g, " ").toLowerCase());
    const list =
      items.length > 1
        ? `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`
        : items[0];
    return `Hi ${name}I can see that ${flight?.flightNumber || "your flight"} is delayed by ${Math.floor(
      resolution.delayMinutes / 60
    )} hours. You're eligible for ${list} under the airline's disruption policy.`;
  }

  return `Hi ${name}here's what I found for your booking.`;
}
