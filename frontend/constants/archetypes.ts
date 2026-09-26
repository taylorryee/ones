import type { FC } from 'react';
import type { SvgProps } from 'react-native-svg';

import BullyIcon from '@/assets/stickers/bully.svg';
import SlasherIcon from '@/assets/stickers/slasher.svg';
import SniperIcon from '@/assets/stickers/sniper.svg';
import ThinkerIcon from '@/assets/stickers/thinker.svg';
import ConeIcon from '@/assets/stickers/cone.svg';
import GoatIcon from '@/assets/stickers/goat.svg';
import LockdownIcon from '@/assets/stickers/lockdown.svg';
import TrashIcon from '@/assets/stickers/trash.svg';

export type ArchetypeSlug = 'sniper' | 'slasher' | 'thinker' | 'bully' | 'cone' | 'lockdown' | 'goat' | 'trash';

export const ARCHETYPES: {
  slug: ArchetypeSlug;
  name: string;
  description: string;
  icon: FC<SvgProps>;
}[] = [
  { slug: 'sniper', name: 'Sniper',  description: 'Green guy', icon: SniperIcon },
  { slug: 'slasher', name: 'Slasher',  description: 'The best archetype', icon: SlasherIcon },
  { slug: 'thinker', name: 'Thinker', description: '4D hoops', icon: ThinkerIcon },
  { slug: 'bully', name: 'Bully',  description: 'Big dawg', icon: BullyIcon },
  { slug: 'cone', name: 'Cone',  description: 'Luka that u??', icon: ConeIcon},
  { slug: 'goat', name: 'Goat',  description: 'baaa', icon: GoatIcon},
  { slug: 'lockdown', name: 'Lockdown',  description: 'Free mee', icon: LockdownIcon},
  { slug: 'trash', name: 'Trash',  description: 'U cut bru', icon: TrashIcon},
]

export type QuizQuestion = {
  prompt: string;
  options: [{ label: string; archetype: ArchetypeSlug }, { label: string; archetype: ArchetypeSlug }];
};

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  { prompt: 'Bron or MJ?', options: [{ label: 'Bron', archetype: 'bully' }, { label: 'MJ', archetype: 'slasher' }] },
  { prompt: 'Curry or Magic?', options: [{ label: 'Curry', archetype: 'sniper' }, { label: 'Magic', archetype: 'thinker' }] },
  { prompt: 'Middy or 3?', options: [{ label: 'Middy', archetype: 'slasher' }, { label: '3', archetype: 'sniper' }] },
  { prompt: 'Post up or pull up?', options: [{ label: 'Post up', archetype: 'bully' }, { label: 'Pull up', archetype: 'sniper' }] },
  { prompt: 'Dunk or dime?', options: [{ label: 'Dunk', archetype: 'slasher' }, { label: 'Dime', archetype: 'thinker' }] },
  { prompt: 'Shaq or Jokić?', options: [{ label: 'Shaq', archetype: 'bully' }, { label: 'Jokić', archetype: 'thinker' }] },
];

export function getArchetypeFromAnswers(answers: ArchetypeSlug[]): ArchetypeSlug {
  const tallies = new Map<ArchetypeSlug, number>();
  for (const answer of answers) {
    tallies.set(answer, (tallies.get(answer) ?? 0) + 1);
  }

  let best = ARCHETYPES[0].slug;
  let bestCount = -1;
  for (const archetype of ARCHETYPES) {
    const count = tallies.get(archetype.slug) ?? 0;
    if (count > bestCount) {
      bestCount = count;
      best = archetype.slug;
    }
  }

  return best;
}

export function getArchetype(slug: string) {
  return ARCHETYPES.find((archetype) => archetype.slug === slug) ?? null;
}
