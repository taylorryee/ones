import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  GestureDetector,
  useCompetingGestures,
  usePanGesture,
  useTapGesture,
} from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import { CardPopup } from '@/components/CardPopup';
import { ROTATINGCARD_BORDER_INSET, RotatingcardBorder } from '@/components/RotatingcardBorder';
import type { Size } from '@/components/skeleton';
import {
  DRAG_SLOP,
  EDGE_STRETCH,
  releaseTarget,
  rubberBand,
  SNAP_SPRING,
} from '@/components/swipePaging';

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

const INSET = ROTATINGCARD_BORDER_INSET;

// Slides to the next card every CARD_INTERVAL, looping forever, and can be swiped either way, with
// the same feel as the calendar. Each card takes a whole frame width (`pitch`) and starts `inset`
// into it, so the next one comes in from under the right of the border as the last leaves under
// the left. Only the shown card and the two either side are mounted, so a quick run of swipes never
// slides onto one still rendering; the cards keep moving rather than jumping back to the start, so
// a card is never remounted while visible. A swipe stops the rotation, which starts again from the
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
  // How many swipes have finished settling; the rotation starts again on each.
  const [settles, setSettles] = useState(0);
  // The same as position, for the gesture, which runs on the UI thread and can't wait for a render.
  const committed = useSharedValue(0);
  // Where the cards are: -position × pitch once they settle.
  const offset = useSharedValue(0);
  // Where the cards were when the drag started, less the slop the finger moved to start it.
  const dragStart = useSharedValue(0);
  // The card this drag lands on if it goes back.
  const back = useSharedValue(0);
  // From when a drag starts until its snap ends, so the rotation can't start under the finger or
  // cut the snap short, however far behind the JS thread is.
  const held = useSharedValue(false);
  const count = cards.length;

  const onSettled = () => setSettles((total) => total + 1);

  // Runs on the UI thread, like the gesture, so a swipe stops it at once. Each slide ending changes
  // the position and each swipe ending changes `settles`, either of which starts the next one.
  useEffect(() => {
    scheduleOnUI(() => {
      'worklet';
      if (held.get()) {
        return;
      }
      const from = committed.get();
      // Also puts the cards back in place when the size changes.
      offset.set(-from * pitch);
      if (count < 2) {
        return;
      }
      const next = from + 1;
      offset.set(
        withDelay(
          CARD_INTERVAL - CARD_SLIDE_DURATION,
          withTiming(
            -next * pitch,
            { duration: CARD_SLIDE_DURATION, easing: Easing.inOut(Easing.cubic) },
            (finished) => {
              // Interrupted only by a drag, which settles the cards itself.
              if (finished) {
                committed.set(next);
                scheduleOnRN(setPosition, next);
              }
            },
          ),
        ),
      );
    });
  }, [committed, count, held, offset, pitch, position, settles]);

  useEffect(() => () => cancelAnimation(offset), [offset]);

  // Runs on the UI thread from start to finish, so rendering a newly mounted card on the JS thread
  // can't stall the drag or the snap.
  const pan = usePanGesture({
    activeOffsetX: [-DRAG_SLOP, DRAG_SLOP],
    enabled: count > 1,
    failOffsetY: [-DRAG_SLOP, DRAG_SLOP],
    onActivate: (event) => {
      cancelAnimation(offset);
      // Caught part way through a slide, going back returns to the card it was leaving. Otherwise
      // it's one back from the shown card, even if that card is still sliding in, so a swipe made
      // meanwhile moves on from it instead of landing on it.
      const at = Math.round((-offset.get() / pitch) * 1000) / 1000;
      back.set(held.get() ? committed.get() - 1 : Math.ceil(at) - 1);
      held.set(true);
      dragStart.set(offset.get() - event.translationX);
    },
    onUpdate: (event) => {
      // One card either way, since the ones past that may not be mounted; a little further
      // than that stretches.
      offset.set(
        rubberBand(
          dragStart.get() + event.translationX,
          -(committed.get() + 1) * pitch,
          -back.get() * pitch,
          pitch * EDGE_STRETCH,
        ),
      );
    },
    onDeactivate: (event) => {
      const forward = committed.get() + 1;
      const target = releaseTarget(
        -offset.get() / pitch,
        back.get(),
        forward,
        event.translationX,
        event.velocityX,
        pitch,
      );
      // Released while stretched, the cards spring straight back; the finger's speed would carry
      // them further out first.
      const stretched = offset.get() < -forward * pitch || offset.get() > -back.get() * pitch;
      // Set straight away rather than when the snap ends, so a swipe that starts while the card is
      // still sliding in moves on from it instead of landing back on the same card.
      committed.set(target);
      scheduleOnRN(setPosition, target);
      offset.set(
        withSpring(
          -target * pitch,
          { ...SNAP_SPRING, velocity: stretched ? 0 : event.velocityX },
          (finished) => {
            // Interrupted only by another drag, which settles the cards itself.
            if (finished) {
              held.set(false);
              scheduleOnRN(onSettled);
            }
          },
        ),
      );
    },
  });

  function openSlot(slot: number) {
    const card = cards[((slot % count) + count) % count];
    if (card.popup) {
      onOpen(card.key);
    }
  }

  // A native gesture rather than a Pressable, which can stay pressed through a swipe and open the
  // card on release. Moving as far as a drag takes to start fails it, and racing the drag means
  // only one of the two can ever win. Lands on the card under the finger, even mid-slide.
  const tap = useTapGesture({
    maxDistance: DRAG_SLOP,
    onActivate: (event) => {
      scheduleOnRN(openSlot, Math.floor((event.x - offset.get()) / pitch));
    },
  });
  const gesture = useCompetingGestures(pan, tap);

  if (count === 0) {
    return null;
  }

  const content = {
    width: Math.max(0, size.width - INSET.left - INSET.right),
    height: Math.max(0, size.height - INSET.top - INSET.bottom),
  };
  const shown =
    count < 2
      ? [position]
      : [position - 2, position - 1, position, position + 1, position + 2];
  const popup = cards.find((card) => card.key === openKey)?.popup ?? null;

  return (
    <>
      <GestureDetector gesture={gesture}>
        <View style={{ height: size.height, width: pitch }}>
          {shown.map((slot) => {
            const card = cards[((slot % count) + count) % count];
            return (
              // Keyed by slot, so the shown card stays mounted when a neighbour becomes current.
              <CardSlot inset={inset} key={slot} offset={offset} pitch={pitch} slot={slot}>
                <RotatingcardBorder height={size.height} width={size.width} />
                <View style={[styles.content, { left: INSET.left, top: INSET.top, ...content }]}>
                  {card.render(content)}
                </View>
              </CardSlot>
            );
          })}
        </View>
      </GestureDetector>
      {/* Outside the carousel's view, so its sideways drags don't claim touches in the popup. */}
      <CardPopup onClose={() => onOpen(null)} render={popup} />
    </>
  );
}

// One card, `slot` frame widths along from the first. Each card is moved on its own, so it is
// always inside its own bounds and gets its touches.
function CardSlot({
  slot,
  offset,
  pitch,
  inset,
  children,
}: {
  slot: number;
  offset: SharedValue<number>;
  pitch: number;
  inset: number;
  children: ReactNode;
}) {
  const slide = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.get() + slot * pitch }],
  }));
  return <Animated.View style={[styles.card, { left: inset }, slide]}>{children}</Animated.View>;
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
