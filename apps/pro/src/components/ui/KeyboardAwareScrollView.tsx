import { forwardRef, useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  Keyboard,
  Platform,
  type ScrollView as ScrollViewType,
  type ScrollViewProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Edge-to-edge-safe keyboard avoidance.
 *
 * With `edgeToEdgeEnabled: true` (app.json) the Android window no longer
 * resizes when the keyboard opens, so the stock `KeyboardAvoidingView`
 * (which infers the keyboard height from a window resize) silently fails and
 * inputs end up hidden behind the keyboard. This component sidesteps that by
 * listening to the `Keyboard` events directly — which still fire with the
 * correct height under edge-to-edge — and padding the scroll content by that
 * height so every field stays reachable above the keyboard.
 *
 * On iOS we lean on the built-in `automaticallyAdjustKeyboardInsets` (rock
 * solid there) and skip the manual padding to avoid double-counting.
 *
 * Drop-in replacement for ScrollView on any form screen.
 */
type Props = ScrollViewProps & {
  /** Extra breathing room above the keyboard (default 16). */
  extraOffset?: number;
};

export const KeyboardAwareScrollView = forwardRef<ScrollViewType, Props>(
  ({ extraOffset = 16, contentContainerStyle, children, ...rest }, ref) => {
    const insets = useSafeAreaInsets();
    const [kbHeight, setKbHeight] = useState(0);
    const isAndroid = Platform.OS === 'android';
    const mounted = useRef(true);

    useEffect(() => {
      mounted.current = true;
      const showEvt = isAndroid ? 'keyboardDidShow' : 'keyboardWillShow';
      const hideEvt = isAndroid ? 'keyboardDidHide' : 'keyboardWillHide';
      const showSub = Keyboard.addListener(showEvt, (e) => {
        if (mounted.current) setKbHeight(e.endCoordinates?.height ?? 0);
      });
      const hideSub = Keyboard.addListener(hideEvt, () => {
        if (mounted.current) setKbHeight(0);
      });
      return () => {
        mounted.current = false;
        showSub.remove();
        hideSub.remove();
      };
    }, [isAndroid]);

    // Only pad on Android. Subtract the bottom safe-area inset so we don't
    // stack the gesture-nav gap on top of the keyboard height.
    const pad = isAndroid && kbHeight > 0 ? Math.max(0, kbHeight - insets.bottom) + extraOffset : 0;

    return (
      <ScrollView
        ref={ref}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={isAndroid ? 'on-drag' : 'interactive'}
        automaticallyAdjustKeyboardInsets={!isAndroid}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[contentContainerStyle, pad > 0 ? { paddingBottom: pad } : null]}
        {...rest}
      >
        {children}
      </ScrollView>
    );
  },
);

KeyboardAwareScrollView.displayName = 'KeyboardAwareScrollView';
