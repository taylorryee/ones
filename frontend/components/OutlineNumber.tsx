import { useEffect, useEffectEvent, type FC } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { SvgProps } from 'react-native-svg';

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

// Every digit moves once per period, on its own timer that starts at a random point in it, so no
// two digits move together.
const MOVE_PERIOD = 10000;
const MOVES = ['jump', 'wobble', 'stretch'] as const;
// How high a jump goes, as a share of the digit height. Kept low: the Elo has little room above.
const JUMP_HEIGHT = 0.15;
// Settles a squashed or stretched digit back to its shape with a little overshoot.
const BOING = { damping: 7, stiffness: 320 };

// A whole number in hollow digits, `height` tall. A picture: it scales as a whole.
// Its width is outlineNumberWidth(value, height). Each digit jumps, wobbles or stretches now and
// then (see BouncyDigit), unless the system asks for reduced motion.
export function OutlineNumber({ value, height }: { value: number; height: number }) {
  return (
    <View
      accessibilityLabel={String(value)}
      accessible
      style={{ flexDirection: 'row', gap: height * LETTER_SPACING, height }}>
      {digitsOf(value).map((digit, index) => {
        const size = OUTLINE_DIGIT_SIZES[digit];
        return (
          <BouncyDigit
            Art={DIGITS[digit]}
            height={height}
            key={index}
            width={(height * size.width) / size.height}
          />
        );
      })}
    </View>
  );
}

// One digit that, every MOVE_PERIOD, does a move picked at random. Every move pivots on the
// bottom of the digit, so it stays standing on the baseline.
function BouncyDigit({
  Art,
  width,
  height,
}: {
  Art: FC<SvgProps>;
  width: number;
  height: number;
}) {
  const lift = useSharedValue(0);
  const tilt = useSharedValue(0);
  const scaleX = useSharedValue(1);
  const scaleY = useSharedValue(1);
  const reduceMotion = useReducedMotion();

  const move = useEffectEvent(() => {
    const kind = MOVES[Math.floor(Math.random() * MOVES.length)];
    if (kind === 'jump') {
      // Crouch, take off stretched, round out at the top, stretch on the way down, land squashed.
      const up = { duration: 240, easing: Easing.out(Easing.quad) };
      const down = { duration: 220, easing: Easing.in(Easing.quad) };
      lift.set(
        withSequence(
          withTiming(0, { duration: 90 }),
          withTiming(-height * JUMP_HEIGHT, up),
          withTiming(0, down)
        )
      );
      scaleY.set(
        withSequence(
          withTiming(0.8, { duration: 90 }),
          withTiming(1.15, { duration: 120 }),
          withTiming(1, { duration: 120 }),
          withTiming(1.08, { duration: 220 }),
          withTiming(0.8, { duration: 80 }),
          withSpring(1, BOING)
        )
      );
      scaleX.set(
        withSequence(
          withTiming(1.15, { duration: 90 }),
          withTiming(0.9, { duration: 120 }),
          withTiming(1, { duration: 120 }),
          withTiming(0.95, { duration: 220 }),
          withTiming(1.18, { duration: 80 }),
          withSpring(1, BOING)
        )
      );
    } else if (kind === 'wobble') {
      tilt.set(
        withSequence(
          withTiming(-12, { duration: 90 }),
          withTiming(10, { duration: 110 }),
          withTiming(-7, { duration: 110 }),
          withTiming(4, { duration: 110 }),
          withSpring(0, BOING)
        )
      );
    } else {
      const pull = { duration: 160, easing: Easing.out(Easing.quad) };
      scaleY.set(withSequence(withTiming(1.25, pull), withSpring(1, BOING)));
      scaleX.set(withSequence(withTiming(0.85, pull), withSpring(1, BOING)));
    }
  });

  useEffect(() => {
    if (reduceMotion) {
      return;
    }
    let interval: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      move();
      interval = setInterval(move, MOVE_PERIOD);
    }, Math.random() * MOVE_PERIOD);
    return () => {
      clearTimeout(start);
      clearInterval(interval);
    };
  }, [reduceMotion]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: lift.get() },
      { rotate: `${tilt.get()}deg` },
      { scaleX: scaleX.get() },
      { scaleY: scaleY.get() },
    ],
  }));

  return (
    <Animated.View style={[{ transformOrigin: 'bottom' }, style]}>
      <Art height={height} width={width} />
    </Animated.View>
  );
}
