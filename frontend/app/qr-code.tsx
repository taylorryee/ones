import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, PanResponder, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getCurrentUser } from '@/services/auth';

export default function QrCodeScreen() {
  const [qrCode, setQrCode] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUser()
      .then((user) => setQrCode(user.qr_code))
      .catch(() => router.replace('/login'));
  }, []);

  const swipeDownResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dy) > Math.abs(gesture.dx) && gesture.dy > 10,
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 60) {
          router.back();
        }
      },
    })
  ).current;

  return (
    <SafeAreaView style={styles.safeArea} {...swipeDownResponder.panHandlers}>
      <View style={styles.container}>
        {qrCode ? (
          <QRCode size={260} value={qrCode} />
        ) : (
          <ActivityIndicator size="large" />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
});
