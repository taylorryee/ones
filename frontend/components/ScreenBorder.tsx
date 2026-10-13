import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

// Fills the whole screen behind the border and is cropped to fit, so it only shows in the gaps
// between the line and the screen edge. Swap the backdrop by replacing this file.
const BACKDROP = require('@/assets/backdrops/test.png');

// Copied from assets/screen_border.svg. Re-paste the `d` attribute (and the viewBox size)
// after re-exporting from Figma. The parser below expects only absolute M and C commands.
const BORDER_PATH =
  'M5.28906 13.1665C5.28906 13.4501 5.00031 39.9188 4.25215 81.6025C3.76592 108.693 4.32859 125.74 5.94062 138.721C7.42237 150.653 8.06156 174.73 7.18453 200.193C6.67852 214.883 6.38391 251.306 6.01617 294.8C5.8664 312.514 4.85234 340.423 4.66812 387.627C4.58406 409.168 4.42719 425.809 4.2782 447.008C3.95176 493.456 4.01352 526.476 4.56453 538.325C4.79013 543.177 5.37594 545.643 5.34437 583.662C5.31281 621.682 4.76625 695.174 4.59555 739.992C4.37184 798.726 5.68195 816.883 7.21656 823.649C8.34297 828.616 9.21352 842.695 10.2126 861.162C10.6026 868.371 32.6395 867.963 62.6661 868.462C82.7144 868.795 110.947 870.938 146.455 870.226C169.607 869.761 186.859 866.92 223.722 866.765C251.78 866.648 298.826 866.511 324.626 866.238C358.777 865.876 378.162 863.444 391.163 863.934C401.774 864.334 394.005 841.306 395.963 833.164C398.672 821.896 394.769 794.901 392.981 757.8C392.231 742.235 387.321 728.387 386.003 698.238C384.995 675.19 385.352 636.344 386.061 609.714C386.771 583.084 388.346 569.83 388.697 541.721C389.048 513.612 388.128 471.05 387.185 410.895C386.241 350.741 385.303 274.284 385.085 233.41C384.851 189.559 385.865 169.384 385.887 142.233C385.898 129.739 386.109 105.923 385.245 72.3119C384.559 45.6523 385.296 23.6932 385.909 12C386.052 9.26702 384.705 7.43306 383.286 6.10822C377.251 0.476089 363.526 2.83572 346.648 3.9615C303.334 6.85067 286.611 4.21525 268.334 6.14541C253.075 7.75679 240.263 5.77463 219.38 4.66779C172.202 2.16725 138.943 4.21869 134.726 5.11838C130.593 6.00002 91.7662 5.51056 35.1674 5.00084C13.1361 5.67447 8.8857 7.31541 5.25367 9.76666C3.7125 11.2331 2.78438 13.1512 2.5 20.5571';
const SOURCE_WIDTH = 400;
const SOURCE_HEIGHT = 873;

const STROKE_WIDTH = 5;
// Points this close to a source edge belong to a corner and are never stretched.
const CORNER = 40;
// Space kept between the innermost wobble of the line and the screen content.
const CONTENT_GAP = 12;
// Space between the safe area and the frame; a few control points sit just outside the viewBox.
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

function ScreenBorder({ d, size }: { d: string; size: Size }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg {...size} style={styles.svg} viewBox={`0 0 ${size.width} ${size.height}`}>
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

const ContentSizeContext = createContext<Size>({ width: 0, height: 0 });

// Size of the area inside the border that screens are allowed to draw in.
export function useContentSize() {
  return useContext(ContentSizeContext);
}

// Draws the hand-drawn border once around the whole app and clips every screen to the area
// inside it, so content can never scroll or animate over the line.
export function ScreenFrame({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [frameSize, setFrameSize] = useState<Size | null>(null);

  const borderPath = useMemo(
    () => frameSize && buildBorderPath(frameSize.width, frameSize.height),
    [frameSize]
  );

  const contentSize = useMemo(
    () =>
      frameSize && {
        width: frameSize.width - CONTENT_INSET.left - CONTENT_INSET.right,
        height: frameSize.height - CONTENT_INSET.top - CONTENT_INSET.bottom,
      },
    [frameSize]
  );

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top + FRAME_MARGIN,
          paddingRight: insets.right + FRAME_MARGIN,
          paddingBottom: insets.bottom + FRAME_MARGIN,
          paddingLeft: insets.left + FRAME_MARGIN,
        },
      ]}>
      <Image resizeMode="cover" source={BACKDROP} style={StyleSheet.absoluteFill} />
      <View
        onLayout={(e) =>
          setFrameSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })
        }
        style={styles.frame}>
        {frameSize && contentSize && borderPath && (
          <>
            <BorderPaper d={borderPath} size={frameSize} />
            <View style={styles.content}>
              <ContentSizeContext.Provider value={contentSize}>{children}</ContentSizeContext.Provider>
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
  },
  frame: {
    flex: 1,
  },
  content: {
    ...CONTENT_INSET,
    overflow: 'hidden',
    position: 'absolute',
  },
  svg: {
    overflow: 'visible',
  },
});
