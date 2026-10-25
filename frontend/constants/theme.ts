// Values shared by the hand-drawn components. Kept free of React Native imports so
// scripts/art.mjs can read STROKE when it validates the art.

// Line color of every hand-drawn stroke.
export const INK = 'black';
// Background of every screen; also fills the inside of the screen border.
export const PAPER = '#F8FAFC';

// Line style in screen points. `width` matches the Figma stroke weight of the frames and
// lines; `smallWidth` is the lighter line used on small repeated shapes (the day boxes).
export const STROKE = {
  width: 5,
  smallWidth: 4,
  linecap: 'round',
  linejoin: 'round',
} as const;

// Registered in app/_layout.tsx from assets/oneSanFUv2.ttf.
export const FONT = 'OneSanTest2';
