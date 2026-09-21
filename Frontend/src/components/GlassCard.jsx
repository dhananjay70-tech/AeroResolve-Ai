import { motion, useReducedMotion } from "framer-motion";
import { useRef } from "react";

export default function GlassCard({
  as: Component = motion.div,
  tilt = false,
  glow = false,
  className = "",
  style,
  children,
  ...props
}) {
  const ref = useRef(null);
  const prefersReducedMotion = useReducedMotion();

  function handleMouseMove(event) {
    if (!tilt || prefersReducedMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    ref.current.style.setProperty("--rx", `${(-y * 8).toFixed(2)}deg`);
    ref.current.style.setProperty("--ry", `${(x * 8).toFixed(2)}deg`);
  }

  function handleMouseLeave() {
    if (!ref.current) return;
    ref.current.style.setProperty("--rx", "0deg");
    ref.current.style.setProperty("--ry", "0deg");
  }

  return (
    <Component
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      // Every card lifts slightly on hover, not just tilt cards - a small,
      // consistent "floating panel" cue rather than a special case.
      whileHover={prefersReducedMotion ? undefined : { y: -3 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      style={{
        transform: tilt
          ? "perspective(900px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))"
          : undefined,
        transformStyle: "preserve-3d",
        // A persistent, restrained accent glow for hero/important cards only
        // - layered into .glass's own box-shadow via --card-glow rather than
        // replacing it, so the soft elevation shadow never disappears.
        ...(glow ? { "--card-glow": "var(--shadow-glow-violet)" } : {}),
        ...style,
      }}
      className={`glass rounded-[20px] ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
