import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { ScreenFrame, useContentInset } from "@/components/ScreenBorder";
import { PAPER } from "@/constants/theme";

SplashScreen.preventAutoHideAsync();

// Pads every screen to the area inside the border. Screens that draw right up to the line
// (badge-wall, badges) turn the padding off and apply useContentInset() themselves.
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
        contentStyle: { backgroundColor: PAPER, ...padding },
        headerShown: false,
        // Full screen: no clock or battery over the border. Set per screen because iOS ignores
        // the app-wide status bar setting (what expo-status-bar uses) in apps with scenes.
        statusBarHidden: true,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="profile" />
      {/* No swipe back: horizontal swipes belong to the calendar and the cards. */}
      <Stack.Screen
        name="badge-wall"
        options={{
          contentStyle: { backgroundColor: PAPER },
          gestureEnabled: false,
        }}
      />
      {/* iOS 26+ fades scrolling content under the status bar; hide it so badges reach the top line. */}
      <Stack.Screen
        name="badges"
        options={{
          contentStyle: { backgroundColor: PAPER },
          scrollEdgeEffects: { top: "hidden" },
        }}
      />
      {/* Slides up and is closed with a swipe down, handled by the screen. Draws up to the line
          like badge-wall, so the separator reaches the border. */}
      <Stack.Screen
        name="play"
        options={{
          animation: "slide_from_bottom",
          contentStyle: { backgroundColor: PAPER },
          gestureEnabled: false,
        }}
      />
      {/* The Win/Loss halves fill up to the line, so the screen applies the inset itself. */}
      <Stack.Screen
        name="match/[id]"
        options={{
          contentStyle: { backgroundColor: PAPER },
        }}
      />
      <Stack.Screen name="test-challenge" />
      <Stack.Screen name="art-gallery" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    OneSanTest2: require("../assets/oneSanFUv2.ttf"),
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

  // Gesture handler runs the calendar's swipe on the UI thread; it needs this at the root.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ScreenFrame>
        <AppStack />
      </ScreenFrame>
    </GestureHandlerRootView>
  );
}
