/// <reference types="node" />
// Run with `npm test` (Node's built-in test runner; Node strips the types).
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { SKELETONS } from './art.generated.ts';
import {
  dayAt,
  fitMonthGrid,
  fitShowcaseRow,
  getShowcaseEditorLayout,
  getWallLayout,
  LABEL_WIDEST,
  monthShape,
  SHOWCASE_SLOTS,
  SIDE_PADDING,
  SPACE,
} from './badgeWallLayout.ts';
import { insetsOf } from './skeleton.ts';

// Mirrors ScreenFrame in ScreenBorder.tsx: the frame sits FRAME_MARGIN inside the screen and the
// content clears both the border's line and the system bars.
const FRAME_MARGIN = 6;
const CONTENT_GAP = 12;
const BORDER_INSET = insetsOf(SKELETONS.screenBorder, 115, 2.5 + CONTENT_GAP);

// [name, screen width, screen height, top safe area, bottom safe area]
const PHONES = [
  ['iPhone SE', 375, 667, 20, 0],
  ['iPhone 16 Pro', 402, 874, 62, 34],
  ['iPhone Pro Max', 440, 956, 62, 34],
  ['small Android', 360, 740, 24, 16],
  ['large Android', 412, 915, 30, 24],
] as const;

function layoutFor(width: number, height: number, safeTop: number, safeBottom: number) {
  const frame = { width: width - FRAME_MARGIN * 2, height: height - FRAME_MARGIN * 2 };
  const inset = {
    ...BORDER_INSET,
    top: Math.max(BORDER_INSET.top, safeTop - FRAME_MARGIN + CONTENT_GAP),
    bottom: Math.max(BORDER_INSET.bottom, safeBottom - FRAME_MARGIN + CONTENT_GAP),
  };
  const content = {
    width: frame.width - inset.left - inset.right,
    height: frame.height - inset.top - inset.bottom,
  };
  return { frame, content, layout: getWallLayout(content, inset) };
}

for (const [name, width, height, safeTop, safeBottom] of PHONES) {
  test(`badge wall fits on ${name}`, () => {
    const { frame, content, layout } = layoutFor(width, height, safeTop, safeBottom);

    assert.ok(
      Math.abs(layout.top.height + layout.middle.height + layout.bottom.height - content.height) <
        1e-6,
      'sections fill the content height exactly'
    );
    assert.ok(Math.abs(layout.frameWidth - frame.width) < 1e-6, 'separators span the frame');

    const { top } = layout;
    assert.ok(top.eloHeight > 0 && top.slot > 0);
    assert.ok(top.stackPadding >= -1e-6, 'Elo and stickers fit the section');
    assert.ok(
      Math.abs(
        top.stackPadding * 2 + top.eloHeight + top.showcaseGap + top.showcaseHeight + SPACE -
          top.height
      ) < 1e-6,
      'top section adds up'
    );
    assert.ok(top.slot + top.slotDip <= top.showcaseHeight + 1e-6, 'dipped sticker stays in its row');
    assert.ok(
      Math.abs(
        top.eloBox.height + top.eloGap - (top.stackPadding + top.eloHeight + top.showcaseGap)
      ) < 1e-6,
      'the Elo box ends where the stickers already start, less its gap'
    );
    assert.ok(top.eloGap > 0 && top.eloBox.width <= content.width + 1e-6, 'Elo stays inside');
    const rowWidth = top.slot * SHOWCASE_SLOTS + top.showcaseGap * (SHOWCASE_SLOTS - 1);
    assert.ok(rowWidth <= content.width + 1e-6, 'stickers fit the width');
    assert.ok(rowWidth >= content.width - SIDE_PADDING * 2, 'stickers reach past the Elo padding');

    const { grid, calendar, calendarTop } = layout.middle;
    assert.ok(grid.width <= calendar.width + 1e-6, 'calendar fits the width');
    assert.ok(grid.height <= calendar.height + 1e-6, 'calendar fits the height');
    assert.ok(calendarTop + calendar.height <= layout.middle.height, 'calendar stays in its section');
    assert.ok(grid.labelSize * LABEL_WIDEST <= grid.box + 1e-6, 'widest letter fits its column');

    const { card, cardTop } = layout.bottom;
    assert.ok(card.width > 0 && card.height > 0, 'card has room');
    assert.ok(
      Math.abs(cardTop + card.height - layout.bottom.height) < 1e-6,
      'card fills its section'
    );

    // A day's tap area reaches halfway into the gaps around its box.
    assert.ok(grid.box + grid.gap >= 40, `tap area ${grid.box + grid.gap} wide`);
    assert.ok(grid.boxHeight + grid.gap >= 33.5, `tap area ${grid.boxHeight + grid.gap} tall`);
  });
}

test('the showcase row keeps the wall proportions at any size', () => {
  const { layout } = layoutFor(402, 874, 62, 34);
  const { top } = layout;
  const row = fitShowcaseRow(300, 200);
  assert.ok(Math.abs(row.gap / row.slot - top.showcaseGap / top.slot) < 1e-6);
  assert.ok(Math.abs(row.dip / row.slot - top.slotDip / top.slot) < 1e-6);
  assert.ok(row.slot * SHOWCASE_SLOTS + row.gap * (SHOWCASE_SLOTS - 1) <= 300 + 1e-6);
});

test('the badge editor fits a popup on every phone', () => {
  for (const [, width, height, safeTop, safeBottom] of PHONES) {
    // Roughly the space inside CardPopup's line.
    const size = { width: width - 96, height: height - safeTop - safeBottom - 96 };
    const { showcase, gridHeight, lineTop, listTop, listPadding } = getShowcaseEditorLayout(size);
    assert.ok(showcase.height <= size.height * 0.25 + 1e-6, 'stickers leave room for the grid');
    assert.ok(showcase.slot > 0 && gridHeight > showcase.height, 'grid gets the most room');
    assert.ok(
      Math.abs(
        showcase.height + SKELETONS.separator.height + SPACE * 2 + gridHeight - size.height
      ) < 1e-6,
      'editor adds up'
    );
    assert.ok(
      Math.abs(listTop + listPadding + gridHeight - size.height) < 1e-6,
      'the padded list ends where the grid does'
    );
    assert.ok(listTop > lineTop && listTop < lineTop + SKELETONS.separator.height, 'list starts under the line');
  }
});

// June 2026 starts on a Monday and takes five rows; a phone-sized calendar.
const CALENDAR = { width: 330, height: 330 };
const JUNE = [2026, 5] as const;

// The middle of the box in `column`, `row` of a month with `rows` rows, in calendar coordinates.
function boxCenter(column: number, row: number, rows: number) {
  const fit = fitMonthGrid(CALENDAR.width, CALENDAR.height, rows);
  return {
    x: (CALENDAR.width - fit.width) / 2 + column * (fit.box + fit.gap) + fit.box / 2,
    y:
      (CALENDAR.height - fit.height) / 2 +
      fit.labelHeight +
      fit.gap +
      row * (fit.boxHeight + fit.gap) +
      fit.boxHeight / 2,
  };
}

function dayAtJune(x: number, y: number) {
  return dayAt(x, y, CALENDAR.width, CALENDAR.height, ...JUNE);
}

test('every day of a month is found at its own box', () => {
  const { days, firstWeekday, rows } = monthShape(...JUNE);
  assert.equal(firstWeekday, 1);
  assert.equal(rows, 5);
  for (let day = 1; day <= days; day++) {
    const cell = firstWeekday + day - 1;
    const { x, y } = boxCenter(cell % 7, Math.floor(cell / 7), rows);
    assert.equal(dayAtJune(x, y), day);
  }
});

test('a tap in the gap goes to the day on its side', () => {
  const fit = fitMonthGrid(CALENDAR.width, CALENDAR.height, 5);
  // Between June 7th (Sunday, the first column of row 1) and 8th.
  const { x, y } = boxCenter(0, 1, 5);
  const edge = x + fit.box / 2;
  assert.equal(dayAtJune(edge + fit.gap / 2 - 0.1, y), 7);
  assert.equal(dayAtJune(edge + fit.gap / 2 + 0.1, y), 8);
});

test('blank cells, the weekday letters and the space around the grid have no day', () => {
  const fit = fitMonthGrid(CALENDAR.width, CALENDAR.height, 5);
  // May's last day in June's grid.
  const blank = boxCenter(0, 0, 5);
  assert.equal(dayAtJune(blank.x, blank.y), null);
  // Past the end of the month, and past the last row.
  const after = boxCenter(3, 4, 5);
  assert.equal(dayAtJune(after.x, after.y), null);
  const below = boxCenter(1, 5, 5);
  assert.equal(dayAtJune(below.x, below.y), null);
  // On the weekday letter over the 1st.
  const letters = boxCenter(1, 0, 5);
  assert.equal(dayAtJune(letters.x, letters.y - fit.boxHeight / 2 - fit.gap - 1), null);
  // Past the half gap each day takes on either side, in a row with no blanks.
  const row = boxCenter(0, 1, 5).y;
  assert.equal(dayAtJune(-fit.gap, row), null);
  assert.equal(dayAtJune(CALENDAR.width + fit.gap, row), null);
  // Inside it, the outer days still take the tap.
  assert.equal(dayAtJune(-fit.gap / 4, row), 7);
  assert.equal(dayAtJune(CALENDAR.width + fit.gap / 4, row), 13);
});
