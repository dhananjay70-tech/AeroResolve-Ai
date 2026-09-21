import { useReducedMotion } from "framer-motion";

// Soft, low-opacity cloud layers - static positions (not random per render)
// so the layout never jitters between mounts.
const CLOUDS = [
  { top: "8%", left: "-10%", size: 560, tint: "rgba(139,92,246,0.10)", duration: 70, delay: 0 },
  { top: "38%", left: "60%", size: 620, tint: "rgba(59,130,246,0.08)", duration: 85, delay: 6 },
  { top: "68%", left: "5%", size: 520, tint: "rgba(255,255,255,0.035)", duration: 76, delay: 3 },
];

// Pure near-black atmosphere: a faint star field and a few very slow,
// very low-opacity cloud layers for depth - no illustrated scenery, no
// large glowing shapes. This sits behind AirplaneBackground and all page
// content, and is deliberately quiet so it never competes with the UI.
export default function AmbientBackground() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="pointer-events-none fixed inset-0 -z-20 overflow-hidden bg-(--color-bg)" aria-hidden="true">
      {CLOUDS.map((cloud, i) => (
        <div
          key={i}
          className={prefersReducedMotion ? "absolute rounded-full blur-[110px]" : "absolute rounded-full blur-[110px] cloud-drift"}
          style={{
            top: cloud.top,
            left: cloud.left,
            width: cloud.size,
            height: cloud.size * 0.6,
            background: cloud.tint,
            animationDuration: `${cloud.duration}s`,
            animationDelay: `${cloud.delay}s`,
          }}
        />
      ))}

      {/* Faint star field */}
      <div
        className="absolute inset-0 opacity-[0.3]"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "34px 34px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 25%, black 35%, transparent 100%)",
        }}
      />

      {/* Grounding vignette so foreground content always stays readable */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-(--color-bg)" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-10%,rgba(255,255,255,0.035),transparent_60%)]" />
    </div>
  );
}
