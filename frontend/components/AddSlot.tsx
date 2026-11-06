// Created by `npm run art` from assets/skeletons/shapes/add-slot.svg.
// This file is yours: edit it freely, the script never overwrites it. Re-exporting the SVG still
// updates the drawing. Delete the line below to take it out of the art gallery.
// art-gallery: shape AddSlot addSlot
import Svg from 'react-native-svg';

import { SKELETONS } from '@/components/art.generated';
import { InkPath } from '@/components/InkPath';
import { buildPath, fitUniform } from '@/components/skeleton';
import { STROKE } from '@/constants/theme';

const SHAPE = SKELETONS.addSlot;

// Height as a share of width, from the drawing.
export const ADD_SLOT_RATIO = SHAPE.height / SHAPE.width;

// The drawing scaled evenly to `size` wide. The line stays the same thickness, with half a line of
// room on every side so it's never cut off at the edge.
export function AddSlot({ size }: { size: number }) {
  const height = size * ADD_SLOT_RATIO;
  const d = buildPath(fitUniform(SHAPE, { width: size, height }, STROKE.width / 2));
  return (
    <Svg height={height} viewBox={`0 0 ${size} ${height}`} width={size}>
      <InkPath d={d} />
    </Svg>
  );
}
