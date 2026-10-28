import { isAxiosError } from 'axios';
import * as Brightness from 'expo-brightness';
import { type BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  AppState,
  Linking,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Svg from 'react-native-svg';

import { SKELETONS } from '@/components/art.generated';
import { InkPath } from '@/components/InkPath';
import { useContentInset, useContentSize } from '@/components/ScreenBorder';
import { SEPARATOR_HEIGHT, SeparatingLine } from '@/components/SeparatingLine';
import { buildPath, fitCorners, insetsOf } from '@/components/skeleton';
import { FONT, INK, PAPER, STROKE } from '@/constants/theme';
import { getCurrentUser, type UserProfile } from '@/services/auth';
import { createChallenge, getActiveMatch } from '@/services/matches';

const SIDE_PADDING = 24;
// Room under the QR code for the player's name, and under the camera for the status line.
const LABEL_SPACE = 48;
// How often the player being scanned asks whether a match has started.
const POLL_INTERVAL_MS = 2000;
// After a failed scan, how long the message stays up before the camera reads codes again.
const RETRY_DELAY_MS = 2000;

// The camera sits in the popup frame. Same corner as StickerPopup, so the corners match.
const FRAME = SKELETONS.popupBorder;
const CORNER = 55;
const CAMERA_INSET = insetsOf(FRAME, CORNER, STROKE.width / 2 + 8);

// What the backend's challenge errors mean to someone standing on the court.
const CHALLENGE_ERRORS: Record<string, string> = {
  'Opponent not found': "That's not a Ones code",
  'Opponent already has an active match': "They're mid-game",
};

// One screen for both players: your code on top to be scanned, the camera below to scan theirs.
// Whoever scans first starts the match, and both phones move to it.
export default function PlayScreen() {
  useKeepAwake();
  useFullBrightness();

  const content = useContentSize();
  const inset = useContentInset();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [permission, requestPermission, getPermission] = useCameraPermissions({ request: true });
  // A match the player already had when the screen opened. They finish that one first.
  const [existingMatchId, setExistingMatchId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  // A ref, not state: the camera reports the same code many times before a re-render.
  const isScanLocked = useRef(false);
  const hasStarted = useRef(false);

  useEffect(() => {
    getCurrentUser()
      .then(setProfile)
      .catch(() => router.replace('/login'));
  }, []);

  // Coming back from Settings after allowing the camera.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') getPermission();
    });
    return () => subscription.remove();
  }, [getPermission]);

  // Checks for a match the player is already in, then watches for one started by someone
  // scanning their code.
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;
    let isActive = true;

    getActiveMatch()
      .then((match) => {
        if (!isActive) return;
        if (match) {
          setExistingMatchId(match.id);
          return;
        }
        intervalId = setInterval(async () => {
          try {
            const started = await getActiveMatch();
            if (started) startMatch(started.id);
          } catch {}
        }, POLL_INTERVAL_MS);
      })
      .catch(() => {});

    return () => {
      isActive = false;
      clearInterval(intervalId);
    };
  }, []);

  function startMatch(matchId: number) {
    if (hasStarted.current) return;
    hasStarted.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace({ pathname: '/match/[id]', params: { id: String(matchId) } });
  }

  async function handleScan({ data }: BarcodeScanningResult) {
    if (isScanLocked.current || !profile || data === profile.qr_code) return;
    isScanLocked.current = true;
    setMessage('Starting match…');

    try {
      startMatch(await createChallenge(data));
    } catch (error) {
      const detail = isAxiosError(error) ? error.response?.data?.detail : undefined;
      if (detail === 'You already have an active match') {
        const match = await getActiveMatch().catch(() => null);
        if (match) setExistingMatchId(match.id);
      }
      setMessage(CHALLENGE_ERRORS[detail] ?? "Couldn't start the match. Try again.");
      setTimeout(() => {
        isScanLocked.current = false;
        setMessage(null);
      }, RETRY_DELAY_MS);
    }
  }

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

  if (!profile || content.width === 0) {
    return <View style={styles.screen} />;
  }

  const screenPadding = { paddingBottom: inset.bottom, paddingTop: inset.top };
  const sidePadding = { paddingLeft: inset.left + SIDE_PADDING, paddingRight: inset.right + SIDE_PADDING };
  const innerWidth = content.width - SIDE_PADDING * 2;

  if (existingMatchId !== null) {
    return (
      <View style={[styles.screen, styles.centered, screenPadding, sidePadding]} {...swipeDownResponder.panHandlers}>
        <Text style={styles.title}>You have a game going</Text>
        <Pressable
          hitSlop={12}
          onPress={() =>
            router.replace({ pathname: '/match/[id]', params: { id: String(existingMatchId) } })
          }>
          <Text style={styles.link}>Open it</Text>
        </Pressable>
      </View>
    );
  }

  // Without the camera the code gets the whole screen: they can still play by being scanned.
  if (permission && !permission.granted) {
    const qrSize = Math.min(innerWidth, content.height - LABEL_SPACE * 3);
    return (
      <View style={[styles.screen, styles.centered, screenPadding, sidePadding]} {...swipeDownResponder.panHandlers}>
        <PlayerCode name={profile.name} qr={profile.qr_code} size={qrSize} />
        <Pressable
          hitSlop={12}
          onPress={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())}>
          <Text style={styles.link}>Allow camera to scan</Text>
        </Pressable>
      </View>
    );
  }

  const halfHeight = content.height / 2;
  const qrSize = Math.min(innerWidth, halfHeight - LABEL_SPACE - SIDE_PADDING);
  const frame = {
    width: innerWidth,
    height: halfHeight - SEPARATOR_HEIGHT - LABEL_SPACE - SIDE_PADDING,
  };

  return (
    <View style={[styles.screen, screenPadding]} {...swipeDownResponder.panHandlers}>
      <View style={[styles.half, styles.centered, sidePadding]}>
        <PlayerCode name={profile.name} qr={profile.qr_code} size={qrSize} />
      </View>
      <View style={[styles.half, styles.centered, sidePadding]}>
        <View pointerEvents="none" style={styles.separator}>
          <SeparatingLine width={content.width + inset.left + inset.right} />
        </View>
        <View style={frame}>
          {permission?.granted && (
            <CameraView
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={handleScan}
              style={[
                styles.camera,
                {
                  bottom: CAMERA_INSET.bottom,
                  left: CAMERA_INSET.left,
                  right: CAMERA_INSET.right,
                  top: CAMERA_INSET.top,
                },
              ]}
            />
          )}
          <Svg height={frame.height} pointerEvents="none" viewBox={`0 0 ${frame.width} ${frame.height}`} width={frame.width}>
            <InkPath d={buildPath(fitCorners(FRAME, frame, CORNER))} />
          </Svg>
        </View>
        <Text style={styles.status}>{message ?? 'Scan their code'}</Text>
      </View>
    </View>
  );
}

function PlayerCode({ name, qr, size }: { name: string; qr: string; size: number }) {
  return (
    <View style={styles.centered}>
      <QRCode backgroundColor={PAPER} color={INK} size={size} value={qr} />
      <Text numberOfLines={1} style={styles.name}>
        {name}
      </Text>
    </View>
  );
}

// Full brightness while the screen is open, so the code scans in sunlight. Put back when the
// player leaves the screen or the app; iOS would otherwise keep it until the phone locks.
function useFullBrightness() {
  useEffect(() => {
    let original: number | null = null;

    async function raise() {
      if (original !== null) return;
      try {
        original = await Brightness.getBrightnessAsync();
        await Brightness.setBrightnessAsync(1);
      } catch {}
    }

    async function restore() {
      if (original === null) return;
      const previous = original;
      original = null;
      try {
        if (Platform.OS === 'android') {
          await Brightness.restoreSystemBrightnessAsync();
        } else {
          await Brightness.setBrightnessAsync(previous);
        }
      } catch {}
    }

    raise();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') raise();
      else restore();
    });

    return () => {
      subscription.remove();
      restore();
    };
  }, []);
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: PAPER,
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  half: {
    flex: 1,
  },
  separator: {
    left: 0,
    position: 'absolute',
    top: 0,
  },
  camera: {
    borderRadius: 24,
    overflow: 'hidden',
    position: 'absolute',
  },
  name: {
    color: INK,
    fontFamily: FONT,
    fontSize: 28,
    marginTop: 12,
  },
  status: {
    color: INK,
    fontFamily: FONT,
    fontSize: 22,
    marginTop: 12,
  },
  title: {
    color: INK,
    fontFamily: FONT,
    fontSize: 32,
    textAlign: 'center',
  },
  link: {
    color: INK,
    fontFamily: FONT,
    fontSize: 22,
    marginTop: 16,
    textDecorationLine: 'underline',
  },
});
