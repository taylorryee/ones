import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Basketball } from '@/components/Basketball';
import { OGSticker } from '@/components/OGSticker';
import { getCurrentUser, logout, type UserProfile } from '@/services/auth';
import { type BallStickerPlacement, getStickerInventory } from '@/services/stickers';

function renderSticker(_placement: BallStickerPlacement) {
  return <OGSticker height="100%" width="100%" />;
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stickers, setStickers] = useState<BallStickerPlacement[]>([]);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  async function loadCurrentUser() {
    try {
      setIsLoading(true);
      const user = await getCurrentUser();
      setProfile(user);
    } catch {
      router.replace('/login');
    } finally {
      setIsLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      getStickerInventory()
        .then((inventory) => {
          if (!isActive) {
            return;
          }

          setStickers(
            inventory.flatMap((owned) =>
              owned.ball_placement
                ? [{ ...owned.ball_placement, sticker: owned.sticker }]
                : []
            )
          );
        })
        .catch(() => {
          if (isActive) {
            setStickers([]);
          }
        });

      return () => {
        isActive = false;
      };
    }, [])
  );

  async function handleLogout() {
    await logout();
    router.replace('/login');
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
        <Pressable onPress={() => router.push('/test-challenge')} style={styles.challengeButton}>
          <Text style={styles.challengeButtonText}>Challenge</Text>
        </Pressable>
        <Pressable onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </Pressable>
      </View>

      <View style={styles.header}>
        <Text style={styles.name}>{profile.name}</Text>
        <Text style={styles.rating}>Rating {profile.rating}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{profile.wins}</Text>
            <Text style={styles.statLabel}>Wins</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{profile.losses}</Text>
            <Text style={styles.statLabel}>Losses</Text>
          </View>
        </View>
      </View>

      <View pointerEvents="none" style={styles.basketball}>
        <Basketball
          height={250}
          renderSticker={renderSticker}
          stickers={stickers}
          width={300}
        />
      </View>
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
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  challengeButton: {
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  challengeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  logoutButton: {
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  logoutButtonText: {
    color: '#B91C1C',
    fontSize: 14,
    fontWeight: '800',
  },
  header: {
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  name: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '800',
  },
  rating: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  statBox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  statValue: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
  },
  basketball: {
    bottom: -3,
    left: 0,
    position: 'absolute',
  },
});
