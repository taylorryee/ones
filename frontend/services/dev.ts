import { api } from '@/api';

// Dev only: a test bot to play matches against on one phone. The backend serves these only
// when ENABLE_DEV_ROUTES=1.

export async function getTestBotId() {
  const response = await api.get<{ id: number }>('/dev/test-bot');
  return response.data.id;
}

// Clears any unfinished match with the bot. Returns its QR code, to scan like a real player's.
export async function resetTestBot() {
  const response = await api.post<{ id: number; qr_code: string }>('/dev/test-bot/reset');
  return response.data.qr_code;
}

// The bot scans you; the Play screen picks the match up as if a real player had.
export async function botScansMe() {
  await api.post('/dev/bot-scans-me');
}

export async function botSubmit(matchId: number, botWon: boolean) {
  await api.post(`/dev/test-match/${matchId}/bot-submit`, { bot_won: botWon });
}

