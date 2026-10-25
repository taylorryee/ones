import { StyleSheet, Text, View } from 'react-native';

import type { Size } from '@/components/skeleton';
import { FONT, INK } from '@/constants/theme';

// Font sizes as shares of the card's content height, so the text keeps its proportions on every
// phone. Long text shrinks to fit rather than being cut off.
const TITLE_SCALE = 0.2;
const BODY_SCALE = 0.14;

// A heading and a few lines of text: quotes, announcements, headlines.
export function TextCard({ size, title, body }: { size: Size; title: string; body: string }) {
  return (
    <View style={styles.card}>
      <Text
        adjustsFontSizeToFit
        allowFontScaling={false}
        numberOfLines={1}
        style={[styles.text, { fontSize: size.height * TITLE_SCALE }]}>
        {title}
      </Text>
      <Text
        adjustsFontSizeToFit
        allowFontScaling={false}
        numberOfLines={4}
        style={[styles.text, { fontSize: size.height * BODY_SCALE }]}>
        {body}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    gap: 6,
    justifyContent: 'center',
  },
  text: {
    color: INK,
    fontFamily: FONT,
    textAlign: 'center',
  },
});
