// Created by `npm run art` from assets/skeletons/frames/test.svg.
// This file is yours: edit it freely, the script never overwrites it. Re-exporting the SVG still
// updates the drawing. Delete the line below to take it out of the art gallery.
// art-gallery: frame Test test
import Svg from 'react-native-svg';

import { SKELETONS } from '@/components/art.generated';
import { InkPath } from '@/components/InkPath';
import { buildPath, fitCorners, insetsOf } from '@/components/skeleton';
import { STROKE } from '@/constants/theme';

const FRAME = SKELETONS.test;
// Points this close to an edge belong to a corner and are never stretched. The script guessed a
// quarter of the shorter side; set it to how far the corner curves reach in the drawing.
const CORNER = 33;
// Space kept between the line's innermost wobble and the content.
const CONTENT_GAP = 12;

// Padding that keeps content inside the line, the same at every size.
export const TEST_INSET = insetsOf(FRAME, CORNER, STROKE.width / 2 + CONTENT_GAP);

// The frame fitted to `width` × `height`: corners keep their drawn shape, only the sides stretch.
export function Test({ width, height }: { width: number; height: number }) {
  const d = buildPath(fitCorners(FRAME, { width, height }, CORNER));
  return (
    <Svg height={height} viewBox={`0 0 ${width} ${height}`} width={width}>
      <InkPath d={d} />
    </Svg>
  );
}
