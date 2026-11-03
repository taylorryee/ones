import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StickerArt } from '@/components/StickerArt';
import { FONT, INK } from '@/constants/theme';
import { goAfterMatch, HOME } from '@/services/matchFlow';
import { getStickerInventory, type OwnedSticker } from '@/services/stickers';

const STICKER_SIZE = 220;

// Placeholder for the sticker unlock and level-up animations, shown after a win that earned one.
// `outcome` is the match's sticker_outcome; tapping anywhere goes on to `next`.
export default function StickerRewardScreen() {
  const { next, outcome, playerStickerId } = useLocalSearchParams<{
    next?: string;
    outcome?: 'unlocked' | 'leveled_up';
    playerStickerId?: string;
  }>();
  const [sticker, setSticker] = useState<OwnedSticker | null>(null);

  useEffect(() => {
    getStickerInventory()
      .then((inventory) =>
        setSticker(inventory.find((owned) => String(owned.id) === playerStickerId) ?? null)
      )
      .catch(() => {});
  }, [playerStickerId]);

  const isLevelUp = outcome === 'leveled_up';

  return (
    <Pressable onPress={() => goAfterMatch(next ?? HOME)} style={styles.screen}>
      <Text style={styles.title}>{isLevelUp ? 'Level up' : 'Sticker unlocked'}</Text>
      <View style={styles.sticker}>{sticker && <StickerArt slug={sticker.sticker.slug} />}</View>
      {sticker && (
        <Text style={styles.subtitle}>
          {sticker.sticker.name}
          {isLevelUp ? ` · Level ${sticker.level}` : ''}
        </Text>
      )}
      <Text style={styles.placeholder}>(animation placeholder)</Text>
      <Text style={styles.hint}>Tap to continue</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    flex: 1,
    gap: 16,
    justifyContent: 'center',
  },
  title: {
    color: INK,
    fontFamily: FONT,
    fontSize: 48,
  },
  sticker: {
    height: STICKER_SIZE,
    width: STICKER_SIZE,
  },
  subtitle: {
    color: INK,
    fontFamily: FONT,
    fontSize: 28,
  },
  placeholder: {
    color: INK,
    fontFamily: FONT,
    fontSize: 18,
    opacity: 0.5,
  },
  hint: {
    color: INK,
    fontFamily: FONT,
    fontSize: 22,
    textDecorationLine: 'underline',
  },
});
