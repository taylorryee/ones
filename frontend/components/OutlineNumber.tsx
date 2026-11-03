import { View } from 'react-native';

import Digit0 from '@/assets/illustrations/outline-digit-0.svg';
import Digit1 from '@/assets/illustrations/outline-digit-1.svg';
import Digit2 from '@/assets/illustrations/outline-digit-2.svg';
import Digit3 from '@/assets/illustrations/outline-digit-3.svg';
import Digit4 from '@/assets/illustrations/outline-digit-4.svg';
import Digit5 from '@/assets/illustrations/outline-digit-5.svg';
import Digit6 from '@/assets/illustrations/outline-digit-6.svg';
import Digit7 from '@/assets/illustrations/outline-digit-7.svg';
import Digit8 from '@/assets/illustrations/outline-digit-8.svg';
import Digit9 from '@/assets/illustrations/outline-digit-9.svg';
import { LETTER_SPACING, OUTLINE_DIGIT_SIZES } from '@/components/outlineDigits';
import { digitsOf } from '@/components/scrapDigits';

// The oneSan digits as hollow characters: a black outline around a white center. All share one
// artboard height and baseline, so they line up like ordinary type. Indexed by the digit.
const DIGITS = [Digit0, Digit1, Digit2, Digit3, Digit4, Digit5, Digit6, Digit7, Digit8, Digit9];

// A whole number in hollow digits, `height` tall. A picture: it scales as a whole.
// Its width is outlineNumberWidth(value, height).
export function OutlineNumber({ value, height }: { value: number; height: number }) {
  return (
    <View
      accessibilityLabel={String(value)}
      accessible
      style={{ flexDirection: 'row', gap: height * LETTER_SPACING, height }}>
      {digitsOf(value).map((digit, index) => {
        const size = OUTLINE_DIGIT_SIZES[digit];
        const Digit = DIGITS[digit];
        return (
          <Digit
            height={height}
            key={index}
            width={(height * size.width) / size.height}
          />
        );
      })}
    </View>
  );
}
