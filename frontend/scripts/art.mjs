// Validates every SVG in assets/, writes the generated data and gallery files, and creates a
// starting component for any new drawing.
//
//   npm run art            check the art, rewrite the generated files, create missing components
//   npm run art -- --check check only; fails if anything is out of date (used by lint)
//
// The rules are in ART.md. Errors fail the run; warnings point at art that still needs redrawing.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parsePath } from '../components/skeleton.ts';
import { STROKE } from '../constants/theme.ts';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = path.join(ROOT, 'assets');
const COMPONENTS = path.join(ROOT, 'components');
const DATA_OUTPUT = path.join(COMPONENTS, 'art.generated.ts');
const GALLERY_OUTPUT = path.join(COMPONENTS, 'gallery.generated.tsx');

// Every sticker is drawn on this square artboard, so a 5-unit stroke means the same thing in each.
const STICKER_CANVAS = 128;

// Folder → kind of art. A skeleton's subfolder decides how its component fits it to the screen.
const KINDS = {
  'skeletons/frames': 'frame',
  'skeletons/lines': 'line',
  'skeletons/shapes': 'shape',
  illustrations: 'illustration',
  stickers: 'sticker',
};

// Marker the script writes into every component it creates; the gallery lists these.
const GALLERY_MARKER = /^\/\/ art-gallery: (frame|line|shape|illustration) ([A-Za-z0-9]+) ([A-Za-z0-9]+)$/m;

const errors = [];
const warnings = [];

const camelCase = (name) => name.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const pascalCase = (name) => camelCase(name).replace(/^./, (c) => c.toUpperCase());
const constantCase = (name) => name.replace(/-/g, '_').toUpperCase();

function attr(tag, name) {
  return tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
}

function checkSvg(file, kind) {
  const source = fs.readFileSync(file, 'utf8');
  const name = path.basename(file, '.svg');
  const where = path.relative(ROOT, file);
  const fail = (message) => errors.push(`${where}: ${message}`);

  if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name)) {
    fail('name must be lowercase words joined by hyphens, starting with a letter (rename the frame in Figma)');
  }
  const root = source.match(/<svg\b[^>]*>/)?.[0] ?? '';
  const viewBox = attr(root, 'viewBox')?.trim().split(/[\s,]+/).map(Number);
  if (!viewBox || viewBox.length !== 4) {
    fail('missing viewBox');
    return null;
  }
  const [minX, minY, width, height] = viewBox;
  if (minX !== 0 || minY !== 0) {
    fail(`viewBox must start at 0 0, got ${minX} ${minY} (re-export instead of editing it)`);
  }
  if (Number(attr(root, 'width')) !== width || Number(attr(root, 'height')) !== height) {
    fail('width/height must match the viewBox size');
  }
  for (const [pattern, label] of [
    [/\stransform="/, 'transform'],
    [/<image\b/, '<image>'],
    [/<text\b/, '<text> (turn on "Outline text" when exporting)'],
    [/<filter\b/, '<filter>'],
    [/<mask\b/, '<mask>'],
  ]) {
    if (pattern.test(source)) {
      fail(`contains ${label}`);
    }
  }

  const art = { name, kind, file, width, height };
  if (kind === 'sticker' && (width !== STICKER_CANVAS || height !== STICKER_CANVAS)) {
    warnings.push(
      `${where}: drawn on ${width}×${height}; stickers should share a ${STICKER_CANVAS}×${STICKER_CANVAS} artboard`
    );
  }
  if (kind === 'illustration' || kind === 'sticker') {
    return art;
  }

  const elements = [...source.matchAll(/<([a-zA-Z]+)\b/g)].map((m) => m[1]);
  const other = elements.filter((e) => e !== 'svg' && e !== 'path');
  if (other.length > 0) {
    fail(`skeletons may only contain <path>, found <${[...new Set(other)].join('>, <')}>`);
  }
  const paths = [];
  for (const tag of source.match(/<path\b[^>]*>/g) ?? []) {
    const fill = attr(tag, 'fill');
    if (fill !== undefined && fill !== 'none') {
      fail(`a path is filled (fill="${fill}"); export the stroke, not an outline`);
    }
    if (!attr(tag, 'stroke')) {
      fail('a path has no stroke');
    }
    if (Number(attr(tag, 'stroke-width')) !== STROKE.width) {
      fail(`stroke-width is ${attr(tag, 'stroke-width')}, expected ${STROKE.width}`);
    }
    try {
      paths.push(...parsePath(attr(tag, 'd') ?? ''));
    } catch (error) {
      fail(error.message);
    }
  }
  if (paths.length === 0) {
    fail('no path data');
  }
  return { ...art, strokeWidth: STROKE.width, paths };
}

function collect() {
  const all = [];
  for (const entry of fs.readdirSync(ASSETS, { recursive: true })) {
    if (!entry.endsWith('.svg')) {
      continue;
    }
    const file = path.join(ASSETS, entry);
    const kind = KINDS[path.dirname(entry).split(path.sep).join('/')];
    if (!kind) {
      errors.push(
        `${path.relative(ROOT, file)}: put SVGs directly in one of assets/${Object.keys(KINDS).join(', assets/')}`
      );
      continue;
    }
    const art = checkSvg(file, kind);
    if (art) {
      all.push(art);
    }
  }
  all.sort((a, b) => (a.name < b.name ? -1 : 1));
  const seen = new Map();
  for (const art of all) {
    const key = camelCase(art.name);
    if (seen.has(key)) {
      errors.push(`${path.relative(ROOT, art.file)}: same name as ${path.relative(ROOT, seen.get(key))}`);
    }
    seen.set(key, art.file);
  }
  return all;
}

function renderData(all) {
  const skeletons = all.filter((a) => a.paths);
  const sized = all.filter((a) => !a.paths);
  const lines = [
    '// Written by scripts/art.mjs from the SVGs in assets/. Do not edit; run `npm run art`.',
    "import type { Skeleton } from './skeleton';",
    '',
    '// Path data of every skeleton, as absolute cubic chains in the SVG’s own units.',
    'export const SKELETONS = {',
  ];
  for (const s of skeletons) {
    lines.push(`  ${camelCase(s.name)}: {`);
    lines.push(`    width: ${s.width},`);
    lines.push(`    height: ${s.height},`);
    lines.push(`    strokeWidth: ${s.strokeWidth},`);
    lines.push('    paths: [');
    for (const p of s.paths) {
      lines.push(`      ${JSON.stringify(p).replace(/,/g, ', ')},`);
    }
    lines.push('    ],');
    lines.push('  },');
  }
  lines.push('} satisfies Record<string, Skeleton>;');
  lines.push('');
  lines.push('// viewBox size of every illustration and sticker, for aspect ratios in layout code.');
  lines.push('export const ART = {');
  for (const a of sized) {
    lines.push(`  ${camelCase(a.name)}: { width: ${a.width}, height: ${a.height} },`);
  }
  lines.push('};');
  lines.push('');
  return lines.join('\n');
}

// --- Starting components -------------------------------------------------------------------

function header(art, componentName) {
  const source = path.relative(ROOT, art.file);
  return [
    `// Created by \`npm run art\` from ${source}.`,
    '// This file is yours: edit it freely, the script never overwrites it. Re-exporting the SVG still',
    '// updates the drawing. Delete the line below to take it out of the art gallery.',
    `// art-gallery: ${art.kind} ${componentName} ${camelCase(art.name)}`,
  ];
}

function frameTemplate(art, name, key, constant) {
  // A starting guess for how far the corner curves reach; adjust it to the drawing.
  const corner = Math.round(Math.min(art.width, art.height) / 4);
  return [
    ...header(art, name),
    "import Svg from 'react-native-svg';",
    '',
    "import { SKELETONS } from '@/components/art.generated';",
    "import { InkPath } from '@/components/InkPath';",
    "import { buildPath, fitCorners, insetsOf } from '@/components/skeleton';",
    "import { STROKE } from '@/constants/theme';",
    '',
    `const FRAME = SKELETONS.${key};`,
    '// Points this close to an edge belong to a corner and are never stretched. The script guessed a',
    '// quarter of the shorter side; set it to how far the corner curves reach in the drawing.',
    `const CORNER = ${corner};`,
    "// Space kept between the line's innermost wobble and the content.",
    'const CONTENT_GAP = 12;',
    '',
    '// Padding that keeps content inside the line, the same at every size.',
    `export const ${constant}_INSET = insetsOf(FRAME, CORNER, STROKE.width / 2 + CONTENT_GAP);`,
    '',
    '// The frame fitted to `width` × `height`: corners keep their drawn shape, only the sides stretch.',
    `export function ${name}({ width, height }: { width: number; height: number }) {`,
    '  const d = buildPath(fitCorners(FRAME, { width, height }, CORNER));',
    '  return (',
    '    <Svg height={height} viewBox={`0 0 ${width} ${height}`} width={width}>',
    '      <InkPath d={d} />',
    '    </Svg>',
    '  );',
    '}',
  ];
}

function lineTemplate(art, name, key, constant) {
  return [
    ...header(art, name),
    "import Svg from 'react-native-svg';",
    '',
    "import { SKELETONS } from '@/components/art.generated';",
    "import { InkPath } from '@/components/InkPath';",
    "import { buildPath, fitSpan } from '@/components/skeleton';",
    '',
    `const LINE = SKELETONS.${key};`,
    '',
    '// Fixed on every screen: only the length is fitted, never the thickness or the wave.',
    `export const ${constant}_HEIGHT = LINE.height;`,
    '',
    "// The line's ends sit exactly on the left and right edges of `width`.",
    `export function ${name}({ width }: { width: number }) {`,
    '  return (',
    `    <Svg height={${constant}_HEIGHT} viewBox={\`0 0 \${width} \${${constant}_HEIGHT}\`} width={width}>`,
    '      <InkPath d={buildPath(fitSpan(LINE, width))} />',
    '    </Svg>',
    '  );',
    '}',
  ];
}

function shapeTemplate(art, name, key, constant) {
  return [
    ...header(art, name),
    "import Svg from 'react-native-svg';",
    '',
    "import { SKELETONS } from '@/components/art.generated';",
    "import { InkPath } from '@/components/InkPath';",
    "import { buildPath, fitUniform } from '@/components/skeleton';",
    "import { STROKE } from '@/constants/theme';",
    '',
    `const SHAPE = SKELETONS.${key};`,
    '',
    '// Height as a share of width, from the drawing.',
    `export const ${constant}_RATIO = SHAPE.height / SHAPE.width;`,
    '',
    '// The drawing scaled evenly to `size` wide. The line stays the same thickness, with half a line of',
    "// room on every side so it's never cut off at the edge.",
    `export function ${name}({ size }: { size: number }) {`,
    `  const height = size * ${constant}_RATIO;`,
    '  const d = buildPath(fitUniform(SHAPE, { width: size, height }, STROKE.width / 2));',
    '  return (',
    '    <Svg height={height} viewBox={`0 0 ${size} ${height}`} width={size}>',
    '      <InkPath d={d} />',
    '    </Svg>',
    '  );',
    '}',
  ];
}

function illustrationTemplate(art, name, key) {
  return [
    ...header(art, name),
    `import ${name}Art from '@/assets/illustrations/${art.name}.svg';`,
    "import { ART } from '@/components/art.generated';",
    '',
    '// A picture: it scales as a whole, lines included, and always keeps its proportions.',
    `export function ${name}({ width }: { width: number }) {`,
    `  const height = (width * ART.${key}.height) / ART.${key}.width;`,
    `  return <${name}Art height={height} width={width} />;`,
    '}',
  ];
}

const TEMPLATES = {
  frame: frameTemplate,
  line: lineTemplate,
  shape: shapeTemplate,
  illustration: illustrationTemplate,
};

function sourceFiles() {
  const files = [];
  for (const dir of ['app', 'components']) {
    for (const entry of fs.readdirSync(path.join(ROOT, dir), { recursive: true })) {
      if (/\.tsx?$/.test(entry) && !entry.includes('.generated.')) {
        files.push(path.join(ROOT, dir, entry));
      }
    }
  }
  return files;
}

// Drawings that still need a component: not a sticker (StickerArt shows those), not used by any
// existing code, and with no component of the same name yet.
function missingComponents(all) {
  const code = sourceFiles().map((file) => fs.readFileSync(file, 'utf8')).join('\n');
  const existing = new Set(
    fs.readdirSync(COMPONENTS).filter((f) => f.endsWith('.tsx')).map((f) => f.slice(0, -4).toLowerCase())
  );
  return all.filter((art) => {
    if (art.kind === 'sticker') {
      return false;
    }
    const key = camelCase(art.name);
    const used =
      new RegExp(`\\b(SKELETONS|ART)\\.${key}\\b`).test(code) ||
      code.includes(`/${path.relative(ASSETS, art.file).split(path.sep).join('/')}'`);
    return !used && !existing.has(pascalCase(art.name).toLowerCase());
  });
}

function renderComponent(art) {
  const name = pascalCase(art.name);
  const lines = TEMPLATES[art.kind](art, name, camelCase(art.name), constantCase(art.name));
  return lines.join('\n') + '\n';
}

// --- Gallery -------------------------------------------------------------------------------

// The gallery draws every marked component at 75%, 100% and 125% of its Figma width, with the
// width capped so large drawings still fit on a phone.
function renderGallery(componentFiles) {
  const entries = [];
  for (const file of componentFiles) {
    const match = fs.readFileSync(file, 'utf8').match(GALLERY_MARKER);
    if (match) {
      entries.push({ kind: match[1], name: match[2], key: match[3] });
    }
  }
  entries.sort((a, b) => (a.name < b.name ? -1 : 1));

  const lines = [
    '// Written by scripts/art.mjs from the `// art-gallery:` lines in components/. Do not edit;',
    '// run `npm run art`.',
    "import type { ReactNode } from 'react';",
    '',
  ];
  if (entries.length > 0) {
    const usesSkeletons = entries.some((e) => e.kind !== 'illustration');
    const usesArt = entries.some((e) => e.kind === 'illustration');
    const data = [usesArt && 'ART', usesSkeletons && 'SKELETONS'].filter(Boolean).join(', ');
    lines.push(`import { ${data} } from '@/components/art.generated';`);
    for (const e of entries) {
      lines.push(`import { ${e.name} } from '@/components/${e.name}';`);
    }
    lines.push('');
    lines.push('// Width the gallery uses as 100% for a drawing that is `width` wide in Figma.');
    lines.push('const base = (width: number) => Math.min(width, 240);');
    lines.push('');
  }
  lines.push('export const GALLERY: { name: string; render: (scale: number) => ReactNode }[] = [');
  for (const e of entries) {
    const source = e.kind === 'illustration' ? `ART.${e.key}` : `SKELETONS.${e.key}`;
    const width = `base(${source}.width) * scale`;
    let element;
    if (e.kind === 'frame') {
      element = `<${e.name} height={(${width} * ${source}.height) / ${source}.width} width={${width}} />`;
    } else if (e.kind === 'shape') {
      element = `<${e.name} size={${width}} />`;
    } else {
      element = `<${e.name} width={${width}} />`;
    }
    lines.push('  {');
    lines.push(`    name: '${e.name}',`);
    lines.push(`    render: (scale) => ${element},`);
    lines.push('  },');
  }
  lines.push('];');
  lines.push('');
  return lines.join('\n');
}

// --- Run -----------------------------------------------------------------------------------

const checkOnly = process.argv.includes('--check');
const all = collect();
const missing = errors.length === 0 ? missingComponents(all) : [];

for (const warning of warnings) {
  console.warn(`warning  ${warning}`);
}
for (const error of errors) {
  console.error(`error    ${error}`);
}
if (errors.length > 0) {
  process.exit(1);
}

const created = missing.map((art) => path.join(COMPONENTS, `${pascalCase(art.name)}.tsx`));
const componentFiles = [
  ...fs.readdirSync(COMPONENTS).filter((f) => f.endsWith('.tsx')).map((f) => path.join(COMPONENTS, f)),
];
const outputs = [[DATA_OUTPUT, renderData(all)]];

if (checkOnly) {
  for (const art of missing) {
    console.error(`error    ${path.relative(ROOT, art.file)} has no component; run \`npm run art\``);
  }
  outputs.push([GALLERY_OUTPUT, renderGallery(componentFiles)]);
  const stale = outputs.filter(([file, text]) => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '') !== text);
  for (const [file] of stale) {
    console.error(`error    ${path.relative(ROOT, file)} is out of date; run \`npm run art\``);
  }
  if (missing.length > 0 || stale.length > 0) {
    process.exit(1);
  }
  console.log('art: ok');
} else {
  missing.forEach((art, i) => {
    fs.writeFileSync(created[i], renderComponent(art));
    console.log(`art: created ${path.relative(ROOT, created[i])} (${art.kind})`);
  });
  for (const file of created) {
    if (!componentFiles.includes(file)) {
      componentFiles.push(file);
    }
  }
  outputs.push([GALLERY_OUTPUT, renderGallery(componentFiles)]);
  let wrote = false;
  for (const [file, text] of outputs) {
    if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== text) {
      fs.writeFileSync(file, text);
      console.log(`art: wrote ${path.relative(ROOT, file)}`);
      wrote = true;
    }
  }
  if (!wrote && created.length === 0) {
    console.log('art: up to date');
  }
}
