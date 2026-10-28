import { StyleSheet, View } from 'react-native';

import { fitBadgeGrid } from '@/components/badgeGrid';
import { TextCard } from '@/components/cards/TextCard';
import type { Size } from '@/components/skeleton';
import { StickerArt } from '@/components/StickerArt';
import type { OwnedSticker } from '@/services/stickers';

// Every badge the player has earned, in rows and columns that fill the card: the fewer badges, the
// bigger they are. A last row that isn't full starts in the first column, so every badge lines up
// with the ones above it.
export function BadgesCard({ size, badges }: { size: Size; badges: OwnedSticker[] }) {
  const grid = fitBadgeGrid(badges.length, size);

  if (grid.badge === 0) {
    return <TextCard body="Win a game to earn your first" size={size} title="Your badges" />;
  }

  const rows = Array.from({ length: grid.rows }, (_, row) =>
    badges.slice(row * grid.columns, (row + 1) * grid.columns)
  );
  return (
    <View style={styles.card}>
      <View style={{ gap: grid.gap }}>
        {rows.map((row, index) => (
          <View key={index} style={[styles.row, { gap: grid.gap }]}>
            {row.map((owned) => (
              <View key={owned.id} style={{ height: grid.badge, width: grid.badge }}>
                <StickerArt slug={owned.sticker.slug} />
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
  },
});
