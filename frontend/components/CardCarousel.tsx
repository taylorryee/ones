import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { ROTATINGCARD_BORDER_INSET, RotatingcardBorder } from '@/components/RotatingcardBorder';
import type { Size } from '@/components/skeleton';

// One card in the carousel. `render` draws what goes inside the frame, at `size`: the space left
// inside the line, the same for every card. A card can hold anything, including its own data
// loading and buttons.
export type CarouselCard = {
  key: string;
  render: (size: Size) => ReactNode;
};

// A slide starts every CARD_INTERVAL and takes CARD_SLIDE_DURATION of it.
const CARD_INTERVAL = 5000;
const CARD_SLIDE_DURATION = 1800;

const INSET = ROTATINGCARD_BORDER_INSET;

// Slides to the next card every CARD_INTERVAL, looping forever. Each card takes a whole frame
// width (`pitch`) and starts `inset` into it, so the next one comes in from under the right of the
// border as the last leaves under the left. Only the shown card and the next one are mounted; the
// row keeps moving left rather than jumping back, so a card is never remounted while visible.
export function CardCarousel({
  cards,
  size,
  inset,
  pitch,
}: {
  cards: CarouselCard[];
  size: Size;
  inset: number;
  pitch: number;
}) {
  // How many slides have happened; the shown card is cards[position % cards.length].
  const [position, setPosition] = useState(0);
  // State rather than a ref so render never reads a ref.
  const [offset] = useState(() => new Animated.Value(0));
  const count = cards.length;

  useEffect(() => {
    // Also puts the row back in place when the size changes.
    offset.setValue(-position * pitch);
    if (count < 2) {
      return;
    }
    const timer = setTimeout(() => {
      Animated.timing(offset, {
        duration: CARD_SLIDE_DURATION,
        easing: Easing.inOut(Easing.cubic),
        toValue: -(position + 1) * pitch,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setPosition(position + 1);
        }
      });
    }, CARD_INTERVAL - CARD_SLIDE_DURATION);

    return () => {
      clearTimeout(timer);
      offset.stopAnimation();
    };
  }, [count, offset, pitch, position]);

  if (count === 0) {
    return null;
  }

  const content = {
    width: Math.max(0, size.width - INSET.left - INSET.right),
    height: Math.max(0, size.height - INSET.top - INSET.bottom),
  };
  const shown = count < 2 ? [position] : [position, position + 1];

  return (
    <Animated.View
      style={{
        height: size.height,
        width: pitch,
        transform: [{ translateX: offset }],
      }}>
      {shown.map((slot) => {
        const card = cards[slot % count];
        return (
          // Keyed by slot, so the shown card stays mounted when the next one becomes current.
          <View key={slot} style={[styles.card, { left: slot * pitch + inset }]}>
            <RotatingcardBorder height={size.height} width={size.width} />
            <View style={[styles.content, { left: INSET.left, top: INSET.top, ...content }]}>
              {card.render(content)}
            </View>
          </View>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    top: 0,
  },
  content: {
    position: 'absolute',
  },
});
