// Timing, sizing and gradient data for the badge unlock (components/BadgeUnlock.tsx). No React
// Native imports, so Node can run the tests.

import { DAY_GRADIENTS } from '../constants/theme.ts';

// How a badge spins in. Only `standard` exists for now; a rarer badge can get its own level with
// more turns, a longer spin or a bigger landing. Angles are in degrees, durations in ms.
export const UNLOCK_INTENSITY = {
  standard: {
    // Starts at this share of its size and springs up to full size as it starts spinning.
    startScale: 0.35,
    // Full turns before it faces front. Slows from about 3 turns a second, the most the eye can
    // still follow as a turning coin at 60fps, to a stop: an eased-out quad, like steady friction.
    turns: 4,
    spinDuration: 2600,
    // It slows to a stop this far past facing front, then springs back and rocks once.
    overshoot: 34,
    rebound: { damping: 9, stiffness: 150, mass: 1 },
    // As it lands it swells to this scale and settles back.
    landScale: 1.08,
  },
} as const;

export type UnlockIntensity = keyof typeof UNLOCK_INTENSITY;

// The badge's width and height on a screen whose free space is `width` × `height`: a little over
// two thirds of the width, unless the screen is short for its width, so it reads the same on an SE
// and a Pro Max and leaves room below for the name.
export const BADGE_WIDTH_SHARE = 0.68;
export const BADGE_HEIGHT_SHARE = 0.38;

export function badgeUnlockSize({ width, height }: { width: number; height: number }) {
  return Math.round(Math.min(width * BADGE_WIDTH_SHARE, height * BADGE_HEIGHT_SHARE));
}

// --- The color wash -------------------------------------------------------------------------
//
// Once the badge has landed, color sweeps across its lines from the bottom left corner to the top
// right, turning the ink into one of the played-day gradients, which then keeps flowing the way it
// does on the calendar (components/PlayedGradient.tsx). Positions are along the badge's diagonal,
// in diagonal lengths, with the middle at 0 and the corners at -0.5 and 0.5.
//
// `front` is where the edge between the colors (behind it) and the ink (ahead of it) is.

// The ink turns into color over this much of the diagonal.
export const WASH_SOFTNESS = 0.15;
// The front starts just before the bottom left corner, so the badge starts all ink...
export const FRONT_START = -0.5 - WASH_SOFTNESS;
// ...and the wash is done once it has passed the top right corner.
export const FRONT_END = 0.5;
// Behind the front the colors run out over one diagonal and back over another, as on the calendar.
// Moving the front on by WASH_CYCLE shows the same picture, so it flows from FRONT_END to
// FRONT_END + WASH_CYCLE over and over without a visible jump.
export const WASH_CYCLE = 2;

// How long the wash takes to cross the badge.
export const WASH_DURATION = 1100;

// Where the gradient's two ends are, relative to the front. Wide enough to cover the whole badge
// for every front from FRONT_START to FRONT_END + WASH_CYCLE.
export const WASH_FROM = -0.5 - (FRONT_END + WASH_CYCLE);
export const WASH_TO = 0.5 - FRONT_START;

export type WashStop = { offset: number; color: string };

// The gradient's stops, from WASH_FROM (offset 0) to WASH_TO (offset 1). `colors` are listed from
// bottom left to top right, like DAY_GRADIENTS, so once the wash is done the badge shows them that
// way round, the last color at the top right.
export function washStops(colors: readonly string[], ink: string): WashStop[] {
  const span = WASH_TO - WASH_FROM;
  const offset = (along: number) => (along - WASH_FROM) / span;
  // One color to the next, in diagonal lengths.
  const step = WASH_CYCLE / (2 * (colors.length - 1));
  const steps = Math.ceil(-WASH_FROM / step);
  const behind: WashStop[] = [];
  for (let index = steps; index >= 0; index--) {
    // Counting back from the front: the last color, down to the first, and up again.
    const inCycle = index % (2 * (colors.length - 1));
    const color =
      inCycle <= colors.length - 1
        ? colors[colors.length - 1 - inCycle]
        : colors[inCycle - (colors.length - 1)];
    behind.push({ offset: Math.max(0, offset(-index * step)), color });
  }
  return [...behind, { offset: offset(WASH_SOFTNESS), color: ink }, { offset: 1, color: ink }];
}

// One of the played-day gradients for a badge, always the same for the same name.
export function badgeGradient(name: string) {
  let hash = 0;
  for (const char of name) {
    hash = (Math.imul(hash, 31) + char.charCodeAt(0)) | 0;
  }
  return DAY_GRADIENTS[Math.abs(hash) % DAY_GRADIENTS.length];
}
