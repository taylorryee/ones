import { useCallback, useState } from 'react';

import { playedFill } from '@/components/playedFill';
import { SCRIBBLE_KINDS, type ScribbleKind } from '@/components/scribble';

// A colored-in calendar day. `animate` stays true from fillDay until the scribble has finished
// drawing, so a day filled while its month is off screen scribbles in when it's next shown, and
// a finished one is drawn complete. `kind` is the scribble, kept so the day looks the same each
// time it's shown. `played` days are drawn in their gradient instead of `color`. `under` is the
// scribble a played day is drawing in over, dropped once it's covered.
export type DayFill = {
  color: string;
  animate: boolean;
  kind: ScribbleKind;
  played?: boolean;
  under?: { color: string; kind: ScribbleKind };
};

// The day in the phone's time zone, e.g. '2026-10-27'.
export function dayKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

// Which calendar days are colored in. Pass `fills` and `finishFill` to MonthPager, then call
// `fillDay(date, color)` to scribble a day in with a randomly picked kind of scribble, or with
// `animate` false to show it already filled (e.g. days loaded from the server).
export function useDayFills() {
  const [fills, setFills] = useState<Record<string, DayFill>>({});

  const fillDay = useCallback((date: Date, color: string, animate = true) => {
    const kind = SCRIBBLE_KINDS[Math.floor(Math.random() * SCRIBBLE_KINDS.length)];
    setFills((current) => ({ ...current, [dayKey(date)]: { color, animate, kind } }));
  }, []);

  // Shows each date already filled in the color `colorOf` gives it, leaving days that are filled alone so their scribble keeps
  // its look when this runs again (e.g. each time the screen is shown).
  const fillDaysIfEmpty = useCallback((dates: Date[], colorOf: (date: Date) => string) => {
    setFills((current) => {
      const next = { ...current };
      for (const date of dates) {
        const key = dayKey(date);
        if (!next[key]) {
          const kind = SCRIBBLE_KINDS[Math.floor(Math.random() * SCRIBBLE_KINDS.length)];
          next[key] = { color: colorOf(date), animate: false, kind };
        }
      }
      return next;
    });
  }, []);

  // Marks each date as having a game, see playedFill. `animate` also draws in the empty ones.
  const fillPlayedDays = useCallback(
    (dates: Date[], colorOf: (date: Date) => string, animate = false) => {
      setFills((current) => {
        const next = { ...current };
        for (const date of dates) {
          const key = dayKey(date);
          const kind = SCRIBBLE_KINDS[Math.floor(Math.random() * SCRIBBLE_KINDS.length)];
          next[key] = playedFill(next[key], colorOf(date), kind, animate);
        }
        return next;
      });
    },
    []
  );

  const finishFill = useCallback((date: Date) => {
    setFills((current) => {
      const key = dayKey(date);
      const fill = current[key];
      return fill?.animate
        ? { ...current, [key]: { ...fill, animate: false, under: undefined } }
        : current;
    });
  }, []);

  return { fills, fillDay, fillDaysIfEmpty, fillPlayedDays, finishFill };
}
