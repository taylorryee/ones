# Hand-drawn art: from Figma to the app

All hand-drawn UI goes through one pipeline. What differs is how a drawing is fitted to the
device, and that depends on which of two kinds of art it is.

## The two kinds

**Illustrations** are pictures of things: stickers, the basketball, the flame. They scale like a
picture, lines included. They are imported as components (`import Art from '@/assets/...svg'`)
through react-native-svg-transformer, which also runs SVGO on them at bundle time; don't
hand-optimize the files.

**Skeletons** are interface lines whose thickness must match the screen border: frames, lines,
the calendar boxes. Their path points are moved to fit the size the device actually has and
redrawn with a fixed stroke. Stretching them like a picture would change the line thickness and
the size of the wobbles.

Rule of thumb: **if its line has to match the border, it's a skeleton.**

| Kind | Fit rule | Use when | Examples |
|---|---|---|---|
| Illustration | proportional | the lines are part of a picture | `assets/stickers/*`, `assets/illustrations/*` |
| Skeleton | `fitSpan` | a line across a width: ends land on 0 and `width`, height and wave unchanged | `SeparatingLine` |
| Skeleton | `fitCorners` | a frame around content: corners keep their exact shape, only the sides stretch | `ScreenBorder`, `StickerPopup` |
| Skeleton | `fitUniform` | a small fixed-aspect shape with a narrow size range: scaled evenly, stroke fixed | `DayBox` |

### Choosing between frames, lines and shapes

All three keep the line the same thickness on every phone; they differ in how the drawing changes
when its space changes size.

- **Frame** (`skeletons/frames/`, `fitCorners`): the corners keep exactly their drawn curve and only
  the sides between them get longer or shorter, so it can take any width and height. Use it for
  anything that surrounds content whose size or proportions vary. Set `CORNER` to about where the
  corner curves end.
- **Line** (`skeletons/lines/`, `fitSpan`): stretched sideways so its ends land exactly on both
  edges; its height and wave never change. Use it for dividers that span a width.
- **Shape** (`skeletons/shapes/`, `fitUniform`): the whole drawing is scaled evenly, like zooming,
  but the line doesn't zoom. Use it for small items that always keep their proportions and change
  size only a little between phones.

If width and height can change independently, it's a frame; if it only gets bigger or smaller as a
whole, it's a shape. If its lines should grow with it (a picture of something), it isn't a skeleton:
put it in `assets/illustrations/`.

The fit rules live in `components/skeleton.ts`. Each is a pure function with tests in
`components/skeleton.test.ts`. `fitCorners` falls back to even scaling on any side shorter than
2 × the corner size, so a frame can never fold over itself.

## Folders

The folder you export into decides everything else: the kind of art, and for a skeleton, its fit
rule.

```
assets/skeletons/frames/  fitCorners: frames and borders around content
assets/skeletons/lines/   fitSpan: lines that run across a width
assets/skeletons/shapes/  fitUniform: small fixed-shape items
assets/illustrations/     pictures that scale as a whole
assets/stickers/          sticker pictures, all on one 128×128 artboard (shown by StickerArt)
design-reference/         reference files that aren't used by the app
```

`scripts/art.mjs` (`npm run art`) turns these into:
- `components/art.generated.ts`:
  - `SKELETONS.<name>`: path points, viewBox size and stroke width of every skeleton;
  - `ART.<name>`: viewBox size of every illustration and sticker, for aspect ratios.
- **A starting component** for each new drawing (see below).
- `components/gallery.generated.tsx`: the list the art gallery shows automatically.

Never type a viewBox number into layout code; use `ART`/`SKELETONS` so a re-export can't
silently break the layout.

Shared values (line width, ink and paper colors, font) are in `constants/theme.ts`.

## Drawing in Figma

- **Reference frame: 402×874** (iPhone 16 Pro / 17). Draw skeletons at 1 unit = 1pt on it, so
  Figma matches the reference phone exactly.
- **Strokes:** center-aligned, an even width of 5 (the line width in `constants/theme.ts`), round
  caps and joins, black. One vector per continuous line.
- **Never use Outline Stroke** on anything that will be resized. An outlined export is a filled
  shape tracing both edges of the line, and the script rejects it in `assets/skeletons/`. Layers
  Figma names `... (Stroke)` are outlines. Brush and variable-width strokes are also outlines once
  exported, so keep those for illustrations.
- **Artboard:** tight around the drawing. Figma's export bounds include the stroke, so the viewBox
  starts at `0 0` with half a stroke of margin. Stickers all share one 128×128 artboard so a
  5-unit line means the same thing in each.
- **Name** the frame in kebab-case, the same as the file (`day-box-2`). No version suffixes;
  git keeps the history.
- **Export** as SVG with "Outline text" on, "Include id attribute" off, "Simplify stroke" on.

## Adding or updating art

1. Decide which kind it is (table above). That decides the folder.
2. Draw it in Figma following the rules above.
3. Export to the folder, overwriting the old file if you're updating it.
4. Run `npm run art`. If it reports an error, fix it in Figma and re-export. Never edit the SVG by
   hand: the next export would undo the edit.
5. **New drawing:** the script creates `components/<Name>.tsx` (for example `card-border.svg` →
   `CardBorder.tsx`) from a template for its folder, and adds it to the art gallery:

   | Folder | Component | Exports |
   |---|---|---|
   | `frames/` | `<CardBorder width height />` | `CARD_BORDER_INSET`, the padding for content inside it |
   | `lines/` | `<Wave width />` | `WAVE_HEIGHT` |
   | `shapes/` | `<Tick size />` | `TICK_RATIO`, height as a share of width |
   | `illustrations/` | `<Trophy width />` | (height follows the drawing's proportions) |

   For a frame, check `CORNER` in the new file: the script guesses a quarter of the shorter side,
   and it should be about how far the drawing's corner curves reach.
6. Open the art gallery (profile → "Art gallery (dev)") and check the new piece at 75%, 100% and
   125% of its Figma size.
7. Use the component in a screen.

**The created component is yours.** Edit it freely (add props, text slots, change the padding);
the script only creates a component when none exists and never overwrites one. Re-exporting the
SVG still updates the drawing, because the component reads its points from `art.generated.ts`.
Delete its `// art-gallery:` line to take it out of the gallery.

The script doesn't create a component for stickers (`StickerArt` shows those), or for a drawing
already used somewhere in `app/` or `components/` (for example `ScreenBorder`, `DayBox`, the
popup). If you delete an SVG, delete its component too; TypeScript will point at it.

`npm run lint` runs `npm run art -- --check`, which fails if a generated file is out of date or a
new drawing has no component yet.

### What the script checks

- **Every SVG:** kebab-case name; viewBox starts at `0 0` and matches width/height; no
  `transform`, `<image>`, `<text>`, `<filter>` or `<mask>`; lives directly in one of the folders above; no two drawings share a name.
- **Skeletons:** only `<path>` elements; not filled; stroke width equals `STROKE.width`; path data
  readable. Any SVG path command except arcs is fine: the parser converts everything to absolute
  cubic curves and fails loudly on what it can't read.
- **Stickers:** a warning (not an error) if the artboard isn't 128×128.

## Rules for skeleton components

1. **The viewBox equals the layout size**, so 1 unit = 1pt and the stroke never scales:
   `<Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>`.
2. **The whole stroke stays inside the box.** Pass at least half the stroke width as padding
   (`fitUniform(..., STROKE.width / 2)`). Both platforms cut drawing off at the `<Svg>` bounds
   (iOS draws in `drawRect:`, Android into a bitmap the size of the view), so
   `overflow: 'visible'` does **not** rescue a stroke that pokes out. The only exception is a line
   end deliberately hidden under the border, like the separator's caps.
3. **Get the size from layout**, never from the window: `onLayout`, or `useContentSize` /
   `useContentInset` inside the frame. Don't render until the size is known. If many copies share
   one size, fit the path once (as `MonthGrid` does with `buildBoxPaths`).
4. **Export the fixed dimensions screens need** (`SEPARATOR_HEIGHT`, `BOX_RATIO`) computed from
   the generated data, instead of having screens work them out.
5. **Don't use `vector-effect="non-scaling-stroke"`.** It's implemented differently on iOS and
   Android, and it can't leave room for the stroke.

## Checking it

- `npm test`: parser and fit rules, including exact path strings for the border and separator,
  so any accidental geometry change fails.
- `npm run lint`: lint plus the art check. `npx tsc --noEmit` for types.
- Matching paths only prove the geometry; devices still draw them slightly differently. Open the
  art gallery (from the profile screen in dev builds, or `frontend://art-gallery`) and screenshot
  it on an iPhone SE, the reference phone, a Pro Max, and small and large Android phones. On
  zoomed crops check that every line is the same width (15px at 3x, 10px at 2x), no stroke is cut
  flat at a red outline, and all stickers have the same line weight. Compare each platform only
  with its own earlier screenshots.

## Still to do

- **Stickers:** redraw all eight on the shared 128×128 artboard (the script warns until then).
- **Day boxes and separator:** `shapes/day-box-*.svg` had their hand-edited viewBoxes reset and
  `lines/separator.svg` was rebuilt from a hand-derived centerline (the original outline is in
  `design-reference/`). Re-export all four from Figma as strokes when convenient.
