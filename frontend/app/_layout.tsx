import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { SCREEN_BACKGROUND, ScreenFrame } from '@/components/ScreenBorder';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    OneSanTest2: require('../assets/oneSanFUv2.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Keep the splash screen up until oneSan is ready so no screen ever renders in a fallback font.
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <>
      <ScreenFrame>
        <Stack
          screenOptions={{ contentStyle: { backgroundColor: SCREEN_BACKGROUND }, headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="badge-wall" />
          <Stack.Screen name="qr-code" />
          <Stack.Screen name="test-challenge" />
        </Stack>
      </ScreenFrame>
      <StatusBar style="auto" />
    </>
  );
}
