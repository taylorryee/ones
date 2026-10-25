// Written by scripts/art.mjs from the `// art-gallery:` lines in components/. Do not edit;
// run `npm run art`.
import type { ReactNode } from 'react';

import { ART, SKELETONS } from '@/components/art.generated';
import { Flame } from '@/components/Flame';
import { RotatingcardBorder } from '@/components/RotatingcardBorder';
import { Test } from '@/components/Test';

// Width the gallery uses as 100% for a drawing that is `width` wide in Figma.
const base = (width: number) => Math.min(width, 240);

export const GALLERY: { name: string; render: (scale: number) => ReactNode }[] = [
  {
    name: 'Flame',
    render: (scale) => <Flame width={base(ART.flame.width) * scale} />,
  },
  {
    name: 'RotatingcardBorder',
    render: (scale) => <RotatingcardBorder height={(base(SKELETONS.rotatingcardBorder.width) * scale * SKELETONS.rotatingcardBorder.height) / SKELETONS.rotatingcardBorder.width} width={base(SKELETONS.rotatingcardBorder.width) * scale} />,
  },
  {
    name: 'Test',
    render: (scale) => <Test height={(base(SKELETONS.test.width) * scale * SKELETONS.test.height) / SKELETONS.test.width} width={base(SKELETONS.test.width) * scale} />,
  },
];
