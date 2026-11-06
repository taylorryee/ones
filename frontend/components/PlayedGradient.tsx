import { useMemo } from 'react';
import Animated, { useAnimatedProps, type SharedValue } from 'react-native-reanimated';
import { Defs, LinearGradient, Stop } from 'react-native-svg';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

// How long the colors take to flow out and back once, in ms.
export const FLOW_DURATION = 6000;

// Length of one out-and-back of the colors, in box diagonals.
const CYCLE = 2;

const GRADIENT_ID = 'played-fill';

// Pass as `stroke` to a line drawn in the same Svg as PlayedGradient.
export const PLAYED_STROKE = `url(#${GRADIENT_ID})`;

// A gradient that flows across a `width` × `height` Svg from its bottom left corner to its top
// right, so its colors travel along a line drawn with it. `colors` take one box diagonal to run out
// and another to run back, so the box shows about one sweep of them at a time. The gradient holds
// that cycle twice, and sliding it by one cycle lands on the same picture, so the loop can't be
// seen. The box always stays within it. Stops are placed once; only its ends move, on the UI thread.
// `flow` is how far through the cycle it is, 0 to 1, from useGradientFlow.
export function PlayedGradient({
  colors,
  flow,
  width,
  height,
}: {
  colors: readonly string[];
  flow: SharedValue<number>;
  width: number;
  height: number;
}) {
  const stops = useMemo(() => {
    const forth = [...colors];
    const back = forth.slice(0, -1).reverse();
    const cycle = [...forth, ...back.slice(0, -1)];
    return [...cycle, ...cycle, forth[0]];
  }, [colors]);

  const animatedProps = useAnimatedProps(() => {
    // Where the gradient starts along the diagonal, from the box's middle, in diagonal lengths.
    const start = flow.get() * CYCLE - CYCLE - 0.5;
    const x = (along: number) => width / 2 + along * width;
    const y = (along: number) => height / 2 - along * height;
    return { x1: x(start), y1: y(start), x2: x(start + 2 * CYCLE), y2: y(start + 2 * CYCLE) };
  });

  return (
    <Defs>
      <AnimatedLinearGradient
        animatedProps={animatedProps}
        gradientUnits="userSpaceOnUse"
        id={GRADIENT_ID}
      >
        {stops.map((color, index) => (
          <Stop key={index} offset={index / (stops.length - 1)} stopColor={color} />
        ))}
      </AnimatedLinearGradient>
    </Defs>
  );
}
