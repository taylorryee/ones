import { Pressable } from 'react-native';
import Svg from 'react-native-svg';

import { SKELETONS } from '@/components/art.generated';
import { InkPath } from '@/components/InkPath';
import { buildPath, fitUniform } from '@/components/skeleton';
import { STROKE } from '@/constants/theme';

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
// `hitSlop` widens the tap area past the drawing, e.g. into the gaps between days.
export function DayBox({
  day,
  size,
  paths,
  onPress,
  hitSlop,
}: {
  day: number;
  size: number;
  paths: string[];
  onPress: (day: number) => void;
  hitSlop?: number;
}) {
  const height = size * BOX_RATIO;

  return (
    <Pressable hitSlop={hitSlop} onPress={() => onPress(day)} style={{ height, width: size }}>
      <Svg height={height} viewBox={`0 0 ${size} ${height}`} width={size}>
        <InkPath d={paths[day % paths.length]} strokeWidth={STROKE.smallWidth} />
      </Svg>
    </Pressable>
  );
}
