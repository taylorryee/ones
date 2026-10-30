import { useState } from 'react';

import type { Insets, Size } from '@/components/skeleton';
import { StickerGrid } from '@/components/StickerGrid';
import { StickerPopup } from '@/components/StickerPopup';
import type { OwnedSticker } from '@/services/stickers';

// The grid fills the inside of the popup, so it needs no padding of its own.
const NO_INSET: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

// The badges card's popup: every badge the player has earned, in the same scrolling grid as the
// badges screen. Tapping a badge opens its StickerPopup on top.
export function BadgesPopupContent({ size, badges }: { size: Size; badges: OwnedSticker[] }) {
  const [selectedSticker, setSelectedSticker] = useState<OwnedSticker | null>(null);

  return (
    <>
      <StickerGrid
        content={size}
        inset={NO_INSET}
        onPressSticker={setSelectedSticker}
        stickers={badges}
      />
      {/* Inside the card's popup so it can open on top of it. */}
      <StickerPopup onClose={() => setSelectedSticker(null)} sticker={selectedSticker} />
    </>
  );
}
