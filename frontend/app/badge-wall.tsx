import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
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
const GRID_PADDING = 20;
const CELL_GAP = 50;

const SCREEN_WIDTH = Dimensions.get('window').width;
const CELL_SIZE = (SCREEN_WIDTH - GRID_PADDING * 2 - CELL_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

type GridItem = { key: string; sticker: OwnedSticker };

export default function BadgeWallScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stickers, setStickers] = useState<OwnedSticker[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  if (isLoading || !profile) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
      </View>

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
            <Text style={styles.ratioText}>
              {profile.wins}/{profile.losses}
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
  topBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  backButton: {
    paddingVertical: 10,
  },
  backButtonText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '800',
  },
  ratioBlock: {
    alignItems: 'center',
    gap: 4,
    paddingBottom: 28,
    paddingTop: 16,
  },
  ratioText: {
    color: '#111827',
    fontSize: 44,
    fontWeight: '800',
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
