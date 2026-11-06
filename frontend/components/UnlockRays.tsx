// Created by `npm run art` from assets/skeletons/shapes/unlock-rays.svg.
// This file is yours: edit it freely, the script never overwrites it. Re-exporting the SVG still
// updates the drawing. Delete the line below to take it out of the art gallery.
// art-gallery: shape UnlockRays unlockRays
import { useEffect } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg from 'react-native-svg';

import { SKELETONS } from '@/components/art.generated';
import { ScribbleFill } from '@/components/ScribbleFill';
import { buildPath, fitUniform, pathLength } from '@/components/skeleton';
import { INK, STROKE } from '@/constants/theme';

const SHAPE = SKELETONS.unlockRays;

// Height as a share of width, from the drawing.
export const UNLOCK_RAYS_RATIO = SHAPE.height / SHAPE.width;

// Each ray takes RAY_DURATION to draw and starts RAY_STAGGER after the one before it.
const RAY_DURATION = 320;
const RAY_STAGGER = 40;
// Steps around the drawing by this many rays at a time, so the rays burst out all around rather
// than sweeping round like a clock hand. Must share no factor with the number of rays.
const RAY_STEP = 7;

// How long the whole burst takes to draw, in ms.
const DRAW_DURATION = RAY_DURATION + RAY_STAGGER * (SHAPE.paths.length - 1);
// Once drawn the rays pick up speed over TURN_RAMP, turning this many degrees to reach the speed
// of one full turn every TURN_DURATION, which they keep. Fixed by the two durations, so the
// speed doesn't jump where the ramp ends: an eased-in quad ends at twice its average speed.
const TURN_DURATION = 12000;
const TURN_RAMP = 900;
const TURN_RAMP_DEGREES = (360 * TURN_RAMP) / TURN_DURATION / 2;

// How wide a circle the rays sweep as they turn, as a share of their width. Above 1, since a ray
// off the middle of a side reaches further from the center than the side does.
export const UNLOCK_RAYS_REACH =
  (2 *
    Math.max(
      ...SHAPE.paths
        .flat()
        .map(([x, y]) => Math.hypot(x - SHAPE.width / 2, y - SHAPE.height / 2))
    )) /
  SHAPE.width;

// The rays around a badge, `size` wide and centered on the middle of it. They burst out from their
// inner ends `delay` ms after mounting, then turn around the badge for as long as they're shown.
// The drawing is scaled evenly and the line stays the same thickness, with half a line of room on
// every side so it's never cut off at the edge. Turning moves the view rather than the drawing, so
// the Svg never redraws; it needs UNLOCK_RAYS_REACH × `size` of clear space.
export function UnlockRays({ size, delay = 0 }: { size: number; delay?: number }) {
  const angle = useSharedValue(0);

  useEffect(() => {
    angle.set(
      withDelay(
        delay + DRAW_DURATION,
        withSequence(
          withTiming(TURN_RAMP_DEGREES, { duration: TURN_RAMP, easing: Easing.in(Easing.quad) }),
          withRepeat(
            withTiming(TURN_RAMP_DEGREES + 360, { duration: TURN_DURATION, easing: Easing.linear }),
            -1
          )
        )
      )
    );
    return () => cancelAnimation(angle);
  }, [angle, delay]);

  const turn = useAnimatedStyle(() => ({ transform: [{ rotate: `${angle.get()}deg` }] }));

  const height = size * UNLOCK_RAYS_RATIO;
  const rays = fitUniform(SHAPE, { width: size, height }, STROKE.width / 2);
  return (
    <Animated.View style={[{ height, width: size }, turn]}>
      <Svg height={height} viewBox={`0 0 ${size} ${height}`} width={size}>
        {rays.map((ray, index) => (
          <ScribbleFill
            animate
            color={INK}
            d={buildPath([ray])}
            delay={delay + ((index * RAY_STEP) % rays.length) * RAY_STAGGER}
            duration={RAY_DURATION}
            key={index}
            length={pathLength([ray])}
            strokeWidth={STROKE.width}
          />
        ))}
      </Svg>
    </Animated.View>
  );
}
