import { api } from '@/api';

// When each of the signed-in player's confirmed matches was confirmed, newest first.
export async function getPlayedTimes() {
  const response = await api.get<string[]>('/matches/me/played');
  return response.data.map((time) => new Date(time));
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
