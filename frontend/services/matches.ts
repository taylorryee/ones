import { api } from '@/api';

// When each of the signed-in player's confirmed matches was confirmed, newest first.
export async function getPlayedTimes() {
  const response = await api.get<string[]>('/matches/me/played');
  return response.data.map((time) => new Date(time));
}
