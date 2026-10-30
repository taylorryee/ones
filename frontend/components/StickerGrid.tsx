import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Insets, Size } from '@/components/skeleton';
import { StickerArt } from '@/components/StickerArt';
import type { OwnedSticker } from '@/services/stickers';

const NUM_COLUMNS = 2;
// Cells are never taller than this many rows fit in the visible part of the grid.
const NUM_ROWS = 2;
// All spacing is a share of the cell size, so the grid keeps the same proportions on every screen.
// On an iPhone 16 these come out at about 20px padding and 40px gaps.
const GRID_PADDING_RATIO = 1 / 6;
const CELL_GAP_RATIO = 1 / 3;
// Space between the last row of badges and the bottom of the safe content area.
const GRID_BOTTOM_GAP_RATIO = 1 / 3;
// The empty message scales with the cells too (about 15px on an iPhone 16).
const EMPTY_FONT_RATIO = 1 / 8;

// The grid fills the whole list and can scroll under whatever covers its edges; the padding keeps
// the first and last rows inside `content` when scrolled all the way.
function getGridLayout(content: Size, inset: Insets) {
  const cellSizeFromWidth =
    content.width / (NUM_COLUMNS + GRID_PADDING_RATIO * 2 + CELL_GAP_RATIO * (NUM_COLUMNS - 1));
  const cellSizeFromHeight =
    content.height / (NUM_ROWS + CELL_GAP_RATIO * (NUM_ROWS - 1) + GRID_BOTTOM_GAP_RATIO);
  const cellSize = Math.max(0, Math.min(cellSizeFromWidth, cellSizeFromHeight));
  const cellGap = cellSize * CELL_GAP_RATIO;
  // Centers the columns inside the content; equals the grid padding when the width decides the cell size.
  const gridSideSpace = (content.width - cellSize * NUM_COLUMNS - cellGap * (NUM_COLUMNS - 1)) / 2;

  return {
    cellSize,
    cellGap,
    emptyFontSize: cellSize * EMPTY_FONT_RATIO,
    gridPaddingTop: inset.top,
    // Every row (the last included) already has the cell gap below it.
    gridPaddingBottom: inset.bottom + cellSize * GRID_BOTTOM_GAP_RATIO - cellGap,
    gridPaddingLeft: inset.left + gridSideSpace,
    gridPaddingRight: inset.right + gridSideSpace,
  };
}

type GridItem = { key: string; sticker: OwnedSticker };

// Two scrolling columns of the player's stickers, sized to `content`, the visible area inside
// `inset`. `stickers` is null while loading, so slow connections don't flash the empty message.
export function StickerGrid({
  stickers,
  content,
  inset,
  onPressSticker,
}: {
  stickers: OwnedSticker[] | null;
  content: Size;
  inset: Insets;
  onPressSticker: (sticker: OwnedSticker) => void;
}) {
  const layout = useMemo(() => getGridLayout(content, inset), [content, inset]);

  const data = useMemo<GridItem[]>(
    () => (stickers ?? []).map((sticker, index) => ({ key: `${sticker.id}-${index}`, sticker })),
    [stickers]
  );

  function renderItem({ item }: { item: GridItem }) {
    return (
      <Pressable
        onPress={() => onPressSticker(item.sticker)}
        style={{ height: layout.cellSize, width: layout.cellSize }}>
        <StickerArt slug={item.sticker.sticker.slug} />
      </Pressable>
    );
  }

  return (
    <FlatList
      columnWrapperStyle={{ gap: layout.cellGap, marginBottom: layout.cellGap }}
      contentContainerStyle={[
        styles.gridContent,
        {
          paddingBottom: layout.gridPaddingBottom,
          paddingLeft: layout.gridPaddingLeft,
          paddingRight: layout.gridPaddingRight,
          paddingTop: layout.gridPaddingTop,
        },
      ]}
      data={data}
      extraData={layout.cellSize}
      keyExtractor={(item) => item.key}
      ListEmptyComponent={
        stickers ? (
          <View style={[styles.empty, { paddingHorizontal: layout.cellGap }]}>
            <Text style={[styles.emptyText, { fontSize: layout.emptyFontSize }]}>
              No stickers yet. Win a game to earn your first.
            </Text>
          </View>
        ) : undefined
      }
      numColumns={NUM_COLUMNS}
      renderItem={renderItem}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  gridContent: {
    flexGrow: 1,
  },
  empty: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  emptyText: {
    color: '#6B7280',
    // The app font rather than the system one, which differs between iOS and Android.
    fontFamily: 'OneSanTest2',
    textAlign: 'center',
  },
});
