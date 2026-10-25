# MonthGrid Responsive Refactor Plan

Review of the hand-drawn calendar in `frontend/app/badge-wall.tsx`, `frontend/components/MonthGrid.tsx` and `frontend/components/DayBox.tsx`. The goal is for the calendar to look the same on every device size without changing its current design or behavior.

Installed versions: React Native 0.88, React 19.3, Expo SDK 58, react-native-svg 15.16, React Compiler enabled (`app.json` → `experiments.reactCompiler`).

## Summary

The structure is sound: the components are split cleanly, the box size follows the screen, and nothing deprecated is used. The weak point is that only the **box width** scales with the screen. The line thickness, gaps, weekday letters and the empty space underneath all change in proportion from phone to phone.

All measurements below are worked out from the layout code using standard phone widths. **None were measured on a device or simulator.**

| Device width | Box size | Box line thickness (border is 5) |
|---|---|---|
| iPhone SE (375) | ~36.8 × 30.1 | ~3.3px |
| iPhone 16 (402) | ~40.6 × 33.2 | ~3.7px |
| Pro Max (440) | ~46 × 37.6 | ~4.2px |

On every phone the calendar is limited by width, not height.

## Confirmed issues (from reading the code and working out the layout)

### P1: The box lines get thicker or thinner with the box, so they never match the border
`stroke-width="5"` in each box SVG is in the file's own 55-unit coordinates, so it scales with the box. That gives roughly 3.3–4.2px depending on the phone, while the screen border is always 5px. Across devices this is the biggest visual difference. On iPad (`supportsTablet: true`, and nothing caps the box size) boxes would be about 100pt wide with roughly 9px lines.

### P1: Tap areas are too small on smaller phones
On an iPhone SE each box is about 36.8 × 30pt. The recommended minimum is 44 × 44pt.

### P1: No accessibility
`DayBox` has no `accessibilityRole` or `accessibilityLabel`, so VoiceOver finds 31 unlabeled tap targets. The weekday letters (`S`, `T`) are ambiguous when read out on their own.

### P2: The weekday letters are cut off at larger system text sizes
The letters sit in a row with a fixed 16pt height (`HEADER_HEIGHT - GAP`) while their font follows the phone's text size setting by default, so they get cut off at larger accessibility sizes. The row height is also tied to `GAP`, so changing the gap changes it without anyone noticing.

### P2: Gaps and letter size don't scale, so the proportions change by device
`GAP = 8` and `fontSize: 16` stay fixed while boxes go from 37 to 46pt. The gap is 22% of the box width on an SE and 17% on a Pro Max.

### P2: Tall phones get a large empty band under the calendar
Width decides the box size, so on a Pro Max the calendar takes up about 290pt of a roughly 454pt space. It sits at the top with about 160pt empty below it, while on an SE the gap is much smaller.

### P3: `npm run lint` skips `components/`
The script lints `app constants services api.ts`, so `DayBox.tsx`, `MonthGrid.tsx`, `ScreenBorder.tsx` and every other component are never checked.

### P3: The badge-wall lint error probably stops the React Compiler from optimizing that screen
The compiler skips components that break the rules of React. `panResponder.current` is read during render (the `react-hooks/refs` error), so the screen redraws the whole calendar when it doesn't need to: while the rating text is resizing, when stickers load, and when the popup opens. `MonthGrid` and `DayBox` themselves are optimized, so the cost is small. With the compiler on, adding `React.memo` by hand isn't needed.

## Possible issues to check on a device

- **The weekday letters could wrap onto two lines.** The letters and boxes share one wrapping container, and the letter row only fits because 7 letter widths plus 6 gaps add up exactly to the container's width. Box sizes are fractional (for example 36.76), and the layout engine rounds positions to whole pixels. If rounding makes the row slightly too wide, the 7th letter moves to the next line and every day after it moves over one column. Not seen yet, but a fragile setup.
- **Fixed-thickness lines could get cut off at the box edges.** Some lines sit exactly 2.5 units from the frame edge. If the P1 fix makes the line thickness fixed in pixels, small boxes get proportionally thicker lines in file units (about 7.5 units on an SE), and the outer edge would be cut off.
- **The month doesn't change at midnight.** `today = new Date()` is only recalculated when the screen redraws, so a screen left open across the end of a month keeps showing the old one. Minor.
- **There are no day numbers.** People have to count boxes to find a date. This is a design choice (the mockup had none), but VoiceOver users need the labels from P1.

## What's fine

- **The parts are cleanly separated.** The screen holds the state, `MonthGrid` handles layout, and `DayBox` only draws.
- **Each day always gets the same box version** (`day % 3`), so nothing flickers when the screen redraws.
- **Sizing all months for 6 rows keeps box sizes the same from month to month.**
- **All the APIs used are current:** `gap`, `Pressable`, SVG imports through the transformer, `onLayout`.
- **TypeScript passes.**

## Refactoring plan (in priority order, same look and behavior)

1. **Fix the line thickness.** Export `STROKE_WIDTH` from `ScreenBorder.tsx`. Remove `stroke-width` from the three box SVGs and pass `strokeWidth={STROKE_PX * 55 / size}` from `DayBox`, so the on-screen thickness stays fixed. You choose the value: 5 to match the border, or something like 4 for a lighter look. Add about 2 units of padding to each box's viewBox so the thicker lines aren't cut off. Then check on a device that the root `strokeWidth` prop actually reaches the path.
2. **Make everything scale in proportion.** Turn the sizing into one pure function, `getMonthGridLayout(width, height)`. It should:
   - work out the gap and the letter size as fractions of the box size (gap ≈ 0.2 × box, measured on an iPhone 16);
   - solve the box size from `width / (7 + 6 × gapRatio)`;
   - cap it at a maximum size for iPad;
   - round values to whole pixels with `PixelRatio.roundToNearestPixel`.

   `MonthGrid` then uses its output and has no fixed numbers of its own.
3. **Draw explicit week rows.** Add a pure `getMonthWeeks(year, month): (number | null)[][]` and draw each week as its own row, with the weekday letters as a separate row on top. This removes the wrapping risk and makes the letter row's height independent of the gap.
4. **Make the boxes accessible.**
   - **DayBox:** add `accessibilityRole="button"`, an `accessibilityLabel` with the full date (for example "Wednesday, October 14"), and `hitSlop` equal to half the gap so the SE tap area grows to about 45 × 38 with no visual change.
   - **Weekday letters:** hide them from screen readers, since each day's label already includes the weekday.
5. **Stop the letters being cut off.** Set `maxFontSizeMultiplier` (about 1.3) on the letters, and calculate their row height from the font size instead of hard-coding it.
6. **Center the calendar vertically** in its space, so tall phones get the same composition as small ones. This is a design call; you could keep it at the top.
7. **Housekeeping:**
   - Add `components` to the `lint` script.
   - Fix the badge-wall ref error with `const [panResponder] = useState(() => PanResponder.create(...))` so the compiler can optimize that screen.
   - Optionally, add a comment next to `BOX_RATIO` and the separator's `36/516` linking them to their SVG frames, since both silently break if those files are re-exported at a different size.

Steps 1, 4 and 5 are small, contained changes. Steps 2 and 3 are the main refactor and only touch `MonthGrid.tsx` and a new `calendar` helper. `badge-wall.tsx` stays the same apart from step 7.

## How to check the result

- **Code checks:** `npx tsc --noEmit`, plus `npx eslint app components` once step 7 is done.
- **Simulators:** iPhone SE, iPhone 16 and Pro Max, plus one iPad. Screenshot Feb 2026 (4 rows), Aug 2026 (6 rows, starts on a Saturday) and the current month, then compare:
  - line thickness against the border;
  - gaps relative to box size;
  - day 1 under the correct weekday;
  - no row wrapping.
- **Taps:** with a temporary `console.log`, tap every day, including near the gaps on an SE, and check that each tap reports the right day.
- **Accessibility:** turn on VoiceOver and swipe through the days (each should read a full date); set text size to the largest accessibility setting (letters not cut off).
- **Edge clipping:** zoom into a screenshot of the smallest box size and check the line edges aren't cut off.
