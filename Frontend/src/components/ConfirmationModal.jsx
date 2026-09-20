import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import GlassCard from "./GlassCard";
import ActionButton from "./ActionButton";

export default function ConfirmationModal({
  open,
  title,
  whatWillHappen,
  whyAvailable,
  whatHappensNext,
  status = "idle",
  successTitle = "Confirmed",
  successMessage,
  errorMessage,
  executionSteps,
  confirmLabel = "Confirm",
  loadingLabel,
  retryLabel = "Retry",
  cancelLabel = "Cancel",
  errorPrefix = "Action could not be completed.",
  onConfirm,
  onClose,
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="w-full max-w-md"
          >
            <GlassCard className="p-6">
              {status === "success" ? (
                <div className="py-2 text-center">
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 18 }}
                    className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300"
                  >
                    <CheckCircle2 size={24} />
                  </motion.div>
                  <p className="mt-4 font-bold text-white/90">{successTitle}</p>
                  <p className="mt-1 text-sm text-white/55">{successMessage}</p>
                  <ActionButton className="mx-auto mt-6" onClick={onClose}>
                    Done
                  </ActionButton>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="font-bold">{title}</p>
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={status === "loading"}
                      aria-label="Close"
                      className="text-white/40 hover:text-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {status === "loading" && executionSteps ? (
                    <div className="mt-4 space-y-2.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-white/40">
                        Agent Execution
                      </p>
                      {executionSteps.map((step) => (
                        <div key={step.label} className="flex items-center gap-2.5 text-sm">
                          {step.status === "done" ? (
                            <span className="text-emerald-400">✓</span>
                          ) : (
                            <motion.span
                              className="text-violet-300"
                              animate={{ opacity: [1, 0.35, 1] }}
                              transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                            >
                              ●
                            </motion.span>
                          )}
                          <span className={step.status === "done" ? "text-white/80" : "text-violet-200"}>
                            {step.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 space-y-4 text-sm">
                      {whatWillHappen && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-white/40">
                            What will happen?
                          </p>
                          <p className="mt-1 text-white/70">{whatWillHappen}</p>
                        </div>
                      )}
                      {whyAvailable && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-white/40">
                            Why is this available?
                          </p>
                          <p className="mt-1 text-white/70">{whyAvailable}</p>
                        </div>
                      )}
                      {whatHappensNext && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-white/40">
                            What happens next?
                          </p>
                          <p className="mt-1 text-white/70">{whatHappensNext}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {status === "error" && (
                    <div className="mt-4 flex items-center gap-2 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                      <AlertCircle size={14} className="shrink-0" />
                      {errorPrefix} {errorMessage}
                    </div>
                  )}

                  <div className="mt-6 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={status === "loading"}
                      className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white/60 hover:text-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {cancelLabel}
                    </button>
                    <ActionButton onClick={onConfirm} loading={status === "loading"}>
                      {status === "loading" && loadingLabel
                        ? loadingLabel
                        : status === "error"
                          ? retryLabel
                          : confirmLabel}
                    </ActionButton>
                  </div>
                </>
              )}
            </GlassCard>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
