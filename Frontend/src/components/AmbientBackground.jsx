import { useReducedMotion } from "framer-motion";

// Deterministic pseudo-random generator (mulberry32) - gives the city-light
// scatter and cloud placement a natural, non-repeating look while staying a
// fixed module-level constant, so nothing shifts between renders/mounts.
function seededRandom(seed) {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// A scatter of "city light" points along the earth's rim, clustered in a
// few denser patches (like lit coastlines/metro areas) rather than spread
// evenly - mostly warm sodium-amber with an occasional cooler white/blue
// district, like real night-earth imagery. Computed once at module load,
// never per-render.
const CITY_LIGHTS = Array.from({ length: 110 }, (_, i) => {
  const cluster = Math.floor(i / 16);
  const clusterX = 6 + cluster * 14 + seededRandom(cluster * 91 + 5) * 9;
  const x = Math.min(97, Math.max(1, clusterX + (seededRandom(i * 17 + 3) - 0.5) * 20));
  const y = 76 + seededRandom(i * 31 + 11) * 20;
  const r = 0.5 + seededRandom(i * 53 + 7) * 1.3;
  const opacity = 0.2 + seededRandom(i * 71 + 13) * 0.55;
  const cool = seededRandom(i * 43 + 21) > 0.85;
  return { x, y, r, opacity, color: cool ? "#bfe3ff" : "#fde68a" };
});

// A handful of soft, irregular landmass silhouettes beneath the city
// lights, clipped to the planet's disk - blurred so they read as continents
// seen through haze rather than hard shapes. One pale patch stands in for a
// sunlit polar ice cap.
const LANDMASSES = Array.from({ length: 7 }, (_, i) => ({
  cx: 60 + seededRandom(i * 47 + 3) * 1320,
  cy: 260 + seededRandom(i * 59 + 5) * 300,
  rx: 140 + seededRandom(i * 67 + 7) * 160,
  ry: 60 + seededRandom(i * 73 + 9) * 60,
  fill: i % 3 === 0 ? "#142a1e" : i % 3 === 1 ? "#0f2233" : "#182a1a",
}));

// A sparse set of brighter stars that twinkle on top of the static dot-grid
// field, each with its own duration/delay so they never pulse in sync.
const TWINKLE_STARS = Array.from({ length: 45 }, (_, i) => ({
  x: seededRandom(i * 19 + 2) * 100,
  y: seededRandom(i * 37 + 6) * 55,
  r: 0.6 + seededRandom(i * 61 + 9) * 1,
  duration: 2.4 + seededRandom(i * 83 + 4) * 3.2,
  delay: seededRandom(i * 101 + 8) * 4,
}));

// Cloud layers - a denser band low over the earth's curve, plus a few
// higher, wispier layers up where the aircraft crosses, as if cruising
// just above them. Large, low-opacity blurred shapes, not illustrated art.
const CLOUDS = [
  { top: "56%", left: "-10%", width: 640, height: 220, tint: "rgba(255,255,255,0.06)", duration: 46, delay: 0 },
  { top: "47%", left: "52%", width: 580, height: 200, tint: "rgba(139,92,246,0.08)", duration: 54, delay: 8 },
  { top: "68%", left: "22%", width: 720, height: 240, tint: "rgba(255,255,255,0.05)", duration: 50, delay: 4 },
  { top: "39%", left: "10%", width: 440, height: 160, tint: "rgba(59,130,246,0.07)", duration: 42, delay: 12 },
  { top: "60%", left: "68%", width: 480, height: 190, tint: "rgba(255,255,255,0.045)", duration: 58, delay: 16 },
  { top: "30%", left: "38%", width: 400, height: 150, tint: "rgba(255,255,255,0.04)", duration: 44, delay: 6 },
];

// A thin, wispy cloud band up near the aircraft's altitude.
const HIGH_CLOUDS = [
  { top: "16%", left: "5%", width: 340, height: 60, tint: "rgba(255,255,255,0.05)", duration: 38, delay: 0 },
  { top: "10%", left: "45%", width: 300, height: 50, tint: "rgba(255,255,255,0.04)", duration: 34, delay: 5 },
  { top: "22%", left: "72%", width: 260, height: 46, tint: "rgba(255,255,255,0.045)", duration: 40, delay: 10 },
];

// Pure near-black atmosphere, viewed from altitude: a faint star field up
// top, the earth's curve with scattered night-city lights along the bottom,
// and a few slow, very low-opacity cloud layers in between for depth. No
// illustrated scenery beyond that, and nothing here ever competes with the
// UI - it sits behind AirplaneBackground and all page content.
export default function AmbientBackground() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="pointer-events-none fixed inset-0 -z-20 overflow-hidden bg-(--color-bg)" aria-hidden="true">
      {/* Star field */}
      <div
        className="absolute inset-0 opacity-[0.3]"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "34px 34px",
          maskImage: "radial-gradient(ellipse 80% 55% at 50% 15%, black 30%, transparent 100%)",
        }}
      />

      {/* Twinkling stars, layered on top of the static field */}
      <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
        {TWINKLE_STARS.map((s, i) => (
          <circle
            key={i}
            cx={`${s.x}%`}
            cy={`${s.y}%`}
            r={s.r}
            fill="#ffffff"
            className={prefersReducedMotion ? undefined : "star-twinkle"}
            opacity={prefersReducedMotion ? 0.5 : undefined}
            style={prefersReducedMotion ? undefined : { animationDuration: `${s.duration}s`, animationDelay: `${s.delay}s` }}
          />
        ))}
      </svg>

      {/* Earth's curve, glowing rim, and night-city lights along it */}
      <svg
        className="absolute inset-x-0 bottom-0 h-[58vh] w-full"
        viewBox="0 0 1440 620"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="earthFill" cx="50%" cy="-10%" r="85%">
            <stop offset="0%" stopColor="#0d1730" />
            <stop offset="45%" stopColor="#070a16" />
            <stop offset="100%" stopColor="#020203" />
          </radialGradient>
          <linearGradient id="earthRim" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(99,102,241,0)" />
            <stop offset="50%" stopColor="rgba(191,227,255,0.85)" />
            <stop offset="100%" stopColor="rgba(99,102,241,0)" />
          </linearGradient>
          <linearGradient id="earthRimHalo" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(99,102,241,0)" />
            <stop offset="50%" stopColor="rgba(129,140,248,0.55)" />
            <stop offset="100%" stopColor="rgba(99,102,241,0)" />
          </linearGradient>
          <clipPath id="earthClip">
            <path d="M-120,620 C 300,40 1140,40 1560,620 Z" />
          </clipPath>
          <filter id="landBlur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="22" />
          </filter>
        </defs>

        <g clipPath="url(#earthClip)">
          <path d="M-120,620 C 300,40 1140,40 1560,620 Z" fill="url(#earthFill)" />
          {/* Continents, seen through haze - kept inside the planet's disk */}
          <g filter="url(#landBlur)" opacity="0.85">
            {LANDMASSES.map((land, i) => (
              <ellipse key={i} cx={land.cx} cy={land.cy} rx={land.rx} ry={land.ry} fill={land.fill} />
            ))}
            {/* Sunlit polar ice, bright against the night side */}
            <ellipse cx="1360" cy="420" rx="150" ry="90" fill="#dbeafe" opacity="0.16" />
          </g>
          {CITY_LIGHTS.map((p, i) => (
            <circle key={i} cx={`${p.x}%`} cy={`${p.y}%`} r={p.r} fill={p.color} opacity={p.opacity} />
          ))}
        </g>

        {/* Layered atmosphere: a soft outer haze plus a crisp inner rim line */}
        <path
          d="M-120,620 C 300,40 1140,40 1560,620"
          fill="none"
          stroke="url(#earthRimHalo)"
          strokeWidth="14"
          opacity="0.5"
          style={{ filter: "blur(6px)" }}
        />
        <path
          d="M-120,620 C 300,40 1140,40 1560,620"
          fill="none"
          stroke="url(#earthRim)"
          strokeWidth="2"
          opacity="0.9"
        />
      </svg>

      {/* Soft atmospheric glow along the horizon */}
      <div className="absolute inset-x-0 bottom-0 h-[32vh] bg-[radial-gradient(ellipse_70%_100%_at_50%_100%,rgba(99,102,241,0.16),transparent_70%)]" />

      {/* Cloud layers over the earth's curve */}
      {CLOUDS.map((cloud, i) => (
        <div
          key={i}
          className={prefersReducedMotion ? "absolute rounded-full blur-[90px]" : "absolute rounded-full blur-[90px] cloud-drift"}
          style={{
            top: cloud.top,
            left: cloud.left,
            width: cloud.width,
            height: cloud.height,
            background: cloud.tint,
            animationDuration: `${cloud.duration}s`,
            animationDelay: `${cloud.delay}s`,
          }}
        />
      ))}

      {/* Thin, wispy clouds up near the aircraft's cruising altitude */}
      {HIGH_CLOUDS.map((cloud, i) => (
        <div
          key={i}
          className={prefersReducedMotion ? "absolute rounded-full blur-[60px]" : "absolute rounded-full blur-[60px] cloud-drift"}
          style={{
            top: cloud.top,
            left: cloud.left,
            width: cloud.width,
            height: cloud.height,
            background: cloud.tint,
            animationDuration: `${cloud.duration}s`,
            animationDelay: `${cloud.delay}s`,
          }}
        />
      ))}

      {/* Grounding vignette so foreground content always stays readable */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_70%_at_50%_-10%,rgba(255,255,255,0.03),transparent_60%)]" />
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-(--color-bg) to-transparent" />
    </div>
  );
}
