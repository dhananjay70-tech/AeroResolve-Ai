import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Bell, CheckCircle2, ShieldAlert, Sparkles } from "lucide-react";
import { useNotifications } from "../hooks/useNotifications";

const TYPE_ICON = {
  disruption: AlertTriangle,
  resolution: Sparkles,
  action: CheckCircle2,
  escalation: ShieldAlert,
};

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString([], { day: "2-digit", month: "short" });
}

export default function NotificationCenter() {
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function toggle() {
    setOpen((wasOpen) => {
      const next = !wasOpen;
      if (next) markAllRead();
      return next;
    });
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={toggle}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white cursor-pointer"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-expanded={open}
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-violet-400" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-11 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-xl glass p-3"
            role="menu"
          >
            <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-white/40">
              Notifications
            </p>
            {notifications.length === 0 ? (
              <p className="px-1 py-6 text-center text-sm text-white/40">No new updates</p>
            ) : (
              <div className="max-h-80 space-y-1 overflow-y-auto">
                {notifications.map((notification) => {
                  const Icon = TYPE_ICON[notification.type] || Bell;
                  return (
                    <div key={notification.id} className="flex gap-2.5 rounded-lg px-2 py-2 hover:bg-white/5">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-300">
                        <Icon size={13} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white/85">
                          {notification.title}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-white/50">
                          {notification.message}
                        </p>
                        <p className="mt-1 text-[10px] text-white/30">
                          {timeAgo(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
