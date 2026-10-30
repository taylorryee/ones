import { api } from '@/api';

// Shown as ONES <chapter>:<verse>.
export type Quote = {
  chapter: number;
  verse: number;
  text: string;
  author: string;
};

export type PlayerStats = {
  wins: number;
  losses: number;
  // Positive for a run of wins, negative for a run of losses, 0 before the first match.
  streak: number;
  week_wins: number;
  week_losses: number;
};

export type BadgeWallContent = {
  quote: Quote;
  stats: PlayerStats;
  // Every verse in order, for the book the quote card opens.
  verses: Quote[];
};

// Sends the local date so the quote changes at the player's midnight.
export async function getBadgeWallContent() {
  const now = new Date();
  const day = [now.getFullYear(), now.getMonth() + 1, now.getDate()]
    .map((part) => String(part).padStart(2, '0'))
    .join('-');
  const response = await api.get<BadgeWallContent>('/cards/badge-wall', { params: { day } });
  return response.data;
}
