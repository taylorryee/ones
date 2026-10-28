// Fits a number of square badges into a box as a grid, as large as they can be. No React Native
// imports, so Node can run the tests.

import type { Size } from './skeleton.ts';

// Space between badges, as a share of a badge's size, so the spacing grows and shrinks with them.
export const BADGE_GAP = 0.15;

export type BadgeGrid = { columns: number; rows: number; badge: number; gap: number };

// Tries every column count and keeps the one that gives the biggest badges; on a tie, the fewer
// rows, so the grid reads as wide as the card. Sizes are floored to whole points so the grid never
// overflows the box from rounding.
export function fitBadgeGrid(count: number, box: Size, gapRatio = BADGE_GAP): BadgeGrid {
  if (count <= 0 || box.width <= 0 || box.height <= 0) {
    return { columns: 0, rows: 0, badge: 0, gap: 0 };
  }

  let best: BadgeGrid = { columns: 1, rows: count, badge: -1, gap: 0 };
  for (let columns = 1; columns <= count; columns++) {
    const rows = Math.ceil(count / columns);
    // Each line holds n badges and n - 1 gaps of gapRatio badges.
    const byWidth = box.width / (columns + (columns - 1) * gapRatio);
    const byHeight = box.height / (rows + (rows - 1) * gapRatio);
    const badge = Math.floor(Math.min(byWidth, byHeight));
    if (badge > best.badge) {
      best = { columns, rows, badge, gap: Math.floor(badge * gapRatio) };
    }
  }
  return best;
}
