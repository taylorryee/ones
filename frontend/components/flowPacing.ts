// How often the played-day gradients repaint, slowed down on phones that can't keep up. No React
// Native imports, so Node can run the tests.

// Repaints per second, best first. 0 leaves the gradients still.
export const FLOW_RATES = [30, 15, 0];

// Frames are measured over this long at a time, in ms.
const WINDOW = 2000;
// A window averaging longer frames than this (about 35 per second) is slow.
const SLOW_FRAME = 28;
// Slow windows in a row before slowing down, so one hitch, like a month loading, doesn't count.
const SLOW_WINDOWS = 2;
// A gap this long, in ms, is the app pausing rather than the phone struggling.
const MAX_FRAME = 250;

export type FlowPacing = { level: number; time: number; frames: number; slowWindows: number };

export const START_PACING: FlowPacing = { level: 0, time: 0, frames: 0, slowWindows: 0 };

// The pacing after a frame that took `frameMs`. It only ever slows down, so a phone on the edge
// doesn't keep switching between the two.
export function pace(pacing: FlowPacing, frameMs: number): FlowPacing {
  'worklet';
  if (frameMs > MAX_FRAME || pacing.level === FLOW_RATES.length - 1) {
    return pacing;
  }
  const time = pacing.time + frameMs;
  const frames = pacing.frames + 1;
  if (time < WINDOW) {
    return { ...pacing, time, frames };
  }
  const slowWindows = time / frames > SLOW_FRAME ? pacing.slowWindows + 1 : 0;
  return slowWindows === SLOW_WINDOWS
    ? { ...START_PACING, level: pacing.level + 1 }
    : { ...pacing, time: 0, frames: 0, slowWindows };
}
