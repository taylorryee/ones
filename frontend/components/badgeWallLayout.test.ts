/// <reference types="node" />
// Run with `npm test` (Node's built-in test runner; Node strips the types).
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { SKELETONS } from './art.generated.ts';
import {
  getWallLayout,
  LABEL_WIDEST,
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
    assert.ok(top.eloFontSize > 0 && top.slot > 0);
    assert.ok(top.stackPadding >= -1e-6, 'Elo and stickers fit the section');
    assert.ok(
      Math.abs(
        top.stackPadding * 2 + top.eloHeight + top.showcaseGap + top.showcaseHeight + SPACE -
          top.height
      ) < 1e-6,
      'top section adds up'
    );
    assert.ok(top.slot + top.slotDip <= top.showcaseHeight + 1e-6, 'dipped sticker stays in its row');
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
