import { getArchetype } from '@/constants/archetypes';
import { OGSticker } from '@/components/OGSticker';

type Props = { slug: string };

export function StickerArt({ slug }: Props) {
  const archetype = getArchetype(slug);

  if (!archetype) {
    return <OGSticker height="100%" width="100%" />;
  }

  const Icon = archetype.icon;
  return <Icon height="100%" width="100%" />;
}
