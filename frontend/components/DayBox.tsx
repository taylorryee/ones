import { useMemo } from 'react';
import { View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Svg from 'react-native-svg';

import { SKELETONS } from '@/components/art.generated';
import { InkPath } from '@/components/InkPath';
import { PLAYED_STROKE, PlayedGradient } from '@/components/PlayedGradient';
import { buildScribble, SCRIBBLE_DURATION } from '@/components/scribble';
import { ScribbleFill } from '@/components/ScribbleFill';
import { buildPath, fitUniform } from '@/components/skeleton';
import { TODAY_STROKE, TodayGradient } from '@/components/TodayGradient';
import { STROKE } from '@/constants/theme';
import type { DayFill } from '@/hooks/useDayFills';

// assets/skeletons/day-box-{1,2,3}.svg. A day always gets the same drawing, while neighbouring
// days look hand drawn rather than stamped.
const BOXES = [SKELETONS.dayBox1, SKELETONS.dayBox2, SKELETONS.dayBox3];

// Height as a share of width; matches the artboard all three box drawings share.
export const BOX_RATIO = SKELETONS.dayBox1.height / SKELETONS.dayBox1.width;

// The three box outlines fitted to one box size. Every drawing is scaled evenly to fill the box,
// with half a line of room on each side so the fixed-width line is never cut off at the edge.
export function buildBoxPaths(size: number) {
  const target = { width: size, height: size * BOX_RATIO };
  return BOXES.map((box) => buildPath(fitUniform(box, target, STROKE.smallWidth / 2)));
}

// One day of the calendar. `paths` comes from buildBoxPaths, computed once for the whole month.
// With `fill` the box is scribbled in under its outline (see useDayFills), and `onFillDrawn` is called once the
// scribble finishes drawing in. `isToday` draws the outline in a moving gradient instead of ink.
// `gradient` draws the scribble and the outline in those colors, moved by its `flow`, and takes the
// place of the fill's color and of today's outline.
export function DayBox({
  day,
  size,
  paths,
  fill,
  onFillDrawn,
  isToday = false,
  gradient,
}: {
  day: number;
  size: number;
  paths: string[];
  fill?: DayFill;
  onFillDrawn?: (day: number) => void;
  isToday?: boolean;
  gradient?: { colors: readonly string[]; flow: SharedValue<number> };
}) {
  const height = size * BOX_RATIO;
  const kind = fill?.kind;
  const under = fill?.under;
  // Reaches the inside edge of the outline, which is drawn on top and hides any wobble. Seeded by
  // the day, so a day always gets the same wobble.
  const scribble = useMemo(
    () =>
      kind
        ? buildScribble(
            { width: size, height },
            STROKE.smallWidth + STROKE.fillWidth / 2,
            STROKE.fillWidth,
            day,
            kind
          )
        : null,
    [day, height, kind, size]
  );
  const underScribble = useMemo(
    () =>
      under
        ? buildScribble(
            { width: size, height },
            STROKE.smallWidth + STROKE.fillWidth / 2,
            STROKE.fillWidth,
            day,
            under.kind
          )
        : null,
    [day, height, size, under]
  );

  return (
    <View style={{ height, width: size }}>
      <Svg height={height} viewBox={`0 0 ${size} ${height}`} width={size}>
        {isToday && !gradient ? <TodayGradient height={height} width={size} /> : null}
        {gradient ? (
          <PlayedGradient
            colors={gradient.colors}
            flow={gradient.flow}
            height={height}
            width={size}
          />
        ) : null}
        {under && underScribble ? (
          <InkPath
            d={buildPath(underScribble.paths)}
            stroke={under.color}
            strokeWidth={STROKE.fillWidth}
          />
        ) : null}
        {fill && scribble ? (
          <ScribbleFill
            animate={fill.animate}
            // A new scribble starts drawing again from the beginning.
            key={`${fill.kind}-${fill.played}`}
            color={gradient ? PLAYED_STROKE : fill.color}
            d={buildPath(scribble.paths)}
            duration={SCRIBBLE_DURATION[fill.kind]}
            length={scribble.length}
            onDrawn={() => onFillDrawn?.(day)}
          />
        ) : null}
        <InkPath
          d={paths[day % paths.length]}
          stroke={gradient ? PLAYED_STROKE : isToday ? TODAY_STROKE : undefined}
          strokeWidth={STROKE.smallWidth}
        />
      </Svg>
    </View>
  );
}
