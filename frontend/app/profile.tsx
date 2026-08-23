import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { api } from '@/api';
import { getCurrentUser, logout, type UserProfile } from '@/services/auth';

const qrPattern = [
  [1, 1, 1, 0, 1, 0, 1, 1, 1],
  [1, 0, 1, 0, 0, 1, 1, 0, 1],
  [1, 1, 1, 1, 0, 1, 1, 1, 1],
  [0, 0, 1, 0, 1, 0, 0, 1, 0],
  [1, 0, 0, 1, 1, 1, 0, 0, 1],
  [0, 1, 1, 0, 1, 0, 1, 1, 0],
  [1, 1, 1, 0, 0, 1, 1, 1, 1],
  [1, 0, 1, 1, 0, 0, 1, 0, 1],
  [1, 1, 1, 0, 1, 1, 1, 1, 1],
];

export default function ProfileScreen() {
  const scrollViewRef = useRef<ScrollView>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [opponentQr, setOpponentQr] = useState('');
  const [matchMessage, setMatchMessage] = useState('');
  const [isCreatingMatch, setIsCreatingMatch] = useState(false);

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

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  async function handleCreateMatch() {
    if (!opponentQr.trim()) {
      setMatchMessage('Enter an opponent QR code.');
      return;
    }

    try {
      setIsCreatingMatch(true);
      setMatchMessage('');

      const response = await api.post('/matches/challenge', {
        opp_qr: opponentQr.trim(),
      });

      setMatchMessage(`Created match #${response.data.id}`);
      setOpponentQr('');
      router.push({
        pathname: '/match/[id]',
        params: {
          id: String(response.data.id),
        },
      });
    } catch {
      setMatchMessage('Could not create match.');
    } finally {
      setIsCreatingMatch(false);
    }
  }

  function scrollToMatchInput() {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 250);
  }

  if (isLoading || !profile) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  const totalMatches = profile.wins + profile.losses;
  const winRate = totalMatches === 0 ? '0%' : `${Math.round((profile.wins / totalMatches) * 100)}%`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoidingView}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.eyebrow}>ONES balls PROFILE</Text>
            <Text style={styles.title}>Ready for your next match?</Text>
            <Text style={styles.subtitle}>Scan this code, start a game, and build your rank.</Text>
          </View>

          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{profile.name.charAt(0).toUpperCase()}</Text>
            </View>

            <View style={styles.profileInfo}>
              <Text style={styles.name}>{profile.name}</Text>
              <Text style={styles.rating}>Rating {profile.rating}</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{profile.wins}</Text>
              <Text style={styles.statLabel}>Wins</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{profile.losses}</Text>
              <Text style={styles.statLabel}>Losses</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{winRate}</Text>
              <Text style={styles.statLabel}>Win Rate</Text>
            </View>
          </View>

          <View style={styles.qrCard}>
            <Text style={styles.sectionTitle}>Your QR Code</Text>
            <Text style={styles.sectionText}>Let another player scan this to challenge you.</Text>

            <View style={styles.qrCode}>
              {qrPattern.map((row, rowIndex) => (
                <View key={`row-${rowIndex}`} style={styles.qrRow}>
                  {row.map((cell, cellIndex) => (
                    <View
                      key={`cell-${rowIndex}-${cellIndex}`}
                      style={[styles.qrCell, cell === 1 && styles.qrCellFilled]}
                    />
                  ))}
                </View>
              ))}
            </View>

            <Text style={styles.qrValue}>{profile.qr_code}</Text>
          </View>

          <View style={styles.testCard}>
            <Text style={styles.sectionTitle}>Test Create Match</Text>
            <Text style={styles.sectionText}>Paste another player&apos;s QR code to test challenge creation.</Text>

            <TextInput
              autoCapitalize="none"
              onChangeText={setOpponentQr}
              onFocus={scrollToMatchInput}
              placeholder="Opponent QR code"
              style={styles.input}
              value={opponentQr}
            />

            {matchMessage ? <Text style={styles.testMessage}>{matchMessage}</Text> : null}

            <Pressable
              disabled={isCreatingMatch}
              onPress={handleCreateMatch}
              style={[styles.primaryButton, isCreatingMatch && styles.disabledButton]}>
              <Text style={styles.primaryButtonText}>
                {isCreatingMatch ? 'Creating...' : 'Create Test Match'}
              </Text>
            </Pressable>
          </View>

          <Pressable onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutButtonText}>Log Out</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    flex: 1,
    justifyContent: 'center',
  },
  container: {
    gap: 20,
    padding: 20,
  },
  header: {
    gap: 8,
    paddingTop: 12,
  },
  eyebrow: {
    color: '#0F766E',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
  },
  title: {
    color: '#111827',
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
  },
  subtitle: {
    color: '#4B5563',
    fontSize: 16,
    lineHeight: 24,
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 16,
    padding: 18,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 32,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: '#111827',
    fontSize: 24,
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
  },
  statBox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    padding: 14,
  },
  statValue: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '700',
  },
  qrCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 20,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '800',
  },
  sectionText: {
    color: '#6B7280',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  qrCode: {
    backgroundColor: '#FFFFFF',
    borderColor: '#111827',
    borderRadius: 8,
    borderWidth: 2,
    gap: 4,
    marginTop: 4,
    padding: 14,
  },
  qrRow: {
    flexDirection: 'row',
    gap: 4,
  },
  qrCell: {
    backgroundColor: '#FFFFFF',
    height: 14,
    width: 14,
  },
  qrCellFilled: {
    backgroundColor: '#111827',
  },
  qrValue: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  testCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 20,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D1D5DB',
    borderRadius: 8,
    borderWidth: 1,
    color: '#111827',
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  testMessage: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 8,
    minHeight: 52,
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.6,
  },
  logoutButton: {
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  logoutButtonText: {
    color: '#B91C1C',
    fontSize: 16,
    fontWeight: '800',
  },
});
