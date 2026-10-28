declare module '*.svg' {
  import React from 'react';
  import { SvgProps } from 'react-native-svg';
  const content: React.FC<SvgProps>;
  export default content;
}

// Rive animations, bundled by Metro as assets (see metro.config.js).
declare module '*.riv' {
  import type { RiveFileSource } from '@rive-app/react-native';
  const source: RiveFileSource;
  export default source;
}
