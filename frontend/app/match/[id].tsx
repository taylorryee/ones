import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { api } from '@/api';
import { getCurrentUser, type UserProfile } from '@/services/auth';

type Match = {
  id: number;
  playerOne_id: number;
  playerTwo_id: number;
  winner_id: number | null;
  playerOne_score: number | null;
  playerTwo_score: number | null;
  status: string;
  submitted_by_id: number | null;
  confirmed_by_id: number | null;
};

export default function MatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);


/////////////////////////////////////////INTIAL MATCH SETUP//////////////////////////////////////////
  const loadMatch = useCallback(async () => { //intial loading of match
    try {
      setIsLoading(true);


      const [currentUser, matchResponse] = await Promise.all([
        getCurrentUser(),
        api.get<Match>(`/matches/${id}`),
      ]);

      setProfile(currentUser);
      setMatch(matchResponse.data);
    } catch {

    } finally {
      setIsLoading(false);
    }
  }, [id]);
  ////////////////////////////////////////////////////////////////////////////////////////////////

  /////////////////////////////////MATCH POLLING///////////////////////////////////////////
  const refreshMatch = useCallback(async () => { 
    try {
      const response = await api.get<Match>(`/matches/${id}`);
      setMatch(response.data);
    } catch {

    }
  }, [id]);

  useEffect(() => {
    loadMatch();
  }, [loadMatch]);

  useEffect(() => { //polling for match updates 
    const intervalId = setInterval(refreshMatch, 3000);

    return () => clearInterval(intervalId);
  }, [refreshMatch]);
/////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////RESULT SUBMISSION//////////////////////////////////////////
  async function declareResult(didWin: boolean) {
    if (!profile || !match) {
      return;
    }

    const opponentId =
      match.playerOne_id === profile.id ? match.playerTwo_id : match.playerOne_id;
    const winnerId = didWin ? profile.id : opponentId;

    try {
      setIsSubmitting(true);


      const response = await api.post<Match>(
        `/matches/${match.id}/submit`,
        {
          winner_id: winnerId,
          playerOne_score: null,
          playerTwo_score: null,
        },
        {
          params: {
            id: profile.id,
          },
        }
      );

      setMatch(response.data);
    } catch {

    } finally {
      setIsSubmitting(false);
    }
  }
//////////////////////////////////////////////////////////////////////////////////

  async function confirmResult() {
    if (!profile || !match) {
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await api.post<Match>(`/matches/${match.id}/confirm`, null, {
        params: {
          id: profile.id,
        },
      });

      setMatch(response.data);
    } catch {

    } finally {
      setIsSubmitting(false);
    }
  }

  /////////////////////////////////////////////////////////////EXTRA/////////////////////////////
  const isParticipant =
    profile != null &&
    match != null &&
    (match.playerOne_id === profile.id || match.playerTwo_id === profile.id);
  const canSubmit = isParticipant && match?.status === 'pending';

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  if (!match || !profile) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text>Could not load match.</Text>
      </SafeAreaView>
    );
  }
//////////////////////////////////////////////////////////////////////////////
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.matchCard}>
          <View style={styles.matchRow}>
            <Text style={styles.label}>Player One</Text>
            <Text style={styles.value}>#{match.playerOne_id}</Text>
          </View>
          
          <View style={styles.matchRow}>
            <Text style={styles.label}>Player Two</Text>
            <Text style={styles.value}>#{match.playerTwo_id}</Text>
          </View>
          
          <View style={styles.matchRow}>
            <Text style={styles.label}>Status</Text>
            <Text style={styles.statusValue}>{match.status}</Text>
          </View>
          
          <View style={styles.matchRow}>
            <Text style={styles.label}>Match ID</Text>
            <Text style={styles.statusValue}>{id}</Text>
          </View>
        </View>

        {/* match not submitted */}
        {match.status === 'pending' && (
          <View style={styles.actions}>
            <Pressable
              disabled={!canSubmit || isSubmitting}
              onPress={() => declareResult(true)}
              style={[styles.winButton, (!canSubmit || isSubmitting) && styles.disabledButton]}>
              <Text style={styles.winButtonText}>{isSubmitting ? 'Submitting...' : 'I Won'}</Text>
            </Pressable>

            <Pressable 
              disabled={!canSubmit || isSubmitting}
              onPress={() => declareResult(false)}
              style={[styles.lossButton, (!canSubmit || isSubmitting) && styles.disabledButton]}>
              <Text style={styles.lossButtonText}>I Lost</Text>
            </Pressable>
          </View>
        )}

        {/* waiting for confirmation */}
        {match.status === 'submitted' && match.submitted_by_id === profile.id && (
          <View style={styles.matchCard}>
            <Text style={styles.title}>Waiting for confirmation</Text>
            <Text style={styles.subtitle}>The other player needs to confirm your result.</Text>
          </View>
        )}

        {/* confirmation page */}
        {match.status === 'submitted' && match.submitted_by_id !== profile.id && (
          <View style={styles.actions}>
            <Text style={styles.title}>Confirm result?</Text>
            <Text style={styles.subtitle}>The other player submitted winner #{match.winner_id}.</Text>

            <Pressable
              disabled={isSubmitting}
              onPress={confirmResult}
              style={[styles.winButton, isSubmitting && styles.disabledButton]}>
              <Text style={styles.winButtonText}>{isSubmitting ? 'Confirming...' : 'Confirm'}</Text>
            </Pressable>

            <Pressable style={styles.lossButton}>
              <Text style={styles.lossButtonText}>Dispute</Text>
            </Pressable>
          </View>
        )}

        {/* final result page */}
        {match.status === 'confirmed' && (
          <View style={styles.matchCard}>
            <Text style={styles.title}>Match complete</Text>
            <Text style={styles.subtitle}>Winner: #{match.winner_id}</Text>
          </View>
        )}

        <Pressable onPress={() => router.replace('/profile')} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back to Profile</Text>
        </Pressable>
      </View>
    </SafeAreaView>

  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centered: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    flex: 1,
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    gap: 22,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    gap: 8,
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
  matchCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  matchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '700',
  },
  value: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
  },
  statusValue: {
    color: '#0F766E',
    fontSize: 16,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  message: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  actions: {
    gap: 12,
  },
  winButton: {
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 8,
    minHeight: 56,
    justifyContent: 'center',
  },
  winButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  lossButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#B91C1C',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 56,
    justifyContent: 'center',
  },
  lossButtonText: {
    color: '#B91C1C',
    fontSize: 18,
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.5,
  },
  backButton: {
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  backButtonText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
  },
});
