import { motion, useReducedMotion } from "framer-motion";

// A small fixed set of runway edge lights, each blinking on its own offset -
// static positions (not random per render) so the layout never jitters.
const RUNWAY_LIGHTS = [8, 20, 32, 44, 56, 68, 80, 92];

// Three distant "beacon" streaks drifting across the upper sky at different
// altitudes/speeds/delays, suggesting air traffic without literal aircraft.
const SKY_TRAILS = [
  { top: "14%", duration: 26, delay: 0, tilt: -6 },
  { top: "28%", duration: 34, delay: 8, tilt: -3 },
  { top: "9%", duration: 30, delay: 16, tilt: -8 },
];

// Pure CSS/SVG airline command-center environment: a distant terminal +
// control tower silhouette, a converging runway with blinking edge lights,
// and slow-drifting sky trails - layered under the existing aurora glow and
// star-grid so every page reads as one cinematic 3D environment instead of a
// flat gradient. No images are used; everything here is drawn shapes.
export default function AmbientBackground() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-(--color-bg)">
      {/* Aurora glow - atmospheric depth */}
      <motion.div
        className="absolute -left-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-violet-600/25 blur-[120px]"
        animate={prefersReducedMotion ? undefined : { x: [0, 60, 0], y: [0, 40, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-[-10rem] top-1/4 h-[28rem] w-[28rem] rounded-full bg-blue-600/20 blur-[120px]"
        animate={prefersReducedMotion ? undefined : { x: [0, -50, 0], y: [0, 60, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[-12rem] left-1/3 h-[30rem] w-[30rem] rounded-full bg-cyan-500/15 blur-[130px]"
        animate={prefersReducedMotion ? undefined : { x: [0, 40, 0], y: [0, -30, 0] }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Sky trails - distant air traffic, very low opacity */}
      {SKY_TRAILS.map((trail, i) => (
        <div
          key={i}
          className="absolute left-[-15%] h-px w-[40%] bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent"
          style={{ top: trail.top, transform: `rotate(${trail.tilt}deg)` }}
        >
          <div
            className={prefersReducedMotion ? "" : "sky-trail-head"}
            style={{ animationDuration: `${trail.duration}s`, animationDelay: `${trail.delay}s` }}
          >
            <span className="absolute right-0 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-white shadow-[0_0_8px_2px_rgba(125,211,252,0.8)]" />
          </div>
        </div>
      ))}

      {/* Distant terminal / control tower silhouette, grounded at the horizon */}
      <svg
        className="absolute inset-x-0 bottom-0 h-[46vh] w-full opacity-[0.5]"
        viewBox="0 0 1440 400"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="terminalFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0b0b16" stopOpacity="0" />
            <stop offset="100%" stopColor="#0b0b16" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        {/* Terminal roofline */}
        <path
          d="M0 260 L140 260 L180 210 L520 210 L560 180 L900 180 L950 220 L1180 220 L1220 190 L1440 190 L1440 400 L0 400 Z"
          fill="#0e0e1c"
        />
        {/* Control tower */}
        <rect x="1005" y="90" width="26" height="130" fill="#0e0e1c" />
        <rect x="992" y="70" width="52" height="26" rx="3" fill="#12122a" />
        <circle cx="1018" cy="76" r="3" fill="#f43f5e" className={prefersReducedMotion ? "" : "tower-beacon"} />
        {/* Terminal windows */}
        {Array.from({ length: 22 }).map((_, i) => (
          <rect
            key={i}
            x={150 + i * 38}
            y="248"
            width="14"
            height="10"
            fill="#38bdf8"
            opacity={i % 3 === 0 ? 0.35 : 0.15}
          />
        ))}
        <rect x="0" y="260" width="1440" height="140" fill="url(#terminalFade)" />
      </svg>

      {/* Converging runway with blinking edge lights */}
      <svg
        className="absolute inset-x-0 bottom-0 h-[30vh] w-full opacity-70"
        viewBox="0 0 1440 260"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M560 0 L880 0 L1120 260 L320 260 Z" fill="rgba(255,255,255,0.025)" />
        <line x1="720" y1="0" x2="720" y2="260" stroke="rgba(255,255,255,0.12)" strokeWidth="3" strokeDasharray="10 14" />
        {RUNWAY_LIGHTS.map((p, i) => {
          const leftX = 560 + ((320 - 560) * p) / 100;
          const rightX = 880 + ((1120 - 880) * p) / 100;
          const y = (260 * p) / 100;
          return (
            <g key={p}>
              <circle
                cx={leftX}
                cy={y}
                r="2.5"
                fill="#fbbf24"
                className={prefersReducedMotion ? "" : "runway-light"}
                style={{ animationDelay: `${i * 0.18}s` }}
              />
              <circle
                cx={rightX}
                cy={y}
                r="2.5"
                fill="#fbbf24"
                className={prefersReducedMotion ? "" : "runway-light"}
                style={{ animationDelay: `${i * 0.18}s` }}
              />
            </g>
          );
        })}
      </svg>

      {/* Star-grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "34px 34px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 30%, black 40%, transparent 100%)",
        }}
      />

      {/* Grounding vignette so foreground content always stays readable */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-(--color-bg)" />
    </div>
  );
}
