import { useMemo, useState } from "react";
import { useAnimationFrame, useReducedMotion } from "framer-motion";

const STATUS_COLOR = {
  cancelled: "#f43f5e",
  delayed: "#f59e0b",
  confirmed: "#8b5cf6",
  scheduled: "#8b5cf6",
};

function pointOnQuadraticCurve(t, p0, p1, p2) {
  const x = (1 - t) ** 2 * p0.x + 2 * (1 - t) * t * p1.x + t ** 2 * p2.x;
  const y = (1 - t) ** 2 * p0.y + 2 * (1 - t) * t * p1.y + t ** 2 * p2.y;
  return { x, y };
}

export default function FlightPath({ origin, destination, status = "confirmed" }) {
  const prefersReducedMotion = useReducedMotion();
  const [t, setT] = useState(0);

  const points = useMemo(
    () => ({
      p0: { x: 20, y: 70 },
      p1: { x: 150, y: 10 },
      p2: { x: 280, y: 70 },
    }),
    []
  );

  useAnimationFrame((time) => {
    if (prefersReducedMotion) return;
    const duration = 3200;
    setT((time % duration) / duration);
  });

  const light = pointOnQuadraticCurve(
    prefersReducedMotion ? 0.5 : t,
    points.p0,
    points.p1,
    points.p2
  );
  const color = STATUS_COLOR[status?.toLowerCase()] || STATUS_COLOR.confirmed;
  const pathD = `M ${points.p0.x} ${points.p0.y} Q ${points.p1.x} ${points.p1.y} ${points.p2.x} ${points.p2.y}`;

  return (
    <div className="w-full">
      <svg viewBox="0 0 300 90" className="w-full overflow-visible">
        <defs>
          <linearGradient id="flightPathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} stopOpacity="0.15" />
            <stop offset="50%" stopColor={color} stopOpacity="0.9" />
            <stop offset="100%" stopColor={color} stopOpacity="0.15" />
          </linearGradient>
        </defs>

        <path
          d={pathD}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="2"
        />
        <path
          d={pathD}
          fill="none"
          stroke="url(#flightPathGradient)"
          strokeWidth="2"
          strokeDasharray="4 6"
        />

        <circle cx={points.p0.x} cy={points.p0.y} r="4.5" fill={color} />
        <circle cx={points.p2.x} cy={points.p2.y} r="4.5" fill={color} />

        <circle cx={light.x} cy={light.y} r="6" fill={color} opacity="0.35" />
        <circle cx={light.x} cy={light.y} r="3" fill="#fff" />
      </svg>

      <div className="mt-1 flex items-center justify-between text-xs font-medium text-white/60">
        <span>{origin}</span>
        <span>{destination}</span>
      </div>
    </div>
  );
}
