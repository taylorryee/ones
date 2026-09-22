import Svg, { Circle, Text as SvgText } from 'react-native-svg';

import { getArchetype } from '@/constants/archetypes';
import { OGSticker } from '@/components/OGSticker';

type Props = { slug: string };

export function StickerArt({ slug }: Props) {
  const archetype = getArchetype(slug);

  if (!archetype) {
    return <OGSticker height="100%" width="100%" />;
  }

  return (
    <Svg height="100%" viewBox="0 0 100 100" width="100%">
      <Circle cx={50} cy={50} fill={archetype.color} r={46} stroke="black" strokeWidth={3} />
      <SvgText
        fill="white"
        fontSize={16}
        fontWeight="bold"
        textAnchor="middle"
        x={50}
        y={55}>
        {archetype.name.toUpperCase()}
      </SvgText>
    </Svg>
  );
}
