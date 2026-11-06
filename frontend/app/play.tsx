import { router } from 'expo-router';
import { useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';

import { PlayPanel } from '@/components/PlayPanel';
import { useContentInset, useContentSize } from '@/components/ScreenBorder';
import { PAPER } from '@/constants/theme';

export default function PlayScreen() {
  const content = useContentSize();
  const inset = useContentInset();

  // Created once; kept in state rather than a ref so it can be read during render.
  const [swipeDownResponder] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dy) > Math.abs(gesture.dx) && gesture.dy > 10,
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 60) {
          router.back();
        }
      },
    })
  );

  return (
    <View style={styles.screen} {...swipeDownResponder.panHandlers}>
      <PlayPanel
        inset={inset}
        onOpenMatch={(matchId) =>
          router.replace({ pathname: '/match/[id]', params: { id: String(matchId) } })
        }
        size={content}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: PAPER,
    flex: 1,
  },
});
