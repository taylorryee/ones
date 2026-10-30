import { View } from 'react-native';

import Digit0 from '@/assets/illustrations/digit-0.svg';
import Digit1 from '@/assets/illustrations/digit-1.svg';
import Digit2 from '@/assets/illustrations/digit-2.svg';
import Digit3 from '@/assets/illustrations/digit-3.svg';
import Digit4 from '@/assets/illustrations/digit-4.svg';
import Digit5 from '@/assets/illustrations/digit-5.svg';
import Digit6 from '@/assets/illustrations/digit-6.svg';
import Digit7 from '@/assets/illustrations/digit-7.svg';
import Digit8 from '@/assets/illustrations/digit-8.svg';
import Digit9 from '@/assets/illustrations/digit-9.svg';
import { DIGIT_OVERLAP, DIGIT_SIZES, digitsOf } from '@/components/scrapDigits';

// Each digit is its own magazine cut-out, indexed by the digit.
const DIGITS = [Digit0, Digit1, Digit2, Digit3, Digit4, Digit5, Digit6, Digit7, Digit8, Digit9];

// Tilt in degrees by position, so a repeated digit (the 00 in 1500) still looks like two scraps.
const TILTS = [-3, 2, -1.5, 3];

// A whole number (the Elo) in cut-out-and-glued-on digits. A picture: it scales as a whole.
// Its width is scrapNumberWidth(value, height).
export function ScrapNumber({ value, height }: { value: number; height: number }) {
  return (
    <View accessibilityLabel={String(value)} accessible style={{ flexDirection: 'row', height }}>
      {digitsOf(value).map((digit, index) => {
        const Art = DIGITS[digit];
        const size = DIGIT_SIZES[digit];
        return (
          <View
            key={index}
            style={{
              marginLeft: index === 0 ? 0 : -height * DIGIT_OVERLAP,
              transform: [{ rotate: `${TILTS[index % TILTS.length]}deg` }],
            }}>
            <Art height={height} width={(height * size.width) / size.height} />
          </View>
        );
      })}
    </View>
  );
}
