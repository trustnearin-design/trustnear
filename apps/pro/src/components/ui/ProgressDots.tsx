import { View } from 'react-native';
import { colors } from '../../theme/colors';

/**
 * Step indicator for multi-step flows (onboarding, KYC, booking).
 *
 *   ●●○○   activeIndex=1, total=4
 */
export function ProgressDots({
  total,
  activeIndex,
  inverse = false,
  size = 'md',
}: {
  total: number;
  activeIndex: number;
  inverse?: boolean;
  size?: 'sm' | 'md';
}) {
  const dotHeight = size === 'sm' ? 3 : 4;
  const dotInactive = size === 'sm' ? 6 : 8;
  const dotActive = size === 'sm' ? 16 : 22;
  const activeColor = colors.accent.DEFAULT;
  const inactiveColor = inverse ? 'rgba(255,255,255,0.3)' : colors.brand[200];

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => {
        const active = i === activeIndex;
        return (
          <View
            key={i}
            style={{
              width: active ? dotActive : dotInactive,
              height: dotHeight,
              borderRadius: dotHeight / 2,
              backgroundColor: active ? activeColor : inactiveColor,
              marginRight: i === total - 1 ? 0 : 6,
            }}
          />
        );
      })}
    </View>
  );
}
