import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { api } from '@/api';

export default function TestChallengeScreen() {
  const [opponentQr, setOpponentQr] = useState('');
  const [matchMessage, setMatchMessage] = useState('');
  const [isCreatingMatch, setIsCreatingMatch] = useState(false);

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoidingView}>
        <View style={styles.container}>
          <Pressable onPress={() => router.push('/profile')} style={styles.backButton}>
            <Text style={styles.backButtonText}>Back to Profile</Text>
          </Pressable>

          <View style={styles.testCard}>
            <Text style={styles.sectionTitle}>Test Create Match</Text>
            <Text style={styles.sectionText}>Paste another player&apos;s QR code to test challenge creation.</Text>

            <TextInput
              autoCapitalize="none"
              onChangeText={setOpponentQr}
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
        </View>
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
  container: {
    gap: 20,
    padding: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },
  backButtonText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '800',
  },
  testCard: {
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
});
