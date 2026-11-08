import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { TextCard } from '@/components/cards/TextCard';
import type { Size } from '@/components/skeleton';
import { INK, PAPER } from '@/constants/theme';

// The player's own code, as a preview of the QR code card's popup. Until the profile has loaded
// there's no code to draw, so the card shows just its title.
export function QrCard({ size, qr }: { size: Size; qr: string | null }) {
  if (!qr) return <TextCard size={size} title="QR code" />;

  const side = Math.max(0, Math.min(size.width, size.height));
  return (
    <View style={styles.card}>
      <QRCode backgroundColor={PAPER} color={INK} size={side} value={qr} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
});
