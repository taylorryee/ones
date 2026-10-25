import type { CarouselCard } from '@/components/CardCarousel';
import { TextCard } from '@/components/cards/TextCard';

// The cards that rotate at the bottom of the badge wall, in order. To add one, write a component
// in this folder that fills the size it's given (or reuse TextCard) and add an entry here.
export const BADGE_WALL_CARDS: CarouselCard[] = [
  {
    key: 'quote',
    render: (size) => (
      <TextCard
        body="I've failed over and over and over again in my life. And that is why I succeed. — Michael Jordan"
        size={size}
        title="Quote of the day"
      />
    ),
  },
  {
    key: 'weekly-stats',
    render: (size) => <TextCard body="Coming soon" size={size} title="Weekly stats" />,
  },
  {
    key: 'hoop-sessions',
    render: (size) => <TextCard body="Coming soon" size={size} title="Hoop sessions" />,
  },
];
