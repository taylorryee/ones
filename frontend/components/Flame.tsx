// Created by `npm run art` from assets/illustrations/flame.svg.
// This file is yours: edit it freely, the script never overwrites it. Re-exporting the SVG still
// updates the drawing. Delete the line below to take it out of the art gallery.
// art-gallery: illustration Flame flame
import FlameArt from '@/assets/illustrations/flame.svg';
import { ART } from '@/components/art.generated';

// A picture: it scales as a whole, lines included, and always keeps its proportions.
export function Flame({ width }: { width: number }) {
  const height = (width * ART.flame.height) / ART.flame.width;
  return <FlameArt height={height} width={width} />;
}
