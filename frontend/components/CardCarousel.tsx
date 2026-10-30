import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
  type PanResponderGestureState,
} from 'react-native';

import { CardPopup } from '@/components/CardPopup';
import { ROTATINGCARD_BORDER_INSET, RotatingcardBorder } from '@/components/RotatingcardBorder';
import type { Size } from '@/components/skeleton';

// One card in the carousel. `render` draws what goes inside the frame, at `size`: the space left
// inside the line, the same for every card. A card can hold anything, including its own data
// loading and buttons. With `popup`, tapping anywhere on the card opens a CardPopup that it draws
// into, at the size inside the popup's line; a swipe doesn't.
export type CarouselCard = {
  key: string;
  render: (size: Size) => ReactNode;
  popup?: (size: Size) => ReactNode;
};

// A slide starts every CARD_INTERVAL and takes CARD_SLIDE_DURATION of it.
const CARD_INTERVAL = 5000;
const CARD_SLIDE_DURATION = 1800;
// A swipe further than this share of a card, or faster than this (pt per ms), moves one card;
// a shorter, slower one springs back. Either way the card settles in SNAP_DURATION.
const SWIPE_DISTANCE = 0.2;
const SWIPE_VELOCITY = 0.3;
const SNAP_DURATION = 300;

const INSET = ROTATINGCARD_BORDER_INSET;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// Slides to the next card every CARD_INTERVAL, looping forever, and can be swiped either way.
// Each card takes a whole frame width (`pitch`) and starts `inset` into it, so the next one comes
// in from under the right of the border as the last leaves under the left. Only the shown card and
// its neighbours are mounted; the cards keep moving rather than jumping back to the start, so a
// card is never remounted while visible. A swipe pauses the timer, which starts again from the
// card it lands on. `openKey` is the card whose popup is open, if any; tapping a card or closing
// its popup calls `onOpen`.
export function CardCarousel({
  cards,
  size,
  inset,
  pitch,
  openKey,
  onOpen,
}: {
  cards: CarouselCard[];
  size: Size;
  inset: number;
  pitch: number;
  openKey: string | null;
  onOpen: (key: string | null) => void;
}) {
  // Cards moved past so far, negative after swiping back past the first; the shown card is
  // cards[position] wrapped round the list.
  const [position, setPosition] = useState(0);
  const [dragging, setDragging] = useState(false);
  // State rather than a ref so render never reads a ref.
  const [offset] = useState(() => new Animated.Value(0));
  const count = cards.length;

  useEffect(() => {
    // While dragging, the finger moves the cards.
    if (dragging) {
      return;
    }
    // Also puts the cards back in place when the size changes.
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
  }, [count, dragging, offset, pitch, position]);

  // Claims horizontal drags and keeps them until the finger lifts.
  const panResponder = useMemo(() => {
    // Never more than one card either way, since only the neighbours are mounted.
    const min = -(position + 1) * pitch;
    const max = -(position - 1) * pitch;
    // Where the cards were when the finger landed; may be part way through an automatic slide.
    let start = -position * pitch;

    function settle(gesture: PanResponderGestureState) {
      const from = Math.round((-start / pitch) * 1000) / 1000;
      const moved = clamp(start + gesture.dx, min, max);
      let target = Math.round(-moved / pitch);
      if (gesture.dx < -pitch * SWIPE_DISTANCE || gesture.vx < -SWIPE_VELOCITY) {
        target = Math.floor(from) + 1;
      } else if (gesture.dx > pitch * SWIPE_DISTANCE || gesture.vx > SWIPE_VELOCITY) {
        target = Math.ceil(from) - 1;
      }
      target = clamp(target, position - 1, position + 1);
      Animated.timing(offset, {
        duration: SNAP_DURATION,
        easing: Easing.out(Easing.cubic),
        toValue: -target * pitch,
        useNativeDriver: true,
      }).start(({ finished }) => {
        // Interrupted only by another drag, which settles the cards itself.
        if (finished) {
          setPosition(target);
          setDragging(false);
        }
      });
    }

    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        count > 1 && Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderGrant: () => {
        setDragging(true);
        offset.stopAnimation((value) => {
          start = value;
        });
      },
      onPanResponderMove: (_, gesture) => {
        offset.setValue(clamp(start + gesture.dx, min, max));
      },
      onPanResponderRelease: (_, gesture) => settle(gesture),
      onPanResponderTerminate: (_, gesture) => settle(gesture),
      onPanResponderTerminationRequest: () => false,
    });
  }, [count, offset, pitch, position]);

  if (count === 0) {
    return null;
  }

  const content = {
    width: Math.max(0, size.width - INSET.left - INSET.right),
    height: Math.max(0, size.height - INSET.top - INSET.bottom),
  };
  const shown = count < 2 ? [position] : [position - 1, position, position + 1];
  const popup = cards.find((card) => card.key === openKey)?.popup ?? null;

  return (
    <>
      <View {...panResponder.panHandlers} style={{ height: size.height, width: pitch }}>
        {shown.map((slot) => {
          const card = cards[((slot % count) + count) % count];
          return (
            // Keyed by slot, so the shown card stays mounted when a neighbour becomes current. Each
            // card is moved on its own, so it is always inside its own bounds and gets its touches.
            <Animated.View
              key={slot}
              style={[
                styles.card,
                {
                  left: inset,
                  transform: [{ translateX: Animated.add(offset, slot * pitch) }],
                },
              ]}>
              <RotatingcardBorder height={size.height} width={size.width} />
              <View style={[styles.content, { left: INSET.left, top: INSET.top, ...content }]}>
                {card.render(content)}
              </View>
              {/* Over the whole card, so the tap lands anywhere inside the border. The carousel
                  takes over a sideways drag, which cancels the press. */}
              {card.popup && (
                <Pressable onPress={() => onOpen(card.key)} style={StyleSheet.absoluteFill} />
              )}
            </Animated.View>
          );
        })}
      </View>
      {/* Outside the carousel's view, so its sideways drags don't claim touches in the popup. */}
      <CardPopup onClose={() => onOpen(null)} render={popup} />
    </>
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
