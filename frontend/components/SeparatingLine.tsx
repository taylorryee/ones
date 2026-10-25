import Svg from 'react-native-svg';

import { SKELETONS } from '@/components/art.generated';
import { InkPath } from '@/components/InkPath';
import { buildPath, fitSpan } from '@/components/skeleton';

// assets/skeletons/separator.svg: the centerline of the hand-drawn line, 5 units thick.
const LINE = SKELETONS.separator;

// Fixed on every screen: only the length is fitted, never the thickness or the wave.
export const SEPARATOR_HEIGHT = LINE.height;

// The line's ends sit exactly on the left and right edges of `width`. Screens pass the full frame
// width, so the line reaches the border on both sides and its caps are hidden under the border's
// outside paint.
export function SeparatingLine({ width }: { width: number }) {
  return (
    <Svg height={SEPARATOR_HEIGHT} viewBox={`0 0 ${width} ${SEPARATOR_HEIGHT}`} width={width}>
      <InkPath d={buildPath(fitSpan(LINE, width))} />
    </Svg>
  );
}
