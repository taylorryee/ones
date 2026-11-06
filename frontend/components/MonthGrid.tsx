import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import { fitMonthGrid, monthShape } from '@/components/badgeWallLayout';
import { dayGradient } from '@/components/dayColors';
import { buildBoxPaths, DayBox } from '@/components/DayBox';
import { FONT, INK } from '@/constants/theme';
import { dayKey, type DayFill } from '@/hooks/useDayFills';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// One month of day boxes, Sunday first, scaled to the largest size that fits `width` × `height`.
// `month` is 0-based, like Date. Boxes are sized for a six-row month so they keep one size, but the
// grid is only as tall as this month's rows, so centering it leaves even space above and below.
// `fills` are the colored-in days from useDayFills. Days with a game are drawn in that day's gradient,
// moved by `flow`. Only draws: MonthPager takes the taps, so they
// can't be mistaken for swipes, and finds the day with dayAt, which must match this layout. Memoized
// so that changing the shown month doesn't redraw the months that didn't change.
export const MonthGrid = memo(function MonthGrid({
  year,
  month,
  width,
  height,
  fills,
  flow,
  onFillDrawn,
}: {
  year: number;
  month: number;
  width: number;
  height: number;
  fills?: Record<string, DayFill>;
  flow: SharedValue<number>;
  onFillDrawn?: (date: Date) => void;
}) {
  const { days, firstWeekday, rows } = monthShape(year, month);
  const fit = fitMonthGrid(width, height, rows);
  // Every box is the same size, so the three outlines are fitted once for the whole month.
  const boxPaths = buildBoxPaths(fit.box);
  const todayKey = dayKey(new Date());

  return (
    <View style={[styles.grid, { gap: fit.gap, height: fit.height, width: fit.width }]}>
      {WEEKDAYS.map((label, index) => (
        // Sized to the boxes, so it ignores the system text size like the boxes do.
        <Text
          allowFontScaling={false}
          key={`weekday-${index}`}
          style={[
            styles.weekday,
            {
              fontSize: fit.labelSize,
              height: fit.labelHeight,
              lineHeight: fit.labelHeight,
              width: fit.box,
            },
          ]}>
          {label}
        </Text>
      ))}
      {Array.from({ length: firstWeekday }, (_, index) => (
        <View key={`blank-${index}`} style={{ width: fit.box }} />
      ))}
      {Array.from({ length: days }, (_, index) => (
        <DayBox
          day={index + 1}
          gradient={
            fills?.[dayKey(new Date(year, month, index + 1))]?.played
              ? { colors: dayGradient(new Date(year, month, index + 1)), flow }
              : undefined
          }
          fill={fills?.[dayKey(new Date(year, month, index + 1))]}
          isToday={dayKey(new Date(year, month, index + 1)) === todayKey}
          key={index + 1}
          onFillDrawn={(day) => onFillDrawn?.(new Date(year, month, day))}
          paths={boxPaths}
          size={fit.box}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  grid: {
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  weekday: {
    color: INK,
    fontFamily: FONT,
    textAlign: 'center',
  },
});
