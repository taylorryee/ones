import { useMemo } from 'react';
import Animated, { useAnimatedProps, type SharedValue } from 'react-native-reanimated';
import Svg, { Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';

import { ART, STICKER_FILLS, STICKER_PATHS } from '@/components/art.generated';
import { WASH_FROM, WASH_TO, washStops } from '@/components/badgeUnlockMotion';
import { INK, STROKE } from '@/constants/theme';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

const GRADIENT_ID = 'badge-wash';
const FILL_GRADIENT_ID = 'badge-wash-fill';

// How strong the wash is inside the badge, against 1 on its lines.
const FILL_OPACITY = 0.35;

// A badge drawing: its viewBox size and the path data of its lines, in the viewBox's units.
export type BadgeArtwork = {
  width: number;
  height: number;
  paths: readonly string[];
  // Closed shapes the wash fills inside the lines.
  fills: readonly string[];
};

// The artwork of a sticker, from the generated art data; null for a slug with no drawing.
export function stickerArtwork(slug: string): BadgeArtwork | null {
  const paths = STICKER_PATHS[slug];
  const size = ART[slug as keyof typeof ART];
  const fills = STICKER_FILLS[slug];
  return paths && fills && size ? { width: size.width, height: size.height, paths, fills } : null;
}

// A badge drawn `size` points square, its line always `lineWidth` points like StickerArt's, in the
// color wash of components/badgeUnlockMotion.ts: ink ahead of `front`, `colors` behind it. All
// lines share one Svg with the gradient, which is what lets the colors run across the whole drawing.
// Only the gradient's ends move, on the UI thread; the paths are never rebuilt.
export function BadgeArt({
  artwork,
  size,
  colors,
  front,
  lineWidth = STROKE.width,
}: {
  artwork: BadgeArtwork;
  size: number;
  colors: readonly string[];
  front: SharedValue<number>;
  lineWidth?: number;
}) {
  const { width, height, paths, fills } = artwork;
  // Points per drawing unit once half a line of room is added on every side, so the fixed-width
  // line is never cut off at the edge.
  const scale = Math.min((size - lineWidth) / width, (size - lineWidth) / height);
  const pad = lineWidth / 2 / scale;
  const boxWidth = width + pad * 2;
  const boxHeight = height + pad * 2;

  const stops = useMemo(() => washStops(colors, INK), [colors]);
  // The same gradient for the fill, except ahead of the front it is clear instead of ink, so only
  // color shows inside the badge. The clear stops keep the nearest color (not ink) so the edge of
  // the wash fades out without going grey.
  const fillStops = useMemo(() => {
    const last = colors[colors.length - 1];
    return washStops(colors, last).map((stop, index, all) => ({
      ...stop,
      opacity: index >= all.length - 2 ? 0 : 1,
    }));
  }, [colors]);

  // A point `along` diagonal lengths from the drawing's middle toward its top right corner.
  const animatedProps = useAnimatedProps(() => {
    const at = front.get();
    const x = (along: number) => width / 2 + along * boxWidth;
    const y = (along: number) => height / 2 - along * boxHeight;
    return {
      x1: x(at + WASH_FROM),
      y1: y(at + WASH_FROM),
      x2: x(at + WASH_TO),
      y2: y(at + WASH_TO),
    };
  });

  if (scale <= 0) {
    return null;
  }

  return (
    <Svg height={size} viewBox={`${-pad} ${-pad} ${boxWidth} ${boxHeight}`} width={size}>
      <Defs>
        <AnimatedLinearGradient
          animatedProps={animatedProps}
          gradientUnits="userSpaceOnUse"
          id={GRADIENT_ID}>
          {stops.map((stop, index) => (
            <Stop key={index} offset={stop.offset} stopColor={stop.color} />
          ))}
        </AnimatedLinearGradient>
        <AnimatedLinearGradient
          animatedProps={animatedProps}
          gradientUnits="userSpaceOnUse"
          id={FILL_GRADIENT_ID}>
          {fillStops.map((stop, index) => (
            <Stop key={index} offset={stop.offset} stopColor={stop.color} stopOpacity={stop.opacity} />
          ))}
        </AnimatedLinearGradient>
      </Defs>
      {/* The closed shapes of the drawing (components/stickerFill.ts), under one group opacity so
          where they overlap the color doesn't build up. */}
      <G opacity={FILL_OPACITY}>
        {fills.map((d, index) => (
          <Path d={d} fill={`url(#${FILL_GRADIENT_ID})`} key={index} stroke="none" />
        ))}
      </G>
      {paths.map((d, index) => (
        <Path
          d={d}
          fill="none"
          key={index}
          stroke={`url(#${GRADIENT_ID})`}
          strokeLinecap={STROKE.linecap}
          strokeLinejoin={STROKE.linejoin}
          strokeWidth={lineWidth / scale}
        />
      ))}
    </Svg>
  );
}
