import { useEffect, useEffectEvent } from 'react';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Path } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { STROKE } from '@/constants/theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// A scribble from buildScribble, drawn inside an existing Svg. With `animate` it draws itself in
// from its start over `duration` ms, then calls `onDrawn`; without, it's drawn complete. Turning
// `animate` on again draws it in again.
export function ScribbleFill({
  d,
  length,
  color,
  animate,
  duration,
  onDrawn,
  strokeWidth = STROKE.fillWidth,
}: {
  d: string;
  length: number;
  color: string;
  animate: boolean;
  duration: number;
  onDrawn?: () => void;
  strokeWidth?: number;
}) {
  // 0 hides the scribble, 1 shows all of it.
  const progress = useSharedValue(animate ? 0 : 1);
  const handleDrawn = useEffectEvent(() => onDrawn?.());

  useEffect(() => {
    if (!animate) {
      return;
    }
    const done = () => handleDrawn();
    progress.set(0);
    progress.set(
      withTiming(1, { duration, easing: Easing.inOut(Easing.quad) }, (finished) => {
        if (finished) {
          scheduleOnRN(done);
        }
      })
    );
  }, [animate, duration, progress]);

  // One dash the length of the path, slid along it. The gap is longer than the path plus its
  // round cap, so at 0 nothing shows, not even a dot.
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: (length + strokeWidth) * (1 - progress.get()),
  }));

  return (
    <AnimatedPath
      animatedProps={animatedProps}
      d={d}
      fill="none"
      stroke={color}
      strokeDasharray={[length, length + strokeWidth * 2]}
      strokeLinecap={STROKE.linecap}
      strokeLinejoin={STROKE.linejoin}
      strokeWidth={strokeWidth}
    />
  );
}
