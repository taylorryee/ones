export type ArchetypeSlug = 'sniper' | 'slasher' | 'thinker' | 'bully';

export const ARCHETYPES: { slug: ArchetypeSlug; name: string; color: string; description: string }[] = [
  { slug: 'sniper', name: 'Sniper', color: '#2563EB', description: 'Lives beyond the arc.' },
  { slug: 'slasher', name: 'Slasher', color: '#DC2626', description: 'Attacks the rim.' },
  { slug: 'thinker', name: 'Thinker', color: '#7C3AED', description: 'Wins with IQ.' },
  { slug: 'bully', name: 'Bully', color: '#EA580C', description: 'Plays through contact.' },
];

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
