import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { SCREEN_BACKGROUND, ScreenFrame, useContentInset } from '@/components/ScreenBorder';

SplashScreen.preventAutoHideAsync();

// Pads every screen to the area inside the border. Screens that draw right up to the line
// (badge-wall) turn the padding off and apply useContentInset() themselves.
function AppStack() {
  const inset = useContentInset();
  const padding = {
    paddingTop: inset.top,
    paddingRight: inset.right,
    paddingBottom: inset.bottom,
    paddingLeft: inset.left,
  };

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: SCREEN_BACKGROUND, ...padding },
        headerShown: false,
      }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="badge-wall" options={{ contentStyle: { backgroundColor: SCREEN_BACKGROUND } }} />
      <Stack.Screen name="qr-code" />
      <Stack.Screen name="test-challenge" />
    </Stack>
  );
}

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
        <AppStack />
      </ScreenFrame>
      <StatusBar style="auto" />
    </>
  );
}
