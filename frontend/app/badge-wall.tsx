import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  getWallLayout,
  SHOWCASE_SLOTS,
  SIDE_PADDING,
} from '@/components/badgeWallLayout';
import { CardCarousel } from '@/components/CardCarousel';
import { GlassesGleam } from '@/components/GlassesGleam';
import { HoopPopup } from '@/components/HoopPopup';
import { badgeWallCards } from '@/components/cards/badgeWallCards';
import { MonthPager } from '@/components/MonthPager';
import { useContentInset, useContentSize } from '@/components/ScreenBorder';
import { SeparatingLine } from '@/components/SeparatingLine';
import { StickerArt } from '@/components/StickerArt';
import { StickerPopup } from '@/components/StickerPopup';
import { FONT, INK, PAPER } from '@/constants/theme';
import { dayKey, useDayFills } from '@/hooks/useDayFills';
import { getCurrentUser, type UserProfile } from '@/services/auth';
import { getBadgeWallContent, type BadgeWallContent } from '@/services/cards';
import { getPlayedTimes } from '@/services/matches';
import { getStickerInventory, type OwnedSticker } from '@/services/stickers';

// The scribble a day is filled with when the player says they hooped.
const HOOP_FILL_COLOR = '#F97316';

type RatioFit = { key: string; fontSize: number; baseline: number | null };

// Keeps the size the layout gives the Elo, and only shrinks it, by the smallest amount that fits,
// when the shown number is wider than the one the layout was sized for. The hidden copy in
// RatioText is measured at the size actually shown, so the result is verified rather than assumed
// to scale linearly; it re-measures until the width is within bounds. Also reports where the
// baseline lands from the top of the text, which differs between iOS and Android.
// Starts again from the layout's size whenever the text or the limits change.
function useRatioFontSize(text: string, maxWidth: number, maxFontSize: number) {
  const key = `${text}|${maxWidth}|${maxFontSize}`;
  const [fit, setFit] = useState<RatioFit>({ key, fontSize: maxFontSize, baseline: null });

  function handleMeasure(width: number, baseline: number) {
    setFit((current) => {
      const fontSize = current.key === key ? current.fontSize : maxFontSize;
      if (width > maxWidth) {
        const shrunk = Math.floor(fontSize * (maxWidth / width) * 0.995 * 10) / 10;
        return { key, fontSize: shrunk, baseline: null };
      }
      if (current.key === key && current.baseline === baseline) {
        return current;
      }
      return { key, fontSize, baseline };
    });
  }

  const current = fit.key === key ? fit : { fontSize: maxFontSize, baseline: null };
  return {
    fontSize: current.fontSize,
    baseline: current.baseline,
    handleMeasure,
  };
}

// Fitted to its box, so it ignores the system text size; the fit would undo it anyway.
function RatioText({
  children,
  fontSize,
  onMeasure,
}: {
  children: string;
  fontSize: number;
  onMeasure: (width: number, baseline: number) => void;
}) {
  return (
    <>
      {/* Hidden, very wide copy so the text is measured on one line at the shown size. */}
      <Text
        allowFontScaling={false}
        onTextLayout={(e) => {
          const line = e.nativeEvent.lines[0];
          // `ascender` is the distance from the top of the line to its baseline on both platforms
          // (iOS reports where the first glyph was actually placed), wherever each puts the line gap.
          if (line) {
            onMeasure(line.width, line.y + line.ascender);
          }
        }}
        style={[styles.ratioText, styles.ratioMeasure, { fontSize }]}>
        {children}
      </Text>
      <Text
        allowFontScaling={false}
        ellipsizeMode="clip"
        numberOfLines={1}
        style={[styles.ratioText, { fontSize }]}>
        {children}
      </Text>
    </>
  );
}

export default function BadgeWallScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stickers, setStickers] = useState<OwnedSticker[]>([]);
  const [selectedSticker, setSelectedSticker] = useState<OwnedSticker | null>(null);
  const [cardContent, setCardContent] = useState<BadgeWallContent | null>(null);
  const [playedTimes, setPlayedTimes] = useState<Date[] | null>(null);
  // Colored-in calendar days: dayFills.fillDay(date, color) scribbles one in.
  const dayFills = useDayFills();
  // The day whose "U hoop today?" popup is open.
  const [askedDay, setAskedDay] = useState<Date | null>(null);
  const today = new Date();
  const contentSize = useContentSize();
  const contentInset = useContentInset();
  const layout = useMemo(
    () => getWallLayout(contentSize, contentInset),
    [contentSize, contentInset]
  );
  const ratioText = profile ? String(profile.rating) : '';
  const ratio = useRatioFontSize(ratioText, layout.top.eloWidth, layout.top.eloFontSize);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

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
        });

      // Loaded on its own so a failure here doesn't empty the stickers. If it fails, the cards
      // keep what they last showed.
      getBadgeWallContent()
        .then((content) => {
          if (isActive) {
            setCardContent(content);
          }
        })
        .catch(() => {});

      // Also on its own; if it fails, the calendar shows month names without a count.
      getPlayedTimes()
        .then((times) => {
          if (isActive) {
            setPlayedTimes(times);
          }
        })
        .catch(() => {});

      return () => {
        isActive = false;
      };
    }, [])
  );

  // Vertical only, so it leaves the calendar's and the cards' sideways swipes alone.
  const swipeUpResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dy) > Math.abs(gesture.dx) && gesture.dy < -10,
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy < -60) {
            router.push('/play');
          }
        },
      }),
    []
  );

  function handleStickerPress(sticker: OwnedSticker) {
    setSelectedSticker(sticker);
  }

  // Asks about days that aren't colored in yet; a filled day does nothing for now.
  function handleDayPress(date: Date) {
    if (!dayFills.fills[dayKey(date)]) {
      setAskedDay(date);
    }
  }

  const { top, middle, bottom } = layout;

  // Shows the first owned stickers until players can choose which ones go here, except the right
  // slot, which always shows the goat: the owned one when there is one, so it opens its popup.
  const goat = stickers.find((owned) => owned.sticker.slug === 'goat');
  const showcase: (OwnedSticker | undefined)[] = stickers
    .filter((owned) => owned !== goat)
    .slice(0, SHOWCASE_SLOTS - 1);
  showcase[SHOWCASE_SLOTS - 1] = goat;

  return (
    <View
      {...swipeUpResponder.panHandlers}
      style={[styles.screen, { paddingBottom: contentInset.bottom, paddingTop: contentInset.top }]}>
      <View
        style={{
          height: top.height,
          paddingLeft: contentInset.left + SIDE_PADDING,
          paddingRight: contentInset.right + SIDE_PADDING,
          paddingTop: top.stackPadding,
        }}>
        {/* Only as tall as the Elo's baseline: the rest of its line hangs over the stickers. */}
        <View style={{ height: top.eloHeight, width: top.eloWidth }}>
          {/* Moves the measured baseline onto the bottom of the box, also when a wide number has
              shrunk. Hidden until measured, so it never shows overlapping the stickers. Absolute,
              so the box's height can't squeeze the text and clip the bottom of the digits. */}
          <View
            style={[
              styles.ratioLine,
              {
                opacity: ratio.baseline === null ? 0 : 1,
                top: ratio.baseline === null ? 0 : top.eloHeight - ratio.baseline,
              },
            ]}>
            <RatioText fontSize={ratio.fontSize} onMeasure={ratio.handleMeasure}>
              {ratioText}
            </RatioText>
          </View>
        </View>
        <View
          style={[
            styles.showcaseRow,
            {
              gap: top.showcaseGap,
              height: top.showcaseHeight,
              // Out of the side padding, so the outer stickers reach the content edge.
              marginHorizontal: -SIDE_PADDING,
              marginTop: top.showcaseGap,
            },
          ]}>
          {Array.from({ length: SHOWCASE_SLOTS }, (_, index) => {
            const sticker = showcase[index];
            const isGoatSlot = index === SHOWCASE_SLOTS - 1;
            const isMiddle = index === Math.floor(SHOWCASE_SLOTS / 2);
            const size = {
              height: top.slot,
              width: top.slot,
              marginTop: isMiddle ? top.slotDip : 0,
            };
            return sticker ? (
              <Pressable key={index} onPress={() => handleStickerPress(sticker)} style={size}>
                {sticker.sticker.slug === 'thinker' ? (
                  <GlassesGleam />
                ) : (
                  <StickerArt slug={sticker.sticker.slug} />
                )}
              </Pressable>
            ) : isGoatSlot ? (
              <View key={index} style={size}>
                <StickerArt slug="goat" />
              </View>
            ) : (
              <View key={index} style={[styles.showcaseSlot, size]} />
            );
          })}
        </View>
      </View>
      <View style={{ height: middle.height }}>
        <View style={{ marginTop: middle.calendarTop }}>
          <MonthPager
            fills={dayFills.fills}
            inset={contentInset.left}
            month={today.getMonth()}
            onFillDrawn={dayFills.finishFill}
            onPressDay={handleDayPress}
            pitch={layout.frameWidth}
            playedTimes={playedTimes}
            size={middle.calendar}
            year={today.getFullYear()}
          />
        </View>
        <Separator width={layout.frameWidth} />
      </View>
      <View style={{ height: bottom.height }}>
        <View style={{ marginTop: bottom.cardTop }}>
          <CardCarousel
            cards={badgeWallCards(cardContent, stickers)}
            inset={contentInset.left}
            pitch={layout.frameWidth}
            size={bottom.card}
          />
        </View>
        <Separator width={layout.frameWidth} />
      </View>
      <StickerPopup onClose={() => setSelectedSticker(null)} sticker={selectedSticker} />
      <HoopPopup
        date={askedDay}
        onClose={() => setAskedDay(null)}
        onYes={(date) => dayFills.fillDay(date, HOOP_FILL_COLOR)}
      />
    </View>
  );
}

// Sits at the top of its section and spans the whole frame, so its ends run under the border.
function Separator({ width }: { width: number }) {
  return (
    <View pointerEvents="none" style={styles.separator}>
      <SeparatingLine width={width} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: PAPER,
    flex: 1,
  },
  ratioLine: {
    alignItems: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
  },
  showcaseRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  showcaseSlot: {
    borderColor: '#9CA3AF',
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 2,
  },
  ratioText: {
    color: INK,
    fontFamily: FONT,
    textAlign: 'center',
  },
  ratioMeasure: {
    opacity: 0,
    position: 'absolute',
    width: 10000,
  },
  separator: {
    left: 0,
    position: 'absolute',
    top: 0,
  },
});
