import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fitMonthGrid } from '@/components/badgeWallLayout';
import { buildBoxPaths, DayBox } from '@/components/DayBox';
import { FONT, INK } from '@/constants/theme';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// One month of day boxes, Sunday first, scaled to the largest size that fits `width` × `height`.
// `month` is 0-based, like Date. Boxes are sized for a six-row month so they keep one size, but the
// grid is only as tall as this month's rows, so centering it leaves even space above and below.
export function MonthGrid({
  year,
  month,
  width,
  height,
  onPressDay,
}: {
  year: number;
  month: number;
  width: number;
  height: number;
  onPressDay: (day: number) => void;
}) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();

  const rows = Math.ceil((firstWeekday + daysInMonth) / 7);
  const fit = fitMonthGrid(width, height, rows);
  // Every box is the same size, so the three outlines are fitted once for the whole month.
  const boxPaths = useMemo(() => buildBoxPaths(fit.box), [fit.box]);

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
      {Array.from({ length: daysInMonth }, (_, index) => (
        <DayBox
          day={index + 1}
          // Each day also takes taps on its half of the gaps around it.
          hitSlop={fit.gap / 2}
          key={index + 1}
          onPress={onPressDay}
          paths={boxPaths}
          size={fit.box}
        />
      ))}
    </View>
  );
}

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
