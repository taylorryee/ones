// The fill of a day once a game was played on it. No React Native imports, so Node can run the tests.

import type { ScribbleKind } from './scribble.ts';
import type { DayFill } from '@/hooks/useDayFills';

// A day already colored in keeps that scribble `under` the new one, which draws in over it. A day
// that already has a game stays as it is, so a second game doesn't draw it in again. `animate`
// draws in a day that was empty; without it, an empty day shows already filled.
export function playedFill(
  previous: DayFill | undefined,
  color: string,
  kind: ScribbleKind,
  animate: boolean
): DayFill {
  if (previous?.played) {
    return previous;
  }
  return {
    color,
    kind,
    animate: animate || previous !== undefined,
    played: true,
    under: previous && { color: previous.color, kind: previous.kind },
  };
}
