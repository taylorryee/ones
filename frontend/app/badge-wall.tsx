import { useFocusEffect } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { router } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StickerArt } from '@/components/StickerArt';
import { getArchetype } from '@/constants/archetypes';
import { getCurrentUser, type UserProfile } from '@/services/auth';
import { getStickerInventory, type OwnedSticker } from '@/services/stickers';

const NUM_COLUMNS = 2;
const NUM_ROWS = 3;
const GRID_PADDING = 20;
const CELL_GAP = 40;

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

const RATIO_BLOCK_HEIGHT = SCREEN_HEIGHT / 3;
const GRID_AREA_HEIGHT = SCREEN_HEIGHT - RATIO_BLOCK_HEIGHT;

const CELL_SIZE_FROM_WIDTH =
  (SCREEN_WIDTH - GRID_PADDING * 2 - CELL_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;
const CELL_SIZE_FROM_HEIGHT =
  (GRID_AREA_HEIGHT - GRID_PADDING * 2 - CELL_GAP * (NUM_ROWS - 1)) / NUM_ROWS;
const CELL_SIZE = Math.min(CELL_SIZE_FROM_WIDTH, CELL_SIZE_FROM_HEIGHT);

type GridItem = { key: string; sticker: OwnedSticker };

export default function BadgeWallScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stickers, setStickers] = useState<OwnedSticker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fontsLoaded, fontError] = useFonts({
    OneSan: require('../assets/oneSan.ttf'),
  });
  
  const [fontTest, fontTestError] = useFonts({
    OneSanTest: require('../assets/oneSanTest.ttf'),
  });

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      setIsLoading(true);

      Promise.all([getCurrentUser(), getStickerInventory()])
        .then(([user, inventory]) => {
          if (!isActive) {
            return;
          }
          setProfile(user);
          setStickers(inventory);
        })
        .catch(() => {
          if (isActive) {
            setStickers([]);
          }
        })
        .finally(() => {
          if (isActive) {
            setIsLoading(false);
          }
        });

      return () => {
        isActive = false;
      };
    }, [])
  );

  const data = useMemo<GridItem[]>(
    () => stickers.map((sticker, index) => ({ key: `${sticker.id}-${index}`, sticker })),
    [stickers]
  );

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        gestureState.dx > 20 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 80 && Math.abs(gestureState.dy) < 60) {
          router.back();
        }
      },
    })
  ).current;

  function handleStickerPress(sticker: OwnedSticker) {
    const archetype = getArchetype(sticker.sticker.slug);
    Alert.alert(sticker.sticker.name, archetype?.description ?? 'A basketball sticker.');
  }

  function renderItem({ item }: { item: GridItem }) {
    return (
      <Pressable onPress={() => handleStickerPress(item.sticker)} style={styles.cell}>
        <StickerArt slug={item.sticker.sticker.slug} />
      </Pressable>
    );
  }

  if (isLoading || !profile || (!fontsLoaded && !fontError)) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} {...panResponder.panHandlers}>
      <FlatList
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.gridContent}
        data={data}
        keyExtractor={(item) => item.key}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No stickers yet. Win a game to earn your first.</Text>
          </View>
        }
        ListHeaderComponent={
          <View style={styles.ratioBlock}>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.1}
              numberOfLines={1}
              style={styles.ratioText}>
              {/* {profile.wins}/{profile.losses} */}
              2/3
            </Text>
          </View>
        }
        numColumns={NUM_COLUMNS}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#F8FAFC',
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    flex: 1,
    justifyContent: 'center',
  },
  ratioBlock: {
    gap: 8,
    height: RATIO_BLOCK_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  ratioText: {
    color: '#111827',
    fontFamily: 'OneSanTest',
    fontSize: 200,
    maxWidth: '100%',
    textAlign: 'center',
  },
  ratioLabel: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  gridContent: {
    flexGrow: 1,
    paddingBottom: 40,
    paddingHorizontal: GRID_PADDING,
  },
  row: {
    gap: CELL_GAP,
    marginBottom: CELL_GAP,
  },
  cell: {
    height: CELL_SIZE,
    width: CELL_SIZE,
  },
  empty: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});
