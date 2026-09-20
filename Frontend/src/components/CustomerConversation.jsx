import { useState } from "react";
import { Maximize2, MessageCircle, Minimize2 } from "lucide-react";
import ChatWindow from "./ChatWindow";

const SUGGESTED_QUESTIONS = [
  "What happened to my flight?",
  "What options do I have?",
  "Am I eligible for a refund?",
];

// `primary` renders this as the always-open, primary chat surface (the
// center column of the AI Assistant workspace) - no minimize toggle, since
// it's the product here, not a widget. `promptRow`/`caseLabel` are built by
// the caller (Chat.jsx) and just forwarded into ChatWindow, so the
// supervisor-call chip inside promptRow reuses the one real call/escalation
// component instead of this file knowing about calling at all.
export default function CustomerConversation({
  messages,
  onSend,
  isTyping,
  primary = false,
  caseLabel,
  promptRow,
}) {
  const [expanded, setExpanded] = useState(primary);

  return (
    <div className={primary ? "flex h-135 flex-col sm:h-150 lg:h-170" : undefined}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-white/70">
          <MessageCircle size={15} />
          Customer Conversation
        </p>
        {!primary && (
          <div className="flex flex-wrap items-center gap-2">
            {!expanded &&
              SUGGESTED_QUESTIONS.map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => {
                    setExpanded(true);
                    onSend(question);
                  }}
                  className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/55 hover:border-violet-400/40 hover:text-white cursor-pointer"
                >
                  {question}
                </button>
              ))}
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="flex items-center gap-1.5 text-xs font-semibold text-violet-300 hover:text-violet-200 cursor-pointer"
            >
              {expanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              {expanded ? "Minimize" : "Open Chat"}
            </button>
          </div>
        )}
      </div>

      <div className={primary ? "min-h-0 flex-1" : expanded ? "h-[28rem]" : "h-56"}>
        <ChatWindow
          messages={messages}
          onSend={onSend}
          isTyping={isTyping}
          caseLabel={primary ? caseLabel : undefined}
          promptRow={primary ? promptRow : undefined}
        />
      </div>
    </div>
  );
}
