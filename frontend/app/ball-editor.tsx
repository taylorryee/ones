import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  type LayoutChangeEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Basketball } from '@/components/Basketball';
import { OGSticker } from '@/components/OGSticker';
import {
  type BallStickerPlacement,
  getStickerInventory,
  type OwnedSticker,
  placeSticker,
  type PlacementInput,
} from '@/services/stickers';

const BALL_WIDTH = 300;
const BALL_HEIGHT = 250;
const STICKER_SIZE_RATIO = 0.22;
// Ellipse (in pixels, centered on the ball) that counts as "on the ball".
const PLACEABLE_RADIUS_X = BALL_WIDTH * 0.4;
const PLACEABLE_RADIUS_Y = BALL_HEIGHT * 0.4;

type Point = { x: number; y: number };

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function isWithinPlaceableRadius(point: Point, ballOrigin: Point) {
  const dx = point.x - (ballOrigin.x + BALL_WIDTH / 2);
  const dy = point.y - (ballOrigin.y + BALL_HEIGHT / 2);
  return (
    (dx * dx) / (PLACEABLE_RADIUS_X * PLACEABLE_RADIUS_X) +
      (dy * dy) / (PLACEABLE_RADIUS_Y * PLACEABLE_RADIUS_Y) <=
    1
  );
}

function renderSticker(_placement: BallStickerPlacement) {
  return <OGSticker height="100%" width="100%" />;
}

export default function BallEditorScreen() {
  const { playerStickerId } = useLocalSearchParams<{ playerStickerId?: string }>();
  const [inventory, setInventory] = useState<OwnedSticker[]>([]);
  const [ownedSticker, setOwnedSticker] = useState<OwnedSticker | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [isPlaced, setIsPlaced] = useState(false);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(
    null
  );
  const [ballOrigin, setBallOrigin] = useState<Point | null>(null);
  const [dragPosition, setDragPosition] = useState<Point | null>(null);

  const ownedStickerRef = useRef<OwnedSticker | null>(null);
  const ballOriginRef = useRef<Point | null>(null);
  const dragPositionRef = useRef<Point | null>(null);
  const dragStartRef = useRef<Point>({ x: 0, y: 0 });
  const placementDetailsRef = useRef<Pick<PlacementInput, 'rotation' | 'scale' | 'z_index'>>({
    rotation: 0,
    scale: 1,
    z_index: 0,
  });
  const hasInitializedPositionRef = useRef(false);

  ballOriginRef.current = ballOrigin;
  dragPositionRef.current = dragPosition;

  useEffect(() => {
    async function loadInventory() {
      try {
        const items = await getStickerInventory();
        setInventory(items);

        const targetId = playerStickerId != null ? Number(playerStickerId) : null;
        const owned =
          (targetId != null ? items.find((item) => item.id === targetId) : null) ??
          items[0] ??
          null;
        ownedStickerRef.current = owned;
        setOwnedSticker(owned);

        if (owned?.ball_placement) {
          placementDetailsRef.current = {
            rotation: owned.ball_placement.rotation,
            scale: owned.ball_placement.scale,
            z_index: owned.ball_placement.z_index,
          };
        }
      } catch {
        setStatus('Could not load sticker');
      } finally {
        setIsLoading(false);
      }
    }

    loadInventory();
  }, [playerStickerId]);

  // Give a sticker with no saved placement a starting point in the middle of the
  // screen; one that's already on the ball starts right where it was left.
  useEffect(() => {
    if (hasInitializedPositionRef.current || !ownedSticker) {
      return;
    }

    if (ownedSticker.ball_placement) {
      if (!ballOrigin) {
        return;
      }

      hasInitializedPositionRef.current = true;
      setDragPosition({
        x: ballOrigin.x + ownedSticker.ball_placement.u * BALL_WIDTH,
        y: ballOrigin.y + ownedSticker.ball_placement.v * BALL_HEIGHT,
      });
      setIsPlaced(true);
      setStatus('Saved');
    } else {
      if (!containerSize) {
        return;
      }

      hasInitializedPositionRef.current = true;
      setDragPosition({ x: containerSize.width / 2, y: containerSize.height / 2 });
      setIsPlaced(false);
      setStatus('Drag your new sticker onto your ball');
    }
  }, [ownedSticker, ballOrigin, containerSize]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStartRef.current = dragPositionRef.current ?? { x: 0, y: 0 };
        setStatus('');
      },
      onPanResponderMove: (_, gesture) => {
        const next = {
          x: dragStartRef.current.x + gesture.dx,
          y: dragStartRef.current.y + gesture.dy,
        };
        dragPositionRef.current = next;
        setDragPosition(next);
      },
      onPanResponderRelease: () => {
        const owned = ownedStickerRef.current;
        const current = dragPositionRef.current;
        const ball = ballOriginRef.current;

        if (!owned || !current || !ball) {
          setIsPlaced(false);
          return;
        }

        if (isWithinPlaceableRadius(current, ball)) {
          const u = clamp((current.x - ball.x) / BALL_WIDTH, 0, 1);
          const v = clamp((current.y - ball.y) / BALL_HEIGHT, 0, 1);

          setIsPlaced(true);
          setStatus('Saving...');
          placeSticker(owned.id, { ...placementDetailsRef.current, u, v })
            .then(() => setStatus('Saved'))
            .catch(() => setStatus('Could not save'));
        } else {
          setIsPlaced(false);
          setStatus('Drag your new sticker onto your ball');
        }
      },
    })
  ).current;

  const otherPlacements: BallStickerPlacement[] = inventory.flatMap((item) =>
    item.ball_placement && item.id !== ownedSticker?.id
      ? [{ ...item.ball_placement, sticker: item.sticker }]
      : []
  );

  function handleDone() {
    if (ownedSticker && !isPlaced) {
      Alert.alert(
        'Place your sticker',
        'Drag your new sticker onto your ball before continuing.'
      );
      return;
    }

    router.replace('/profile');
  }

  function handleContainerLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    setContainerSize({ width, height });
  }

  function handleBallLayout(event: LayoutChangeEvent) {
    const { x, y } = event.nativeEvent.layout;
    setBallOrigin({ x, y });
  }

  const stickerSize =
    Math.min(BALL_WIDTH, BALL_HEIGHT) * STICKER_SIZE_RATIO * placementDetailsRef.current.scale;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} onLayout={handleContainerLayout}>
      <View style={styles.header}>
        <Text style={styles.title}>Ball editor</Text>
        <Text style={styles.status}>{ownedSticker ? status : 'No sticker to place'}</Text>
      </View>

      <Pressable onPress={handleDone} style={styles.doneButton}>
        <Text style={styles.doneButtonText}>Done</Text>
      </Pressable>

      <View style={styles.basketball} onLayout={handleBallLayout}>
        <Basketball
          height={BALL_HEIGHT}
          renderSticker={renderSticker}
          stickers={otherPlacements}
          width={BALL_WIDTH}
        />
      </View>

      {ownedSticker && dragPosition ? (
        <View
          {...panResponder.panHandlers}
          style={{
            height: stickerSize,
            left: dragPosition.x - stickerSize / 2,
            position: 'absolute',
            top: dragPosition.y - stickerSize / 2,
            transform: [{ rotate: `${placementDetailsRef.current.rotation}deg` }],
            width: stickerSize,
          }}>
          <OGSticker height="100%" width="100%" />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  basketball: {
    bottom: -3,
    left: 0,
    position: 'absolute',
  },
  centered: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    flex: 1,
    justifyContent: 'center',
  },
  doneButton: {
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 8,
    marginHorizontal: 20,
    marginTop: 16,
    minHeight: 52,
    justifyContent: 'center',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  safeArea: {
    backgroundColor: '#F8FAFC',
    flex: 1,
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
