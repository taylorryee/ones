import { useEffect, useRef, useState, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { MonthGrid } from "@/components/MonthGrid";
import type { Size } from "@/components/skeleton";
import { FONT, INK, PAPER } from "@/constants/theme";
import type { DayFill } from "@/hooks/useDayFills";

// A swipe further than this share of a month, or faster than this (pt per s), moves one month;
// a shorter, slower one springs back. The spring carries on at the finger's speed and never
// overshoots, so a flick doesn't brake to a stop and the months never bounce past the border.
const SWIPE_DISTANCE = 0.2;
const SWIPE_VELOCITY = 300;
const SNAP_SPRING = {
  damping: 40,
  mass: 1,
  overshootClamping: true,
  stiffness: 320,
};
// How far a finger moves sideways before the drag starts, or up and down before it's left alone.
const DRAG_SLOP = 10;
// After landing on another month its name fades in, stays, then fades out over the grid.
const NAME_FADE_IN = 480;
const NAME_HOLD = 1050;
const NAME_FADE_OUT = 900;
// Name size as a share of the calendar height; long names shrink to fit the width.
const NAME_SCALE = 0.2;
// Size of the games-played line under the name, as a share of the calendar height.
const PLAYED_SCALE = 0.08;

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const clamp = (value: number, min: number, max: number) => {
  "worklet";
  return Math.min(max, Math.max(min, value));
};

// The calendar, opening on `year`/`month` (0-based, like Date). Swiping right shows the month
// before, swiping left comes back, never past `month`. Each month takes a whole frame width
// (`pitch`) and starts `inset` into it, so months slide in and out from under the border. Only the
// shown month and the months next to it are mounted. `playedTimes` are the player's confirmed games,
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
  // The same, for the gesture, which runs on the UI thread and can't wait for a render.
  const committed = useSharedValue(0);
  // Where the months are: -position × pitch once they settle.
  const offset = useSharedValue(0);
  // Where the months were when the drag started, less the slop the finger moved to start it.
  const dragStart = useSharedValue(0);
  const nameOpacity = useSharedValue(0);
  // The frame width the months were last placed for.
  const placedPitch = useRef(pitch);

  // Puts the months back in place when the size changes. Not on a month change: the month is set
  // as soon as the finger lifts, while the snap is still sliding it into place.
  useEffect(() => {
    if (placedPitch.current !== pitch) {
      placedPitch.current = pitch;
      offset.set(-position * pitch);
    }
  }, [offset, pitch, position]);

  // Runs on the UI thread from start to finish, so rendering a newly mounted month on the JS
  // thread can't stall the drag or the snap.
  const pan = usePanGesture({
    activeOffsetX: [-DRAG_SLOP, DRAG_SLOP],
    failOffsetY: [-DRAG_SLOP, DRAG_SLOP],
    onActivate: (event) => {
      // A new swipe clears the last month's name straight away, and catches the months where they
      // are if they're still sliding.
      cancelAnimation(nameOpacity);
      nameOpacity.set(0);
      cancelAnimation(offset);
      dragStart.set(offset.get() - event.translationX);
    },
    onUpdate: (event) => {
      // One month back, and one forward unless this is already the latest month.
      const latest = Math.min(committed.get() + 1, 0);
      offset.set(
        clamp(
          dragStart.get() + event.translationX,
          -latest * pitch,
          -(committed.get() - 1) * pitch,
        ),
      );
    },
    onDeactivate: (event) => {
      const from = committed.get();
      const latest = Math.min(from + 1, 0);
      let target = Math.round(-offset.get() / pitch);
      if (
        event.translationX < -pitch * SWIPE_DISTANCE ||
        event.velocityX < -SWIPE_VELOCITY
      ) {
        target = from + 1;
      } else if (
        event.translationX > pitch * SWIPE_DISTANCE ||
        event.velocityX > SWIPE_VELOCITY
      ) {
        target = from - 1;
      }
      target = clamp(target, from - 1, latest);
      // Set straight away rather than when the snap ends, so a swipe that starts while the month
      // is still sliding in moves on from it instead of landing back on the same month.
      committed.set(target);
      scheduleOnRN(setPosition, target);
      offset.set(
        withSpring(
          -target * pitch,
          { ...SNAP_SPRING, velocity: event.velocityX },
          (finished) => {
            // Interrupted only by another drag, which settles the months itself. Stopping
            // nameOpacity in that drag cancels the whole fade, hold included.
            if (finished && target !== from) {
              nameOpacity.set(
                withSequence(
                  withTiming(1, { duration: NAME_FADE_IN }),
                  withDelay(
                    NAME_HOLD,
                    withTiming(0, { duration: NAME_FADE_OUT }),
                  ),
                ),
              );
            }
          },
        ),
      );
    },
  });

  const nameStyle = useAnimatedStyle(() => ({ opacity: nameOpacity.get() }));

  const current = new Date(year, month + position, 1);
  // The year is only named for months outside the latest month's year.
  const name =
    current.getFullYear() === year
      ? MONTHS[current.getMonth()]
      : `${MONTHS[current.getMonth()]} ${current.getFullYear()}`;
  // Counted in the phone's time zone, so a game late on the 31st stays in its month.
  const played = playedTimes?.filter(
    (time) =>
      time.getFullYear() === current.getFullYear() &&
      time.getMonth() === current.getMonth(),
  ).length;
  // Two months back are mounted, so a quick run of swipes never slides onto one still rendering.
  const shown = [position - 2, position - 1, position];
  if (position < 0) {
    shown.push(position + 1);
  }

  return (
    <GestureDetector gesture={pan}>
      <View style={{ height: size.height, width: pitch }}>
        {shown.map((slot) => {
          // Day 1, so stepping back from e.g. March 31st can't overflow into the wrong month.
          const first = new Date(year, month + slot, 1);
          const shownYear = first.getFullYear();
          const shownMonth = first.getMonth();
          return (
            // Keyed by slot, so the shown month stays mounted when a neighbour becomes current.
            <MonthSlot
              inset={inset}
              key={slot}
              offset={offset}
              pitch={pitch}
              size={size}
              slot={slot}
            >
              <MonthGrid
                fills={fills}
                height={size.height}
                month={shownMonth}
                onFillDrawn={(day) =>
                  onFillDrawn?.(new Date(shownYear, shownMonth, day))
                }
                onPressDay={(day) =>
                  onPressDay(new Date(shownYear, shownMonth, day))
                }
                width={size.width}
                year={shownYear}
              />
            </MonthSlot>
          );
        })}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.name,
            { height: size.height, left: inset, width: size.width },
            nameStyle,
          ]}
        >
          {/* Sized to the calendar, so it ignores the system text size like the boxes do. */}
          <Text
            adjustsFontSizeToFit
            allowFontScaling={false}
            numberOfLines={1}
            style={[styles.nameText, { fontSize: size.height * NAME_SCALE }]}
          >
            {name}
          </Text>
          {played === undefined ? null : (
            <Text
              adjustsFontSizeToFit
              allowFontScaling={false}
              numberOfLines={1}
              style={[
                styles.nameText,
                { fontSize: size.height * PLAYED_SCALE },
              ]}
            >
              {`You hooped ${played} ${played === 1 ? "time" : "times"} this month`}
            </Text>
          )}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

// One month, `slot` months from `month`, placed `slot` frame widths along from the shown month.
function MonthSlot({
  slot,
  offset,
  pitch,
  inset,
  size,
  children,
}: {
  slot: number;
  offset: SharedValue<number>;
  pitch: number;
  inset: number;
  size: Size;
  children: ReactNode;
}) {
  const slide = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.get() + slot * pitch }],
  }));
  return (
    <Animated.View
      style={[
        styles.month,
        { height: size.height, left: inset, width: size.width },
        slide,
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  month: {
    justifyContent: "center",
    position: "absolute",
    top: 0,
  },
  // Opaque, so the grid is fully hidden while the name shows.
  name: {
    alignItems: "center",
    backgroundColor: PAPER,
    justifyContent: "center",
    position: "absolute",
    top: 0,
  },
  nameText: {
    color: INK,
    fontFamily: FONT,
    textAlign: "center",
  },
});
