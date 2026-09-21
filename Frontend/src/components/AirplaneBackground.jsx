import { useEffect } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";

// A hand-built commercial-jet silhouette (fuselage, cockpit band, window
// row, swept wings, twin engines, tail fin + stabilizers) rather than a
// generic icon - shaded with layered gradients so it reads as a lit 3D
// object, not a flat glyph. Everything here is vector, no image assets.
function Jet({ className }) {
  return (
    <svg viewBox="0 0 260 110" width="220" height="94" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="jetFuselage" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9aa7bd" />
          <stop offset="48%" stopColor="#4b5666" />
          <stop offset="100%" stopColor="#dbe3ee" />
        </linearGradient>
        <linearGradient id="jetWing" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2c3444" />
          <stop offset="100%" stopColor="#8b96a8" />
        </linearGradient>
        <linearGradient id="jetTail" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#232a36" />
          <stop offset="100%" stopColor="#5c6779" />
        </linearGradient>
        <filter id="jetShadow" x="-60%" y="-60%" width="220%" height="220%">
          <feDropShadow dx="0" dy="10" stdDeviation="9" floodColor="#000000" floodOpacity="0.45" />
          <feDropShadow dx="0" dy="0" stdDeviation="7" floodColor="#8b5cf6" floodOpacity="0.4" />
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#60a5fa" floodOpacity="0.35" />
        </filter>
      </defs>

      <g filter="url(#jetShadow)">
        {/* Rear stabilizers */}
        <path d="M25,30 L-5,14 L38,32 Z" fill="url(#jetTail)" />
        <path d="M25,50 L-5,66 L38,52 Z" fill="url(#jetTail)" />
        {/* Vertical tail fin */}
        <path d="M35,28 L21,2 L55,26 Z" fill="url(#jetTail)" />

        {/* Upper wing (far side, just peeking over the fuselage) */}
        <path d="M165,26 L206,2 L179,24 Z" fill="url(#jetWing)" opacity="0.9" />

        {/* Fuselage */}
        <path
          d="M10,55 Q40,18 130,20 Q210,21 250,42 L250,46 Q210,60 130,58 Q40,60 10,55 Z"
          fill="url(#jetFuselage)"
        />
        {/* Cockpit band + window row */}
        <rect x="203" y="27" width="34" height="6" rx="3" fill="#0b1220" opacity="0.75" />
        {[62, 78, 94, 110, 126, 142, 158, 174, 190].map((x) => (
          <circle key={x} cx={x} cy="38" r="1.1" fill="rgba(255,255,255,0.4)" />
        ))}

        {/* Main wing (near side, swept back and down) */}
        <path d="M150,52 L55,100 L120,58 Z" fill="url(#jetWing)" />

        {/* Twin engines, with a soft warm exhaust glow trailing each one */}
        <ellipse className="engine-glow" cx="102" cy="76" rx="9" ry="5" fill="#fb923c" opacity="0.5" />
        <ellipse className="engine-glow" cx="66" cy="92" rx="7" ry="4" fill="#fb923c" opacity="0.4" style={{ animationDelay: "0.5s" }} />
        <ellipse cx="112" cy="75" rx="16" ry="7.5" fill="url(#jetWing)" />
        <ellipse cx="119" cy="75" rx="6" ry="6" fill="#0b1220" opacity="0.6" />
        <ellipse cx="76" cy="91" rx="12.5" ry="6" fill="url(#jetWing)" />
        <ellipse cx="82" cy="91" rx="5" ry="5" fill="#0b1220" opacity="0.6" />

        {/* Specular highlight along the fuselage's top edge, selling the
            cylindrical metal shading */}
        <path
          d="M35,32 Q120,24 235,40"
          fill="none"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.6"
        />

        {/* Navigation lights: steady red/green wingtips, a blinking red
            anti-collision beacon on the spine, and a white wingtip strobe */}
        <circle cx="55" cy="100" r="2.4" fill="#ef4444" />
        <circle cx="206" cy="2" r="2" fill="#4ade80" />
        <circle className="nav-beacon" cx="150" cy="21" r="2.2" fill="#f87171" />
        <circle className="nav-strobe" cx="55" cy="100" r="4.5" fill="#f8fafc" />
      </g>
    </svg>
  );
}

// One aircraft's full flight loop: the long cross-screen traversal, a
// continuous bob + roll layered on top so it never looks rigid mid-flight,
// and its twin contrails. Reused for the primary jet and the smaller,
// fainter ones further back in the sky, each with its own altitude band,
// speed, size and start offset so they never move in lockstep.
function Flight({
  prefersReducedMotion,
  topClass,
  duration,
  initialDelay = 0,
  repeatDelay = 4,
  climb = "-7vh",
  bank = -15,
  jetClassName,
  visibilityClass = "",
}) {
  return (
    <div className={`absolute inset-x-0 h-0 ${topClass} ${visibilityClass}`}>
      <motion.div
        className="absolute left-0"
        animate={prefersReducedMotion ? undefined : { x: ["-30vw", "120vw"], y: [0, climb] }}
        transition={
          prefersReducedMotion
            ? undefined
            : { duration, repeat: Infinity, ease: "linear", repeatDelay, delay: initialDelay }
        }
        style={{ willChange: prefersReducedMotion ? undefined : "transform" }}
      >
        <motion.div
          animate={
            prefersReducedMotion
              ? undefined
              : { y: [0, -5, 0, 4, 0], rotate: [bank, bank + 2, bank, bank - 2, bank] }
          }
          transition={prefersReducedMotion ? undefined : { duration: 9, repeat: Infinity, ease: "easeInOut" }}
          style={{ willChange: prefersReducedMotion ? undefined : "transform" }}
        >
          {/* Plane + contrails climb together, banked into the turn */}
          <div className="relative">
            {/* Twin contrails - a bright thin core plus a softer wide halo
                each, so they read as diffusing exhaust trails rather than
                flat bars. */}
            {[
              { top: "68%", width: "w-40 sm:w-64 lg:w-80", haloWidth: "w-28 sm:w-44 lg:w-56", delay: "0s" },
              { top: "84%", width: "w-32 sm:w-52 lg:w-64", haloWidth: "w-20 sm:w-32 lg:w-40", delay: "0.35s" },
            ].map((trail, i) => (
              <span key={i} className="absolute right-full -translate-y-1/2" style={{ top: trail.top }}>
                <span
                  className={`absolute inset-y-0 right-0 ${trail.haloWidth} rounded-full bg-gradient-to-l from-white/25 to-transparent blur-[6px] ${
                    prefersReducedMotion ? "opacity-20" : "contrail"
                  }`}
                  style={prefersReducedMotion ? undefined : { animationDuration: `${duration}s`, animationDelay: trail.delay }}
                />
                <span
                  className={`relative h-0.75 ${trail.width} rounded-full bg-gradient-to-l from-white/60 to-transparent blur-[1px] ${
                    prefersReducedMotion ? "opacity-25" : "contrail"
                  }`}
                  style={prefersReducedMotion ? undefined : { animationDuration: `${duration}s`, animationDelay: trail.delay }}
                />
              </span>
            ))}
            <Jet className={jetClassName} />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

// A few slow, elegant 3D jets climbing across the upper sky, each with a
// pair of engine contrails, always behind the page's glass cards (this
// whole layer sits at -z-10, and every real UI surface renders above it
// with no explicit z-index of its own). Everything here only ever animates
// transform/opacity so it stays cheap to composite regardless of how long
// it runs.
export default function AirplaneBackground() {
  const prefersReducedMotion = useReducedMotion();

  // Mouse parallax - a few px of drift toward the pointer, smoothed with a
  // spring so it never feels like it's tracking 1:1.
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const parallaxX = useSpring(pointerX, { stiffness: 30, damping: 18, mass: 0.6 });
  const parallaxY = useSpring(pointerY, { stiffness: 30, damping: 18, mass: 0.6 });

  // Scroll parallax - a small vertical shift as the page scrolls, clamped
  // to a short input range so it settles quickly instead of drifting away
  // on long pages.
  const { scrollY } = useScroll();
  const scrollParallax = useTransform(scrollY, [0, 900], [0, 22], { clamp: true });

  useEffect(() => {
    if (prefersReducedMotion) return undefined;
    function handlePointerMove(event) {
      const nx = event.clientX / window.innerWidth - 0.5;
      const ny = event.clientY / window.innerHeight - 0.5;
      pointerX.set(nx * 18);
      pointerY.set(ny * 10);
    }
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [prefersReducedMotion, pointerX, pointerY]);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <motion.div
        className="absolute inset-0"
        style={{
          x: prefersReducedMotion ? 0 : parallaxX,
          y: prefersReducedMotion ? 0 : parallaxY,
          willChange: "transform",
        }}
      >
        <motion.div
          className="absolute inset-0"
          style={{ y: prefersReducedMotion ? 0 : scrollParallax, willChange: "transform" }}
        >
          {/* Primary jet - kept near the very top on mobile (clear of the
              welcome header and cards) and given a little more air on larger
              screens where there's more empty sky above the content. */}
          <Flight
            prefersReducedMotion={prefersReducedMotion}
            topClass="top-[4%] sm:top-[8%] lg:top-[12%]"
            duration={78}
            repeatDelay={4}
            jetClassName="w-33 opacity-90 sm:w-44 lg:w-52"
          />

          {/* A second, smaller jet further back at a higher cruising
              altitude - tablet and up only, so mobile stays uncluttered. */}
          <Flight
            prefersReducedMotion={prefersReducedMotion}
            topClass="top-[20%] lg:top-[24%]"
            duration={108}
            initialDelay={14}
            repeatDelay={6}
            bank={-11}
            climb="-4vh"
            jetClassName="w-20 opacity-55 lg:w-28"
            visibilityClass="hidden sm:block"
          />

          {/* A third, faint, distant jet even higher up - desktop only. */}
          <Flight
            prefersReducedMotion={prefersReducedMotion}
            topClass="top-[2%]"
            duration={130}
            initialDelay={46}
            repeatDelay={8}
            bank={-9}
            climb="-3vh"
            jetClassName="w-14 opacity-35"
            visibilityClass="hidden lg:block"
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
