import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Basketball } from '@/components/Basketball';
import { OGSticker } from '@/components/OGSticker';
import {
  type BallStickerPlacement,
  getStickerInventory,
} from '@/services/stickers';

function renderSticker(placement: BallStickerPlacement) {
  return placement.sticker.slug === 'og-sticker' ? (
    <OGSticker height="100%" width="100%" />
  ) : null;
}

export default function BasketballTestScreen() {
  const [stickers, setStickers] = useState<BallStickerPlacement[]>([]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      getStickerInventory()
        .then((inventory) => {
          if (!isActive) {
            return;
          }

          setStickers(
            inventory.flatMap((owned) =>
              owned.ball_placement
                ? [{ ...owned.ball_placement, sticker: owned.sticker }]
                : []
            )
          );
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View pointerEvents="none" style={styles.basketball}>
        <Basketball
          height={250}
          renderSticker={renderSticker}
          stickers={stickers}
          width={300}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#F8FAFC',
    flex: 1,
  },
  basketball: {
    bottom: -3,
    left: 0,
    position: 'absolute',
  },
});
