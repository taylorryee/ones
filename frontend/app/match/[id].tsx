import { isAxiosError } from 'axios';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useEffectEvent, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { api } from '@/api';
import { useContentInset, useContentSize } from '@/components/ScreenBorder';
import { SEPARATOR_HEIGHT, SeparatingLine } from '@/components/SeparatingLine';
import { FONT, INK, PAPER } from '@/constants/theme';
import { getCurrentUser, type UserProfile } from '@/services/auth';
import { botSubmit, getTestBotId } from '@/services/dev';
import { goAfterMatch, HOME, markMatchPlayed } from '@/services/matchFlow';
import { getActiveMatch, recordScore, startRematch } from '@/services/matches';

// The two halves of the result picker. Soft enough that the ink line and lettering stay the
// strongest marks on the screen.
const WIN_COLOR = '#9BD8A0';
const LOSS_COLOR = '#F2A1A1';
// The end screen's three sections, in the same soft tones.
const REMATCH_COLOR = '#F8C58C';
const END_COLOR = '#A9C8EE';
const SCORE_COLOR = '#F4DE8A';
// How often the end screen checks whether the opponent started a rematch.
const REMATCH_POLL_MS = 3000;

// Leaving a confirmed match happens once, whichever of Rematch, End or the opponent's rematch
// gets there first.
const continuedMatchIds = new Set<number>();

type Section = {
  accessibilityLabel: string;
  color: string;
  label: string;
  onPress: () => void;
  // A smaller line under the label, e.g. the Elo change.
  detail?: string;
};

type Match = {
  id: number;
  playerOne_id: number;
  playerTwo_id: number;
  winner_id: number | null;
  playerOne_score: number | null;
  playerTwo_score: number | null;
  playerOne_win_rating_change: number;
  playerTwo_win_rating_change: number;
  // Share of the normal Elo stakes: lower when the same two players keep playing each other.
  rating_percent: number;
  status: string;
  submitted_by_id: number | null;
  confirmed_by_id: number | null;
  awarded_player_sticker_id: number | null;
  sticker_outcome: 'unlocked' | 'leveled_up' | null;
  dispute_deadline: string | null;
};

export default function MatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const inset = useContentInset();
  // Dev only: the backend's test bot, so this screen can play the opponent's side for it.
  const [testBotId, setTestBotId] = useState<number | null>(null);

  useEffect(() => {
    // Fails quietly when the backend's dev routes are off; the bot buttons then never show.
    if (__DEV__) getTestBotId().then(setTestBotId).catch(() => {});
  }, []);

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

  // The score being typed on the end screen, as the player sees it: theirs first.
  const [scoreDraft, setScoreDraft] = useState<{ mine: string; theirs: string } | null>(null);

  // Goes on from a finished match to `next`, by way of the sticker screen when this player's
  // win unlocked or leveled up a sticker.
  function continueTo(next: string) {
    if (!match || !profile || continuedMatchIds.has(match.id)) return;
    continuedMatchIds.add(match.id);

    if (
      match.winner_id === profile.id &&
      match.sticker_outcome != null &&
      match.awarded_player_sticker_id != null
    ) {
      router.replace({
        pathname: '/sticker-reward',
        params: {
          next,
          outcome: match.sticker_outcome,
          playerStickerId: String(match.awarded_player_sticker_id),
        },
      });
    } else {
      goAfterMatch(next);
    }
  }

  // When the opponent taps Rematch first, this phone follows them into the new match.
  const followRematch = useEffectEvent(async () => {
    if (!match) return;
    try {
      const active = await getActiveMatch();
      if (active && active.id !== match.id) continueTo(`/match/${active.id}`);
    } catch {}
  });

  // Only from the end screens, so a player still tapping their result isn't pulled away.
  const isOnEndScreen =
    match != null &&
    profile != null &&
    (match.status === 'confirmed' ||
      match.status === 'disputed' ||
      (match.status === 'reported' && match.submitted_by_id === profile.id));
  useEffect(() => {
    if (!isOnEndScreen) return;
    const intervalId = setInterval(followRematch, REMATCH_POLL_MS);
    return () => clearInterval(intervalId);
  }, [isOnEndScreen]);

  async function rematch() {
    if (!match) return;
    try {
      setIsSubmitting(true);
      setSubmitError('');
      continueTo(`/match/${await startRematch(match.id)}`);
    } catch {
      setSubmitError("Couldn't start the rematch. Tap again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function endMatch() {
    markMatchPlayed();
    continueTo(HOME);
  }

  async function saveScore() {
    if (!match || !scoreDraft) return;
    const mine = Number.parseInt(scoreDraft.mine, 10);
    const theirs = Number.parseInt(scoreDraft.theirs, 10);
    if (Number.isNaN(mine) || Number.isNaN(theirs)) {
      setSubmitError('Enter both scores.');
      return;
    }
    const isPlayerOne = match.playerOne_id === profile?.id;
    try {
      setIsSubmitting(true);
      setSubmitError('');
      await recordScore(match.id, isPlayerOne ? mine : theirs, isPlayerOne ? theirs : mine);
      await refreshMatch();
      setScoreDraft(null);
    } catch (error) {
      const detail = isAxiosError(error) ? error.response?.data?.detail : undefined;
      setSubmitError(typeof detail === 'string' ? detail : "Couldn't save it. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

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

      // First to tap records the result; a second tap agrees with it or throws it out. The
      // offset lets the backend end the dispute window at this phone's midnight.
      const response = await api.post<Match>(`/matches/${match.id}/submit`, {
        winner_id: winnerId,
        tz_offset_minutes: new Date().getTimezoneOffset(),
      });

      setMatch(response.data);
    } catch {
      setSubmitError("Couldn't send it. Tap again.");
    } finally {
      setIsSubmitting(false);
    }
  }
//////////////////////////////////////////////////////////////////////////////////

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


  // Dev only: buttons that act as the test bot, when it is the opponent. Before anyone reports,
  // the bot can go first; after you report, it can agree or disagree, as a second phone would.
  // Leave it alone after you report to test the opponent who never opens the app.
  const isBotMatch =
    testBotId !== null &&
    match !== null &&
    (match.playerOne_id === testBotId || match.playerTwo_id === testBotId);

  async function runBotAction(action: () => Promise<void>) {
    try {
      setIsSubmitting(true);
      await action();
      await refreshMatch();
    } catch {
      setSubmitError('Bot action failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function renderBotControls() {
    if (!isBotMatch || !match || !profile) return null;
    const buttons: { label: string; action: () => Promise<void> }[] = [];
    if (match.status === 'pending') {
      buttons.push(
        { label: 'Bot says it won', action: () => botSubmit(match.id, true) },
        { label: 'Bot says it lost', action: () => botSubmit(match.id, false) }
      );
    } else if (match.status === 'reported' && match.submitted_by_id === profile.id) {
      const botWon = match.winner_id === testBotId;
      buttons.push(
        { label: 'Bot agrees', action: () => botSubmit(match.id, botWon) },
        { label: 'Bot disagrees', action: () => botSubmit(match.id, !botWon) }
      );
    }
    if (buttons.length === 0) return null;
    return (
      <View style={[styles.botControls, { top: inset.top + 8 }]}>
        {buttons.map((button) => (
          <Pressable
            disabled={isSubmitting}
            hitSlop={8}
            key={button.label}
            onPress={() => runBotAction(button.action)}>
            <Text style={styles.botControlText}>{button.label} (dev)</Text>
          </Pressable>
        ))}
      </View>
    );
  }

  function renderSections(sections: Section[]) {
    return <Sections disabled={isSubmitting} error={submitError} sections={sections} />;
  }

  // While the game is on, the whole frame is the result picker: tap the half that happened.
  function renderPicker(onResult: (didWin: boolean) => void) {
    return renderSections([
      { accessibilityLabel: 'I won', color: WIN_COLOR, label: 'Win', onPress: () => onResult(true) },
      {
        accessibilityLabel: 'I lost',
        color: LOSS_COLOR,
        label: 'Loss',
        onPress: () => onResult(false),
      },
    ]);
  }

  // Once the result is in: go again, finish, or note the points.
  function renderEndScreen(current: Match) {
    const isPlayerOne = current.playerOne_id === profile?.id;
    const myScore = isPlayerOne ? current.playerOne_score : current.playerTwo_score;
    const theirScore = isPlayerOne ? current.playerTwo_score : current.playerOne_score;
    const hasScore = myScore != null && theirScore != null;
    const elo =
      current.rating_percent === 0
        ? 'Unrated: too many games vs them this week'
        : `${confirmedRatingChange > 0 ? '+' : ''}${confirmedRatingChange} Elo` +
          (current.rating_percent < 100 ? ` (${current.rating_percent}%, rematch)` : '');

    return renderSections([
      {
        accessibilityLabel: 'Rematch',
        color: REMATCH_COLOR,
        label: 'Rematch',
        onPress: () => rematch(),
      },
      {
        accessibilityLabel: 'End',
        color: END_COLOR,
        detail: elo,
        label: 'End',
        onPress: () => endMatch(),
      },
      {
        accessibilityLabel: 'Record score',
        color: SCORE_COLOR,
        detail: hasScore ? `${myScore} – ${theirScore}` : undefined,
        label: 'Record score',
        onPress: () => {
          setSubmitError('');
          setScoreDraft({
            mine: hasScore ? String(myScore) : '',
            theirs: hasScore ? String(theirScore) : '',
          });
        },
      },
    ]);
  }

  // The other player tapped the opposite result, so it was undone. Nothing to score.
  function renderThrownOutScreen() {
    return renderSections([
      {
        accessibilityLabel: 'Rematch',
        color: REMATCH_COLOR,
        label: 'Rematch',
        onPress: () => rematch(),
      },
      {
        accessibilityLabel: 'End',
        color: END_COLOR,
        detail: "You didn't agree, result thrown out",
        label: 'End',
        onPress: () => endMatch(),
      },
    ]);
  }

  // Typed near the top, so the keyboard below never covers it.
  function renderScoreEntry() {
    if (!scoreDraft) return null;
    return (
      <View
        style={[
          styles.scoreEntry,
          { paddingLeft: inset.left, paddingRight: inset.right, paddingTop: inset.top + 24 },
        ]}>
        <Text style={styles.scoreTitle}>Record score</Text>
        <View style={styles.scoreRow}>
          <ScoreInput
            autoFocus
            label="You"
            onChange={(mine) => setScoreDraft({ ...scoreDraft, mine })}
            value={scoreDraft.mine}
          />
          <Text style={styles.scoreDash}>–</Text>
          <ScoreInput
            label="Them"
            onChange={(theirs) => setScoreDraft({ ...scoreDraft, theirs })}
            value={scoreDraft.theirs}
          />
        </View>
        {submitError !== '' && <Text style={styles.scoreError}>{submitError}</Text>}
        <View style={styles.scoreActions}>
          <Pressable disabled={isSubmitting} hitSlop={12} onPress={() => setScoreDraft(null)}>
            <Text style={styles.scoreAction}>Cancel</Text>
          </Pressable>
          <Pressable disabled={isSubmitting} hitSlop={12} onPress={saveScore}>
            <Text style={styles.scoreAction}>{isSubmitting ? 'Saving…' : 'Save'}</Text>
          </Pressable>
        </View>
      </View>
    );
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

  if (!isParticipant) {
    return (
      <View style={styles.centered}>
        <Text style={styles.subtitle}>{"This match isn't yours."}</Text>
      </View>
    );
  }

  // Your tap is still to come: the game is on, or the other player has reported and this tap
  // agrees with them or throws their result out.
  if (
    match.status === 'pending' ||
    (match.status === 'reported' && match.submitted_by_id !== profile.id)
  ) {
    return (
      <>
        {renderPicker(declareResult)}
        {renderBotControls()}
      </>
    );
  }

  if (match.status === 'disputed') {
    return renderThrownOutScreen();
  }

  // Reported by you, or confirmed.
  if (scoreDraft) {
    return renderScoreEntry();
  }
  return (
    <>
      {renderEndScreen(match)}
      {renderBotControls()}
    </>
  );
}

// The whole frame split into tappable colored sections, top to bottom, with a separating line
// between each. They fill edge to edge and the screen border masks them to its line.
function Sections({
  disabled,
  error,
  sections,
}: {
  disabled: boolean;
  error: string;
  sections: Section[];
}) {
  const content = useContentSize();
  const inset = useContentInset();
  // An equal share of the frame each, whatever the top and bottom insets, so every color
  // boundary sits under its line.
  const height = (content.height + inset.top + inset.bottom) / sections.length;
  const lineWidth = content.width + inset.left + inset.right;
  return (
    <View style={styles.picker}>
      {sections.map((section, index) => (
        <ResultSection
          disabled={disabled}
          key={section.label}
          section={section}
          style={{
            height,
            paddingTop: index === 0 ? inset.top : 0,
            paddingBottom: index === sections.length - 1 ? inset.bottom : 0,
          }}
        />
      ))}
      {/* Centred on each boundary: the line's wobble stays inside its stroke, so neither color
          shows past it. */}
      {sections.slice(1).map((section, index) => (
        <View
          key={section.label}
          pointerEvents="none"
          style={[styles.seam, { top: height * (index + 1) - SEPARATOR_HEIGHT / 2 }]}>
          <SeparatingLine width={lineWidth} />
        </View>
      ))}
      {error !== '' && (
        <Text pointerEvents="none" style={[styles.pickerError, { bottom: inset.bottom }]}>
          {error}
        </Text>
      )}
    </View>
  );
}

function ResultSection({
  disabled,
  section,
  style,
}: {
  disabled: boolean;
  section: Section;
  style: { height: number; paddingTop: number; paddingBottom: number };
}) {
  return (
    <Pressable
      accessibilityLabel={section.accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      onPress={section.onPress}
      style={({ pressed }) => [
        styles.half,
        { backgroundColor: section.color },
        style,
        (pressed || disabled) && styles.halfPressed,
      ]}>
      {/* Shrinks to one line, so a long label like "Record score" fits the width. */}
      <Text adjustsFontSizeToFit numberOfLines={1} style={styles.halfLabel}>
        {section.label}
      </Text>
      {section.detail && <Text style={styles.halfDetail}>{section.detail}</Text>}
    </Pressable>
  );
}

function ScoreInput({
  autoFocus,
  label,
  onChange,
  value,
}: {
  autoFocus?: boolean;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <View style={styles.scoreField}>
      <TextInput
        accessibilityLabel={`${label} score`}
        autoFocus={autoFocus}
        keyboardType="number-pad"
        maxLength={3}
        onChangeText={(text) => onChange(text.replace(/[^0-9]/g, ''))}
        placeholder="0"
        placeholderTextColor="#00000040"
        style={styles.scoreInput}
        value={value}
      />
      <Text style={styles.scoreLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  botControls: {
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 20,
    position: 'absolute',
  },
  botControlText: {
    color: INK,
    fontFamily: FONT,
    fontSize: 18,
    textDecorationLine: 'underline',
  },
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
    paddingHorizontal: 24,
  },
  halfDetail: {
    color: INK,
    fontFamily: FONT,
    fontSize: 28,
  },
  scoreEntry: {
    alignItems: 'center',
    backgroundColor: PAPER,
    flex: 1,
    gap: 24,
  },
  scoreTitle: {
    color: INK,
    fontFamily: FONT,
    fontSize: 48,
  },
  scoreRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
  },
  scoreField: {
    alignItems: 'center',
  },
  scoreInput: {
    color: INK,
    fontFamily: FONT,
    fontSize: 80,
    minWidth: 120,
    textAlign: 'center',
  },
  scoreLabel: {
    color: INK,
    fontFamily: FONT,
    fontSize: 22,
  },
  scoreDash: {
    color: INK,
    fontFamily: FONT,
    fontSize: 64,
  },
  scoreError: {
    color: INK,
    fontFamily: FONT,
    fontSize: 20,
    textAlign: 'center',
  },
  scoreActions: {
    flexDirection: 'row',
    gap: 48,
  },
  scoreAction: {
    color: INK,
    fontFamily: FONT,
    fontSize: 28,
    textDecorationLine: 'underline',
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
  centered: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    flex: 1,
    justifyContent: 'center',
  },
  subtitle: {
    color: '#4B5563',
    fontSize: 16,
    lineHeight: 24,
  },
});
