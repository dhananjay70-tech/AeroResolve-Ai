import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

export default function SideDrawer({ open, title, onClose, children }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col glass sm:border-l sm:border-white/10"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <p className="font-bold">{title}</p>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="text-white/40 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
