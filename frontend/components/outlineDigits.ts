// Sizes for OutlineNumber, the hollow oneSan digits the Elo is shown in. No React Native imports,
// so the badge wall layout can use them and Node can run the tests.

import { ART } from './art.generated.ts';
import { digitsOf } from './scrapDigits.ts';

// viewBox size of each digit's artboard, indexed by the digit. All share one height.
export const OUTLINE_DIGIT_SIZES = [
  ART.outlineDigit0,
  ART.outlineDigit1,
  ART.outlineDigit2,
  ART.outlineDigit3,
  ART.outlineDigit4,
  ART.outlineDigit5,
  ART.outlineDigit6,
  ART.outlineDigit7,
  ART.outlineDigit8,
  ART.outlineDigit9,
];

// Space between digits as a share of the height; the artboards are tight around the outline.
export const LETTER_SPACING = 0.03;

// Width of `value` drawn `height` tall.
export function outlineNumberWidth(value: number, height: number) {
  const digits = digitsOf(value);
  const total = digits.reduce(
    (sum, d) => sum + (height * OUTLINE_DIGIT_SIZES[d].width) / OUTLINE_DIGIT_SIZES[d].height,
    0
  );
  return total + height * LETTER_SPACING * (digits.length - 1);
}

// The tallest `value` can be drawn, up to `maxHeight`, and still fit `maxWidth`.
export function fitOutlineNumber(value: number, maxWidth: number, maxHeight: number) {
  return Math.min(maxHeight, maxWidth / outlineNumberWidth(value, 1));
}
