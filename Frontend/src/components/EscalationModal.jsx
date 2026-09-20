import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, X } from "lucide-react";
import { escalationApi } from "../services/api";
import { escalationStorage } from "../utils/escalationStorage";
import { useNotifications } from "../hooks/useNotifications";
import GlassCard from "./GlassCard";
import ActionButton from "./ActionButton";

export default function EscalationModal({ open, bookingId, pnr, onClose, onSuccess }) {
  const { addNotification } = useNotifications();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setReason("");
      setError("");
    }
  }, [open]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!reason.trim() || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await escalationApi.create(bookingId, reason.trim(), {
        type: "SUPERVISOR_REVIEW",
        pnr,
      });
      escalationStorage.set(pnr, res.data.id);
      addNotification({
        type: "escalation",
        title: "Escalation submitted",
        message: "Your request has been sent for supervisor review.",
        pnr,
      });
      onSuccess?.(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
        >
          <GlassCard className="w-full max-w-md p-6">
            <div className="flex items-center justify-between">
              <p className="font-bold">Escalate to Supervisor</p>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                aria-label="Close"
                className="text-white/40 hover:text-white cursor-pointer disabled:opacity-40"
              >
                <X size={18} />
              </button>
            </div>
            <p className="mt-1 text-sm text-white/50">
              Describe what you need reviewed beyond standard policy.
            </p>
            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={4}
                placeholder="e.g. Requesting a fare-difference waiver above the standard limit."
                className="w-full rounded-xl bg-white/5 px-3.5 py-3 text-sm outline-none ring-1 ring-white/10 placeholder-white/30 focus:ring-violet-400/60"
              />
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}
              <ActionButton type="submit" loading={submitting} className="w-full">
                Submit for Review
              </ActionButton>
            </form>
          </GlassCard>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
