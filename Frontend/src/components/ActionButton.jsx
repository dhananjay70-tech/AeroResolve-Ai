import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

const VARIANTS = {
  primary:
    "btn-gradient text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40",
  secondary:
    "bg-white/8 text-white border border-white/15 hover:bg-white/14",
  ghost: "bg-transparent text-white/80 border border-white/10 hover:bg-white/5",
  danger: "bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25",
};

export default function ActionButton({
  icon: Icon,
  trailingIcon: TrailingIcon,
  variant = "primary",
  loading = false,
  disabled = false,
  className = "",
  children,
  ...props
}) {
  return (
    <motion.button
      whileHover={disabled || loading ? undefined : { scale: 1.03 }}
      whileTap={disabled || loading ? undefined : { scale: 0.97 }}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold
      transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer
      ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        Icon && <Icon size={16} />
      )}
      <span>{children}</span>
      {!loading && TrailingIcon && <TrailingIcon size={16} />}
    </motion.button>
  );
}
