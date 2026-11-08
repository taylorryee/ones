import * as Haptics from "expo-haptics";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import {
  GestureDetector,
  GestureHandlerRootView,
  usePanGesture,
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import Svg, { Path } from "react-native-svg";

import { SKELETONS } from "@/components/art.generated";
import { InkPath } from "@/components/InkPath";
import {
  buildPath,
  fitCorners,
  insetsOf,
  type Size,
} from "@/components/skeleton";
import { DRAG_SLOP } from "@/components/swipePaging";
import { PAPER, STROKE } from "@/constants/theme";

// Drawn in the same frame as StickerPopup: assets/skeletons/frames/popup-border.svg.
const FRAME = SKELETONS.popupBorder;
const CORNER = 55;
// Space kept between the innermost wobble of the line and the content.
const CONTENT_GAP = 8;
const CONTENT_INSET = insetsOf(FRAME, CORNER, STROKE.width / 2 + CONTENT_GAP);
// How far past the bottom of `size` a popup's content may draw, down to the frame's edge. Scrolling
// content can run into this space to pass under the line; pad its end by the same amount.
export const POPUP_BOTTOM_BLEED = CONTENT_INSET.bottom;
// Space between the frame and the window edges, clear of the system UI.
const MARGIN = 24;

// The one spring for opening and closing, so closing is the opening played backwards. It overshoots
// a little on the way out, which is hidden by the popup having faded by then on the way back.
const POPUP_SPRING = { damping: 20, mass: 1, stiffness: 240 };
// Opening and closing fade the popup in over this first share of the motion, so the popup's
// contents don't show squashed into the card.
const FADE_SHARE = 0.35;
// Dragged down further than this share of the popup's height, or flicked down faster than this
// (pt per s), the popup closes on release; otherwise it springs back.
const DISMISS_DISTANCE = 0.25;
const DISMISS_VELOCITY = 800;
// Dragged up, the popup only moves this share of the finger's distance.
const UP_RESISTANCE = 0.1;
// The popup shrinks by up to this share as it is dragged down by its whole height.
const DRAG_SHRINK = 0.08;
// An edge swipe from this close to the left edge, at least this far (or this fast), closes it.
const EDGE_WIDTH = 24;
const EDGE_DISTANCE = 80;
const EDGE_VELOCITY = 500;

// Where the card the popup opened from is in the window: its center and its width. The popup
// grows out of it and shrinks back into it.
export type PopupOrigin = { x: number; y: number; width: number };

// The popup a carousel card opens: a frame that nearly fills the window, solid inside the line and
// see-through outside it. `render` draws the content at `size`, the space inside the line. Content
// is clipped there at the top and sides, so it can scroll, and at the bottom it can pass under the
// line (see POPUP_BOTTOM_BLEED). It grows out of `origin` with a spring when `render` becomes
// non-null and shrinks back into it when it goes null again. It closes, by calling `onClose`, on
// a tap outside the frame, a swipe down on the popup, a swipe in from the left edge (which iOS
// doesn't give a Modal) and the Android back button; the parent then sets `render` to null.
export function CardPopup({
  render,
  origin,
  onClose,
}: {
  render: ((size: Size) => ReactNode) | null;
  origin: PopupOrigin | null;
  onClose: () => void;
}) {
  const windowSize = useWindowDimensions();
  const safeArea = useSafeAreaInsets();
  const width = windowSize.width - MARGIN * 2;
  const height =
    windowSize.height - safeArea.top - safeArea.bottom - MARGIN * 2;
  const content = useMemo(
    () => ({
      width: Math.max(0, width - CONTENT_INSET.left - CONTENT_INSET.right),
      height: Math.max(0, height - CONTENT_INSET.top - CONTENT_INSET.bottom),
    }),
    [width, height],
  );

  // What's drawn stays up while the popup closes, after `render` has gone null.
  const [shown, setShown] = useState<{
    render: (size: Size) => ReactNode;
  } | null>(null);
  const [visible, setVisible] = useState(false);
  // 0 when closed and 1 when open, driven by the spring either way.
  const open = useSharedValue(0);
  // How far the finger has pulled the popup down.
  const dragY = useSharedValue(0);
  const dragStart = useSharedValue(0);
  // Whether the drag is past the distance that closes the popup.
  const armed = useSharedValue(false);
  const hasOpened = useRef(false);
  const closedByDrag = useRef(false);
  const isOpen = render !== null;

  // Adjusted while rendering rather than in an effect, so the Modal is there on the first frame.
  if (render && shown?.render !== render) {
    setShown({ render });
  }
  if (isOpen && !visible) {
    setVisible(true);
  }

  function hide() {
    setVisible(false);
    setShown(null);
  }

  useEffect(() => {
    if (isOpen) {
      hasOpened.current = true;
      closedByDrag.current = false;
      open.set(withSpring(1, POPUP_SPRING));
      return;
    }
    if (!hasOpened.current) return;
    if (!closedByDrag.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
    }
    armed.set(false);
    dragY.set(withSpring(0, POPUP_SPRING));
    open.set(
      withSpring(0, POPUP_SPRING, (finished) => {
        // Not finished when it was opened again part way through closing.
        if (finished) {
          scheduleOnRN(hide);
        }
      }),
    );
    // Only when it opens or closes, not when `hide` is recreated by a render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  function closeByDrag() {
    closedByDrag.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onClose();
  }

  function detent() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }

  // Pulling the popup down. Vertical only: the sideways scrolling inside popups wins any drag that
  // starts sideways.
  const drag = usePanGesture({
    activeOffsetY: [-DRAG_SLOP, DRAG_SLOP],
    failOffsetX: [-DRAG_SLOP, DRAG_SLOP],
    onActivate: (event) => {
      // The finger has already moved the slop, which the popup doesn't follow.
      dragStart.set(event.translationY);
    },
    onUpdate: (event) => {
      const moved = event.translationY - dragStart.get();
      dragY.set(moved < 0 ? moved * UP_RESISTANCE : moved);
      const past = moved > height * DISMISS_DISTANCE;
      if (past !== armed.get()) {
        armed.set(past);
        scheduleOnRN(detent);
      }
    },
    onDeactivate: (event) => {
      if (armed.get() || event.velocityY > DISMISS_VELOCITY) {
        scheduleOnRN(closeByDrag);
      } else {
        dragY.set(withSpring(0, POPUP_SPRING));
      }
      armed.set(false);
    },
  });

  // A swipe in from the left edge, where iOS would go back. Only starts in the strip along the edge.
  const edge = usePanGesture({
    activeOffsetX: [-DRAG_SLOP, DRAG_SLOP],
    failOffsetY: [-DRAG_SLOP, DRAG_SLOP],
    hitSlop: { left: 0, width: EDGE_WIDTH },
    onDeactivate: (event) => {
      if (
        event.translationX > EDGE_DISTANCE ||
        event.velocityX > EDGE_VELOCITY
      ) {
        scheduleOnRN(onClose);
      }
    },
  });

  // Grows from the card: moved from its center to the window's and scaled up from its width.
  const fromX = origin ? origin.x - windowSize.width / 2 : 0;
  const fromY = origin ? origin.y - windowSize.height / 2 : 0;
  const fromScale = origin ? Math.min(1, origin.width / width) : 0.85;
  const popupStyle = useAnimatedStyle(() => {
    const progress = open.get();
    const pulled = Math.min(Math.max(dragY.get(), 0) / height, 1);
    return {
      opacity: Math.min(1, Math.max(0, progress / FADE_SHARE)),
      transform: [
        { translateX: (1 - progress) * fromX },
        { translateY: (1 - progress) * fromY + dragY.get() },
        {
          scale:
            (fromScale + (1 - fromScale) * progress) *
            (1 - DRAG_SHRINK * pulled),
        },
      ],
    };
  });
  const backdropStyle = useAnimatedStyle(() => {
    const pulled = Math.min(Math.max(dragY.get(), 0) / height, 1);
    return {
      opacity: Math.min(1, Math.max(0, open.get())) * (1 - 0.6 * pulled),
    };
  });

  const frame = buildPath(fitCorners(FRAME, { width, height }, CORNER));
  // Past the frame's box, so the line can never poke through the edge of this paint.
  const outside = `M${-STROKE.width} ${-STROKE.width}H${width + STROKE.width}V${
    height + STROKE.width
  }H${-STROKE.width}Z`;

  return (
    <Modal
      animationType="none"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      {/* A Modal is its own window, so it needs its own root for the gestures. */}
      <GestureHandlerRootView style={styles.root}>
        <GestureDetector gesture={edge}>
          <View style={styles.center}>
            <Animated.View style={[styles.backdrop, backdropStyle]}>
              <Pressable onPress={onClose} style={StyleSheet.absoluteFill} />
            </Animated.View>
            <GestureDetector gesture={drag}>
              <Animated.View style={[{ height, width }, popupStyle]}>
                <Svg
                  height={height}
                  viewBox={`0 0 ${width} ${height}`}
                  width={width}
                >
                  {/* Paper inside the line, so only the backdrop outside the frame is see-through. */}
                  <Path d={frame} fill={PAPER} />
                </Svg>
                <View
                  style={[
                    styles.content,
                    {
                      height: content.height + POPUP_BOTTOM_BLEED,
                      left: CONTENT_INSET.left,
                      top: CONTENT_INSET.top,
                      width: content.width,
                    },
                  ]}
                >
                  {shown?.render(content)}
                </View>
                {/* Over the content, which scrolls under the line and never shows past it. */}
                <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                  <Svg
                    height={height}
                    viewBox={`0 0 ${width} ${height}`}
                    width={width}
                  >
                    <Path d={outside + frame} fill={PAPER} fillRule="evenodd" />
                    <InkPath d={frame} />
                  </Svg>
                </View>
              </Animated.View>
            </GestureDetector>
          </View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  center: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(248,250,252,0.92)",
  },
  content: {
    overflow: "hidden",
    position: "absolute",
  },
});
