import { Path } from 'react-native-svg';

import { INK, STROKE } from '@/constants/theme';

// The one place hand-drawn line style is set. `d` must already be in screen points (the Svg's
// viewBox matches its size), so `strokeWidth` is in points too and never scales.
export function InkPath({
  d,
  strokeWidth = STROKE.width,
  stroke = INK,
}: {
  d: string;
  strokeWidth?: number;
  stroke?: string;
}) {
  return (
    <Path
      d={d}
      fill="none"
      stroke={stroke}
      strokeLinecap={STROKE.linecap}
      strokeLinejoin={STROKE.linejoin}
      strokeWidth={strokeWidth}
    />
  );
}
