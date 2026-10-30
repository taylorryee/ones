import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';

import { useContentInset, useContentSize } from '@/components/ScreenBorder';
import { StickerGrid } from '@/components/StickerGrid';
import { StickerPopup } from '@/components/StickerPopup';
import { PAPER } from '@/constants/theme';
import { getStickerInventory, type OwnedSticker } from '@/services/stickers';

export default function BadgesScreen() {
  // null until the first load finishes, so slow connections don't flash the empty message.
  const [stickers, setStickers] = useState<OwnedSticker[] | null>(null);
  const [selectedSticker, setSelectedSticker] = useState<OwnedSticker | null>(null);
  const contentSize = useContentSize();
  const contentInset = useContentInset();

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      getStickerInventory()
        .then((inventory) => {
          if (isActive) {
            setStickers(inventory);
          }
        })
        .catch(() => {
          if (isActive) {
            setStickers([]);
          }
        });

      return () => {
        isActive = false;
      };
    }, [])
  );

  // Created once; kept in state rather than a ref so it can be read during render.
  const [panResponder] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        gestureState.dx > 20 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 80 && Math.abs(gestureState.dy) < 60) {
          router.back();
        }
      },
    })
  );

  // The grid fills the whole frame and scrolls under the border at both ends.
  return (
    <View style={styles.safeArea} {...panResponder.panHandlers}>
      <StickerGrid
        content={contentSize}
        inset={contentInset}
        onPressSticker={setSelectedSticker}
        stickers={stickers}
      />
      <StickerPopup onClose={() => setSelectedSticker(null)} sticker={selectedSticker} />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: PAPER,
    flex: 1,
  },
});
