// Shared confirmation-modal copy for the two backend-allowed cancellation
// actions. Restates facts already present on an AIRLINE_CANCELLATION
// resolution (see ResolutionPanel.jsx) - nothing here is invented, and both
// Dashboard.jsx and Chat.jsx use this same copy so an action reads
// identically wherever it's confirmed from.
export const ACTION_COPY = {
  REBOOK: {
    title: "Rebook Flight",
    message: "I'd like to rebook my flight.",
    whatWillHappen: "You'll be rebooked onto the next available flight within 24 hours, at no additional charge.",
    whyAvailable: "Your flight was cancelled by the airline, which entitles you to a policy-based rebooking.",
    whatHappensNext: "We'll confirm this with the policy engine and AI assistant, and the result will appear here immediately.",
  },
  REFUND: {
    title: "Request Full Refund",
    message: "I'd like a full refund instead.",
    whatWillHappen: "A full refund will be issued to your original payment method.",
    whyAvailable: "Your flight was cancelled by the airline, which entitles you to a full refund under standard policy.",
    whatHappensNext: "We'll confirm this with the policy engine and AI assistant, and the result will appear here immediately.",
  },
};
