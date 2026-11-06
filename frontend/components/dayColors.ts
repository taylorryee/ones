// The color of each calendar day. No React Native imports, so Node can run the tests.

import { DAY_COLORS, DAY_GRADIENTS } from '../constants/theme.ts';

const DAY_MS = 24 * 60 * 60 * 1000;

// One of `options`, picked at random but always the same for the same `seed` (mulberry32).
function pick<T>(options: T[], seed: number) {
  const state = (seed + 0x6d2b79f5) | 0;
  let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
  mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
  const random = ((mixed ^ (mixed >>> 14)) >>> 0) / 2 ** 32;
  return options[Math.floor(random * options.length)];
}

// One of `options` for `date`: random, but never the same as the day before or after, even across
// months. Worked out from the date, because a day's fill is rebuilt on every load and has to keep
// its look. Even days pick freely, and odd days pick from what their two even neighbours leave, so
// no day has to know any earlier one.
function pickForDay<T>(options: T[], date: Date) {
  const day = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS;
  if (day % 2 === 0) {
    return pick(options, day);
  }
  const neighbours = [pick(options, day - 1), pick(options, day + 1)];
  return pick(options.filter((option) => !neighbours.includes(option)), day);
}

// The color `date` is scribbled in with when the player hooped.
export function dayColor(date: Date) {
  return pickForDay(DAY_COLORS, date);
}

// The gradient `date` is scribbled in with when the player played a game, won or lost.
export function dayGradient(date: Date) {
  return pickForDay(DAY_GRADIENTS, date);
}
