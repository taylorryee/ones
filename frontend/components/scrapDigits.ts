// Sizes for ScrapNumber, the cut-out digits the Elo is shown in. No React Native imports, so the
// badge wall layout can use them and Node can run the tests.

import { ART } from './art.generated.ts';

// viewBox size of each digit's artboard, indexed by the digit. All share one height.
export const DIGIT_SIZES = [
  ART.digit0,
  ART.digit1,
  ART.digit2,
  ART.digit3,
  ART.digit4,
  ART.digit5,
  ART.digit6,
  ART.digit7,
  ART.digit8,
  ART.digit9,
];

// How far each scrap tucks under the one before it, as a share of the height. The artboards have
// clear space around the paper, so this only closes that gap.
export const DIGIT_OVERLAP = 0.1;

export function digitsOf(value: number) {
  return String(Math.abs(Math.round(value))).split('').map(Number);
}

// Width of `value` drawn `height` tall.
export function scrapNumberWidth(value: number, height: number) {
  const digits = digitsOf(value);
  const total = digits.reduce(
    (sum, d) => sum + (height * DIGIT_SIZES[d].width) / DIGIT_SIZES[d].height,
    0
  );
  return total - height * DIGIT_OVERLAP * (digits.length - 1);
}

// The tallest `value` can be drawn, up to `maxHeight`, and still fit `maxWidth`.
export function fitScrapNumber(value: number, maxWidth: number, maxHeight: number) {
  return Math.min(maxHeight, maxWidth / scrapNumberWidth(value, 1));
}
