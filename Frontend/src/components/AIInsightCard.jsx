import { useNavigate } from "react-router-dom";
import { MessageCircle, Sparkles } from "lucide-react";
import GlassCard from "./GlassCard";
import ActionButton from "./ActionButton";

const SUGGESTED_QUESTIONS = [
  "What happened to my flight?",
  "What options do I have?",
  "Am I eligible for a refund?",
  "Can I get lounge access?",
  "Why was my flight delayed?",
];

export default function AIInsightCard({ pnr, conversationId, resolution }) {
  const navigate = useNavigate();

  function askAI(prefill) {
    navigate("/chat", { state: { pnr, conversationId, resolution, prefill } });
  }

  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl btn-gradient text-white">
          <Sparkles size={18} />
        </div>
        <div>
          <p className="font-bold">Ask AeroResolve AI</p>
          <p className="text-xs text-white/50">
            Get answers using your verified booking and airline policy information.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {SUGGESTED_QUESTIONS.map((question) => (
          <button
            key={question}
            type="button"
            onClick={() => askAI(question)}
            className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:border-violet-400/40 hover:text-white cursor-pointer"
          >
            {question}
          </button>
        ))}
      </div>

      <ActionButton icon={MessageCircle} variant="secondary" className="mt-5 w-full" onClick={() => askAI()}>
        Open AI Assistant
      </ActionButton>
    </GlassCard>
  );
}
