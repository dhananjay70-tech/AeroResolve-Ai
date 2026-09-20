import {
  Armchair,
  BedDouble,
  IndianRupee,
  RefreshCw,
  ShieldQuestion,
  Sparkles,
  Utensils,
} from "lucide-react";
import ResolutionCard from "./ResolutionCard";

const ENTITLEMENT_META = {
  MEAL_VOUCHER: {
    icon: Utensils,
    title: "Meal Voucher",
    describe: (e) => `₹${e.amountInr} voucher credited for dining while you wait.`,
  },
  LOUNGE_ACCESS: {
    icon: Armchair,
    title: "Lounge Access",
    describe: () => "Complimentary lounge access for the duration of your delay.",
  },
  HOTEL_ACCOMMODATION: {
    icon: BedDouble,
    title: "Hotel",
    describe: () => "Hotel coverage for the delayed hours only.",
  },
};

export default function ResolutionPanel({ resolution, onRebook, onRefund, onEscalate }) {
  if (!resolution || resolution.entitlement === "NONE") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
        <Sparkles className="text-violet-300" size={20} />
        <p className="text-sm text-white/50">
          No disruption entitlements yet. Ask the assistant about your booking.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {resolution.entitlement === "AIRLINE_CANCELLATION" && (
        <>
          <ResolutionCard
            icon={RefreshCw}
            title="Rebook Flight"
            description="Next available flight within 24 hours, at no extra cost."
            status={resolution.loyalty?.priorityRebooking ? "Priority" : undefined}
            ctaLabel="Continue"
            onAction={onRebook}
          />
          <ResolutionCard
            icon={IndianRupee}
            title="Full Refund"
            description="Refund issued to your original payment method."
            ctaLabel="Request"
            onAction={onRefund}
          />
        </>
      )}

      {resolution.entitlement === "DELAY" &&
        resolution.entitlements.map((entitlement) => {
          const meta = ENTITLEMENT_META[entitlement.type];
          if (!meta) return null;
          return (
            <ResolutionCard
              key={entitlement.type}
              icon={meta.icon}
              title={meta.title}
              description={meta.describe(entitlement)}
              status="Applied"
            />
          );
        })}

      {onEscalate && (
        <ResolutionCard
          icon={ShieldQuestion}
          title="Escalate"
          description="Request supervisor review for exceptions beyond standard policy."
          ctaLabel="Escalate"
          onAction={onEscalate}
        />
      )}
    </div>
  );
}
