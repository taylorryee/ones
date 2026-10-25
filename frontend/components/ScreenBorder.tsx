import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { SKELETONS } from '@/components/art.generated';
import { InkPath } from '@/components/InkPath';
import { buildPath, fitCorners, insetsOf, type Insets, type Size } from '@/components/skeleton';
import { PAPER, STROKE } from '@/constants/theme';

// assets/skeletons/screen-border.svg. Points this close to a source edge belong to a corner and
// are never stretched.
const BORDER = SKELETONS.screenBorder;
const CORNER = 115;
// Space kept between the innermost wobble of the line and the screen content.
const CONTENT_GAP = 12;
// Space between the screen edge and the frame; a few control points sit just outside the viewBox.
const FRAME_MARGIN = 6;

const CONTENT_INSET = insetsOf(BORDER, CORNER, STROKE.width / 2 + CONTENT_GAP);

// Drawn under the content so the backdrop only shows outside the line, not in the gap between
// the line's wobble and the content.
function BorderPaper({ d, size }: { d: string; size: Size }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg {...size} style={styles.svg} viewBox={`0 0 ${size.width} ${size.height}`}>
        <Path d={d} fill={PAPER} />
      </Svg>
    </View>
  );
}

// Drawn over the content: paints everything outside the line, so content can run right up to
// the line's wobble (and scroll under it) without ever showing past it.
function ScreenBorder({ d, size }: { d: string; size: Size }) {
  const outside = `M${-FRAME_MARGIN} ${-FRAME_MARGIN}H${size.width + FRAME_MARGIN}V${
    size.height + FRAME_MARGIN
  }H${-FRAME_MARGIN}Z`;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg {...size} style={styles.svg} viewBox={`0 0 ${size.width} ${size.height}`}>
        <Path d={outside + d} fill={PAPER} fillRule="evenodd" />
        <InkPath d={d} />
      </Svg>
    </View>
  );
}

const ContentSizeContext = createContext<Size>({ width: 0, height: 0 });
const ContentInsetContext = createContext<Insets>({ top: 0, right: 0, bottom: 0, left: 0 });

// Size of the area inside the border that screens are allowed to draw in.
export function useContentSize() {
  return useContext(ContentSizeContext);
}

// Distance from each edge of the screen area to the safe content area. Screens are padded by this
// by default; a screen that draws edge to edge (right up to the line) applies it itself.
export function useContentInset() {
  return useContext(ContentInsetContext);
}

// Draws the hand-drawn border once around the whole app. Screens fill the whole frame and are
// masked to the shape of the line, so content can never show outside it.
export function ScreenFrame({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [frameSize, setFrameSize] = useState<Size | null>(null);

  const borderPath = useMemo(
    () => frameSize && buildPath(fitCorners(BORDER, frameSize, CORNER)),
    [frameSize]
  );

  // The frame covers the whole screen, so content must clear both the line and the system UI.
  const contentInset = useMemo(
    () => ({
      top: Math.max(CONTENT_INSET.top, insets.top - FRAME_MARGIN + CONTENT_GAP),
      right: Math.max(CONTENT_INSET.right, insets.right - FRAME_MARGIN + CONTENT_GAP),
      bottom: Math.max(CONTENT_INSET.bottom, insets.bottom - FRAME_MARGIN + CONTENT_GAP),
      left: Math.max(CONTENT_INSET.left, insets.left - FRAME_MARGIN + CONTENT_GAP),
    }),
    [insets.top, insets.right, insets.bottom, insets.left]
  );

  const contentSize = useMemo(
    () =>
      frameSize && {
        width: frameSize.width - contentInset.left - contentInset.right,
        height: frameSize.height - contentInset.top - contentInset.bottom,
      },
    [frameSize, contentInset]
  );

  return (
    <View style={styles.root}>
      <View
        onLayout={(e) =>
          setFrameSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })
        }
        style={styles.frame}>
        {frameSize && contentSize && borderPath && (
          <>
            <BorderPaper d={borderPath} size={frameSize} />
            <View style={StyleSheet.absoluteFill}>
              <ContentInsetContext.Provider value={contentInset}>
                <ContentSizeContext.Provider value={contentSize}>{children}</ContentSizeContext.Provider>
              </ContentInsetContext.Provider>
            </View>
            <ScreenBorder d={borderPath} size={frameSize} />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: PAPER,
    flex: 1,
    padding: FRAME_MARGIN,
  },
  frame: {
    flex: 1,
  },
  svg: {
    overflow: 'visible',
  },
});
