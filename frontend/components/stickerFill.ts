// Closed shapes for filling a sticker, made from its drawn lines (see components/BadgeArt.tsx).
// Pure functions with no imports beyond the path parser, so Node can run the tests and
// scripts/art.mjs can use them.

import { parsePath, type Point } from './skeleton.ts';

// A drawn line's ends are this close, in artboard units, when it counts as joined to something:
// the hand-drawn outlines never quite meet.
const JOIN = 24;
// A drawing's open line only counts as an outline if its box covers this share of the artboard;
// smaller open lines (creases, eyes, a crosshair arm) are details and aren't filled.
const OUTLINE_SHARE = 0.02;

type Chain = Point[];

const start = (chain: Chain) => chain[0];
const end = (chain: Chain) => chain[chain.length - 1];
const gap = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);
// A cubic chain read backwards is still a cubic chain.
const reversed = (chain: Chain) => [...chain].reverse();

function boxArea(chain: Chain) {
  const xs = chain.map((point) => point[0]);
  const ys = chain.map((point) => point[1]);
  return (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
}

function toPath(contour: Chain[]) {
  let d = '';
  contour.forEach((chain, index) => {
    d += `${index === 0 ? 'M' : 'L'}${start(chain)[0]} ${start(chain)[1]}`;
    for (let i = 1; i < chain.length; i += 3) {
      d += `C${chain[i][0]} ${chain[i][1]} ${chain[i + 1][0]} ${chain[i + 1][1]} ${chain[i + 2][0]} ${chain[i + 2][1]}`;
    }
  });
  return `${d}Z`;
}

// The closed shapes a sticker's lines make. Lines whose ends meet (within JOIN) are chained into
// one outline, since a drawing is often an outline in two halves. Then a chain is filled if its
// own ends meet, or if it's big enough to be an outline, closing it with a straight edge. The rest
// are details and aren't filled.
export function stickerFills(strokes: readonly string[], canvas: number): string[] {
  const contours: Chain[][] = strokes
    .flatMap((d) => parsePath(d))
    .filter((chain) => chain.length > 1)
    .map((chain) => [chain]);

  const closes = (contour: Chain[]) =>
    gap(end(contour[contour.length - 1]), start(contour[0])) <= JOIN;

  // Chains only join other chains that aren't closed already, and only big ones, so a small detail
  // near the end of an outline can't be pulled into it.
  const big = (contour: Chain[]) =>
    contour.reduce((sum, chain) => sum + boxArea(chain), 0) >= canvas * canvas * OUTLINE_SHARE;

  let joined = true;
  while (joined) {
    joined = false;
    outer: for (let a = 0; a < contours.length; a++) {
      if (closes(contours[a]) || !big(contours[a])) {
        continue;
      }
      for (let b = 0; b < contours.length; b++) {
        if (a === b || closes(contours[b]) || !big(contours[b])) {
          continue;
        }
        const tail = end(contours[a][contours[a].length - 1]);
        const other = contours[b];
        const otherStart = start(other[0]);
        const otherEnd = end(other[other.length - 1]);
        let next: Chain[] | null = null;
        if (gap(tail, otherStart) <= JOIN) {
          next = [...contours[a], ...other];
        } else if (gap(tail, otherEnd) <= JOIN) {
          next = [...contours[a], ...[...other].reverse().map(reversed)];
        }
        if (next) {
          contours[a] = next;
          contours.splice(b, 1);
          joined = true;
          break outer;
        }
      }
    }
  }

  return contours.filter((contour) => closes(contour) || big(contour)).map(toPath);
}
