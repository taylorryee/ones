// Which badges are on the badge wall, and moving them. No React Native imports, so Node can run the
// tests.

import type { OwnedSticker } from '@/services/stickers';

import { SHOWCASE_SLOTS } from './badgeWallLayout.ts';

// The badge in each slot, left to right; null where there's an opening.
export function showcaseSlots(badges: OwnedSticker[]) {
  return Array.from(
    { length: SHOWCASE_SLOTS },
    (_, slot) => badges.find((badge) => badge.showcase_slot === slot) ?? null
  );
}

// Puts `badge` in `slot`. A badge already on the wall trades places with whatever was there; one
// that wasn't takes the slot, and the badge it replaces goes back to the collection.
export function placeBadge(badges: OwnedSticker[], badge: OwnedSticker, slot: number) {
  return badges.map((owned) => {
    if (owned.id === badge.id) {
      return { ...owned, showcase_slot: slot };
    }
    return owned.showcase_slot === slot ? { ...owned, showcase_slot: badge.showcase_slot } : owned;
  });
}
