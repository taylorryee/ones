import { useEffect, useRef, useState, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  GestureDetector,
  useCompetingGestures,
  usePanGesture,
  useTapGesture,
} from "react-native-gesture-handler";
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

import { dayAt } from "@/components/badgeWallLayout";
import { MonthGrid } from "@/components/MonthGrid";
import type { Size } from "@/components/skeleton";
import {
  DRAG_SLOP,
  EDGE_STRETCH,
  releaseTarget,
  rubberBand,
  SNAP_SPRING,
} from "@/components/swipePaging";
import { FONT, INK, PAPER } from "@/constants/theme";
import type { DayFill } from "@/hooks/useDayFills";
import { useGradientFlow } from "@/hooks/useGradientFlow";

// After landing on another month its name fades in, stays, then fades out over the grid.
const NAME_FADE_IN = 100;
const NAME_HOLD = 650;
const NAME_FADE_OUT = 250;
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

// The calendar, opening on `year`/`month` (0-based, like Date). Swiping right shows the month
// before, swiping left comes back; past `month` it only stretches and springs back. Each month takes a whole frame width
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
  const { flow, stillFlow, sliding, restartFlow } = useGradientFlow();
  // The slot whose gradients move, so the months off screen never repaint. Changes once the months
  // settle, not when the finger lifts.
  const [flowingSlot, setFlowingSlot] = useState(0);
  // A month that starts moving was held at the start of the flow, so it carries on from there.
  useEffect(() => {
    restartFlow();
  }, [flowingSlot, restartFlow]);

  // Months from `month`: 0 is that month, -1 the one before it.
  const [position, setPosition] = useState(0);
  // The same, for the gesture, which runs on the UI thread and can't wait for a render.
  const committed = useSharedValue(0);
  // Where the months are: -position × pitch once they settle.
  const offset = useSharedValue(0);
  // Where the months were when the drag started, less the slop the finger moved to start it.
  const dragStart = useSharedValue(0);
  const nameOpacity = useSharedValue(0);
  // Whether the month's name should still fade in once the months settle. Tapping a day clears it.
  const nameWanted = useSharedValue(false);
  // Whether the name is on its way in, showing or on its way out. Days can't be tapped meanwhile.
  const nameActive = useSharedValue(false);
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
      sliding.set(true);
      cancelAnimation(nameOpacity);
      nameOpacity.set(0);
      nameWanted.set(false);
      nameActive.set(false);
      cancelAnimation(offset);
      dragStart.set(offset.get() - event.translationX);
    },
    onUpdate: (event) => {
      // One month back, and one forward unless this is already the latest month; a little
      // further than that stretches.
      const latest = Math.min(committed.get() + 1, 0);
      offset.set(
        rubberBand(
          dragStart.get() + event.translationX,
          -latest * pitch,
          -(committed.get() - 1) * pitch,
          pitch * EDGE_STRETCH,
        ),
      );
    },
    onDeactivate: (event) => {
      const from = committed.get();
      const latest = Math.min(from + 1, 0);
      const target = releaseTarget(
        -offset.get() / pitch,
        from - 1,
        latest,
        event.translationX,
        event.velocityX,
        pitch,
      );
      // Released while stretched, the months spring straight back; the finger's speed would carry
      // them further out first.
      const stretched =
        offset.get() < -latest * pitch || offset.get() > -(from - 1) * pitch;
      // Set straight away rather than when the snap ends, so a swipe that starts while the month
      // is still sliding in moves on from it instead of landing back on the same month.
      committed.set(target);
      nameWanted.set(target !== from);
      scheduleOnRN(setPosition, target);
      offset.set(
        withSpring(
          -target * pitch,
          { ...SNAP_SPRING, velocity: stretched ? 0 : event.velocityX },
          (finished) => {
            // Interrupted only by another drag, which settles the months itself. Stopping
            // nameOpacity in that drag cancels the whole fade, hold included.
            if (finished) {
              sliding.set(false);
              scheduleOnRN(setFlowingSlot, target);
            }
            if (finished && nameWanted.get()) {
              nameActive.set(true);
              nameOpacity.set(
                withSequence(
                  withTiming(1, { duration: NAME_FADE_IN }),
                  withDelay(
                    NAME_HOLD,
                    withTiming(0, { duration: NAME_FADE_OUT }, () => {
                      nameActive.set(false);
                    }),
                  ),
                ),
              );
            }
          },
        ),
      );
    },
  });

  // Days can't be tapped from when the name starts fading in until it's fully gone. A tap before
  // that, while the months are still settling, means the player is done looking at the month, so
  // the name is dropped and never shows.
  function onPressDayCancelingName(date: Date) {
    if (nameActive.get()) {
      return;
    }
    nameWanted.set(false);
    cancelAnimation(nameOpacity);
    nameOpacity.set(0);
    onPressDay(date);
  }

  // Finds the day at `x`, `y` in the month `slot` months from `month`, if there is one.
  function pressMonthAt(slot: number, x: number, y: number) {
    const first = new Date(year, month + slot, 1);
    const shownYear = first.getFullYear();
    const shownMonth = first.getMonth();
    const day = dayAt(x, y, size.width, size.height, shownYear, shownMonth);
    if (day !== null) {
      onPressDayCancelingName(new Date(shownYear, shownMonth, day));
    }
  }

  // A native gesture rather than a Pressable on each day, which can stay pressed through a swipe
  // and open the day on release. Moving as far as a drag takes to start fails it, and racing the
  // drag means only one of the two can ever win. Months past `month` are never shown.
  const tap = useTapGesture({
    maxDistance: DRAG_SLOP,
    onActivate: (event) => {
      const along = event.x - offset.get();
      const slot = Math.floor(along / pitch);
      if (slot <= 0) {
        scheduleOnRN(pressMonthAt, slot, along - slot * pitch - inset, event.y);
      }
    },
  });
  const gesture = useCompetingGestures(pan, tap);

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
    <GestureDetector gesture={gesture}>
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
                flow={slot === flowingSlot ? flow : stillFlow}
                height={size.height}
                month={shownMonth}
                onFillDrawn={onFillDrawn}
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
            ></Text>
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
