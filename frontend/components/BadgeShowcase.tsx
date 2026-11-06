import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { AddSlot } from '@/components/AddSlot';
import { GlassesGleam } from '@/components/GlassesGleam';
import { StickerArt } from '@/components/StickerArt';
import type { OwnedSticker } from '@/services/stickers';

// How far the slot being edited rocks to each side, and how long one swing takes.
const WIGGLE_DEGREES = 4;
const WIGGLE_DURATION = 130;

function Wiggle({ active, children }: { active: boolean; children: ReactNode }) {
  const angle = useSharedValue(0);

  useEffect(() => {
    const easing = Easing.inOut(Easing.quad);
    if (active) {
      angle.set(
        withSequence(
          withTiming(WIGGLE_DEGREES, { duration: WIGGLE_DURATION / 2, easing }),
          withRepeat(
            withTiming(-WIGGLE_DEGREES, { duration: WIGGLE_DURATION, easing }),
            -1,
            true
          )
        )
      );
    } else {
      angle.set(withTiming(0, { duration: WIGGLE_DURATION / 2, easing }));
    }
    return () => cancelAnimation(angle);
  }, [active, angle]);

  const rock = useAnimatedStyle(() => ({ transform: [{ rotate: `${angle.get()}deg` }] }));

  return <Animated.View style={[styles.fill, rock]}>{children}</Animated.View>;
}

// The row of badges on the badge wall, with the middle one dipped: the same on the wall and in the
// badges popup. Thinker is the glasses. A slot with no badge stays blank and can't be tapped unless
// `showOpenings` is set, which draws a plus in it; `wiggling` is the slot being edited, if any.
export function BadgeShowcase({
  slots,
  slot,
  gap,
  dip,
  showOpenings = false,
  wiggling = null,
  onPressSlot,
}: {
  slots: (OwnedSticker | null)[];
  slot: number;
  gap: number;
  dip: number;
  showOpenings?: boolean;
  wiggling?: number | null;
  onPressSlot: (index: number) => void;
}) {
  return (
    <View style={[styles.row, { gap }]}>
      {slots.map((badge, index) => (
        <Pressable
          disabled={!badge && !showOpenings}
          key={index}
          onPress={() => onPressSlot(index)}
          style={{
            height: slot,
            marginTop: index === Math.floor(slots.length / 2) ? dip : 0,
            width: slot,
          }}>
          <Wiggle active={wiggling === index}>
            {!badge ? (
              showOpenings && <AddSlot size={slot} />
            ) : badge.sticker.slug === 'thinker' ? (
              <GlassesGleam />
            ) : (
              <StickerArt slug={badge.sticker.slug} />
            )}
          </Wiggle>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    height: '100%',
    width: '100%',
  },
  row: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'center',
  },
});
