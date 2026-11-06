import { useEffect } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Defs, LinearGradient, Stop } from 'react-native-svg';

import { TODAY_COLORS } from '@/constants/theme';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

// How long the gradient takes to turn once, in ms.
const TURN_DURATION = 1500;

const GRADIENT_ID = 'today-outline';

// Pass as `stroke` to a line drawn in the same Svg as TodayGradient.
export const TODAY_STROKE = `url(#${GRADIENT_ID})`;

// A gradient that turns around the middle of a `width` × `height` Svg, so its colors travel around
// a line drawn with it. Stops are placed once; only the gradient's ends move, on the UI thread.
export function TodayGradient({ width, height }: { width: number; height: number }) {
  // 0 to 1 is one full turn.
  const turn = useSharedValue(0);

  useEffect(() => {
    turn.set(withRepeat(withTiming(1, { duration: TURN_DURATION, easing: Easing.linear }), -1));
    return () => cancelAnimation(turn);
  }, [turn]);

  // The ends sit on a circle through the box's corners, so every corner stays within the gradient
  // at any angle.
  const radius = Math.hypot(width, height) / 2;
  const animatedProps = useAnimatedProps(() => {
    const angle = turn.get() * 2 * Math.PI;
    const reachX = radius * Math.cos(angle);
    const reachY = radius * Math.sin(angle);
    return {
      x1: width / 2 - reachX,
      y1: height / 2 - reachY,
      x2: width / 2 + reachX,
      y2: height / 2 + reachY,
    };
  });

  return (
    <Defs>
      <AnimatedLinearGradient
        animatedProps={animatedProps}
        gradientUnits="userSpaceOnUse"
        id={GRADIENT_ID}
      >
        {TODAY_COLORS.map((color, index) => (
          <Stop
            key={color}
            offset={index / (TODAY_COLORS.length - 1)}
            stopColor={color}
          />
        ))}
      </AnimatedLinearGradient>
    </Defs>
  );
}
