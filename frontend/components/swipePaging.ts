// How the calendar and the rotating cards feel under the finger, kept here so they feel the same.

// A swipe further than this share of a page, or faster than this (pt per s), moves one page;
// a shorter, slower one springs back. The spring carries on at the finger's speed and never
// overshoots, so a flick doesn't brake to a stop and the pages never bounce past the border.
export const SWIPE_DISTANCE = 0.2;
export const SWIPE_VELOCITY = 300;
export const SNAP_SPRING = {
  damping: 36,
  mass: 1,
  overshootClamping: true,
  stiffness: 320,
};
// Dragging past the pages that can be reached stretches them like a rubber band: they follow the
// finger at this share of its speed to begin with, then ever less, and never further than this
// many pages, so they spring back from the same place on release.
const EDGE_RESISTANCE = 0.65;
export const EDGE_STRETCH = 3;
// How far a finger moves sideways before the drag starts, or up and down before it's left alone.
export const DRAG_SLOP = 10;

export const clamp = (value: number, min: number, max: number) => {
  'worklet';
  return Math.min(max, Math.max(min, value));
};

// `value` kept to `min`..`max`, except that going past either end still moves a little, by less
// and less, up to `maxStretch`.
export const rubberBand = (value: number, min: number, max: number, maxStretch: number) => {
  'worklet';
  const stretch = (past: number) =>
    maxStretch * (1 - 1 / ((past * EDGE_RESISTANCE) / maxStretch + 1));
  if (value < min) {
    return min - stretch(min - value);
  }
  if (value > max) {
    return max + stretch(value - max);
  }
  return value;
};

// The page to settle on when the finger lifts: `forward` or `back` after a real swipe, otherwise
// the nearest page to `at`, the fractional page the pages are on now.
export const releaseTarget = (
  at: number,
  back: number,
  forward: number,
  translationX: number,
  velocityX: number,
  pitch: number,
) => {
  'worklet';
  let target = Math.round(at);
  if (translationX < -pitch * SWIPE_DISTANCE || velocityX < -SWIPE_VELOCITY) {
    target = forward;
  } else if (translationX > pitch * SWIPE_DISTANCE || velocityX > SWIPE_VELOCITY) {
    target = back;
  }
  return clamp(target, back, forward);
};
