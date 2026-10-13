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

import SeparatingLine from '@/assets/seperating_line (Stroke).svg';
import StickerPopupFrame from '@/assets/sticker_popup (Stroke).svg';
import { useContentSize } from '@/components/ScreenBorder';
import { StickerArt } from '@/components/StickerArt';
import { getArchetype } from '@/constants/archetypes';
import { getCurrentUser, type UserProfile } from '@/services/auth';
import { getStickerInventory, type OwnedSticker } from '@/services/stickers';

const NUM_COLUMNS = 2;
const NUM_ROWS = 3;
const GRID_PADDING = 20;
const CELL_GAP = 40;

// The sticker popup is shown in a Modal, which covers the whole window rather than the framed area.
const WINDOW_WIDTH = Dimensions.get('window').width;

const RATIO_BASE_FONT_SIZE = 200;

// Sizes for everything drawn inside the screen border, based on the framed content area.
function getWallLayout(width: number, height: number) {
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
    separatorWidth: width,
    separatorHeight: (width * 36) / 516, // matches the seperating_line.svg viewBox
  };
}

type GridItem = { key: string; sticker: OwnedSticker };

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
  const layout = useMemo(
    () => getWallLayout(contentSize.width, contentSize.height),
    [contentSize]
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
      <FlatList
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.gridContent}
        data={data}
        keyExtractor={(item) => item.key}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No stickers yet. Win a game to earn your first.</Text>
          </View>
        }
        ListHeaderComponent={
          <>
            <View style={[styles.ratioBlock, { height: layout.ratioBlockHeight }]}>
              {/* {profile.wins}/{profile.losses} */}
              <RatioText maxWidth={layout.ratioMaxWidth}>12W /13L </RatioText>
            </View>
            <Text adjustsFontSizeToFit minimumFontScale={0.3} numberOfLines={1} style={styles.nameText}>
              penyee 7
            </Text>
            <SeparatingLine
              height={layout.separatorHeight}
              style={styles.separator}
              width={layout.separatorWidth}
            />
            <Text style={styles.sectionTitle}>My badges</Text>
          </>
        }
        numColumns={NUM_COLUMNS}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
      />
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
  ratioBlock: {
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  nameText: {
    color: '#111827',
    fontFamily: 'OneSanTest2',
    fontSize: 75,
    marginBottom: 24,
    textAlign: 'center',
    marginTop:-120
  },
  separator: {
    // Cancels the list's horizontal padding so the line spans edge to edge.
    marginHorizontal: -GRID_PADDING,
    marginBottom: 16,
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
    paddingBottom: 40,
    paddingHorizontal: GRID_PADDING,
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
