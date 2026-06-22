/**
 * NefariousScene - A two-act stylized motion-graphics sequence.
 *
 * Act 1 ("Enhanced Visual Impacts"): a central muscular figure whose every
 *   gesture detonates a cinematic fireball. Embers and smoke drift across a
 *   volatile, red-lit frame while debris streaks past the foreground in
 *   slow motion.
 *
 * Act 2 ("The Final Power Stance"): the camera flashes to a wide, full-bleed
 *   shot of two exceptionally muscular men who simultaneously raise their arms
 *   into a crossed-chest stance before a large, glowing "NEFARIOUS" logo.
 *   Overhead spotlights carve out their musculature with deep shadows.
 *
 * Everything is programmatic (SVG + gradients + frame-driven animation) - no
 * photographic footage - so it stays deterministic and renders headlessly.
 */

import React, { useId, useMemo } from "react";
import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  random,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { PersistentParticles, Vignette } from "../components/CinematicEffects";

// ============================================================
// TIMELINE
// ============================================================

const FPS = 30;
const IMPACT_FRAMES = 270; // Act 1: 9s
const STANCE_FRAMES = 240; // Act 2: 8s
export const NEFARIOUS_TOTAL_FRAMES = IMPACT_FRAMES + STANCE_FRAMES; // 17s

// ============================================================
// PALETTE
// ============================================================

const FIRE = {
  core: "#fff6da",
  hot: "#ffb13a",
  mid: "#ff5a1f",
  deep: "#c0140a",
};
const SMOKE_TINT = "60,22,14"; // rgb, alpha applied per-blob
const SPOT = "#fff2da";
const LOGO_RED = "#ff2d2d";

// ============================================================
// MATH HELPERS
// ============================================================

type Pt = [number, number];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpPt = (p: Pt, q: Pt, t: number): Pt => [
  lerp(p[0], q[0], t),
  lerp(p[1], q[1], t),
];

/** A 0 -> 1 -> 0 pulse centred on `beat`, lasting `len` frames. */
const beatPulse = (frame: number, beat: number, len = 16) => {
  const x = (frame - beat) / len;
  if (x < 0 || x > 1) return 0;
  return Math.sin(x * Math.PI);
};

// ============================================================
// MUSCULAR FIGURE (stylized SVG silhouette)
// ============================================================

// Local SVG coordinate space (240 x 440). Joints are fixed except the arms,
// which the parent supplies so poses can be animated.
const VB_W = 240;
const VB_H = 440;

const HEAD: Pt = [120, 52];
const SHOULDER_L: Pt = [80, 122];
const SHOULDER_R: Pt = [160, 122];
const HIP_L: Pt = [108, 262];
const HIP_R: Pt = [132, 262];
const KNEE_L: Pt = [86, 348];
const KNEE_R: Pt = [154, 348];
const FOOT_L: Pt = [74, 428];
const FOOT_R: Pt = [166, 428];

const limb = (a: Pt, b: Pt, c: Pt) =>
  `M ${a[0]} ${a[1]} L ${b[0]} ${b[1]} L ${c[0]} ${c[1]}`;

interface FigureProps {
  heightPx: number;
  centerX: number;
  feetY: number;
  bodyTop: string;
  bodyBottom: string;
  rim: string;
  rimOpacity?: number;
  glowColor: string;
  glowBlur?: number;
  leftElbow: Pt;
  leftHand: Pt;
  rightElbow: Pt;
  rightHand: Pt;
  zIndex?: number;
}

/**
 * A bold, symmetrical bodybuilder silhouette. The torso is a filled V-taper;
 * limbs are thick round-capped strokes; a set of low-opacity "rim" strokes
 * fakes the highlight of an overhead light against the near-black body.
 */
const MuscularFigure: React.FC<FigureProps> = ({
  heightPx,
  centerX,
  feetY,
  bodyTop,
  bodyBottom,
  rim,
  rimOpacity = 0.55,
  glowColor,
  glowBlur = 26,
  leftElbow,
  leftHand,
  rightElbow,
  rightHand,
  zIndex = 10,
}) => {
  const uid = useId().replace(/[:]/g, "");
  const gradId = `body-${uid}`;
  const width = (heightPx * VB_W) / VB_H;
  const left = centerX - width / 2;
  const top = feetY - heightPx;

  // V-taper torso outline with a hint of lat flare.
  const torso = `
    M 74 124
    C 96 100, 144 100, 166 124
    C 178 156, 150 214, 142 242
    L 146 268
    L 94 268
    L 98 242
    C 90 214, 62 156, 74 124
    Z`;

  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width,
        height: heightPx,
        zIndex,
        filter: `drop-shadow(0 0 ${glowBlur}px ${glowColor})`,
      }}
    >
      <svg width={width} height={heightPx} viewBox={`0 0 ${VB_W} ${VB_H}`}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={bodyTop} />
            <stop offset="100%" stopColor={bodyBottom} />
          </linearGradient>
        </defs>

        {/* Legs (wide stance) */}
        <path
          d={limb(HIP_L, KNEE_L, FOOT_L)}
          stroke={`url(#${gradId})`}
          strokeWidth={42}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={limb(HIP_R, KNEE_R, FOOT_R)}
          stroke={`url(#${gradId})`}
          strokeWidth={42}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Hips / pelvis block */}
        <path d="M 94 244 L 146 244 L 150 272 L 90 272 Z" fill={`url(#${gradId})`} />

        {/* Torso */}
        <path d={torso} fill={`url(#${gradId})`} />

        {/* Neck */}
        <path d="M 108 84 L 132 84 L 136 124 L 104 124 Z" fill={`url(#${gradId})`} />

        {/* Traps */}
        <path d="M 104 92 L 80 122 L 160 122 L 136 92 Z" fill={`url(#${gradId})`} />

        {/* Head */}
        <circle cx={HEAD[0]} cy={HEAD[1]} r={30} fill={`url(#${gradId})`} />

        {/* Deltoids */}
        <circle cx={SHOULDER_L[0]} cy={SHOULDER_L[1]} r={26} fill={`url(#${gradId})`} />
        <circle cx={SHOULDER_R[0]} cy={SHOULDER_R[1]} r={26} fill={`url(#${gradId})`} />

        {/* Arms (left drawn first so the right reads as "on top" when crossed) */}
        <path
          d={limb(SHOULDER_L, leftElbow, leftHand)}
          stroke={`url(#${gradId})`}
          strokeWidth={31}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={limb(SHOULDER_R, rightElbow, rightHand)}
          stroke={`url(#${gradId})`}
          strokeWidth={31}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* ---- Rim highlights (overhead light catching the muscle) ---- */}
        <g
          stroke={rim}
          strokeOpacity={rimOpacity}
          strokeWidth={4}
          fill="none"
          strokeLinecap="round"
        >
          {/* Shoulder / trap sheen */}
          <path d="M 96 104 C 110 98, 130 98, 144 104" />
          {/* Collarbone */}
          <path d="M 100 130 C 110 136, 130 136, 140 130" />
          {/* Pec separation */}
          <path d="M 120 134 L 120 170" strokeOpacity={rimOpacity * 0.8} />
          {/* Pec under-lights */}
          <path d="M 96 164 C 106 172, 114 172, 120 168" />
          <path d="M 144 164 C 134 172, 126 172, 120 168" />
          {/* Abs */}
          <path d="M 120 176 L 120 236" strokeOpacity={rimOpacity * 0.7} />
          <path d="M 104 192 L 136 192" strokeOpacity={rimOpacity * 0.55} />
          <path d="M 105 210 L 135 210" strokeOpacity={rimOpacity * 0.55} />
          <path d="M 107 228 L 133 228" strokeOpacity={rimOpacity * 0.5} />
          {/* Arm sheen (centreline catch-light) */}
          <path
            d={limb(SHOULDER_L, leftElbow, leftHand)}
            strokeWidth={3}
            strokeOpacity={rimOpacity * 0.7}
          />
          <path
            d={limb(SHOULDER_R, rightElbow, rightHand)}
            strokeWidth={3}
            strokeOpacity={rimOpacity * 0.7}
          />
          {/* Quad sheen */}
          <path d={limb(HIP_L, KNEE_L, FOOT_L)} strokeWidth={3} strokeOpacity={rimOpacity * 0.6} />
          <path d={limb(HIP_R, KNEE_R, FOOT_R)} strokeWidth={3} strokeOpacity={rimOpacity * 0.6} />
        </g>
      </svg>
    </div>
  );
};

// ============================================================
// FIREBALL / EXPLOSION
// ============================================================

interface FireballProps {
  start: number;
  x: number; // px
  y: number; // px
  size: number; // px diameter at peak
}

const Fireball: React.FC<FireballProps> = ({ start, x, y, size }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - start;
  const life = 1.7 * fps;
  if (local < 0 || local > life) return null;

  const t = local / life;
  const grow = interpolate(t, [0, 0.22, 1], [0, 1, 1.22], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  const fade = interpolate(t, [0, 0.45, 1], [1, 0.85, 0], {
    extrapolateRight: "clamp",
  });
  const d = size * grow;

  // Expanding shock ring.
  const ring = interpolate(t, [0, 1], [0.25, 2.3]);
  const ringD = size * ring;
  const ringOpacity = interpolate(t, [0, 0.5, 1], [0.85, 0.25, 0]);

  // Bright collapsing core.
  const coreScale = interpolate(t, [0, 0.14, 0.55], [0, 1, 0], {
    extrapolateRight: "clamp",
  });
  const coreD = size * 0.42 * coreScale;

  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
      {/* Shock ring */}
      <div
        style={{
          position: "absolute",
          left: x - ringD / 2,
          top: y - ringD / 2,
          width: ringD,
          height: ringD,
          borderRadius: "50%",
          border: `${Math.max(2, size * 0.03)}px solid ${FIRE.hot}`,
          opacity: ringOpacity,
          filter: `blur(${size * 0.012}px)`,
        }}
      />
      {/* Fire body */}
      <div
        style={{
          position: "absolute",
          left: x - d / 2,
          top: y - d / 2,
          width: d,
          height: d,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${FIRE.core} 0%, ${FIRE.hot} 24%, ${FIRE.mid} 46%, ${FIRE.deep} 68%, rgba(70,6,3,0) 78%)`,
          opacity: fade,
          filter: `blur(${size * 0.02}px)`,
        }}
      />
      {/* Hot core */}
      {coreD > 1 && (
        <div
          style={{
            position: "absolute",
            left: x - coreD / 2,
            top: y - coreD / 2,
            width: coreD,
            height: coreD,
            borderRadius: "50%",
            background: `radial-gradient(circle, #ffffff 0%, ${FIRE.core} 45%, rgba(255,200,100,0) 75%)`,
            opacity: fade,
          }}
        />
      )}
    </AbsoluteFill>
  );
};

// ============================================================
// SMOKE
// ============================================================

const SmokeLayer: React.FC<{
  count?: number;
  seed?: string;
  zIndex?: number;
}> = ({ count = 8, seed = "smoke", zIndex = 3 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const blobs = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: random(`${seed}-x${i}`) * width,
        baseY: height * 0.55 + random(`${seed}-y${i}`) * height * 0.45,
        size: 300 + random(`${seed}-s${i}`) * 380,
        speed: 0.3 + random(`${seed}-sp${i}`) * 0.6,
        sway: 40 + random(`${seed}-sw${i}`) * 70,
        phase: random(`${seed}-ph${i}`) * Math.PI * 2,
        op: 0.16 + random(`${seed}-o${i}`) * 0.2,
      })),
    [count, seed, width, height]
  );

  return (
    <AbsoluteFill style={{ zIndex, pointerEvents: "none" }}>
      {blobs.map((b, i) => {
        const cycle = height * 0.9 + b.size;
        const rise = (frame * b.speed) % cycle;
        const y = b.baseY - rise;
        const x = b.x + Math.sin(frame * 0.01 + b.phase) * b.sway;
        const grow = 1 + (rise / height) * 0.6;
        const fade = Math.max(0, 1 - rise / (height * 0.9));
        const alpha = (b.op * fade).toFixed(3);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - (b.size * grow) / 2,
              top: y - (b.size * grow) / 2,
              width: b.size * grow,
              height: b.size * grow,
              borderRadius: "50%",
              background: `radial-gradient(circle, rgba(${SMOKE_TINT},${alpha}) 0%, rgba(${SMOKE_TINT},0) 70%)`,
              filter: `blur(${b.size * 0.08}px)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// ============================================================
// FOREGROUND DEBRIS (slow motion)
// ============================================================

const DebrisLayer: React.FC<{ count?: number; seed?: string }> = ({
  count = 6,
  seed = "debris",
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const chunks = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const dir = random(`${seed}-d${i}`) > 0.5 ? 1 : -1;
        return {
          dir,
          y: height * 0.18 + random(`${seed}-y${i}`) * height * 0.7,
          w: 40 + random(`${seed}-w${i}`) * 110,
          h: 12 + random(`${seed}-h${i}`) * 22,
          speed: 2.4 + random(`${seed}-s${i}`) * 2.6, // px/frame -> slow drift
          rot: random(`${seed}-r${i}`) * 360,
          rotSpeed: (random(`${seed}-rs${i}`) - 0.5) * 1.4,
          delay: random(`${seed}-dl${i}`) * 50,
          op: 0.45 + random(`${seed}-o${i}`) * 0.4,
          blur: 6 + random(`${seed}-b${i}`) * 8,
        };
      }),
    [count, seed, height]
  );

  return (
    <AbsoluteFill style={{ zIndex: 60, pointerEvents: "none" }}>
      {chunks.map((c, i) => {
        const t = Math.max(0, frame - c.delay);
        const startX = c.dir > 0 ? -180 : width + 180;
        const x = startX + c.dir * t * c.speed;
        const rotation = c.rot + t * c.rotSpeed;
        // Cull once it has fully crossed the frame.
        if (x < -250 || x > width + 250) return null;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - c.w / 2,
              top: c.y - c.h / 2,
              width: c.w,
              height: c.h,
              borderRadius: c.h / 2,
              background: `linear-gradient(90deg, #1a0f0a 0%, #3a1c0e 50%, #1a0f0a 100%)`,
              boxShadow: `0 0 12px rgba(255,90,30,0.45)`,
              opacity: c.op,
              transform: `rotate(${rotation}deg)`,
              filter: `blur(${c.blur}px)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// ============================================================
// OVERHEAD SPOTLIGHT (Act 2)
// ============================================================

const Spotlight: React.FC<{ centerX: number; intensity?: number }> = ({
  centerX,
  intensity = 1,
}) => {
  const { height } = useVideoConfig();
  return (
    <>
      {/* Beam */}
      <div
        style={{
          position: "absolute",
          top: -120,
          left: centerX - 360,
          width: 720,
          height: height + 200,
          clipPath: "polygon(43% 0%, 57% 0%, 80% 100%, 20% 100%)",
          background: `linear-gradient(to bottom, rgba(255,242,218,${0.42 * intensity}) 0%, rgba(255,242,218,${0.06 * intensity}) 55%, rgba(255,242,218,0) 100%)`,
          filter: "blur(16px)",
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />
      {/* Floor pool */}
      <div
        style={{
          position: "absolute",
          top: height - 220,
          left: centerX - 320,
          width: 640,
          height: 300,
          borderRadius: "50%",
          background: `radial-gradient(ellipse at center, rgba(255,242,218,${0.28 * intensity}) 0%, rgba(255,242,218,0) 70%)`,
          filter: "blur(18px)",
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />
    </>
  );
};

// ============================================================
// NEFARIOUS LOGO
// ============================================================

const NefariousLogo: React.FC<{ glow: number; scale: number; opacity: number }> = ({
  glow,
  scale,
  opacity,
}) => {
  const baseStyle: React.CSSProperties = {
    margin: 0,
    fontFamily: "Outfit, sans-serif",
    fontWeight: 900,
    fontSize: 170,
    letterSpacing: 14,
    lineHeight: 1,
    whiteSpace: "nowrap",
  };

  return (
    <div
      style={{
        position: "relative",
        transform: `scale(${scale})`,
        opacity,
        display: "grid",
        placeItems: "center",
      }}
    >
      {/* Glow underlayer */}
      <h1
        style={{
          ...baseStyle,
          gridArea: "1 / 1",
          color: LOGO_RED,
          filter: `blur(${18 + glow * 26}px)`,
          opacity: 0.55 + glow * 0.4,
        }}
      >
        NEFARIOUS
      </h1>
      {/* Sharp gradient layer */}
      <h1
        style={{
          ...baseStyle,
          gridArea: "1 / 1",
          background: "linear-gradient(180deg, #ffac6b 0%, #ff3b30 52%, #8c0a05 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          WebkitTextFillColor: "transparent",
          textShadow: `0 0 ${10 + glow * 16}px rgba(255,60,40,${0.5 + glow * 0.4})`,
        }}
      >
        NEFARIOUS
      </h1>
    </div>
  );
};

// ============================================================
// ACT 1 - ENHANCED VISUAL IMPACTS
// ============================================================

const GESTURE_BEATS = [26, 70, 112, 150, 188, 224];

// Explosion choreography (positions as fractions of the frame).
const EXPLOSIONS: { start: number; fx: number; fy: number; size: number }[] = [
  { start: 22, fx: 0.30, fy: 0.42, size: 360 },
  { start: 28, fx: 0.50, fy: 0.30, size: 300 },
  { start: 68, fx: 0.70, fy: 0.40, size: 430 },
  { start: 108, fx: 0.36, fy: 0.34, size: 340 },
  { start: 114, fx: 0.62, fy: 0.52, size: 290 },
  { start: 148, fx: 0.50, fy: 0.26, size: 470 },
  { start: 186, fx: 0.26, fy: 0.46, size: 360 },
  { start: 190, fx: 0.74, fy: 0.34, size: 330 },
  { start: 222, fx: 0.50, fy: 0.40, size: 540 },
];

const ImpactScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Energy / camera shake / red flash accumulate from the gesture beats.
  let shakeX = 0;
  let shakeY = 0;
  let flash = 0;
  let energy = 0;
  for (const b of GESTURE_BEATS) {
    const p = beatPulse(frame, b, 18);
    if (p > 0) {
      const dir = random(`shk-${b}`) * Math.PI * 2;
      shakeX += Math.cos(dir) * p * 14;
      shakeY += Math.sin(dir) * p * 10;
      flash = Math.max(flash, p);
      energy = Math.max(energy, p);
    }
  }

  // Arm posing: a raised, open flex with a thrust on each beat (alternating
  // sides) - the thrust "throws" the explosion.
  const leftElbowBase: Pt = [54, 150];
  const leftHandBase: Pt = [44, 84];
  const rightElbowBase: Pt = [186, 150];
  const rightHandBase: Pt = [196, 84];

  let leftElbow: Pt = [...leftElbowBase];
  let leftHand: Pt = [...leftHandBase];
  let rightElbow: Pt = [...rightElbowBase];
  let rightHand: Pt = [...rightHandBase];

  GESTURE_BEATS.forEach((b, idx) => {
    const p = beatPulse(frame, b, 16);
    if (p <= 0) return;
    if (idx % 2 === 0) {
      rightHand = [rightHandBase[0] + 34 * p, rightHandBase[1] + 44 * p];
      rightElbow = [rightElbowBase[0] + 16 * p, rightElbowBase[1] + 20 * p];
    } else {
      leftHand = [leftHandBase[0] - 34 * p, leftHandBase[1] + 44 * p];
      leftElbow = [leftElbowBase[0] - 16 * p, leftElbowBase[1] + 20 * p];
    }
  });

  // Intro fade so the act doesn't pop in.
  const intro = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0503", opacity: intro }}>
      {/* Pulsing red ambient environment */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 45%, rgba(120,18,8,${0.45 + energy * 0.4}) 0%, rgba(30,4,2,0.9) 60%, #050202 100%)`,
        }}
      />

      {/* Camera-shaken world layer */}
      <AbsoluteFill style={{ transform: `translate(${shakeX}px, ${shakeY}px)` }}>
        {/* Background smoke */}
        <SmokeLayer count={9} seed="impact-smoke" zIndex={3} />

        {/* Explosions behind the figure */}
        <AbsoluteFill style={{ zIndex: 5 }}>
          {EXPLOSIONS.map((e, i) => (
            <Fireball
              key={i}
              start={e.start}
              x={e.fx * width}
              y={e.fy * height}
              size={e.size}
            />
          ))}
        </AbsoluteFill>

        {/* Central figure */}
        <MuscularFigure
          zIndex={10}
          heightPx={840}
          centerX={width / 2}
          feetY={height - 44}
          bodyTop="#241510"
          bodyBottom="#0a0604"
          rim="#ff8a3a"
          rimOpacity={0.6}
          glowColor="#ff4d12"
          glowBlur={34}
          leftElbow={leftElbow}
          leftHand={leftHand}
          rightElbow={rightElbow}
          rightHand={rightHand}
        />

        {/* Rising embers (two heat layers) */}
        <PersistentParticles count={55} color="#ff7a18" seed="ember-a" />
        <PersistentParticles count={30} color="#ffd27a" seed="ember-b" />
      </AbsoluteFill>

      {/* Foreground debris in slow motion */}
      <DebrisLayer count={6} seed="impact-debris" />

      {/* Red flash on each detonation */}
      <AbsoluteFill
        style={{
          backgroundColor: "#ff4d12",
          opacity: flash * 0.22,
          mixBlendMode: "screen",
          pointerEvents: "none",
          zIndex: 80,
        }}
      />

      <Vignette intensity={0.5} />
    </AbsoluteFill>
  );
};

// ============================================================
// ACT 2 - THE FINAL POWER STANCE
// ============================================================

// Local arm joints for the crossed-chest stance, interpolated from "down".
const armsDown = {
  leftElbow: [66, 198] as Pt,
  leftHand: [82, 262] as Pt,
  rightElbow: [174, 198] as Pt,
  rightHand: [158, 262] as Pt,
};
const armsCrossed = {
  leftElbow: [78, 202] as Pt,
  leftHand: [150, 150] as Pt,
  rightElbow: [162, 202] as Pt,
  rightHand: [90, 138] as Pt,
};

const PowerStanceScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Men fade up; logo powers on.
  const entrance = interpolate(frame, [0, 0.6 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Arms simultaneously raise into the cross ~0.5s in.
  const armProgress = spring({
    frame: frame - 0.5 * fps,
    fps,
    durationInFrames: Math.round(0.9 * fps),
    config: { damping: 14 },
  });
  const leftElbow = lerpPt(armsDown.leftElbow, armsCrossed.leftElbow, armProgress);
  const leftHand = lerpPt(armsDown.leftHand, armsCrossed.leftHand, armProgress);
  const rightElbow = lerpPt(armsDown.rightElbow, armsCrossed.rightElbow, armProgress);
  const rightHand = lerpPt(armsDown.rightHand, armsCrossed.rightHand, armProgress);

  // Logo glow flicker (deterministic).
  const flick = (random(`flk-${Math.floor(frame / 4)}`) - 0.5) * 0.2;
  const glow = Math.min(1, Math.max(0, 0.6 + 0.3 * Math.sin(frame * 0.12) + flick));
  const logoScale = interpolate(entrance, [0, 1], [0.86, 1]);

  const menCenters = [width * 0.34, width * 0.66];

  // Full-bleed background - no letterbox bars, top to bottom.
  return (
    <AbsoluteFill style={{ backgroundColor: "#050507" }}>
      {/* Backdrop glow behind branding */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 38%, rgba(60,10,8,0.9) 0%, rgba(8,8,12,0.96) 58%, #050507 100%)",
        }}
      />

      {/* NEFARIOUS branding (behind the men) */}
      <AbsoluteFill
        style={{
          zIndex: 4,
          justifyContent: "flex-start",
          alignItems: "center",
          paddingTop: height * 0.18,
        }}
      >
        <NefariousLogo glow={glow} scale={logoScale} opacity={entrance} />
      </AbsoluteFill>

      {/* Overhead spotlights */}
      <AbsoluteFill style={{ zIndex: 5 }}>
        {menCenters.map((cx, i) => (
          <Spotlight key={i} centerX={cx} intensity={entrance} />
        ))}
      </AbsoluteFill>

      {/* The two men - identical, symmetrical */}
      <AbsoluteFill style={{ zIndex: 10, opacity: entrance }}>
        {menCenters.map((cx, i) => (
          <MuscularFigure
            key={i}
            zIndex={10}
            heightPx={780}
            centerX={cx}
            feetY={height - 30}
            bodyTop="#15151d"
            bodyBottom="#050507"
            rim={SPOT}
            rimOpacity={0.6}
            glowColor="rgba(255,242,218,0.5)"
            glowBlur={22}
            leftElbow={leftElbow}
            leftHand={leftHand}
            rightElbow={rightElbow}
            rightHand={rightHand}
          />
        ))}
      </AbsoluteFill>

      {/* A few lingering embers for continuity */}
      <PersistentParticles count={16} color="#ff9a4a" seed="stance-ember" />

      <Vignette intensity={0.45} />
    </AbsoluteFill>
  );
};

// ============================================================
// TRANSITION FLASH (Act 1 -> Act 2)
// ============================================================

const TransitionFlash: React.FC = () => {
  const frame = useCurrentFrame();
  // Bright orange-white blowout that peaks at the cut.
  const opacity = interpolate(frame, [0, 6, 16], [0, 0.95, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill
      style={{
        background: "radial-gradient(circle at 50% 50%, #ffffff 0%, #ffd27a 40%, #ff5a1f 100%)",
        opacity,
        mixBlendMode: "screen",
        pointerEvents: "none",
        zIndex: 200,
      }}
    />
  );
};

// ============================================================
// ROOT
// ============================================================

export const NefariousScene: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Sequence durationInFrames={IMPACT_FRAMES} name="Act 1 - Enhanced Visual Impacts">
        <ImpactScene />
      </Sequence>

      <Sequence from={IMPACT_FRAMES} durationInFrames={STANCE_FRAMES} name="Act 2 - The Final Power Stance">
        <PowerStanceScene />
      </Sequence>

      {/* Flash straddling the cut */}
      <Sequence from={IMPACT_FRAMES - 8} durationInFrames={24} name="Transition">
        <TransitionFlash />
      </Sequence>
    </AbsoluteFill>
  );
};

export default NefariousScene;
