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
import { OutlineNumber } from '@/components/OutlineNumber';
import { fitOutlineNumber } from '@/components/outlineDigits';
import { useContentInset, useContentSize } from '@/components/ScreenBorder';
import { SeparatingLine } from '@/components/SeparatingLine';
import { StickerArt } from '@/components/StickerArt';
import { StickerPopup } from '@/components/StickerPopup';
import { FONT, INK, PAPER } from '@/constants/theme';
import { dayKey, useDayFills } from '@/hooks/useDayFills';
import { getCurrentUser, type UserProfile } from '@/services/auth';
import { getBadgeWallContent, type BadgeWallContent } from '@/services/cards';
import { getActiveMatch, getPlayedTimes } from '@/services/matches';
import { getStickerInventory, type OwnedSticker } from '@/services/stickers';

// The scribble a day is filled with when the player says they hooped.
const HOOP_FILL_COLOR = '#F97316';
// The sticker each showcase slot shows, left to right, until players can choose: the owned one
// when there is one, so it opens its popup, otherwise just its picture. Thinker is the glasses.
const SHOWCASE_STICKERS = ['thinker', 'cone', 'goat'];

export default function BadgeWallScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stickers, setStickers] = useState<OwnedSticker[]>([]);
  const [selectedSticker, setSelectedSticker] = useState<OwnedSticker | null>(null);
  // The rotating card whose popup is open.
  const [openCard, setOpenCard] = useState<string | null>(null);
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
  // As large as the Elo's box allows, by its height or, for a long number, its width.
  const eloHeight = profile
    ? fitOutlineNumber(profile.rating, layout.top.eloBox.width, layout.top.eloBox.height)
    : 0;

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

  // Vertical only, so it leaves the calendar's and the cards' sideways swipes alone. Off while a
  // card's popup is open: touches in a Modal still reach this screen's responders, so scrolling
  // the popup would otherwise open the play screen.
  const swipeUpResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          openCard === null && Math.abs(gesture.dy) > Math.abs(gesture.dx) && gesture.dy < -10,
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy < -60) {
            router.push('/play');
          }
        },
      }),
    [openCard]
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

  // Dev only: opens the match screen. Without a match in progress, it opens a preview of the
  // Win/Loss picker instead.
  async function openTestMatch() {
    const match = await getActiveMatch().catch(() => null);
    router.push({ pathname: '/match/[id]', params: { id: match ? String(match.id) : 'preview' } });
  }

  const { top, middle, bottom } = layout;

  return (
    <View
      {...swipeUpResponder.panHandlers}
      style={[styles.screen, { paddingBottom: contentInset.bottom, paddingTop: contentInset.top }]}>
      <View
        style={{
          height: top.height,
          paddingLeft: contentInset.left + SIDE_PADDING,
          paddingRight: contentInset.right + SIDE_PADDING,
        }}>
        {/* Fills the space above the stickers, out of the side padding to the content edge. A
            number that doesn't fill it sits at the bottom, so the gap to the stickers stays the
            same. */}
        <View
          style={[
            styles.elo,
            {
              height: top.eloBox.height,
              marginHorizontal: -SIDE_PADDING,
              width: top.eloBox.width,
            },
          ]}>
          {profile && <OutlineNumber height={eloHeight} value={profile.rating} />}
        </View>
        <View
          style={[
            styles.showcaseRow,
            {
              gap: top.showcaseGap,
              height: top.showcaseHeight,
              // Out of the side padding, so the outer stickers reach the content edge.
              marginHorizontal: -SIDE_PADDING,
              marginTop: top.eloGap,
            },
          ]}>
          {Array.from({ length: SHOWCASE_SLOTS }, (_, index) => {
            const slug = SHOWCASE_STICKERS[index];
            const sticker = stickers.find((owned) => owned.sticker.slug === slug);
            const art = slug === 'thinker' ? <GlassesGleam /> : <StickerArt slug={slug} />;
            const isMiddle = index === Math.floor(SHOWCASE_SLOTS / 2);
            const size = {
              height: top.slot,
              width: top.slot,
              marginTop: isMiddle ? top.slotDip : 0,
            };
            return sticker ? (
              <Pressable key={index} onPress={() => handleStickerPress(sticker)} style={size}>
                {art}
              </Pressable>
            ) : (
              <View key={index} style={size}>
                {art}
              </View>
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
            onOpen={setOpenCard}
            openKey={openCard}
            inset={contentInset.left}
            pitch={layout.frameWidth}
            size={bottom.card}
          />
        </View>
        <Separator width={layout.frameWidth} />
      </View>
      {__DEV__ && (
        <Pressable
          hitSlop={12}
          onPress={openTestMatch}
          style={[styles.testButton, { right: contentInset.right + SIDE_PADDING, top: contentInset.top }]}>
          <Text style={styles.testButtonText}>Match (dev)</Text>
        </Pressable>
      )}
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
  elo: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  showcaseRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  separator: {
    left: 0,
    position: 'absolute',
    top: 0,
  },
  testButton: {
    position: 'absolute',
  },
  testButtonText: {
    color: INK,
    fontFamily: FONT,
    fontSize: 18,
    textDecorationLine: 'underline',
  },
});
