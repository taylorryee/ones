import { useState, type ReactNode } from 'react';
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

export type QuestionOption = { label: string; onPress: () => void };

// A question with a row of answers, over the whole window, in the popup frame. Each answer runs
// its onPress and then closes; a tap outside the frame just closes. The frame is fitted to the
// content's measured height. `children` are shown between the question and the answers.
export function QuestionPopup({
  children,
  onClose,
  options,
  question,
  visible,
}: {
  children?: ReactNode;
  onClose: () => void;
  options: QuestionOption[];
  question: string;
  visible: boolean;
}) {
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <Pressable onPress={onClose} style={styles.backdrop}>
        <PopupCard onClose={onClose} options={options} question={question}>
          {children}
        </PopupCard>
      </Pressable>
    </Modal>
  );
}

// The frame and its content. The Modal unmounts it when closed, so each opening measures from
// scratch instead of drawing the frame at the size of whatever was shown last.
function PopupCard({
  children,
  onClose,
  options,
  question,
}: {
  children?: ReactNode;
  onClose: () => void;
  options: QuestionOption[];
  question: string;
}) {
  const windowSize = useWindowDimensions();
  const width = Math.min(MAX_WIDTH, windowSize.width - SIDE_MARGIN * 2);
  const [size, setSize] = useState<Size | null>(null);

  return (
    <>
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
          {question}
        </Text>
        {children}
        {options.length > 0 && (
          <View style={styles.buttons}>
            {options.map((option) => (
              <Pressable
                hitSlop={12}
                key={option.label}
                onPress={() => {
                  option.onPress();
                  onClose();
                }}>
                <Text allowFontScaling={false} style={styles.button}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </Pressable>
    </>
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
    flexWrap: 'wrap',
    gap: 48,
    justifyContent: 'center',
  },
  button: {
    color: INK,
    fontFamily: FONT,
    fontSize: 28,
  },
});
