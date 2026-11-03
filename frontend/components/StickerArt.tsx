import { useState } from 'react';
import { View } from 'react-native';

import { ART } from '@/components/art.generated';
import { getArchetype } from '@/constants/archetypes';
import { OGSticker } from '@/components/OGSticker';
import { STROKE } from '@/constants/theme';

type Props = {
  slug: string;
  // Line width in screen points, the same at every sticker size.
  lineWidth?: number;
};

// Fills its parent. The sticker files have no stroke width (assets/stickers/.svgrrc strips it at
// bundle time), so the line is set here from the size the sticker is actually drawn at, and the
// viewBox is padded by half a line so the thicker stroke isn't cut off at the edges.
export function StickerArt({ slug, lineWidth = STROKE.width }: Props) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const archetype = getArchetype(slug);

  if (!archetype) {
    return <OGSticker height="100%" width="100%" />;
  }

  const Icon = archetype.icon;
  const art = ART[archetype.slug];
  let drawing = null;
  if (size) {
    // Points per drawing unit once the padding is added; solved so the padded viewBox fits exactly.
    const scale = Math.min((size.width - lineWidth) / art.width, (size.height - lineWidth) / art.height);
    if (scale > 0) {
      const pad = lineWidth / 2 / scale;
      drawing = (
        <Icon
          height="100%"
          strokeWidth={lineWidth / scale}
          viewBox={`${-pad} ${-pad} ${art.width + pad * 2} ${art.height + pad * 2}`}
          width="100%"
        />
      );
    }
  }

  return (
    <View
      onLayout={(e) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
      style={{ height: '100%', width: '100%' }}>
      {drawing}
    </View>
  );
}
