import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg from 'react-native-svg';

import { SKELETONS } from '@/components/art.generated';
import { InkPath } from '@/components/InkPath';
import { buildPath, fitCorners, insetsOf, type Size } from '@/components/skeleton';
import { FONT, INK, STROKE } from '@/constants/theme';

// Drawn in the same frame as StickerPopup: assets/skeletons/frames/popup-border.svg.
const FRAME = SKELETONS.popupBorder;
const CORNER = 55;
// Space kept between the innermost wobble of the line and the text.
const CONTENT_GAP = 16;
const CONTENT_INSET = insetsOf(FRAME, CORNER, STROKE.width / 2 + CONTENT_GAP);
const MAX_WIDTH = 300;
const SIDE_MARGIN = 48;

// Asks whether the player hooped on `date`, over the whole window. Yes calls onYes; No or a tap
// outside the frame closes it. The frame is fitted to the content's measured height.
export function HoopPopup({
  date,
  onYes,
  onClose,
}: {
  date: Date | null;
  onYes: (date: Date) => void;
  onClose: () => void;
}) {
  const windowSize = useWindowDimensions();
  const width = Math.min(MAX_WIDTH, windowSize.width - SIDE_MARGIN * 2);
  const [size, setSize] = useState<Size | null>(null);

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={date !== null}>
      <Pressable onPress={onClose} style={styles.backdrop}>
        {/* Swallows taps inside the frame so they don't close it. */}
        <Pressable
          onLayout={(e) => setSize(e.nativeEvent.layout)}
          style={[
            styles.card,
            {
              paddingBottom: CONTENT_INSET.bottom,
              paddingLeft: CONTENT_INSET.left,
              paddingRight: CONTENT_INSET.right,
              paddingTop: CONTENT_INSET.top,
              width,
            },
          ]}>
          {size && (
            <Svg
              height={size.height}
              style={StyleSheet.absoluteFill}
              viewBox={`0 0 ${size.width} ${size.height}`}
              width={size.width}>
              <InkPath d={buildPath(fitCorners(FRAME, size, CORNER))} />
            </Svg>
          )}
          <Text allowFontScaling={false} style={styles.question}>
            U hoop today?
          </Text>
          <View style={styles.buttons}>
            <Pressable
              hitSlop={12}
              onPress={() => {
                if (date) {
                  onYes(date);
                }
                onClose();
              }}>
              <Text allowFontScaling={false} style={styles.button}>
                Yes
              </Text>
            </Pressable>
            <Pressable hitSlop={12} onPress={onClose}>
              <Text allowFontScaling={false} style={styles.button}>
                No
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(248,250,252,0.92)',
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    alignItems: 'center',
    gap: 20,
  },
  question: {
    color: INK,
    fontFamily: FONT,
    fontSize: 32,
    textAlign: 'center',
  },
  buttons: {
    flexDirection: 'row',
    gap: 48,
  },
  button: {
    color: INK,
    fontFamily: FONT,
    fontSize: 28,
  },
});
