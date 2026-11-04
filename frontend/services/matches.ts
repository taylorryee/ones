import { api } from '@/api';

// When each of the signed-in player's confirmed matches was confirmed, newest first.
export async function getPlayedTimes() {
  const response = await api.get<string[]>('/matches/me/played');
  return response.data.map((time) => new Date(time));
}

// One of the signed-in player's played matches. rating_change is their own Elo change (0 when
// the result was disputed and thrown out).
export type PlayedGame = {
  played_at: Date;
  opponent_name: string;
  you_won: boolean;
  rating_change: number;
  status: 'reported' | 'confirmed' | 'disputed';
};

// Every played match, newest first, for the stats of a day tapped on the calendar.
export async function getPlayedGames(): Promise<PlayedGame[]> {
  const response = await api.get<(Omit<PlayedGame, 'played_at'> & { played_at: string })[]>(
    '/matches/me/games'
  );
  return response.data.map((game) => ({ ...game, played_at: new Date(game.played_at) }));
}

// Starts a match against the player whose QR code was scanned. Returns the new match's id.
export async function createChallenge(opponentQr: string) {
  const response = await api.post<{ id: number }>('/matches/challenge', { opp_qr: opponentQr });
  return response.data.id;
}

// The signed-in player's pending or submitted match, if they have one.
export async function getActiveMatch() {
  const response = await api.get<{ id: number } | null>('/matches/me/active');
  return response.data;
}

// A new match against the same opponent once a match is confirmed. If the opponent already
// tapped Rematch, this returns that match. Returns the match's id.
export async function startRematch(matchId: number) {
  const response = await api.post<{ id: number }>(`/matches/${matchId}/rematch`);
  return response.data.id;
}

// The points, after the result is confirmed. The winner needs the higher score.
export async function recordScore(matchId: number, playerOneScore: number, playerTwoScore: number) {
  await api.post(`/matches/${matchId}/score`, {
    playerOne_score: playerOneScore,
    playerTwo_score: playerTwoScore,
  });
}

// A result the opponent reported that you haven't answered, while it can still be disputed.
export type ResultToAnswer = {
  id: number;
  opponent_name: string;
  you_won: boolean;
  dispute_deadline: string;
};

export async function getResultsToAnswer() {
  const response = await api.get<ResultToAnswer[]>('/matches/me/to-answer');
  return response.data;
}

// Agrees with a result the opponent reported. Returns the match, so a win's sticker can be shown.
export async function agreeWithResult(matchId: number) {
  const response = await api.post<{
    awarded_player_sticker_id: number | null;
    sticker_outcome: 'unlocked' | 'leveled_up' | null;
  }>(`/matches/${matchId}/confirm`);
  return response.data;
}

// Throws out a result the opponent reported: Elo, the win and any sticker are taken back.
export async function disputeResult(matchId: number) {
  await api.post(`/matches/${matchId}/dispute`);
}
