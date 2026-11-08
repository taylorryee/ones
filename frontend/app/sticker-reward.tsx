import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { stickerArtwork } from '@/components/BadgeArt';
import { BadgeUnlock } from '@/components/BadgeUnlock';
import { useContentSize } from '@/components/ScreenBorder';
import { StickerArt } from '@/components/StickerArt';
import { UNLOCK_RAYS_REACH, UnlockRays } from '@/components/UnlockRays';
import { getArchetype } from '@/constants/archetypes';
import { goAfterMatch, HOME } from '@/services/matchFlow';
import { getStickerInventory, type OwnedSticker } from '@/services/stickers';

// The sticker's size as a share of the rays; the rays start just outside it.
const STICKER_SHARE = 0.55;
// The sticker springs up from this scale and a little past its full size...
const STICKER_START = 0.55;
const POP_SPRING = { damping: 12, mass: 1, stiffness: 220 };
// ...and the rays burst out this long after it starts, as it reaches its largest.
const RAYS_DELAY = 170;

// Shown after a win that earned a sticker. Every sticker with artwork, new or levelled up, spins in
// with BadgeUnlock. One without artwork pops up large in the middle of the screen, then rays burst
// out and turn around it; tapping anywhere goes on to `next`, at any point in the animation.
export default function StickerRewardScreen() {
  const { next, playerStickerId } = useLocalSearchParams<{
    next?: string;
    playerStickerId?: string;
  }>();
  const [sticker, setSticker] = useState<OwnedSticker | null>(null);
  const space = useContentSize();

  useEffect(() => {
    getStickerInventory()
      .then((inventory) =>
        setSticker(inventory.find((owned) => String(owned.id) === playerStickerId) ?? null)
      )
      .catch(() => {});
  }, [playerStickerId]);

  // As large as the rays can be and still stay on screen as they turn.
  const rays = space ? Math.min(space.width, space.height) / UNLOCK_RAYS_REACH : 0;
  const goOn = () => goAfterMatch(next ?? HOME);

  const artwork = sticker ? stickerArtwork(sticker.sticker.slug) : null;
  if (sticker && artwork) {
    const archetype = getArchetype(sticker.sticker.slug);
    return (
      <BadgeUnlock
        artwork={artwork}
        description={archetype?.description}
        name={archetype?.name ?? sticker.sticker.name}
        onDone={goOn}
      />
    );
  }

  return (
    <Pressable onPress={goOn} style={styles.screen}>
      {/* Waits for the sticker, so the animation never plays around an empty space. */}
      {sticker && rays > 0 && (
        <>
          <View style={styles.rays}>
            <UnlockRays delay={RAYS_DELAY} size={rays} />
          </View>
          <PoppingSticker size={rays * STICKER_SHARE} slug={sticker.sticker.slug} />
        </>
      )}
    </Pressable>
  );
}

function PoppingSticker({ slug, size }: { slug: string; size: number }) {
  const scale = useSharedValue(STICKER_START);

  useEffect(() => {
    scale.set(withSpring(1, POP_SPRING));
  }, [scale]);

  const pop = useAnimatedStyle(() => ({
    // Fully showing by the time it's a little over halfway up.
    opacity: Math.min(1, (scale.get() - STICKER_START) / ((1 - STICKER_START) * 0.6)),
    transform: [{ scale: scale.get() }],
  }));

  return (
    <Animated.View style={[{ height: size, width: size }, pop]}>
      <StickerArt slug={slug} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  // Out of the flow, so the rays and the sticker share the same center.
  rays: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
});
