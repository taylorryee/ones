import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

// Fills the whole screen behind the border and is cropped to fit, so it only shows in the gaps
// between the line and the screen edge. Swap the backdrop by replacing this file.
const BACKDROP = require('@/assets/backdrops/test.png');

// Copied from assets/backdrops/roundedBorderv2.svg. Re-paste the `d` attribute (and the viewBox size)
// after re-exporting from Figma. The parser below expects only absolute M and C commands.
const BORDER_PATH =
  'M2.5 99.8771C2.5 117.616 3.96438 161.031 5.53395 171.919C5.84429 174.071 5.94953 176.104 6.11078 200.866C6.27203 225.627 6.41125 273.065 6.72789 299.197C7.19077 337.399 10.0703 353.414 11.3034 362.932C11.6373 365.509 11.9228 368.591 11.2989 396.448C10.675 424.305 9.07656 476.849 8.45551 504.923C7.79011 535.002 9.54055 539.205 10.7541 563.318C11.8594 585.281 10.8306 627.095 10.4981 650.547C10.0043 685.374 8.94828 704.367 9.63336 716.646C10.1931 726.679 14.6758 738.979 26.3883 752.764C38.1216 766.573 45.9041 772.892 54.8086 779.679C67.388 789.267 85.4753 791.049 95.6214 792.675C127.632 797.806 184.879 793.295 194.448 792.37C215.014 790.382 262.891 790.633 281.424 787.244C296.279 784.527 306.257 771.185 320.587 757.42C328.355 749.959 332.895 740.504 337.808 726.512C341.086 717.177 341.043 710.053 341.046 684.995C341.049 661.906 339.59 617.769 338.846 588.342C337.765 545.54 336.975 528.063 336.37 514.806C335.235 489.959 335.543 468.672 334.569 456.554C333.428 442.352 333.712 431.921 333.146 394.875C332.618 360.382 332.953 294.012 332.837 254.349C332.689 203.735 331.618 183.852 330.398 169.119C329.144 153.977 327.193 128.374 326.637 107.847C326.118 88.7295 319.501 74.7808 312.289 60.1036C304.283 43.8101 297.478 34.1704 291.667 24.8879C286.035 15.89 277.846 10.8736 267.694 7.79149C256.639 4.43534 247.741 4.9627 231.914 3.8479C188.313 0.776876 178.751 3.73661 165.014 5.02552C139.464 7.42278 101.549 6.35895 69.1544 6.5272C55.909 6.59599 45.8453 17.5885 38.7039 25.482C31.4432 33.5073 26.448 49.2332 17.3479 62.9574C10.2254 73.6992 5.93609 84.0935 4.42562 93.8329C4.14437 96.054 3.77312 98.3949 3.67211 104.827C3.57109 111.258 3.75156 121.71 4.35938 135.111';
const SOURCE_WIDTH = 344;
const SOURCE_HEIGHT = 798;

const STROKE_WIDTH = 5;
// Points this close to a source edge belong to a corner and are never stretched.
const CORNER = 115;
// Space kept between the innermost wobble of the line and the screen content.
const CONTENT_GAP = 12;
// Space between the screen edge and the frame; a few control points sit just outside the viewBox.
const FRAME_MARGIN = 6;

export const SCREEN_BACKGROUND = '#F8FAFC';

const SOURCE_NUMBERS = BORDER_PATH.match(/-?\d*\.?\d+/g)!.map(Number);
const SOURCE_POINTS: [number, number][] = [];
for (let i = 0; i < SOURCE_NUMBERS.length; i += 2) {
  SOURCE_POINTS.push([SOURCE_NUMBERS[i], SOURCE_NUMBERS[i + 1]]);
}

function isInMiddle(value: number, size: number) {
  return value > CORNER && value < size - CORNER;
}

// The edges only ever sit in the corner zones across their own direction, so these
// insets are the same on every screen size.
const LEFT_EDGE = SOURCE_POINTS.filter(([x, y]) => isInMiddle(y, SOURCE_HEIGHT) && x < SOURCE_WIDTH / 2);
const RIGHT_EDGE = SOURCE_POINTS.filter(([x, y]) => isInMiddle(y, SOURCE_HEIGHT) && x > SOURCE_WIDTH / 2);
const TOP_EDGE = SOURCE_POINTS.filter(([x, y]) => isInMiddle(x, SOURCE_WIDTH) && y < SOURCE_HEIGHT / 2);
const BOTTOM_EDGE = SOURCE_POINTS.filter(([x, y]) => isInMiddle(x, SOURCE_WIDTH) && y > SOURCE_HEIGHT / 2);
const INSET_PADDING = STROKE_WIDTH / 2 + CONTENT_GAP;

const CONTENT_INSET = {
  left: Math.max(...LEFT_EDGE.map(([x]) => x)) + INSET_PADDING,
  right: SOURCE_WIDTH - Math.min(...RIGHT_EDGE.map(([x]) => x)) + INSET_PADDING,
  top: Math.max(...TOP_EDGE.map(([, y]) => y)) + INSET_PADDING,
  bottom: SOURCE_HEIGHT - Math.min(...BOTTOM_EDGE.map(([, y]) => y)) + INSET_PADDING,
};

// Corners keep their original shape and position; only the stretch between them grows or shrinks.
function remap(value: number, sourceSize: number, targetSize: number) {
  if (value <= CORNER) {
    return value;
  }
  if (value >= sourceSize - CORNER) {
    return value + targetSize - sourceSize;
  }
  return CORNER + ((value - CORNER) * (targetSize - CORNER * 2)) / (sourceSize - CORNER * 2);
}

function buildBorderPath(width: number, height: number) {
  const points = SOURCE_POINTS.map(
    ([x, y]) =>
      `${remap(x, SOURCE_WIDTH, width).toFixed(2)} ${remap(y, SOURCE_HEIGHT, height).toFixed(2)}`
  );
  let d = `M${points[0]}`;
  for (let i = 1; i < points.length; i += 3) {
    d += `C${points[i]} ${points[i + 1]} ${points[i + 2]}`;
  }
  return d;
}

// Drawn under the content so the backdrop only shows outside the line, not in the gap between
// the line's wobble and the content.
function BorderPaper({ d, size }: { d: string; size: Size }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg {...size} style={styles.svg} viewBox={`0 0 ${size.width} ${size.height}`}>
        <Path d={d} fill={SCREEN_BACKGROUND} />
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
        <Path d={outside + d} fill={SCREEN_BACKGROUND} fillRule="evenodd" />
        <Path
          d={d}
          fill="none"
          stroke="black"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={STROKE_WIDTH}
        />
      </Svg>
    </View>
  );
}

type Size = { width: number; height: number };

type Insets = { top: number; right: number; bottom: number; left: number };

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
    () => frameSize && buildBorderPath(frameSize.width, frameSize.height),
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
      {/* <Image resizeMode="cover" source={BACKDROP} style={StyleSheet.absoluteFill} /> */}
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
    backgroundColor: SCREEN_BACKGROUND,
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
