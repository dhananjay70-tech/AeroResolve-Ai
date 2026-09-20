import { motion } from "framer-motion";
import { Bot, UserRound } from "lucide-react";

function formatTimestamp(value) {
  if (!value) return null;
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatMessage({ role, content, timestamp }) {
  const isUser = role === "user";
  const time = formatTimestamp(timestamp);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`flex items-start gap-2 ${isUser ? "flex-row-reverse" : ""}`}
    >
      <div
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-blue-500/20 text-blue-300" : "bg-violet-500/20 text-violet-300"
        }`}
      >
        {isUser ? <UserRound size={12} /> : <Bot size={12} />}
      </div>
      <div className={`flex max-w-[78%] flex-col gap-0.5 ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`rounded-xl px-3 py-2 text-[13px] leading-snug ${
            isUser
              ? "btn-gradient text-white rounded-br-sm"
              : "glass text-white/85 rounded-bl-sm"
          }`}
        >
          {content}
        </div>
        {time && <span className="px-1 text-[10px] text-white/25">{time}</span>}
      </div>
    </motion.div>
  );
}
