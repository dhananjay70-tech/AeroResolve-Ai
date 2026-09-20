import { useState } from "react";
import { motion } from "framer-motion";
import { Wrench } from "lucide-react";
import GlassCard from "./GlassCard";
import SideDrawer from "./SideDrawer";

function ToolRow({ label, status }) {
  return (
    <div className="flex items-center gap-2.5 py-1 text-sm">
      {status === "done" ? (
        <span className="text-emerald-400">✓</span>
      ) : status === "warn" ? (
        <motion.span
          className="text-amber-300"
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        >
          ⚠
        </motion.span>
      ) : status === "active" ? (
        <motion.span
          className="text-violet-300"
          animate={{ opacity: [1, 0.35, 1] }}
          transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
        >
          ◉
        </motion.span>
      ) : (
        <span className="text-white/25">○</span>
      )}
      <span className={`font-mono text-xs ${status === "pending" ? "text-white/40" : "text-white/80"}`}>
        {label}
      </span>
    </div>
  );
}

function ToolList({ categories }) {
  return (
    <div className="space-y-5">
      {categories.map((category) => (
        <div key={category.title}>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-white/35">
            {category.title}
          </p>
          {category.tools.map((tool) => (
            <ToolRow key={tool.key} label={tool.label} status={tool.status} />
          ))}
        </div>
      ))}
    </div>
  );
}

// Only tools that really exist in the AI service's architecture
// (Ai_Services/app/tools/{customer,booking,policy,action}_tools.py) - each
// status below is derived only from real, already-fetched frontend state,
// never simulated.
export default function ToolRuntime({
  booking,
  customer,
  flight,
  resolution,
  resolutionPending,
  pendingActionType,
  completedActionType,
  aiEscalation,
  supervisorCall,
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const policyEvaluated = resolution !== null && resolution !== undefined;
  const entitlementTypes = new Set((resolution?.entitlements || []).map((e) => e.type));

  function status(done, active = false, warn = false) {
    if (warn) return "warn";
    if (done) return "done";
    if (active) return "active";
    return "pending";
  }

  const categories = [
    {
      title: "Booking Tools",
      tools: [
        { key: "get_customer", label: "get_customer()", status: status(Boolean(customer)) },
        { key: "get_booking", label: "get_booking()", status: status(Boolean(booking)) },
      ],
    },
    {
      title: "Flight Tools",
      tools: [{ key: "get_flight_status", label: "get_flight_status()", status: status(Boolean(flight)) }],
    },
    {
      title: "Policy Tools",
      tools: [
        { key: "evaluate_policy", label: "evaluate_policy()", status: status(policyEvaluated, resolutionPending) },
      ],
    },
    {
      title: "Action Tools",
      tools: [
        {
          key: "rebook_flight",
          label: "rebook_flight()",
          status: status(completedActionType === "REBOOK", pendingActionType === "REBOOK"),
        },
        {
          key: "request_refund",
          label: "request_refund()",
          status: status(completedActionType === "REFUND", pendingActionType === "REFUND"),
        },
        { key: "meal_voucher", label: "meal_voucher()", status: status(entitlementTypes.has("MEAL_VOUCHER")) },
        { key: "lounge_access", label: "lounge_access()", status: status(entitlementTypes.has("LOUNGE_ACCESS")) },
        {
          key: "hotel_support",
          label: "hotel_support()",
          status: status(entitlementTypes.has("HOTEL_ACCOMMODATION")),
        },
      ],
    },
    {
      title: "Escalation",
      tools: [
        { key: "create_escalation", label: "create_escalation()", status: status(Boolean(aiEscalation)) },
        {
          key: "supervisor_call",
          label: "supervisor_call()",
          status: status(
            ["CALL_COMPLETED", "CALL_CONNECTED", "AI_HANDLING", "SUPERVISOR_TAKEOVER"].includes(
              supervisorCall?.callStatus
            ),
            ["CALL_INITIATING", "CALL_RINGING"].includes(supervisorCall?.callStatus),
            ["CALL_FAILED", "NOT_CONFIGURED"].includes(supervisorCall?.callStatus)
          ),
        },
      ],
    },
  ];

  return (
    <>
      {/* Mobile and desktop: full panel inline */}
      <GlassCard className="block p-5 md:hidden lg:block">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-white/70">Tool Runtime</p>
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Live
          </span>
        </div>
        <ToolList categories={categories} />
      </GlassCard>

      {/* Tablet: compact toggle + drawer */}
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="hidden w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/70 hover:text-white md:flex lg:hidden cursor-pointer"
      >
        <Wrench size={14} />
        Tool Runtime
      </button>
      <SideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Tool Runtime">
        <ToolList categories={categories} />
      </SideDrawer>
    </>
  );
}
