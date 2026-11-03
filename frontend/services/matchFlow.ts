import { router } from 'expo-router';

// Where the app goes after a confirmed match: the badge wall, or the next match on a rematch.
export const HOME = '/badge-wall';

// Set when the player ends a match, read once by the badge wall to scribble in today.
// Module state, not a route param, so it survives however the badge wall is reached.
let matchJustPlayed = false;

export function markMatchPlayed() {
  matchJustPlayed = true;
}

export function consumeMatchPlayed() {
  const played = matchJustPlayed;
  matchJustPlayed = false;
  return played;
}

// Home goes back down the stack to the badge wall (or replaces this screen with it if it isn't
// there), so finished match screens don't pile up. Anything else replaces this screen.
export function goAfterMatch(next: string) {
  if (next === HOME) {
    router.dismissTo(HOME);
  } else {
    router.replace(next as never);
  }
}
