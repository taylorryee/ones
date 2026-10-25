import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg from 'react-native-svg';

import { SKELETONS } from '@/components/art.generated';
import { InkPath } from '@/components/InkPath';
import { buildPath, fitCorners, insetsOf, type Size } from '@/components/skeleton';
import { StickerArt } from '@/components/StickerArt';
import { FONT, STROKE } from '@/constants/theme';
import { getArchetype } from '@/constants/archetypes';
import { type OwnedSticker } from '@/services/stickers';

// The sticker popup is shown in a Modal, which covers the whole window rather than the framed area.
const POPUP_MARGIN = 32;

// assets/skeletons/popup-border.svg. Points this close to a source edge belong to a corner and
// are never stretched, so the corners look the same at every popup size.
const FRAME = SKELETONS.popupBorder;
const CORNER = 55;
// Space kept between the innermost wobble of the line and the text.
const CONTENT_GAP = 24;
// Distance from each side of the popup to its content, in points at every size.
const CONTENT_INSET = insetsOf(FRAME, CORNER, STROKE.width / 2 + CONTENT_GAP);

// The popup keeps the popup-border.svg proportions and fits the window, clear of the system UI.
function getPopupWidth(window: Size, safeArea: { top: number; bottom: number }) {
  const maxHeight = window.height - safeArea.top - safeArea.bottom - POPUP_MARGIN * 2;
  return Math.min(window.width - 96, (maxHeight * FRAME.width) / FRAME.height);
}

const POPUP_TITLE_MAX_FONT = 36;
const POPUP_DESC_MIN_FONT = 8;
const POPUP_DESC_MAX_FONT = 24;

// Fits the text inside the frame at the largest font size possible.
// The title shrinks until it fits on one line; the description size is found by binary
// search, measuring the wrapped text in a hidden copy of the same width as the frame interior.
// The search runs once per mount, so the parent remounts it (via `key`) when `width` changes.
function StickerPopupCard({
  name,
  description,
  slug,
  width,
}: {
  name: string;
  description: string;
  slug: string;
  width: number;
}) {
  const height = (width * FRAME.height) / FRAME.width;
  const innerWidth = width - CONTENT_INSET.left - CONTENT_INSET.right;
  const innerHeight = height - CONTENT_INSET.top - CONTENT_INSET.bottom;
  const frame = buildPath(fitCorners(FRAME, { width, height }, CORNER));
  // Text may use at most this much of the interior; the sticker fills whatever is left below it.
  const textMaxHeight = innerHeight * 0.6;

  const [titleWidth, setTitleWidth] = useState<number | null>(null);
  const [range, setRange] = useState({ lo: POPUP_DESC_MIN_FONT, hi: POPUP_DESC_MAX_FONT });

  const titleFont =
    titleWidth === null
      ? POPUP_TITLE_MAX_FONT
      : Math.min(
          POPUP_TITLE_MAX_FONT,
          Math.floor((POPUP_TITLE_MAX_FONT * innerWidth) / (titleWidth + 2))
        );
  const done = range.hi - range.lo < 1;
  const probeFont = (range.lo + range.hi) / 2;

  function handleProbeLayout(probeHeight: number) {
    setRange((r) =>
      probeHeight <= textMaxHeight ? { lo: (r.lo + r.hi) / 2, hi: r.hi } : { lo: r.lo, hi: (r.lo + r.hi) / 2 }
    );
  }

  return (
    <View style={{ height, width }}>
      <Svg height={height} viewBox={`0 0 ${width} ${height}`} width={width}>
        <InkPath d={frame} />
      </Svg>
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
          style={[styles.modalProbe, { left: CONTENT_INSET.left, top: CONTENT_INSET.top, width: innerWidth }]}>
          <Text numberOfLines={1} style={[styles.modalTitle, { fontSize: titleFont }]}>
            {name}
          </Text>
          <Text style={[styles.modalDescription, { fontSize: probeFont }]}>{description}</Text>
        </View>
      )}
      {titleWidth !== null && done && (
        <View
          style={[
            styles.modalContent,
            {
              height: innerHeight,
              left: CONTENT_INSET.left,
              top: CONTENT_INSET.top,
              width: innerWidth,
            },
          ]}>
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

// Shows the tapped sticker's name, description and art over the whole window; tapping anywhere closes it.
export function StickerPopup({
  sticker,
  onClose,
}: {
  sticker: OwnedSticker | null;
  onClose: () => void;
}) {
  const windowSize = useWindowDimensions();
  const safeArea = useSafeAreaInsets();
  const popupWidth = getPopupWidth(windowSize, safeArea);

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={sticker !== null}>
      <Pressable onPress={onClose} style={styles.modalBackdrop}>
        {sticker && (
          <StickerPopupCard
            key={`${sticker.id}-${popupWidth}`}
            description={getArchetype(sticker.sticker.slug)?.description ?? 'A basketball sticker.'}
            name={sticker.sticker.name}
            slug={sticker.sticker.slug}
            width={popupWidth}
          />
        )}
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(248,250,252,0.92)',
    flex: 1,
    justifyContent: 'center',
    padding: POPUP_MARGIN,
  },
  modalContent: {
    alignItems: 'center',
    gap: 8,
    position: 'absolute',
  },
  modalSticker: {
    flex: 1,
    width: '100%',
  },
  modalProbe: {
    alignItems: 'center',
    gap: 8,
    opacity: 0,
    position: 'absolute',
  },
  modalMeasure: {
    alignItems: 'flex-start',
    opacity: 0,
    position: 'absolute',
    width: 10000,
  },
  modalTitle: {
    color: '#111827',
    fontFamily: FONT,
    fontSize: 35,
    textAlign: 'center',
  },
  modalDescription: {
    color: '#374151',
    fontFamily: FONT,
    fontSize: 23,
    textAlign: 'center',
  },
});
