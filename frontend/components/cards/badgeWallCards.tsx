import type { CarouselCard } from '@/components/CardCarousel';
import { BadgesPopupContent } from '@/components/cards/BadgesPopupContent';
import { BiblePopupContent } from '@/components/cards/BiblePopupContent';
import { StatsCard } from '@/components/cards/StatsCard';
import { TextCard } from '@/components/cards/TextCard';
import type { BadgeWallContent, Quote } from '@/services/cards';
import type { OwnedSticker } from '@/services/stickers';

// Shown until the day's quote has loaded, and when it can't be.
const FALLBACK_QUOTE: Quote = {
  chapter: 1,
  verse: 1,
  text: "I've failed over and over and over again in my life. And that is why I succeed.",
  author: 'Michael Jordan',
};

// The cards that rotate at the bottom of the badge wall, in order, filled from `content` (null
// until it has loaded) and the player's `badges`. To add one, write a component in this folder
// that fills the size it's given (or reuse TextCard), add an entry here (with `popup` to open one
// when tapped) and, if it needs data from the server, a field to BadgeWallContent in
// services/cards.ts and backend/schemas/cards.py.
export function badgeWallCards(
  content: BadgeWallContent | null,
  badges: OwnedSticker[]
): CarouselCard[] {
  const quote = content?.quote ?? FALLBACK_QUOTE;
  return [
    {
      key: 'quote',
      render: (size) => (
        <TextCard
          body={`${quote.text} — ${quote.author}`}
          size={size}
          title={`ONES ${quote.chapter}:${quote.verse}`}
        />
      ),
      popup: (size) => (
        <BiblePopupContent size={size} today={quote} verses={content?.verses ?? [quote]} />
      ),
    },
    {
      key: 'stats',
      render: (size) => <StatsCard size={size} stats={content?.stats} />,
    },
    {
      key: 'badges',
      render: (size) => <TextCard size={size} title="Badges" />,
      popup: (size) => <BadgesPopupContent badges={badges} size={size} />,
    },
    {
      key: 'tournaments',
      render: (size) => <TextCard body="Coming soon" size={size} title="Tournaments" />,
    },
    {
      key: 'hoop-sessions',
      render: (size) => <TextCard body="Coming soon" size={size} title="Hoop sessions" />,
    },
  ];
}
