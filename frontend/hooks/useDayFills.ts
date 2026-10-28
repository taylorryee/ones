import { useCallback, useState } from 'react';

import { SCRIBBLE_KINDS, type ScribbleKind } from '@/components/scribble';

// A colored-in calendar day. `animate` stays true from fillDay until the scribble has finished
// drawing, so a day filled while its month is off screen scribbles in when it's next shown, and
// a finished one is drawn complete. `kind` is the scribble, kept so the day looks the same each
// time it's shown.
export type DayFill = { color: string; animate: boolean; kind: ScribbleKind };

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

  const finishFill = useCallback((date: Date) => {
    setFills((current) => {
      const key = dayKey(date);
      const fill = current[key];
      return fill?.animate ? { ...current, [key]: { ...fill, animate: false } } : current;
    });
  }, []);

  return { fills, fillDay, finishFill };
}
