import { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  StyleSheet,
  Text,
  View,
  type PanResponderGestureState,
} from 'react-native';

import { MonthGrid } from '@/components/MonthGrid';
import type { Size } from '@/components/skeleton';
import { FONT, INK, PAPER } from '@/constants/theme';
import type { DayFill } from '@/hooks/useDayFills';

// A swipe further than this share of a month, or faster than this (pt per ms), moves one month;
// a shorter, slower one springs back. Either way the month settles in SNAP_DURATION.
const SWIPE_DISTANCE = 0.2;
const SWIPE_VELOCITY = 0.3;
const SNAP_DURATION = 300;
// After landing on another month its name fades in, stays, then fades out over the grid.
const NAME_FADE_IN = 480;
const NAME_HOLD = 1050;
const NAME_FADE_OUT = 900;
// Name size as a share of the calendar height; long names shrink to fit the width.
const NAME_SCALE = 0.2;
// Size of the games-played line under the name, as a share of the calendar height.
const PLAYED_SCALE = 0.08;

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// The calendar, opening on `year`/`month` (0-based, like Date). Swiping right shows the month
// before, swiping left comes back, never past `month`. Each month takes a whole frame width
// (`pitch`) and starts `inset` into it, so months slide in and out from under the border. Only the
// shown month and its neighbours are mounted. `playedTimes` are the player's confirmed games,
// counted under the month's name; null while loading, which leaves the count out. `fills` and
// `onFillDrawn` come from useDayFills.
export function MonthPager({
  year,
  month,
  size,
  inset,
  pitch,
  playedTimes,
  fills,
  onPressDay,
  onFillDrawn,
}: {
  year: number;
  month: number;
  size: Size;
  inset: number;
  pitch: number;
  playedTimes: Date[] | null;
  fills?: Record<string, DayFill>;
  onPressDay: (date: Date) => void;
  onFillDrawn?: (date: Date) => void;
}) {
  // Months from `month`: 0 is that month, -1 the one before it.
  const [position, setPosition] = useState(0);
  // State rather than a ref so render never reads a ref.
  const [offset] = useState(() => new Animated.Value(0));
  const [nameOpacity] = useState(() => new Animated.Value(0));

  // Also puts the months back in place when the size changes.
  useEffect(() => {
    offset.setValue(-position * pitch);
  }, [offset, pitch, position]);

  // Claims horizontal drags and keeps them until the finger lifts.
  const panResponder = useMemo(() => {
    // One month back, and one forward unless this is already the latest month.
    const latest = Math.min(position + 1, 0);
    const min = -latest * pitch;
    const max = -(position - 1) * pitch;
    // Where the months were when the finger landed; may be part way through a snap.
    let start = -position * pitch;

    function settle(gesture: PanResponderGestureState) {
      const moved = clamp(start + gesture.dx, min, max);
      let target = Math.round(-moved / pitch);
      if (gesture.dx < -pitch * SWIPE_DISTANCE || gesture.vx < -SWIPE_VELOCITY) {
        target = position + 1;
      } else if (gesture.dx > pitch * SWIPE_DISTANCE || gesture.vx > SWIPE_VELOCITY) {
        target = position - 1;
      }
      target = clamp(target, position - 1, latest);
      Animated.timing(offset, {
        duration: SNAP_DURATION,
        easing: Easing.out(Easing.cubic),
        toValue: -target * pitch,
        useNativeDriver: true,
      }).start(({ finished }) => {
        // Interrupted only by another drag, which settles the months itself.
        if (!finished) {
          return;
        }
        setPosition(target);
        if (target !== position) {
          // The hold is the fade-out's delay rather than Animated.delay, so every step runs on
          // nameOpacity and stopping it in the next swipe cancels the whole sequence. A separate
          // delay would keep running and its fade-out would cut short the next month's name.
          Animated.sequence([
            Animated.timing(nameOpacity, {
              duration: NAME_FADE_IN,
              toValue: 1,
              useNativeDriver: true,
            }),
            Animated.timing(nameOpacity, {
              delay: NAME_HOLD,
              duration: NAME_FADE_OUT,
              toValue: 0,
              useNativeDriver: true,
            }),
          ]).start();
        }
      });
    }

    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderGrant: () => {
        // A new swipe clears the last month's name straight away.
        nameOpacity.stopAnimation();
        nameOpacity.setValue(0);
        offset.stopAnimation((value) => {
          start = value;
        });
      },
      onPanResponderMove: (_, gesture) => {
        offset.setValue(clamp(start + gesture.dx, min, max));
      },
      onPanResponderRelease: (_, gesture) => settle(gesture),
      onPanResponderTerminate: (_, gesture) => settle(gesture),
      onPanResponderTerminationRequest: () => false,
    });
  }, [nameOpacity, offset, pitch, position]);

  const current = new Date(year, month + position, 1);
  // The year is only named for months outside the latest month's year.
  const name =
    current.getFullYear() === year
      ? MONTHS[current.getMonth()]
      : `${MONTHS[current.getMonth()]} ${current.getFullYear()}`;
  // Counted in the phone's time zone, so a game late on the 31st stays in its month.
  const played = playedTimes?.filter(
    (time) =>
      time.getFullYear() === current.getFullYear() && time.getMonth() === current.getMonth()
  ).length;
  const shown = position < 0 ? [position - 1, position, position + 1] : [position - 1, position];

  return (
    <View {...panResponder.panHandlers} style={{ height: size.height, width: pitch }}>
      {shown.map((slot) => {
        // Day 1, so stepping back from e.g. March 31st can't overflow into the wrong month.
        const first = new Date(year, month + slot, 1);
        const shownYear = first.getFullYear();
        const shownMonth = first.getMonth();
        return (
          // Keyed by slot, so the shown month stays mounted when a neighbour becomes current.
          <Animated.View
            key={slot}
            style={[
              styles.month,
              {
                height: size.height,
                left: inset,
                transform: [{ translateX: Animated.add(offset, slot * pitch) }],
                width: size.width,
              },
            ]}>
            <MonthGrid
              fills={fills}
              height={size.height}
              month={shownMonth}
              onFillDrawn={(day) => onFillDrawn?.(new Date(shownYear, shownMonth, day))}
              onPressDay={(day) => onPressDay(new Date(shownYear, shownMonth, day))}
              width={size.width}
              year={shownYear}
            />
          </Animated.View>
        );
      })}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.name,
          { height: size.height, left: inset, opacity: nameOpacity, width: size.width },
        ]}>
        {/* Sized to the calendar, so it ignores the system text size like the boxes do. */}
        <Text
          adjustsFontSizeToFit
          allowFontScaling={false}
          numberOfLines={1}
          style={[styles.nameText, { fontSize: size.height * NAME_SCALE }]}>
          {name}
        </Text>
        {played === undefined ? null : (
          <Text
            adjustsFontSizeToFit
            allowFontScaling={false}
            numberOfLines={1}
            style={[styles.nameText, { fontSize: size.height * PLAYED_SCALE }]}>
            {`You hooped ${played} ${played === 1 ? 'time' : 'times'} this month`}
          </Text>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  month: {
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
  },
  // Opaque, so the grid is fully hidden while the name shows.
  name: {
    alignItems: 'center',
    backgroundColor: PAPER,
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
  },
  nameText: {
    color: INK,
    fontFamily: FONT,
    textAlign: 'center',
  },
});
