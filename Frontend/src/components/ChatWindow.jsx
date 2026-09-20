import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SendHorizonal, Sparkles } from "lucide-react";
import ChatMessage from "./ChatMessage";
import TypingIndicator from "./TypingIndicator";

export default function ChatWindow({ messages, onSend, isTyping, disabled, caseLabel, promptRow }) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  function handleSubmit(event) {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setDraft("");
  }

  return (
    <div className="flex h-full flex-col glass rounded-2xl">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg btn-gradient text-white">
            <Sparkles size={15} />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">AeroResolve AI</p>
            <p className="flex items-center gap-1.5 text-[11px] leading-tight text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              AI Resolution Assistant • Online
            </p>
          </div>
        </div>
        {caseLabel && (
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/55">
            {caseLabel}
          </span>
        )}
      </div>

      {/* justify-end anchors short conversations to the bottom, near the
          composer, instead of leaving a dead gap below the last message. */}
      <div
        ref={scrollRef}
        className="flex min-h-0 flex-1 flex-col justify-end gap-2.5 overflow-y-auto px-4 py-3"
      >
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              role={message.role}
              content={message.content}
              timestamp={message.timestamp}
            />
          ))}
        </AnimatePresence>
        {isTyping && <TypingIndicator />}
      </div>

      {promptRow && <div className="shrink-0 border-t border-white/10 px-3 py-2">{promptRow}</div>}

      <form onSubmit={handleSubmit} className="flex shrink-0 items-center gap-2 border-t border-white/10 p-3">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask about your booking…"
          disabled={disabled}
          className="flex-1 rounded-xl bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-white/35 outline-none ring-1 ring-white/10 focus:ring-violet-400/60 disabled:opacity-50"
        />
        <motion.button
          whileHover={disabled ? undefined : { scale: 1.05 }}
          whileTap={disabled ? undefined : { scale: 0.95 }}
          type="submit"
          disabled={disabled || !draft.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl btn-gradient text-white disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
        >
          <SendHorizonal size={16} />
        </motion.button>
      </form>
    </div>
  );
}
