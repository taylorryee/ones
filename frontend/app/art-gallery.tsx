import { Redirect } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg from 'react-native-svg';

import { SKELETONS } from '@/components/art.generated';
import { BOX_RATIO, buildBoxPaths, DayBox } from '@/components/DayBox';
import { GALLERY } from '@/components/gallery.generated';
import { InkPath } from '@/components/InkPath';
import { buildPath, fitCorners } from '@/components/skeleton';
import { SEPARATOR_HEIGHT, SeparatingLine } from '@/components/SeparatingLine';
import { StickerArt } from '@/components/StickerArt';
import { ARCHETYPES } from '@/constants/archetypes';
import { FONT } from '@/constants/theme';
import { dayKey, useDayFills } from '@/hooks/useDayFills';

// Dev only: every hand-drawn component at its smallest, typical and largest sizes, so one
// screenshot per device shows line weight, clipping and corner shape. Components created by
// `npm run art` appear automatically at the top (from components/gallery.generated.tsx). Open it from the profile
// screen or with the frontend://art-gallery link. The red hairlines are each component's layout
// box; no stroke should be cut flat against one. The screen border is this screen's own frame.
const SEPARATOR_WIDTHS = [160, 240, 320];
// Smallest box on a 360dp Android, on the reference phone, and on a Pro Max.
const BOX_SIZES = [34, 40, 46];
const STICKER_SIZE = 64;
// Components created by `npm run art` are drawn at these shares of their Figma size.
const GALLERY_SCALES = [0.75, 1, 1.25];
// 264 is the popup's width on the smallest phones; 140 shows the corners left at full size while
// the sides shrink. The popup draws the frame with a corner size of 55.
const POPUP_WIDTHS = [140, 264];
const POPUP = SKELETONS.popupBorder;
// Tapping a scribble demo box cycles it through these.
const FILL_COLORS = ['#F97316', '#2563EB', '#16A34A'];

function Outlined({ children }: { children: React.ReactNode }) {
  return <View style={styles.outline}>{children}</View>;
}

export default function ArtGalleryScreen() {
  const dayFills = useDayFills();

  if (!__DEV__) {
    return <Redirect href="/" />;
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {GALLERY.map((item) => (
        <View key={item.name} style={styles.content}>
          <Text style={styles.heading}>{item.name}</Text>
          {GALLERY_SCALES.map((scale) => (
            <View key={scale} style={styles.row}>
              <Text style={styles.label}>{Math.round(scale * 100)}%</Text>
              <Outlined>{item.render(scale)}</Outlined>
            </View>
          ))}
        </View>
      ))}

      <Text style={styles.heading}>Separator</Text>
      {SEPARATOR_WIDTHS.map((width) => (
        <View key={width} style={styles.row}>
          <Text style={styles.label}>{width}</Text>
          <Outlined>
            <View style={{ height: SEPARATOR_HEIGHT, width }}>
              <SeparatingLine width={width} />
            </View>
          </Outlined>
        </View>
      ))}

      <Text style={styles.heading}>Day boxes</Text>
      {BOX_SIZES.map((size) => {
        const paths = buildBoxPaths(size);
        return (
          <View key={size} style={styles.row}>
            <Text style={styles.label}>{size}</Text>
            {[1, 2, 3].map((day) => (
              <Outlined key={day}>
                <View style={{ height: size * BOX_RATIO, width: size }}>
                  <DayBox day={day} onPress={() => {}} paths={paths} size={size} />
                </View>
              </Outlined>
            ))}
          </View>
        );
      })}

      <Text style={styles.heading}>Scribble fill (tap a box)</Text>
      {BOX_SIZES.map((size, row) => {
        const paths = buildBoxPaths(size);
        return (
          <View key={size} style={styles.row}>
            <Text style={styles.label}>{size}</Text>
            {[1, 2, 3, 4].map((day) => {
              // A made-up date per box, so every box has its own fill.
              const date = new Date(2000, row, day);
              const fill = dayFills.fills[dayKey(date)];
              const color = FILL_COLORS[(FILL_COLORS.indexOf(fill?.color ?? '') + 1) % 3];
              return (
                <Outlined key={day}>
                  <View style={{ height: size * BOX_RATIO, width: size }}>
                    <DayBox
                      day={day}
                      fill={fill}
                      onFillDrawn={() => dayFills.finishFill(date)}
                      onPress={() => dayFills.fillDay(date, color)}
                      paths={paths}
                      size={size}
                    />
                  </View>
                </Outlined>
              );
            })}
          </View>
        );
      })}

      <Text style={styles.heading}>Popup frame</Text>
      {POPUP_WIDTHS.map((width) => {
        const height = (width * POPUP.height) / POPUP.width;
        return (
          <View key={width} style={styles.row}>
            <Text style={styles.label}>{width}</Text>
            <Outlined>
              <Svg height={height} viewBox={`0 0 ${width} ${height}`} width={width}>
                <InkPath d={buildPath(fitCorners(POPUP, { width, height }, 55))} />
              </Svg>
            </Outlined>
          </View>
        );
      })}

      <Text style={styles.heading}>Stickers at {STICKER_SIZE}</Text>
      <View style={styles.wrap}>
        {ARCHETYPES.map((archetype) => (
          <Outlined key={archetype.slug}>
            <View style={{ height: STICKER_SIZE, width: STICKER_SIZE }}>
              <StickerArt slug={archetype.slug} />
            </View>
          </Outlined>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
    paddingBottom: 24,
  },
  heading: {
    color: '#111827',
    fontFamily: FONT,
    fontSize: 20,
    marginTop: 8,
  },
  label: {
    color: '#6B7280',
    fontSize: 12,
    width: 28,
  },
  outline: {
    borderColor: 'red',
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
