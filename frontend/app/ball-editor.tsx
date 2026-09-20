import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  PanResponder,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Basketball } from '@/components/Basketball';
import { OGSticker } from '@/components/OGSticker';
import {
  getStickerInventory,
  type OwnedSticker,
  placeSticker,
  type PlacementInput,
} from '@/services/stickers';

const BALL_ASPECT_RATIO = 330 / 271;
const STICKER_SIZE_RATIO = 0.22;
const DEFAULT_PLACEMENT: PlacementInput = {
  rotation: 0,
  scale: 1,
  u: 0.5,
  v: 0.5,
  z_index: 0,
};

export default function BallEditorScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const ballWidth = Math.min(screenWidth - 32, 360);
  const ballHeight = ballWidth / BALL_ASPECT_RATIO;
  const [ownedSticker, setOwnedSticker] = useState<OwnedSticker | null>(null);
  const [placement, setPlacement] = useState<PlacementInput>(DEFAULT_PLACEMENT);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState('');

  const ownedStickerRef = useRef<OwnedSticker | null>(null);
  const placementRef = useRef(placement);
  const dragStartRef = useRef({ u: placement.u, v: placement.v });
  const ballSizeRef = useRef({ height: ballHeight, width: ballWidth });

  ballSizeRef.current = { height: ballHeight, width: ballWidth };

  useEffect(() => {
    async function loadSticker() {
      try {
        const inventory = await getStickerInventory();
        const owned = inventory.find((item) => item.sticker.slug === 'og-sticker') ?? null;
        ownedStickerRef.current = owned;
        setOwnedSticker(owned);

        if (owned?.ball_placement) {
          const savedPlacement: PlacementInput = {
            rotation: owned.ball_placement.rotation,
            scale: owned.ball_placement.scale,
            u: owned.ball_placement.u,
            v: owned.ball_placement.v,
            z_index: owned.ball_placement.z_index,
          };
          placementRef.current = savedPlacement;
          setPlacement(savedPlacement);
          setStatus('Saved');
        }
      } catch {
        setStatus('Could not load sticker');
      } finally {
        setIsLoading(false);
      }
    }

    loadSticker();
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStartRef.current = {
          u: placementRef.current.u,
          v: placementRef.current.v,
        };
        setStatus('');
      },
      onPanResponderMove: (_, gesture) => {
        const { height, width } = ballSizeRef.current;
        const stickerSize = Math.min(width, height) * STICKER_SIZE_RATIO * placementRef.current.scale;
        const minU = stickerSize / 2 / width;
        const minV = stickerSize / 2 / height;
        const nextPlacement = {
          ...placementRef.current,
          u: Math.max(minU, Math.min(1 - minU, dragStartRef.current.u + gesture.dx / width)),
          v: Math.max(minV, Math.min(1 - minV, dragStartRef.current.v + gesture.dy / height)),
        };

        placementRef.current = nextPlacement;
        setPlacement(nextPlacement);
      },
      onPanResponderRelease: () => {
        const owned = ownedStickerRef.current;
        if (!owned) {
          return;
        }

        setStatus('Saving...');
        placeSticker(owned.id, placementRef.current)
          .then(() => setStatus('Saved'))
          .catch(() => setStatus('Could not save'));
      },
    })
  ).current;

  const stickerSize = Math.min(ballWidth, ballHeight) * STICKER_SIZE_RATIO * placement.scale;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Ball editor</Text>
        <Text style={styles.status}>{ownedSticker ? status : 'OG Sticker unavailable'}</Text>
      </View>

      <View style={styles.stage}>
        <View style={{ height: ballHeight, position: 'relative', width: ballWidth }}>
          <Basketball height={ballHeight} width={ballWidth} />

          {ownedSticker ? (
            <View
              {...panResponder.panHandlers}
              style={{
                height: stickerSize,
                left: placement.u * ballWidth - stickerSize / 2,
                position: 'absolute',
                top: placement.v * ballHeight - stickerSize / 2,
                transform: [{ rotate: `${placement.rotation}deg` }],
                width: stickerSize,
              }}>
              <OGSticker height="100%" width="100%" />
            </View>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  safeArea: {
    backgroundColor: '#F8FAFC',
    flex: 1,
  },
  stage: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  status: {
    color: '#6B7280',
    fontSize: 14,
    minHeight: 20,
  },
  title: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '800',
  },
});
