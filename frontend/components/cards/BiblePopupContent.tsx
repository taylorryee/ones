import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from 'react-native';

import { SeparatingLine } from '@/components/SeparatingLine';
import type { Size } from '@/components/skeleton';
import { FONT, INK } from '@/constants/theme';
import type { Quote } from '@/services/cards';

// Font sizes and spacing as shares of the popup's content width, so the book keeps its
// proportions on every phone. Long verses shrink to fit their page rather than being cut off.
const TITLE_SCALE = 0.09;
const TAB_SCALE = 0.06;
const TAB_GAP_SCALE = 0.05;
const REFERENCE_SCALE = 0.1;
const TODAY_SCALE = 0.045;
const TEXT_SCALE = 0.075;
const AUTHOR_SCALE = 0.055;
const PAGE_NUMBER_SCALE = 0.04;
// Faded tabs and page numbers, so the current verse stands out.
const FADED = 0.3;

const reference = (verse: Quote) => `${verse.chapter}:${verse.verse}`;

// The quote card's popup: the Book of Ones, one verse to a page. Pages flick by sideways, one at
// a time, the same way as the tabs; the tabs along the top show every verse and jump to the one tapped, and follow along as
// the pages move. Opens at `today`'s verse.
export function BiblePopupContent({
  size,
  verses,
  today,
}: {
  size: Size;
  verses: Quote[];
  today: Quote;
}) {
  const todayIndex = Math.max(
    0,
    verses.findIndex((verse) => reference(verse) === reference(today))
  );
  const [current, setCurrent] = useState(todayIndex);
  // The space left for pages under the header, known once the header has been laid out.
  const [pageHeight, setPageHeight] = useState<number | null>(null);
  const pages = useRef<FlatList<Quote>>(null);
  const tabs = useRef<ScrollViewInstance>(null);
  // Where each tab sits in its row, to keep the current one in view.
  const tabLayouts = useRef<{ x: number; width: number }[]>([]);

  // Centers the current tab, so the row follows the pages.
  useEffect(() => {
    const tab = tabLayouts.current[current];
    if (tab) {
      tabs.current?.scrollTo({ x: tab.x + tab.width / 2 - size.width / 2, animated: true });
    }
  }, [current, size.width]);

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const index = Math.round(event.nativeEvent.contentOffset.x / size.width);
    const clamped = Math.min(verses.length - 1, Math.max(0, index));
    if (clamped !== current) {
      setCurrent(clamped);
    }
  }

  function jumpTo(index: number) {
    setCurrent(index);
    pages.current?.scrollToIndex({ index, animated: true });
  }

  function renderPage({ item, index }: { item: Quote; index: number }) {
    return (
      <View
        style={[
          styles.page,
          { height: pageHeight ?? 0, width: size.width, paddingHorizontal: size.width * 0.04 },
        ]}>
        <Text
          allowFontScaling={false}
          style={[styles.text, { fontSize: size.width * REFERENCE_SCALE }]}>
          ONES {reference(item)}
        </Text>
        {index === todayIndex && (
          <Text
            allowFontScaling={false}
            style={[styles.text, styles.faded, { fontSize: size.width * TODAY_SCALE }]}>
            Today&apos;s verse
          </Text>
        )}
        <Text
          adjustsFontSizeToFit
          allowFontScaling={false}
          numberOfLines={9}
          style={[styles.text, styles.verse, { fontSize: size.width * TEXT_SCALE }]}>
          {item.text}
        </Text>
        <Text
          allowFontScaling={false}
          style={[styles.text, { fontSize: size.width * AUTHOR_SCALE }]}>
          — {item.author}
        </Text>
        <Text
          allowFontScaling={false}
          style={[
            styles.text,
            styles.faded,
            styles.pageNumber,
            { fontSize: size.width * PAGE_NUMBER_SCALE },
          ]}>
          {index + 1} of {verses.length}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ height: size.height, width: size.width }}>
      <View onLayout={(event) => setPageHeight(size.height - event.nativeEvent.layout.height)}>
        <Text
          adjustsFontSizeToFit
          allowFontScaling={false}
          numberOfLines={1}
          style={[styles.text, { fontSize: size.width * TITLE_SCALE }]}>
          The Book of Ones
        </Text>
        <ScrollView
          contentContainerStyle={[
            styles.tabs,
            { gap: size.width * TAB_GAP_SCALE, paddingHorizontal: size.width * TAB_GAP_SCALE },
          ]}
          horizontal
          ref={tabs}
          showsHorizontalScrollIndicator={false}>
          {verses.map((verse, index) => (
            <Pressable
              hitSlop={8}
              key={reference(verse)}
              onLayout={(event) => {
                tabLayouts.current[index] = event.nativeEvent.layout;
              }}
              onPress={() => jumpTo(index)}>
              <Text
                allowFontScaling={false}
                style={[
                  styles.text,
                  index !== current && styles.faded,
                  { fontSize: size.width * TAB_SCALE },
                ]}>
                {reference(verse)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <SeparatingLine width={size.width} />
      </View>
      {pageHeight !== null && pageHeight > 0 && (
        <FlatList
          data={verses}
          decelerationRate="fast"
          getItemLayout={(_, index) => ({ index, length: size.width, offset: size.width * index })}
          horizontal
          initialScrollIndex={todayIndex}
          keyExtractor={reference}
          onScroll={handleScroll}
          pagingEnabled
          ref={pages}
          renderItem={renderPage}
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  page: {
    alignItems: 'center',
    gap: 14,
    justifyContent: 'center',
  },
  verse: {
    marginVertical: 8,
  },
  pageNumber: {
    bottom: 8,
    position: 'absolute',
  },
  text: {
    color: INK,
    fontFamily: FONT,
    textAlign: 'center',
  },
  faded: {
    opacity: FADED,
  },
});
