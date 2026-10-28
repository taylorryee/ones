import { DataBindMode, Fit, RiveView, useRiveFile } from '@rive-app/react-native';

import { StickerArt } from '@/components/StickerArt';
import glassesGleam from '@/assets/rive/glasses-gleam.riv';

// The thinker sticker with a gleam sweeping across its lenses. Built from frontend/rive/glasses-gleam;
// after changing that project, rebuild it and copy build/glasses-gleam.riv to assets/rive/.
// Shows the still sticker while the file loads or if it fails to.
export function GlassesGleam() {
  const { riveFile } = useRiveFile(glassesGleam);

  if (!riveFile) {
    return <StickerArt slug="thinker" />;
  }

  return (
    <RiveView
      autoPlay
      // The file has no view model, and the default (Auto) logs an error looking for one.
      dataBind={DataBindMode.None}
      file={riveFile}
      fit={Fit.Contain}
      style={{ height: '100%', width: '100%' }}
    />
  );
}
