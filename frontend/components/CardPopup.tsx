import { useMemo, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { SKELETONS } from '@/components/art.generated';
import { InkPath } from '@/components/InkPath';
import { buildPath, fitCorners, insetsOf, type Size } from '@/components/skeleton';
import { PAPER, STROKE } from '@/constants/theme';

// Drawn in the same frame as StickerPopup: assets/skeletons/frames/popup-border.svg.
const FRAME = SKELETONS.popupBorder;
const CORNER = 55;
// Space kept between the innermost wobble of the line and the content.
const CONTENT_GAP = 8;
const CONTENT_INSET = insetsOf(FRAME, CORNER, STROKE.width / 2 + CONTENT_GAP);
// Space between the frame and the window edges, clear of the system UI.
const MARGIN = 24;

// The popup a carousel card opens: a frame that nearly fills the window, solid inside the line and
// see-through outside it. `render` draws the content at `size`, the space inside the line; content
// is clipped there, so it can scroll. Tapping outside the frame closes it.
export function CardPopup({
  render,
  onClose,
}: {
  render: ((size: Size) => ReactNode) | null;
  onClose: () => void;
}) {
  const windowSize = useWindowDimensions();
  const safeArea = useSafeAreaInsets();
  const width = windowSize.width - MARGIN * 2;
  const height = windowSize.height - safeArea.top - safeArea.bottom - MARGIN * 2;
  const content = useMemo(
    () => ({
      width: Math.max(0, width - CONTENT_INSET.left - CONTENT_INSET.right),
      height: Math.max(0, height - CONTENT_INSET.top - CONTENT_INSET.bottom),
    }),
    [width, height]
  );
  const frame = buildPath(fitCorners(FRAME, { width, height }, CORNER));

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={render !== null}>
      <View style={styles.backdrop}>
        <Pressable onPress={onClose} style={StyleSheet.absoluteFill} />
        <View style={{ height, width }}>
          <Svg height={height} viewBox={`0 0 ${width} ${height}`} width={width}>
            {/* Paper inside the line, so only the backdrop outside the frame is see-through. */}
            <Path d={frame} fill={PAPER} />
            <InkPath d={frame} />
          </Svg>
          <View
            style={[
              styles.content,
              { left: CONTENT_INSET.left, top: CONTENT_INSET.top, ...content },
            ]}>
            {render?.(content)}
          </View>
        </View>
      </View>
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
  content: {
    overflow: 'hidden',
    position: 'absolute',
  },
});
