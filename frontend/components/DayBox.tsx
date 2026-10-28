import { useMemo } from 'react';
import { Pressable } from 'react-native';
import Svg from 'react-native-svg';

import { SKELETONS } from '@/components/art.generated';
import { InkPath } from '@/components/InkPath';
import { buildScribble, SCRIBBLE_DURATION } from '@/components/scribble';
import { ScribbleFill } from '@/components/ScribbleFill';
import { buildPath, fitUniform } from '@/components/skeleton';
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
// `hitSlop` widens the tap area past the drawing, e.g. into the gaps between days. With `fill` the
// box is scribbled in under its outline (see useDayFills), and `onFillDrawn` is called once the
// scribble finishes drawing in.
export function DayBox({
  day,
  size,
  paths,
  onPress,
  hitSlop,
  fill,
  onFillDrawn,
}: {
  day: number;
  size: number;
  paths: string[];
  onPress: (day: number) => void;
  hitSlop?: number;
  fill?: DayFill;
  onFillDrawn?: (day: number) => void;
}) {
  const height = size * BOX_RATIO;
  const kind = fill?.kind;
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

  return (
    <Pressable hitSlop={hitSlop} onPress={() => onPress(day)} style={{ height, width: size }}>
      <Svg height={height} viewBox={`0 0 ${size} ${height}`} width={size}>
        {fill && scribble ? (
          <ScribbleFill
            animate={fill.animate}
            // A new kind is a new scribble, so it starts drawing again from the beginning.
            key={fill.kind}
            color={fill.color}
            d={buildPath(scribble.paths)}
            duration={SCRIBBLE_DURATION[fill.kind]}
            length={scribble.length}
            onDrawn={() => onFillDrawn?.(day)}
          />
        ) : null}
        <InkPath d={paths[day % paths.length]} strokeWidth={STROKE.smallWidth} />
      </Svg>
    </Pressable>
  );
}
