import { useNavigate } from "react-router-dom";
import { ArrowRight, Bot } from "lucide-react";
import GlassCard from "./GlassCard";
import ActionButton from "./ActionButton";
import ChatMessage from "./ChatMessage";
import LoadingSkeleton from "./LoadingSkeleton";

// The dashboard's AI customer-support workspace preview. `preview` is the
// real first exchange the agent already had for this case (the disruption
// question Dashboard.jsx actually sent, and the aiMessage the backend
// actually returned) - never hardcoded conversation copy.
export default function AIAssistantPreview({ booking, flight, resolution, conversationId, preview, loading }) {
  const navigate = useNavigate();

  function openAssistant(prefill) {
    navigate("/chat", { state: { pnr: booking?.pnr, conversationId, resolution, prefill } });
  }

  return (
    <GlassCard className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl btn-gradient text-white">
            <Bot size={18} />
          </div>
          <div>
            <p className="font-bold">AI Resolution Assistant</p>
            <p className="flex items-center gap-1.5 text-xs text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Active
            </p>
          </div>
        </div>
        {booking && (
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
            Case: {booking.pnr}
            {flight?.origin && flight?.destination ? ` · ${flight.origin} → ${flight.destination}` : ""}
          </span>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {loading && <LoadingSkeleton variant="card" className="h-24" />}

        {!loading && preview?.aiMessage && (
          <>
            {preview.customerMessage && <ChatMessage role="user" content={preview.customerMessage} />}
            <ChatMessage role="agent" content={preview.aiMessage} />
          </>
        )}

        {!loading && !preview?.aiMessage && (
          <p className="text-sm text-white/50">
            Ask the assistant about this booking to see your live conversation here.
          </p>
        )}
      </div>

      <ActionButton
        icon={Bot}
        trailingIcon={ArrowRight}
        variant="secondary"
        className="mt-5 w-full sm:w-auto"
        onClick={() => openAssistant()}
      >
        Open AI Assistant
      </ActionButton>
    </GlassCard>
  );
}
