// Values shared by the hand-drawn components. Kept free of React Native imports so
// scripts/art.mjs can read STROKE when it validates the art.

// Line color of every hand-drawn stroke.
export const INK = 'black';
// Background of every screen; also fills the inside of the screen border.
export const PAPER = '#F8FAFC';
// The gradient that travels around today's box on the calendar.
export const TODAY_COLORS = [
  '#EF4444',
  '#F97316',
  '#FACC15',
  '#066e2e',
  '#3B82F6',
  '#6366F1',
  '#8025d4',
  '#050406',
  '#df2bb5',
  '#06efd0',
  '#94ff09',
];

// The colors a filled calendar day can be (components/dayColors.ts). Keep at least three, and keep
// them clearly different colors rather than shades of one.
export const DAY_COLORS = ['#EF4444', '#F97316', '#FACC15', '#22C55E', '#3B82F6', '#A855F7'];

// The gradients a day with a game can be filled with (components/dayColors.ts), each listed from
// the box's bottom left corner to its top right. Keep at least three.
export const DAY_GRADIENTS = [
  ['#4A4FD0', '#A01E96', '#F2CF85'],
  ['#E84FAE', '#7A549F', '#4A8CC9'],
  ['#5FD3DC', '#8A5CEB', '#E52BFF'],
  ['#F2FF55', '#E87C9C', '#E62EF2'],
  ['#F7E73F', '#EE8E33', '#E8402F'],
  ['#F6D67A', '#EAA552', '#E37A33'],
  ['#9DF7C4', '#D6FBA6', '#FBFB9A'],
  ['#64A9F5', '#B3C79A', '#F7E455'],
  ['#AEC6FC', '#D2BFEE', '#F3BEE8'],
];

// Line style in screen points. `width` matches the Figma stroke weight of the frames and
// lines; `smallWidth` is the lighter line used on small repeated shapes (the day boxes);
// `fillWidth` is the pen that scribbles a box in.
export const STROKE = {
  width: 5,
  smallWidth: 4,
  fillWidth: 6,
  linecap: 'round',
  linejoin: 'round',
} as const;

// Registered in app/_layout.tsx from assets/oneSanFUv2.ttf.
export const FONT = 'OneSanTest2';
