// Geometry for skeleton art: Figma paths that are moved to fit the size a device actually has
// and redrawn with a fixed stroke. See ART.md. Pure functions with no imports, so Node can run
// the tests and scripts/art.mjs can use the parser.

export type Point = [number, number];
export type Size = { width: number; height: number };
export type Insets = { top: number; right: number; bottom: number; left: number };

// One subpath is an absolute cubic chain: [p0, c1, c2, p1, c1, c2, p2, ...].
export type Skeleton = Size & { strokeWidth: number; paths: Point[][] };

const COMMAND = /[MmLlHhVvCcSsQqTtZzAa]|-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;

function lineTo(from: Point, to: Point): Point[] {
  return [
    [from[0] + (to[0] - from[0]) / 3, from[1] + (to[1] - from[1]) / 3],
    [from[0] + ((to[0] - from[0]) * 2) / 3, from[1] + ((to[1] - from[1]) * 2) / 3],
    to,
  ];
}

// Reads any SVG path made of M/L/H/V/C/S/Q/T/Z commands (absolute or relative) into absolute
// cubic chains. Straight segments become cubics with control points at 1/3 and 2/3. Throws on
// arcs and anything else it doesn't understand, instead of producing wrong geometry.
export function parsePath(d: string): Point[][] {
  const tokens = d.match(COMMAND) ?? [];
  const paths: Point[][] = [];
  let current: Point[] | null = null;
  let pen: Point = [0, 0];
  let start: Point = [0, 0];
  // Last control point, for the smooth commands (S and T).
  let lastCubic: Point | null = null;
  let lastQuad: Point | null = null;
  let command = '';
  let i = 0;

  const number = () => {
    const token = tokens[i++];
    if (token === undefined || /^[A-Za-z]$/.test(token)) {
      throw new Error(`Path ends early after "${command}"`);
    }
    return Number(token);
  };
  const point = (relative: boolean): Point => {
    const x = number();
    const y = number();
    return relative ? [pen[0] + x, pen[1] + y] : [x, y];
  };
  const chain = () => {
    if (!current) {
      throw new Error(`"${command}" before any M`);
    }
    return current;
  };

  while (i < tokens.length) {
    if (/^[A-Za-z]$/.test(tokens[i])) {
      command = tokens[i++];
    } else if (!command) {
      throw new Error('Path starts with a number');
    }
    const relative = command === command.toLowerCase();
    const kind = command.toUpperCase();

    if (kind === 'Z') {
      if (current && (pen[0] !== start[0] || pen[1] !== start[1])) {
        current.push(...lineTo(pen, start));
      }
      pen = start;
      lastCubic = lastQuad = null;
      command = '';
      continue;
    }

    if (kind === 'M') {
      pen = start = point(relative);
      current = [pen];
      paths.push(current);
      // Extra coordinate pairs after M are line segments.
      command = relative ? 'l' : 'L';
      lastCubic = lastQuad = null;
    } else if (kind === 'L' || kind === 'H' || kind === 'V') {
      let to: Point;
      if (kind === 'L') {
        to = point(relative);
      } else if (kind === 'H') {
        const x = number();
        to = [relative ? pen[0] + x : x, pen[1]];
      } else {
        const y = number();
        to = [pen[0], relative ? pen[1] + y : y];
      }
      chain().push(...lineTo(pen, to));
      pen = to;
      lastCubic = lastQuad = null;
    } else if (kind === 'C' || kind === 'S') {
      const c1: Point =
        kind === 'C'
          ? point(relative)
          : lastCubic
            ? [2 * pen[0] - lastCubic[0], 2 * pen[1] - lastCubic[1]]
            : pen;
      const c2 = point(relative);
      const to = point(relative);
      chain().push(c1, c2, to);
      pen = to;
      lastCubic = c2;
      lastQuad = null;
    } else if (kind === 'Q' || kind === 'T') {
      const q: Point =
        kind === 'Q'
          ? point(relative)
          : lastQuad
            ? [2 * pen[0] - lastQuad[0], 2 * pen[1] - lastQuad[1]]
            : pen;
      const to = point(relative);
      chain().push(
        [pen[0] + ((q[0] - pen[0]) * 2) / 3, pen[1] + ((q[1] - pen[1]) * 2) / 3],
        [to[0] + ((q[0] - to[0]) * 2) / 3, to[1] + ((q[1] - to[1]) * 2) / 3],
        to
      );
      pen = to;
      lastQuad = q;
      lastCubic = null;
    } else {
      throw new Error(`Unsupported path command "${command}" (convert arcs to curves in Figma)`);
    }
  }
  return paths;
}

// Writes cubic chains back as a path string, rounded to 0.01pt.
export function buildPath(paths: Point[][]): string {
  let d = '';
  for (const path of paths) {
    const points = path.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`);
    d += `M${points[0]}`;
    for (let i = 1; i < points.length; i += 3) {
      d += `C${points[i]} ${points[i + 1]} ${points[i + 2]}`;
    }
  }
  return d;
}

function cubicAt(p0: Point, c1: Point, c2: Point, p1: Point, t: number): Point {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p1[0],
    u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p1[1],
  ];
}

// Length of the drawn curve, summed over short straight pieces of every segment.
export function pathLength(paths: Point[][]): number {
  let length = 0;
  for (const path of paths) {
    for (let i = 0; i + 3 < path.length; i += 3) {
      let previous = path[i];
      for (let step = 1; step <= 16; step++) {
        const point = cubicAt(path[i], path[i + 1], path[i + 2], path[i + 3], step / 16);
        length += Math.hypot(point[0] - previous[0], point[1] - previous[1]);
        previous = point;
      }
    }
  }
  return length;
}

// Bounds of the drawn curve (not its control points), sampled along every segment.
export function boundsOf(paths: Point[][]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const path of paths) {
    for (let i = 0; i + 3 < path.length; i += 3) {
      for (let step = 0; step <= 24; step++) {
        const [x, y] = cubicAt(path[i], path[i + 1], path[i + 2], path[i + 3], step / 24);
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  return { minX, minY, maxX, maxY };
}

// Fit rule for lines: x is scaled so the first and last points land on 0 and `width`. y is
// unchanged, so the wave and the height are the same on every device.
export function fitSpan(skeleton: Skeleton, width: number): Point[][] {
  const first = skeleton.paths[0][0][0];
  const lastPath = skeleton.paths[skeleton.paths.length - 1];
  const last = lastPath[lastPath.length - 1][0];
  return skeleton.paths.map((path) =>
    path.map(([x, y]): Point => [((x - first) * width) / (last - first), y])
  );
}

// Corners fixed, middle stretched, on one axis. Values within `corner` of either source edge
// keep their distance to that edge; values between the corner zones are stretched linearly.
function remapAxis(value: number, sourceSize: number, targetSize: number, corner: number) {
  if (targetSize < corner * 2) {
    // The corner zones would overlap and fold the path, so scale the whole axis instead.
    return (value * targetSize) / sourceSize;
  }
  if (value <= corner) {
    return value;
  }
  if (value >= sourceSize - corner) {
    return value + targetSize - sourceSize;
  }
  return corner + ((value - corner) * (targetSize - corner * 2)) / (sourceSize - corner * 2);
}

// Fit rule for frames: corners keep their exact shape and position, only the stretch between
// them grows or shrinks. On an axis shorter than 2 × `corner` it falls back to uniform scaling.
export function fitCorners(skeleton: Skeleton, target: Size, corner: number): Point[][] {
  return skeleton.paths.map((path) =>
    path.map(([x, y]): Point => [
      remapAxis(x, skeleton.width, target.width, corner),
      remapAxis(y, skeleton.height, target.height, corner),
    ])
  );
}

// Fit rule for small fixed-aspect shapes: the drawn curve is scaled evenly to the largest size
// that fits `target` with `pad` left on every side (pad ≥ half the stroke keeps the line inside
// the box), and centred.
export function fitUniform(skeleton: Skeleton, target: Size, pad: number): Point[][] {
  const { minX, minY, maxX, maxY } = boundsOf(skeleton.paths);
  // Never negative, so a box smaller than its padding collapses instead of drawing mirrored.
  const scale = Math.max(
    0,
    Math.min((target.width - pad * 2) / (maxX - minX), (target.height - pad * 2) / (maxY - minY))
  );
  const offsetX = (target.width - (maxX - minX) * scale) / 2;
  const offsetY = (target.height - (maxY - minY) * scale) / 2;
  return skeleton.paths.map((path) =>
    path.map(([x, y]): Point => [offsetX + (x - minX) * scale, offsetY + (y - minY) * scale])
  );
}

// How far each side of a frame reaches in, plus `padding`, for frames fitted with fitCorners.
// The edges only sit in the corner zones across their own direction, so these insets are the
// same at every target size.
export function insetsOf(skeleton: Skeleton, corner: number, padding: number): Insets {
  const { width, height } = skeleton;
  const points = skeleton.paths.flat();
  const inMiddle = (value: number, size: number) => value > corner && value < size - corner;
  const left = points.filter(([x, y]) => inMiddle(y, height) && x < width / 2).map(([x]) => x);
  const right = points.filter(([x, y]) => inMiddle(y, height) && x > width / 2).map(([x]) => x);
  const top = points.filter(([x, y]) => inMiddle(x, width) && y < height / 2).map(([, y]) => y);
  const bottom = points.filter(([x, y]) => inMiddle(x, width) && y > height / 2).map(([, y]) => y);
  return {
    left: Math.max(...left) + padding,
    right: width - Math.min(...right) + padding,
    top: Math.max(...top) + padding,
    bottom: height - Math.min(...bottom) + padding,
  };
}
