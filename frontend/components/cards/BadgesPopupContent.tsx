import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BadgeShowcase } from '@/components/BadgeShowcase';
import { getShowcaseEditorLayout } from '@/components/badgeWallLayout';
import { POPUP_BOTTOM_BLEED } from '@/components/CardPopup';
import { SeparatingLine } from '@/components/SeparatingLine';
import { placeBadge, showcaseSlots } from '@/components/showcaseSlots';
import type { Size } from '@/components/skeleton';
import { StickerGrid } from '@/components/StickerGrid';
import { StickerPopup } from '@/components/StickerPopup';
import { setShowcase, type OwnedSticker } from '@/services/stickers';

// The popup is short on width, so the grid shows more rows than the badges screen's.
const GRID_ROWS = 3;

// The badges card's popup: the player's badge wall on top and every badge they've earned below.
// Tapping a slot on the wall starts it wiggling, and the next badge tapped goes there (tapping the
// slot again cancels). With no slot picked, tapping a badge opens its StickerPopup on top.
export function BadgesPopupContent({
  size,
  badges,
  onChangeBadges,
}: {
  size: Size;
  badges: OwnedSticker[];
  onChangeBadges: (badges: OwnedSticker[]) => void;
}) {
  const [selectedSticker, setSelectedSticker] = useState<OwnedSticker | null>(null);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const { showcase, gridHeight, lineTop, listTop, listPadding } = getShowcaseEditorLayout(size);

  function handlePressBadge(badge: OwnedSticker) {
    if (editingSlot === null) {
      setSelectedSticker(badge);
      return;
    }
    // Shown at once; if it can't be saved, the wall goes back to how it was.
    const placed = placeBadge(badges, badge, editingSlot);
    setEditingSlot(null);
    onChangeBadges(placed);
    setShowcase(showcaseSlots(placed).map((owned) => owned?.id ?? null)).catch(() =>
      onChangeBadges(badges)
    );
  }

  return (
    <>
      <BadgeShowcase
        dip={showcase.dip}
        gap={showcase.gap}
        onPressSlot={(slot) => setEditingSlot((editing) => (editing === slot ? null : slot))}
        showOpenings
        slot={showcase.slot}
        slots={showcaseSlots(badges)}
        wiggling={editingSlot}
      />
      {/* The list runs from under the separator to under the popup's line. */}
      <View
        style={[
          styles.list,
          { height: size.height + POPUP_BOTTOM_BLEED - listTop, top: listTop, width: size.width },
        ]}>
        <StickerGrid
          content={{ width: size.width, height: gridHeight }}
          inset={{ top: listPadding, right: 0, bottom: POPUP_BOTTOM_BLEED, left: 0 }}
          onPressSticker={handlePressBadge}
          rows={GRID_ROWS}
          stickers={badges}
        />
      </View>
      {/* After the list, so badges pass under the line. */}
      <View pointerEvents="none" style={[styles.list, { top: lineTop }]}>
        <SeparatingLine width={size.width} />
      </View>
      {/* Inside the card's popup so it can open on top of it. */}
      <StickerPopup onClose={() => setSelectedSticker(null)} sticker={selectedSticker} />
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    left: 0,
    position: 'absolute',
  },
});
