// Sizes for the badge wall. The area inside the screen border is split into three sections that
// each take a fixed share of its height, and everything in a section is fitted to that section,
// never to the screen. No React Native imports, so Node can run the tests.

import { SKELETONS } from './art.generated.ts';
import type { Insets, Size } from './skeleton.ts';

// Shares of the content height: Elo and stickers, the calendar, and a section still to come.
export const SECTIONS = { top: 0.35, middle: 0.4, bottom: 0.25 };
// Space between the parts of a section, and below each separator.
export const SPACE = 8;
// Space between the content edge and the Elo number and stickers.
export const SIDE_PADDING = 20;

const SEPARATOR_HEIGHT = SKELETONS.separator.height;

// From assets/oneSanFUv2.ttf, as shares of the font size: the height of the digits, the furthest
// the baseline the digits sit on can be from the top of their line (a line is 1.117 tall with
// 0.213 under the baseline; iOS can put the line gap above the text), and the width of "2000",
// the widest Elo a player normally reaches. Re-measure if the font changes. The screen measures
// where the baseline really is and lines it up with the bottom of the Elo's box.
const DIGIT_HEIGHT = 0.8;
const ELO_BASELINE = 0.904;
const ELO_REFERENCE_WIDTH = 2.28;

// Row of sticker slots under the Elo number. A sticker is this share of the digits' height, so the
// two always look in proportion.
export const SHOWCASE_SLOTS = 3;
const SHOWCASE_ELO_RATIO = 0.75;
// Space between stickers, and between the digits and the stickers, as a share of the sticker size.
const SHOWCASE_GAP_SCALE = 0.2;
// The middle slot sits this share of the slot size lower than the outer two, forming a smile.
const SHOWCASE_SMILE_DIP = 0.25;

const COLUMNS = 7;
// Boxes are always sized for the tallest month, so they never change size between months.
const MAX_ROWS = 6;
const GRID_GAP = 4;
const BOX_RATIO = SKELETONS.dayBox1.height / SKELETONS.dayBox1.width;
// Weekday letter size as a share of the box width: never smaller than the first, never larger
// than the second.
const LABEL_MIN_SCALE = 0.35;
const LABEL_MAX_SCALE = 0.8;
// From assets/oneSanFUv2.ttf, as shares of the font size: the advance width of "M", the widest
// weekday letter (at LABEL_MAX_SCALE it takes 60% of its column), and a line height just above
// ascender + descender + line gap (1.117), so neither platform clips the letters. Re-measure if
// the font changes.
export const LABEL_WIDEST = 0.754;
const LABEL_LINE_HEIGHT = 1.15;

// The largest month of day boxes that fits `width` × `height`: a row of weekday letters, then six
// rows of boxes. Boxes come first, with room kept for the smallest letters; the letters then take
// whatever height the boxes leave, up to LABEL_MAX_SCALE. Height they don't use is left out of
// the grid, so centering splits it above and below. The returned `height` is for `rows` rows, so
// a shorter month is only as tall as the rows it shows.
export function fitMonthGrid(width: number, height: number, rows = MAX_ROWS) {
  const fromWidth = (width - GRID_GAP * (COLUMNS - 1)) / COLUMNS;
  const fromHeight =
    (height - GRID_GAP * MAX_ROWS) / (MAX_ROWS * BOX_RATIO + LABEL_MIN_SCALE * LABEL_LINE_HEIGHT);
  const box = Math.max(0, Math.min(fromWidth, fromHeight));
  const boxHeight = box * BOX_RATIO;
  // Sized for six rows, like the boxes, so the letters keep one size between months.
  const labelRoom = height - GRID_GAP * MAX_ROWS - boxHeight * MAX_ROWS;
  const labelSize = Math.max(0, Math.min(box * LABEL_MAX_SCALE, labelRoom / LABEL_LINE_HEIGHT));
  const labelHeight = labelSize * LABEL_LINE_HEIGHT;

  return {
    box,
    boxHeight,
    gap: GRID_GAP,
    labelSize,
    labelHeight,
    width: box * COLUMNS + GRID_GAP * (COLUMNS - 1),
    height: labelHeight + GRID_GAP + boxHeight * rows + GRID_GAP * (rows - 1),
  };
}

// `content` is the area inside the border and `inset` the space from the frame to it. The screen
// draws edge to edge inside the frame, so separators can span `frameWidth`.
export function getWallLayout(content: Size, inset: Insets) {
  const topHeight = content.height * SECTIONS.top;
  const middleHeight = content.height * SECTIONS.middle;
  const innerWidth = content.width - SIDE_PADDING * 2;

  // Top section, from the top: the Elo from the top of its line down to the digits' baseline, a
  // gap, then the stickers with the middle one dipped. The space under the baseline is left out,
  // so the stickers tuck up under the digits. SPACE is kept clear above the separator.
  const stackRoom = topHeight - SPACE;
  // Each sticker with its gap; the Elo and the stickers are solved for together from the ratio.
  const slotUnit = 1 + SHOWCASE_GAP_SCALE + SHOWCASE_SMILE_DIP;
  // Sized for a reference Elo rather than the shown one, so nothing moves when the number changes.
  const eloFontSize = Math.max(
    0,
    Math.min(
      innerWidth / ELO_REFERENCE_WIDTH,
      stackRoom / (ELO_BASELINE + SHOWCASE_ELO_RATIO * DIGIT_HEIGHT * slotUnit)
    )
  );
  const eloHeight = eloFontSize * ELO_BASELINE;
  const slot = Math.max(
    0,
    Math.min(
      SHOWCASE_ELO_RATIO * DIGIT_HEIGHT * eloFontSize,
      innerWidth / (SHOWCASE_SLOTS + SHOWCASE_GAP_SCALE * (SHOWCASE_SLOTS - 1)),
      (stackRoom - eloHeight) / slotUnit
    )
  );
  const showcaseGap = slot * SHOWCASE_GAP_SCALE;

  const calendarTop = SEPARATOR_HEIGHT + SPACE;
  // The same space is kept above the next section's separator.
  const calendar = { width: content.width, height: Math.max(0, middleHeight - calendarTop - SPACE) };

  // Bottom section: the card fills everything below its separator, down to the content edge.
  const bottomHeight = content.height * SECTIONS.bottom;
  const cardTop = SEPARATOR_HEIGHT + SPACE;
  const card = { width: content.width, height: Math.max(0, bottomHeight - cardTop) };

  return {
    frameWidth: content.width + inset.left + inset.right,
    top: {
      height: topHeight,
      // Whatever the stack doesn't use is split above and below it.
      stackPadding: (stackRoom - eloHeight - slot * slotUnit) / 2,
      eloFontSize,
      eloWidth: innerWidth,
      eloHeight,
      showcaseGap,
      showcaseHeight: slot * (1 + SHOWCASE_SMILE_DIP),
      slot,
      slotDip: slot * SHOWCASE_SMILE_DIP,
    },
    middle: {
      height: middleHeight,
      calendarTop,
      calendar,
      grid: fitMonthGrid(calendar.width, calendar.height),
    },
    bottom: { height: bottomHeight, cardTop, card },
  };
}
