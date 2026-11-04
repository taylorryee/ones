import { StyleSheet, Text, View } from 'react-native';

import { QuestionPopup } from '@/components/QuestionPopup';
import { FONT, INK } from '@/constants/theme';
import type { PlayedGame } from '@/services/matches';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatChange(change: number) {
  return change > 0 ? `+${change}` : String(change);
}

// e.g. "W vs Sam (+16)". A disputed game was thrown out, so it has no Elo change.
function describeGame(game: PlayedGame) {
  if (game.status === 'disputed') {
    return `Disputed vs ${game.opponent_name}`;
  }
  return `${game.you_won ? 'W' : 'L'} vs ${game.opponent_name} (${formatChange(game.rating_change)})`;
}

// The player's games on a past day: the day's record and Elo change, then each game, oldest
// first. `games` is null while loading. A tap anywhere closes it.
export function DayStatsPopup({
  date,
  games,
  onClose,
}: {
  date: Date | null;
  games: PlayedGame[] | null;
  onClose: () => void;
}) {
  // Disputed games are listed but don't count.
  const counted = games?.filter((game) => game.status !== 'disputed') ?? [];
  const wins = counted.filter((game) => game.you_won).length;
  const losses = counted.length - wins;
  const eloChange = counted.reduce((sum, game) => sum + game.rating_change, 0);

  return (
    <QuestionPopup
      onClose={onClose}
      options={[]}
      question={date ? `${MONTHS[date.getMonth()]} ${date.getDate()}` : ''}
      visible={date !== null}>
      {games === null || games.length === 0 ? (
        <Text allowFontScaling={false} style={styles.line}>
          {games === null ? '…' : 'No games'}
        </Text>
      ) : (
        <View style={styles.stats}>
          <View style={styles.columns}>
            <View style={styles.column}>
              <Text allowFontScaling={false} style={styles.value}>
                {wins}-{losses}
              </Text>
              <Text allowFontScaling={false} style={styles.label}>
                Record
              </Text>
            </View>
            <View style={styles.column}>
              <Text allowFontScaling={false} style={styles.value}>
                {formatChange(eloChange)}
              </Text>
              <Text allowFontScaling={false} style={styles.label}>
                Elo
              </Text>
            </View>
          </View>
          {[...games].reverse().map((game, index) => (
            <Text allowFontScaling={false} key={index} numberOfLines={1} style={styles.line}>
              {describeGame(game)}
            </Text>
          ))}
        </View>
      )}
    </QuestionPopup>
  );
}

const styles = StyleSheet.create({
  stats: {
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: 8,
  },
  columns: {
    flexDirection: 'row',
    gap: 40,
    marginBottom: 8,
  },
  column: {
    alignItems: 'center',
  },
  value: {
    color: INK,
    fontFamily: FONT,
    fontSize: 30,
  },
  label: {
    color: INK,
    fontFamily: FONT,
    fontSize: 16,
  },
  line: {
    color: INK,
    fontFamily: FONT,
    fontSize: 20,
  },
});
