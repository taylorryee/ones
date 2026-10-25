import { StyleSheet, Text, View } from 'react-native';

import type { Size } from '@/components/skeleton';
import { FONT, INK } from '@/constants/theme';
import type { PlayerStats } from '@/services/cards';

// Font sizes as shares of the card's content height, matching TextCard's title.
const TITLE_SCALE = 0.2;
const VALUE_SCALE = 0.3;
const LABEL_SCALE = 0.13;

// Shown in place of a number until the stats have loaded.
const NONE = '–';

function formatStreak(streak: number) {
  if (streak === 0) {
    return NONE;
  }
  return streak > 0 ? `W${streak}` : `L${-streak}`;
}

// The player's record, current streak and last seven days, side by side under a title.
export function StatsCard({ size, stats }: { size: Size; stats: PlayerStats | undefined }) {
  const columns = [
    { label: 'Record', value: stats ? `${stats.wins}-${stats.losses}` : NONE },
    { label: 'Streak', value: stats ? formatStreak(stats.streak) : NONE },
    { label: 'Last 7 days', value: stats ? `${stats.week_wins}-${stats.week_losses}` : NONE },
  ];

  return (
    <View style={styles.card}>
      <Text
        adjustsFontSizeToFit
        allowFontScaling={false}
        numberOfLines={1}
        style={[styles.text, { fontSize: size.height * TITLE_SCALE }]}>
        Your stats
      </Text>
      <View style={styles.columns}>
        {columns.map((column) => (
          <View key={column.label} style={styles.column}>
            <Text
              adjustsFontSizeToFit
              allowFontScaling={false}
              numberOfLines={1}
              style={[styles.text, { fontSize: size.height * VALUE_SCALE }]}>
              {column.value}
            </Text>
            <Text
              adjustsFontSizeToFit
              allowFontScaling={false}
              numberOfLines={1}
              style={[styles.text, { fontSize: size.height * LABEL_SCALE }]}>
              {column.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    gap: 6,
    justifyContent: 'center',
  },
  columns: {
    flexDirection: 'row',
  },
  column: {
    flex: 1,
  },
  text: {
    color: INK,
    fontFamily: FONT,
    textAlign: 'center',
  },
});
