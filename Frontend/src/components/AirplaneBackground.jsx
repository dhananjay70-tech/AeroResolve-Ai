import { useEffect } from "react";
import { Plane } from "lucide-react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";

// One slow, quiet 3D-styled aircraft drifting across the very top band of
// the screen, always behind the page's glass cards (this whole layer sits
// at -z-10, and every real UI surface renders above it with no explicit
// z-index of its own). Everything here only ever animates transform/opacity
// so it stays cheap to composite regardless of how long it runs.
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
          {/* Flight path band - kept near the very top on mobile (clear of the
              welcome header and cards) and given a little more air on larger
              screens where there's more empty sky above the content. */}
          <div className="absolute inset-x-0 top-[5%] h-0 sm:top-[10%] lg:top-[14%]">
            <motion.div
              className="absolute left-0 flex items-center gap-0"
              style={{ willChange: prefersReducedMotion ? undefined : "transform" }}
              animate={prefersReducedMotion ? undefined : { x: ["-15vw", "115vw"] }}
              transition={
                prefersReducedMotion
                  ? undefined
                  : { duration: 95, repeat: Infinity, ease: "linear", repeatDelay: 8 }
              }
            >
              {/* Contrail */}
              <span
                className={`h-px w-28 shrink-0 bg-gradient-to-r from-transparent to-white/35 sm:w-44 lg:w-56 ${
                  prefersReducedMotion ? "opacity-30" : "contrail"
                }`}
                style={prefersReducedMotion ? undefined : { animationDuration: "95s" }}
              />

              {/* Aircraft - dark/silver body with a soft blue-violet rim light,
                  levelled out of the icon's default takeoff angle. */}
              <Plane
                size={26}
                strokeWidth={1.5}
                className="-rotate-45 shrink-0 text-slate-300/80 sm:size-[30px]"
                style={{
                  filter:
                    "drop-shadow(0 0 1.5px rgba(255,255,255,0.4)) drop-shadow(0 8px 14px rgba(0,0,0,0.5)) drop-shadow(0 0 10px rgba(139,92,246,0.45))",
                }}
              />
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
