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


// Dev only: every match you leave earns a badge, whatever the result, to test the reward
// animation. Set to false to get back the real rule (only a first win over someone).
export const ALWAYS_WIN_BADGE = __DEV__ && true;

// Awards you a random badge through the real award code; it stays in your inventory.
export async function awardTestBadge() {
  const response = await api.post<{ player_sticker_id: number; outcome: 'unlocked' | 'leveled_up' }>(
    '/dev/award-badge'
  );
  return response.data;
}
