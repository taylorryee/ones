import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { BadgeArt, type BadgeArtwork } from '@/components/BadgeArt';
import {
  badgeGradient,
  badgeUnlockSize,
  FRONT_END,
  FRONT_START,
  UNLOCK_INTENSITY,
  type UnlockIntensity,
  WASH_CYCLE,
  WASH_DURATION,
} from '@/components/badgeUnlockMotion';
import { FLOW_DURATION } from '@/components/PlayedGradient';
import { FONT, INK, PAPER } from '@/constants/theme';

// How far away the viewer is, in badge widths. Closer exaggerates the coin's near edge growing as
// it turns; further flattens it.
const PERSPECTIVE = 4;
// The size spring as the badge appears: quick, with a little overshoot.
const APPEAR_SPRING = { damping: 13, stiffness: 170, mass: 1 };
// The color wash starts this long after the badge lands, partway into its rebound.
const WASH_DELAY = 260;
// The name and description rise this far into place, in points, after the wash has started.
const TEXT_RISE = 14;
const TEXT_DELAY = WASH_DELAY + 300;
const TEXT_DURATION = 450;
// Skipping eases the badge round to face front over this long, rather than cutting.
const SKIP_DURATION = 240;
// The shadow under the badge: as wide as this share of the badge, narrowing as the badge turns
// edge-on, never below MIN_SHADOW of its width.
const SHADOW_WIDTH = 0.62;
const SHADOW_HEIGHT = 0.07;
const MIN_SHADOW = 0.3;
const SHADOW_OPACITY = 0.09;
// Gap from the badge's bottom to the shadow, and to the name, as shares of the badge.
const SHADOW_GAP = 0.06;
const TEXT_GAP = 0.2;

// After the wash, the colors keep flowing at the calendar's speed.
function flowing() {
  'worklet';
  return withRepeat(
    withTiming(FRONT_END + WASH_CYCLE, { duration: FLOW_DURATION, easing: Easing.linear }),
    -1
  );
}

// After `delay` the wash crosses the badge, then flows for as long as it's shown. `still` shows the
// finished colors without moving, for Reduce Motion.
function washIn(front: SharedValue<number>, delay: number, still: boolean) {
  'worklet';
  if (still) {
    front.set(FRONT_END);
    return;
  }
  front.set(
    withDelay(
      delay,
      withSequence(
        withTiming(FRONT_END, { duration: WASH_DURATION, easing: Easing.inOut(Easing.quad) }),
        flowing()
      )
    )
  );
}

// The moment a new badge is unlocked: the badge spins in like a tossed coin, slows, rocks back as
// it lands, and color washes across it; then its name and description rise in below. Fills its
// parent, and sizes the badge from the space it gets (badgeUnlockSize).
//
// The first tap skips straight to the end; a tap once everything is shown calls `onDone`. With
// Reduce Motion on, it opens on the end. `colors` defaults to a played-day gradient picked by
// name; `intensity` picks the spin from UNLOCK_INTENSITY.
export function BadgeUnlock({
  artwork,
  name,
  description,
  colors,
  intensity = 'standard',
  onDone,
}: {
  artwork: BadgeArtwork;
  name: string;
  description?: string;
  colors?: readonly string[];
  intensity?: UnlockIntensity;
  onDone: () => void;
}) {
  const motion = UNLOCK_INTENSITY[intensity];
  const reducedMotion = useReducedMotion();
  const [space, setSpace] = useState<{ width: number; height: number } | null>(null);
  // True once the name has risen in or the animation was skipped, from which point a tap goes on.
  // Under Reduce Motion everything shows from the start.
  const [shown, setShown] = useState(false);
  const revealed = shown || reducedMotion;
  // Plays once; a later change of size (the phone turning) only resizes it.
  const started = useRef(false);

  // Degrees turned; facing front at every multiple of 360.
  const angle = useSharedValue(0);
  // 0 to about 1 as the badge appears; springs a little past 1.
  const appear = useSharedValue(0);
  // Multiplies the size: swells as the badge lands.
  const land = useSharedValue(1);
  // Where the color wash's front is (badgeUnlockMotion.ts).
  const front = useSharedValue(FRONT_START);
  // 0 to 1 as the name and description rise in.
  const text = useSharedValue(0);

  const size = space ? badgeUnlockSize(space) : 0;

  useEffect(
    () => () => [angle, appear, land, front, text].forEach(cancelAnimation),
    [angle, appear, land, front, text]
  );
  const finalAngle = motion.turns * 360;

  // Starts once the space is known, so it never plays before it can be seen.
  useEffect(() => {
    if (size === 0 || started.current) {
      return;
    }
    started.current = true;
    if (reducedMotion) {
      angle.set(finalAngle);
      appear.set(1);
      washIn(front, 0, true);
      text.set(1);
      return;
    }

    const showText = () => {
      'worklet';
      text.set(
        withDelay(
          TEXT_DELAY,
          withTiming(
            1,
            { duration: TEXT_DURATION, easing: Easing.out(Easing.cubic) },
            (finished) => {
              if (finished) {
                scheduleOnRN(setShown, true);
              }
            }
          )
        )
      );
    };
    const onLanded = () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    };

    appear.set(withSpring(1, APPEAR_SPRING));
    angle.set(
      withSequence(
        // From full speed down to a stop a little past facing front...
        withTiming(
          finalAngle + motion.overshoot,
          { duration: motion.spinDuration, easing: Easing.out(Easing.quad) },
          (finished) => {
            if (!finished) {
              return;
            }
            land.set(
              withSequence(
                withTiming(motion.landScale, { duration: 120, easing: Easing.out(Easing.quad) }),
                withSpring(1, { damping: 10, stiffness: 220, mass: 1 })
              )
            );
            washIn(front, WASH_DELAY, false);
            showText();
            scheduleOnRN(onLanded);
          }
        ),
        // ...then back, rocking once before it rests.
        withSpring(finalAngle, motion.rebound)
      )
    );
  }, [angle, appear, finalAngle, front, land, motion, reducedMotion, size, text]);

  // Jumps to the end: the badge eases on round to its next front-facing turn, or back to its last
  // one if it's already rocking past it, and everything else shows at once. Cancelling the spin
  // before it lands also cancels its landing.
  function skip() {
    [angle, appear, land, front, text].forEach(cancelAnimation);
    angle.set(
      withTiming(Math.min(Math.ceil(angle.get() / 360) * 360, finalAngle), {
        duration: SKIP_DURATION,
        easing: Easing.out(Easing.cubic),
      })
    );
    appear.set(withTiming(1, { duration: SKIP_DURATION }));
    land.set(withTiming(1, { duration: SKIP_DURATION }));
    text.set(withTiming(1, { duration: SKIP_DURATION }));
    if (reducedMotion) {
      front.set(FRONT_END);
    } else {
      front.set(withSequence(withTiming(FRONT_END, { duration: SKIP_DURATION }), flowing()));
    }
    setShown(true);
  }

  const coin = useAnimatedStyle(() => {
    const turned = angle.get();
    // Past edge-on the back faces the viewer. Flipping it back means the badge never shows
    // mirrored, like a coin with the same face on both sides; edge-on the flip can't be seen.
    const facing = Math.cos((turned * Math.PI) / 180) >= 0;
    const grow = motion.startScale + (1 - motion.startScale) * appear.get();
    return {
      opacity: Math.min(1, appear.get() * 3),
      transform: [
        // size is 0 until the layout is measured, and React Native rejects a zero perspective.
        { perspective: Math.max(1, size * PERSPECTIVE) },
        { scale: grow * land.get() },
        { rotateY: `${turned}deg` },
        { scaleX: facing ? 1 : -1 },
      ],
    };
  });

  // The badge's shadow on the ground: as wide as the badge looks, so it narrows as it turns.
  const shadow = useAnimatedStyle(() => {
    const across = Math.abs(Math.cos((angle.get() * Math.PI) / 180));
    const grow = motion.startScale + (1 - motion.startScale) * appear.get();
    return {
      opacity: Math.min(1, appear.get()) * SHADOW_OPACITY,
      transform: [{ scaleX: (MIN_SHADOW + (1 - MIN_SHADOW) * across) * grow * land.get() }],
    };
  });

  const rise = useAnimatedStyle(() => ({
    opacity: text.get(),
    transform: [{ translateY: (1 - text.get()) * TEXT_RISE }],
  }));

  const gradient = colors ?? badgeGradient(name);
  const badgeTop = space ? (space.height - size) / 2 : 0;

  return (
    <Pressable
      accessibilityHint={revealed ? 'Continues' : 'Skips the animation'}
      accessibilityLabel={`${name} unlocked${description ? `. ${description}` : ''}`}
      accessibilityRole="button"
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setSpace((old) => (old?.width === width && old.height === height ? old : { width, height }));
      }}
      onPress={revealed ? onDone : skip}
      style={styles.screen}>
      {space && size > 0 && (
        <>
          <Animated.View
            style={[
              styles.shadow,
              {
                borderRadius: (size * SHADOW_HEIGHT) / 2,
                height: size * SHADOW_HEIGHT,
                left: (space.width - size * SHADOW_WIDTH) / 2,
                top: badgeTop + size * (1 + SHADOW_GAP),
                width: size * SHADOW_WIDTH,
              },
              shadow,
            ]}
          />
          <Animated.View
            style={[
              styles.badge,
              { height: size, left: (space.width - size) / 2, top: badgeTop, width: size },
              coin,
            ]}>
            <BadgeArt artwork={artwork} colors={gradient} front={front} size={size} />
          </Animated.View>
          <Animated.View
            style={[styles.text, { top: badgeTop + size * (1 + TEXT_GAP) }, rise]}>
            <Text style={[styles.name, { fontSize: size * 0.17 }]}>{name}</Text>
            {description ? (
              <Text style={[styles.description, { fontSize: size * 0.08 }]}>{description}</Text>
            ) : null}
          </Animated.View>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFill,
    backgroundColor: PAPER,
  },
  badge: {
    position: 'absolute',
  },
  shadow: {
    backgroundColor: INK,
    position: 'absolute',
  },
  text: {
    alignItems: 'center',
    left: 0,
    paddingHorizontal: 16,
    position: 'absolute',
    right: 0,
  },
  name: {
    color: INK,
    fontFamily: FONT,
    textAlign: 'center',
  },
  description: {
    color: INK,
    fontFamily: FONT,
    marginTop: 6,
    opacity: 0.7,
    textAlign: 'center',
  },
});
