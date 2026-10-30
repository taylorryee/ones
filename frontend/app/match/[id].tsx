import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { api } from '@/api';
import { useContentInset, useContentSize } from '@/components/ScreenBorder';
import { SEPARATOR_HEIGHT, SeparatingLine } from '@/components/SeparatingLine';
import { FONT, INK } from '@/constants/theme';
import { getCurrentUser, type UserProfile } from '@/services/auth';

// The two halves of the result picker. Soft enough that the ink line and lettering stay the
// strongest marks on the screen.
const WIN_COLOR = '#9BD8A0';
const LOSS_COLOR = '#F2A1A1';

type Match = {
  id: number;
  playerOne_id: number;
  playerTwo_id: number;
  winner_id: number | null;
  playerOne_score: number | null;
  playerTwo_score: number | null;
  playerOne_win_rating_change: number;
  playerTwo_win_rating_change: number;
  status: string;
  submitted_by_id: number | null;
  confirmed_by_id: number | null;
  awarded_player_sticker_id: number | null;
  sticker_outcome: 'unlocked' | 'leveled_up' | null;
};

export default function MatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Dev only: /match/preview shows the Win/Loss picker without a match, for the badge wall's
  // test button. Taps there send nothing.
  const isPreview = __DEV__ && id === 'preview';
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const content = useContentSize();
  const inset = useContentInset();

/////////////////////////////////////////INTIAL MATCH SETUP//////////////////////////////////////////
  const loadMatch = useCallback(async () => { //intial loading of match
    if (isPreview) return;
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
  }, [id, isPreview]);
  ////////////////////////////////////////////////////////////////////////////////////////////////

  /////////////////////////////////MATCH POLLING///////////////////////////////////////////
  const refreshMatch = useCallback(async () => { 
    if (isPreview) return;
    try {
      const response = await api.get<Match>(`/matches/${id}`);
      setMatch(response.data);
    } catch {

    }
  }, [id, isPreview]);

  useEffect(() => {
    loadMatch();
  }, [loadMatch]);

  useEffect(() => { //polling for match updates
    const intervalId = setInterval(refreshMatch, 3000);

    return () => clearInterval(intervalId);
  }, [refreshMatch]);
/////////////////////////////////////////////////////////////////////////////////////////////

  const hasNavigatedOnConfirmRef = useRef(false);

  useEffect(() => {
    if (
      match?.status === 'confirmed' &&
      match.winner_id === profile?.id &&
      !hasNavigatedOnConfirmRef.current
    ) {
      hasNavigatedOnConfirmRef.current = true;

      if (match.sticker_outcome === 'unlocked' && match.awarded_player_sticker_id != null) {
        router.replace({
          pathname: '/ball-editor',
          params: { playerStickerId: String(match.awarded_player_sticker_id) },
        });
      } else {
        router.replace('/profile');
      }
    }
  }, [match, profile]);

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
      setSubmitError('');

      // Only the winner is reported; scores stay empty.
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
      setSubmitError("Couldn't send it. Tap again.");
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
  const isPlayerOne = match?.playerOne_id === profile?.id;
  const yourWinRatingChange = (isPlayerOne
    ? match?.playerOne_win_rating_change
    : match?.playerTwo_win_rating_change) ?? 0;
  const yourLossRatingChange = (isPlayerOne
    ? match?.playerTwo_win_rating_change
    : match?.playerOne_win_rating_change) ?? 0;
  const confirmedRatingChange =
    match?.winner_id === profile?.id ? yourWinRatingChange : -yourLossRatingChange;

  // While the game is on, the whole frame is the result picker: tap the half that happened.
  // The halves fill edge to edge and the screen border masks them to its line.
  function renderPicker(onResult: (didWin: boolean) => void) {
    // Exactly half the frame each, whatever the top and bottom insets, so the color boundary
    // sits under the line. Their outer edges run under the border, which masks them to its line.
    const half = (content.height + inset.top + inset.bottom) / 2;
    return (
      <View style={styles.picker}>
        <ResultHalf
          color={WIN_COLOR}
          disabled={isSubmitting}
          label="Win"
          onPress={() => onResult(true)}
          style={{ height: half, paddingTop: inset.top }}
        />
        <ResultHalf
          color={LOSS_COLOR}
          disabled={isSubmitting}
          label="Loss"
          onPress={() => onResult(false)}
          style={{ height: half, paddingBottom: inset.bottom }}
        />
        {/* Centred on the boundary: the line's wobble stays inside its stroke, so neither color
            shows past it. */}
        <View pointerEvents="none" style={[styles.seam, { top: half - SEPARATOR_HEIGHT / 2 }]}>
          <SeparatingLine width={content.width + inset.left + inset.right} />
        </View>
        {submitError !== '' && (
          <Text pointerEvents="none" style={[styles.pickerError, { bottom: inset.bottom }]}>
            {submitError}
          </Text>
        )}
      </View>
    );
  }

  if (isPreview) {
    return renderPicker((didWin) => setSubmitError(`Preview: ${didWin ? 'Win' : 'Loss'} tapped`));
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!match || !profile) {
    return (
      <View style={styles.centered}>
        <Text>Could not load match.</Text>
      </View>
    );
  }
//////////////////////////////////////////////////////////////////////////////

  if (match.status === 'pending' && isParticipant) {
    return renderPicker(declareResult);
  }

  return (
    <View
      style={[
        styles.safeArea,
        {
          paddingTop: inset.top,
          paddingRight: inset.right,
          paddingBottom: inset.bottom,
          paddingLeft: inset.left,
        },
      ]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoidingView}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled">
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

          {isParticipant && (
            <View style={styles.matchRow}>
              <Text style={styles.label}>Elo</Text>
              <Text style={styles.value}>Win +{yourWinRatingChange} / Lose -{yourLossRatingChange}</Text>
            </View>
          )}
        </View>

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
            <Text style={styles.subtitle}>Player One: {match.playerOne_score}</Text>
            <Text style={styles.subtitle}>Player Two: {match.playerTwo_score}</Text>

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
            {isParticipant && (
              <Text style={styles.subtitle}>Elo change: {confirmedRatingChange && confirmedRatingChange > 0 ? '+' : ''}{confirmedRatingChange}</Text>
            )}
          </View>
        )}

        <Pressable onPress={() => router.replace('/profile')} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back to Profile</Text>
        </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>

  );
}

function ResultHalf({
  color,
  disabled,
  label,
  onPress,
  style,
}: {
  color: string;
  disabled: boolean;
  label: string;
  onPress: () => void;
  style: { height: number; paddingTop?: number; paddingBottom?: number };
}) {
  return (
    <Pressable
      accessibilityLabel={`I ${label === 'Win' ? 'won' : 'lost'}`}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.half,
        { backgroundColor: color },
        style,
        (pressed || disabled) && styles.halfPressed,
      ]}>
      <Text style={styles.halfLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  picker: {
    flex: 1,
  },
  half: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  halfPressed: {
    opacity: 0.7,
  },
  halfLabel: {
    color: INK,
    fontFamily: FONT,
    fontSize: 96,
  },
  seam: {
    left: 0,
    position: 'absolute',
  },
  pickerError: {
    alignSelf: 'center',
    color: INK,
    fontFamily: FONT,
    fontSize: 22,
    position: 'absolute',
  },
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
    flexGrow: 1,
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
