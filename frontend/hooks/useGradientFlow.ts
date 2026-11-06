import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { useFrameCallback, useReducedMotion, useSharedValue } from 'react-native-reanimated';

import { FLOW_RATES, pace, START_PACING } from '@/components/flowPacing';
import { FLOW_DURATION } from '@/components/PlayedGradient';

// Moves the gradients of played days. Repainting them is slow, so `flow` only changes at the rate
// flowPacing allows, and not at all while `sliding` is true, the screen is out of focus or the
// player has Reduce Motion on (read when the app starts). `stillFlow` never changes: give it to
// gradients that shouldn't move. restartFlow starts `flow` over.
export function useGradientFlow() {
  const reducedMotion = useReducedMotion();
  const flow = useSharedValue(0);
  const stillFlow = useSharedValue(0);
  const sliding = useSharedValue(false);
  const focused = useSharedValue(true);
  // How far through the cycle it really is; `flow` is this rounded to the last repaint.
  const elapsed = useSharedValue(0);
  const pacing = useSharedValue(START_PACING);

  useFocusEffect(
    useCallback(() => {
      focused.set(true);
      return () => focused.set(false);
    }, [focused])
  );

  useFrameCallback((frame) => {
    if (reducedMotion || sliding.get() || !focused.get()) {
      return;
    }
    const frameMs = frame.timeSincePreviousFrame ?? 0;
    const next = pace(pacing.get(), frameMs);
    pacing.set(next);
    const rate = FLOW_RATES[next.level];
    if (rate === 0) {
      return;
    }
    elapsed.set((elapsed.get() + frameMs / FLOW_DURATION) % 1);
    const repaints = (rate * FLOW_DURATION) / 1000;
    const stepped = Math.floor(elapsed.get() * repaints) / repaints;
    if (stepped !== flow.get()) {
      flow.set(stepped);
    }
  });

  const restartFlow = useCallback(() => {
    elapsed.set(0);
    flow.set(0);
  }, [elapsed, flow]);

  return { flow, stillFlow, sliding, restartFlow };
}
