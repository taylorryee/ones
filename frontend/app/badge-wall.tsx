import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import FlameIcon from '@/assets/backdrops/testFlame.svg';
import SeparatingLine from '@/assets/seperating_line (Stroke).svg';
import StickerPopupFrame from '@/assets/sticker_popup (Stroke).svg';
import { SCREEN_BACKGROUND, useContentInset, useContentSize } from '@/components/ScreenBorder';
import { StickerArt } from '@/components/StickerArt';
import { getArchetype } from '@/constants/archetypes';
import { getCurrentUser, type UserProfile } from '@/services/auth';
import { getStickerInventory, type OwnedSticker } from '@/services/stickers';

const NUM_COLUMNS = 2;
const NUM_ROWS = 3;
const GRID_PADDING = 20;
const CELL_GAP = 40;
// Space between the separator line and the first row of badges, inside the scroll area.
const GRID_TOP_GAP = 16;

// The sticker popup is shown in a Modal, which covers the whole window rather than the framed area.
const WINDOW_WIDTH = Dimensions.get('window').width;

const RATIO_BASE_FONT_SIZE = 200;

const FLAME_HEIGHT = 60;
const FLAME_WIDTH = (FLAME_HEIGHT * 51) / 57; // matches the testFlame.svg viewBox

// Sizes for everything drawn inside the screen border, based on the framed content area.
// The screen draws edge to edge inside the frame, so `inset` is the space to the safe content area.
function getWallLayout(
  width: number,
  height: number,
  inset: { top: number; right: number; bottom: number; left: number }
) {
  const ratioBlockHeight = height / 3;
  const gridAreaHeight = height - ratioBlockHeight;
  const cellSizeFromWidth =
    (width - GRID_PADDING * 2 - CELL_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;
  const cellSizeFromHeight =
    (gridAreaHeight - GRID_PADDING * 2 - CELL_GAP * (NUM_ROWS - 1)) / NUM_ROWS;

  return {
    ratioBlockHeight,
    cellSize: Math.min(cellSizeFromWidth, cellSizeFromHeight),
    // Slightly under the real available width so rounding never pushes the text into ellipsis.
    ratioMaxWidth: width - GRID_PADDING * 2 - 8,
    // Runs under the border on both sides so its ends are hidden by the line.
    separatorWidth: width + inset.left + inset.right,
    separatorHeight: ((width + inset.left + inset.right) * 36) / 516, // matches the seperating_line.svg viewBox
    paddingTop: inset.top,
    paddingLeft: inset.left + GRID_PADDING,
    paddingRight: inset.right + GRID_PADDING,
    gridPaddingBottom: inset.bottom + 40,
  };
}

type GridItem = { key: string; sticker: OwnedSticker };

// Everything above the bottom edge of the separator line, in the seperating_line.svg viewBox.
// The lower edge is copied from that file's path (from its right end cap to its left end).
const SEPARATOR_MASK_PATH =
  'M516 0V11.302H515.311C515.989 12.5047 515.563 14.0302 514.36 14.7082C513.158 15.3859 511.633 14.9605 510.955 13.758C509.753 11.6261 508.947 10.3298 507.694 9.61838C496.137 8.1213 455.816 5.60802 410.943 5.00314C402.186 6.5735 392.44 9.87902 381.541 13.049C370.666 16.2118 358.845 19.167 346.506 19.7102C315.549 21.0727 279.427 25.9708 253.137 31.5549C239.256 34.5032 221.314 37.7406 194.146 34.0129C180.509 32.1419 169.509 30.6886 161.005 29.4406C152.539 28.1984 146.372 27.1366 142.464 26.0285C136.872 24.443 125.121 23.155 108.433 22.2961C91.8434 21.4423 70.6232 21.0209 46.2695 21.0891C14.4902 21.178 2.78656 21.1779 2.5 21.1779C1.11929 21.1779 0 20.0587 0 18.6779V0Z';

// Drawn over the top of the badge grid: hides badges above the line's wobbly bottom edge, so they
// scroll right up to the line everywhere instead of stopping at its lowest point.
function SeparatorOverlay({ width, height }: { width: number; height: number }) {
  return (
    <View pointerEvents="none" style={[styles.separatorOverlay, { height, width }]}>
      <Svg height={height} style={StyleSheet.absoluteFill} viewBox="0 0 516 36" width={width}>
        <Path d={SEPARATOR_MASK_PATH} fill={SCREEN_BACKGROUND} />
      </Svg>
      <SeparatingLine height={height} width={width} />
    </View>
  );
}

// Keeps the base font size and lets the text grow wider with each character.
// If it would run off the screen, the size is reduced by the smallest amount that fits.
// The hidden copy is measured at the size actually shown, so the result is verified
// rather than assumed to scale linearly; it re-measures until the width is within bounds.
function RatioText({ children, maxWidth }: { children: string; maxWidth: number }) {
  const [fontSize, setFontSize] = useState(RATIO_BASE_FONT_SIZE);

  useEffect(() => {
    setFontSize(RATIO_BASE_FONT_SIZE);
  }, [children, maxWidth]);

  function handleMeasure(width: number) {
    if (width > maxWidth) {
      setFontSize((current) => Math.floor(current * (maxWidth / width) * 0.995 * 10) / 10);
    }
  }

  return (
    <>
      {/* Hidden, very wide copy so the text is measured on one line at the shown size. */}
      <Text
        onTextLayout={(e) => handleMeasure(e.nativeEvent.lines[0]?.width ?? 0)}
        style={[styles.ratioText, styles.ratioMeasure, { fontSize }]}>
        {children}
      </Text>
      <Text
        ellipsizeMode="clip"
        numberOfLines={1}
        style={[styles.ratioText, { fontSize }]}>
        {children}
      </Text>
    </>
  );
}

const POPUP_WIDTH = WINDOW_WIDTH - 96;
const POPUP_HEIGHT = (POPUP_WIDTH * 287) / 269; // matches the sticker_popup.svg viewBox
const POPUP_INSET_X = POPUP_WIDTH * (30 / 269);
const POPUP_INSET_Y = POPUP_HEIGHT * (38 / 287);
const POPUP_INNER_WIDTH = POPUP_WIDTH - POPUP_INSET_X * 2;
const POPUP_INNER_HEIGHT = POPUP_HEIGHT - POPUP_INSET_Y * 2;
// Text may use at most this much of the interior; the sticker fills whatever is left below it.
const POPUP_TEXT_MAX_HEIGHT = POPUP_INNER_HEIGHT * 0.6;
const POPUP_TITLE_MAX_FONT = 36;
const POPUP_DESC_MIN_FONT = 8;
const POPUP_DESC_MAX_FONT = 24;

// Fits the text inside the frame at the largest font size possible.
// The title shrinks until it fits on one line; the description size is found by binary
// search, measuring the wrapped text in a hidden copy of the same width as the frame interior.
function StickerPopup({
  name,
  description,
  slug,
}: {
  name: string;
  description: string;
  slug: string;
}) {
  const [titleWidth, setTitleWidth] = useState<number | null>(null);
  const [range, setRange] = useState({ lo: POPUP_DESC_MIN_FONT, hi: POPUP_DESC_MAX_FONT });

  const titleFont =
    titleWidth === null
      ? POPUP_TITLE_MAX_FONT
      : Math.min(
          POPUP_TITLE_MAX_FONT,
          Math.floor((POPUP_TITLE_MAX_FONT * POPUP_INNER_WIDTH) / (titleWidth + 2))
        );
  const done = range.hi - range.lo < 1;
  const probeFont = (range.lo + range.hi) / 2;

  function handleProbeLayout(height: number) {
    setRange((r) =>
      height <= POPUP_TEXT_MAX_HEIGHT ? { lo: (r.lo + r.hi) / 2, hi: r.hi } : { lo: r.lo, hi: (r.lo + r.hi) / 2 }
    );
  }

  return (
    <View style={{ height: POPUP_HEIGHT, width: POPUP_WIDTH }}>
      <StickerPopupFrame height={POPUP_HEIGHT} width={POPUP_WIDTH} />
      {titleWidth === null && (
        <View pointerEvents="none" style={styles.modalMeasure}>
          <Text
            onLayout={(e) => setTitleWidth(e.nativeEvent.layout.width)}
            style={[styles.modalTitle, { fontSize: POPUP_TITLE_MAX_FONT }]}>
            {name}
          </Text>
        </View>
      )}
      {titleWidth !== null && !done && (
        <View
          key={probeFont}
          onLayout={(e) => handleProbeLayout(e.nativeEvent.layout.height)}
          pointerEvents="none"
          style={styles.modalProbe}>
          <Text numberOfLines={1} style={[styles.modalTitle, { fontSize: titleFont }]}>
            {name}
          </Text>
          <Text style={[styles.modalDescription, { fontSize: probeFont }]}>{description}</Text>
        </View>
      )}
      {titleWidth !== null && done && (
        <View style={styles.modalContent}>
          <Text numberOfLines={1} style={[styles.modalTitle, { fontSize: titleFont }]}>
            {name}
          </Text>
          <Text style={[styles.modalDescription, { fontSize: range.lo }]}>{description}</Text>
          <View style={styles.modalSticker}>
            <StickerArt slug={slug} />
          </View>
        </View>
      )}
    </View>
  );
}

export default function BadgeWallScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stickers, setStickers] = useState<OwnedSticker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSticker, setSelectedSticker] = useState<OwnedSticker | null>(null);
  const contentSize = useContentSize();
  const contentInset = useContentInset();
  const layout = useMemo(
    () => getWallLayout(contentSize.width, contentSize.height, contentInset),
    [contentSize, contentInset]
  );

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      setIsLoading(true);

      Promise.all([getCurrentUser(), getStickerInventory()])
        .then(([user, inventory]) => {
          if (!isActive) {
            return;
          }
          setProfile(user);
          setStickers(inventory);
        })
        .catch(() => {
          if (isActive) {
            setStickers([]);
          }
        })
        .finally(() => {
          if (isActive) {
            setIsLoading(false);
          }
        });

      return () => {
        isActive = false;
      };
    }, [])
  );

  const data = useMemo<GridItem[]>(
    () => stickers.map((sticker, index) => ({ key: `${sticker.id}-${index}`, sticker })),
    [stickers]
  );

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        gestureState.dx > 20 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 80 && Math.abs(gestureState.dy) < 60) {
          router.back();
        }
      },
    })
  ).current;

  function handleStickerPress(sticker: OwnedSticker) {
    setSelectedSticker(sticker);
  }

  function renderItem({ item }: { item: GridItem }) {
    return (
      <Pressable
        onPress={() => handleStickerPress(item.sticker)}
        style={{ height: layout.cellSize, width: layout.cellSize }}>
        <StickerArt slug={item.sticker.sticker.slug} />
      </Pressable>
    );
  }


  return (
    <View style={styles.safeArea} {...panResponder.panHandlers}>
      {/* Fixed header: only the badge grid below scrolls. */}
      <View
        style={{
          paddingLeft: layout.paddingLeft,
          paddingRight: layout.paddingRight,
          paddingTop: layout.paddingTop,
        }}>
        <View style={[styles.ratioBlock, { height: layout.ratioBlockHeight }]}>
          {/* {profile.wins}/{profile.losses} */}
          <RatioText maxWidth={layout.ratioMaxWidth}>12W /13L </RatioText>
        </View>
        <View style={styles.nameRow}>
          <Text adjustsFontSizeToFit minimumFontScale={0.3} numberOfLines={1} style={styles.nameText}>
            penyee 7
          </Text>
          <FlameIcon height={FLAME_HEIGHT} width={FLAME_WIDTH} />
        </View>
        {/* <Text style={styles.sectionTitle}>My badges</Text> */}
      </View>
      <View style={styles.grid}>
        <FlatList
          columnWrapperStyle={styles.row}
          contentContainerStyle={[
            styles.gridContent,
            {
              paddingBottom: layout.gridPaddingBottom,
              paddingLeft: layout.paddingLeft,
              paddingRight: layout.paddingRight,
              paddingTop: layout.separatorHeight + GRID_TOP_GAP,
            },
          ]}
          data={data}
          keyExtractor={(item) => item.key}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No stickers yet. Win a game to earn your first.</Text>
            </View>
          }
          numColumns={NUM_COLUMNS}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
        />
        <SeparatorOverlay height={layout.separatorHeight} width={layout.separatorWidth} />
      </View>
      <Modal
        animationType="fade"
        onRequestClose={() => setSelectedSticker(null)}
        transparent
        visible={selectedSticker !== null}>
        <Pressable onPress={() => setSelectedSticker(null)} style={styles.modalBackdrop}>
          {selectedSticker && (
            <StickerPopup
              key={selectedSticker.id}
              description={
                getArchetype(selectedSticker.sticker.slug)?.description ?? 'A basketball sticker.'
              }
              name={selectedSticker.sticker.name}
              slug={selectedSticker.sticker.slug}
            />
          )}
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#F8FAFC',
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    flex: 1,
    justifyContent: 'center',
  },
  grid: {
    flex: 1,
  },
  ratioBlock: {
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginTop:-50
  },
  nameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 24,
    marginTop: -120,
  },
  nameText: {
    color: '#111827',
    // Shrinks the name (via adjustsFontSizeToFit) rather than pushing the flame off screen.
    flexShrink: 1,
    fontFamily: 'OneSanTest2',
    fontSize: 75,
    textAlign: 'center',
  },
  sectionTitle: {
    color: '#111827',
    fontFamily: 'OneSanTest2',
    fontSize: 40,
    marginBottom: 24,
    textAlign:'center'
  },
  ratioText: {
    color: '#111827',
    fontFamily: 'OneSanTest2',
    fontSize:180,
    textAlign: 'center',
    marginTop:-75
  },
  ratioMeasure: {
    opacity: 0,
    position: 'absolute',
    width: 10000,
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(248,250,252,0.92)',
    flex: 1,
    justifyContent: 'center',
    padding: 32,
  },
  modalContent: {
    alignItems: 'center',
    gap: 8,
    height: POPUP_INNER_HEIGHT,
    left: POPUP_INSET_X,
    position: 'absolute',
    top: POPUP_INSET_Y,
    width: POPUP_INNER_WIDTH,
  },
  modalSticker: {
    flex: 1,
    width: '100%',
  },
  modalProbe: {
    alignItems: 'center',
    gap: 8,
    left: POPUP_INSET_X,
    opacity: 0,
    position: 'absolute',
    top: POPUP_INSET_Y,
    width: POPUP_INNER_WIDTH,
  },
  modalMeasure: {
    alignItems: 'flex-start',
    opacity: 0,
    position: 'absolute',
    width: 10000,
  },
  modalTitle: {
    color: '#111827',
    fontFamily: 'OneSanTest2',
    fontSize: 35,
    textAlign: 'center',
  },
  modalDescription: {
    color: '#374151',
    fontFamily: 'OneSanTest2',
    fontSize: 23,
    textAlign: 'center',
  },
  ratioLabel: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  gridContent: {
    flexGrow: 1,
  },
  separatorOverlay: {
    left: 0,
    position: 'absolute',
    top: 0,
  },
  row: {
    gap: CELL_GAP,
    marginBottom: CELL_GAP,
  },
  empty: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});
