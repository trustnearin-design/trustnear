import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

interface CouponStripProps {
  /** Big offer line, e.g. "FLAT 20% OFF". */
  offer: string;
  /** Promo code, e.g. "FIRST20". */
  code: string;
  /** Small line under the offer, e.g. "on your first booking". */
  caption?: string | undefined;
  onPress?: (() => void) | undefined;
}

/**
 * Myntra-style coupon ticket bar (the "FLAT ₹500 OFF · USE CODE" strip).
 * Two-zone ticket: left offer block + dashed divider + right code chip with
 * a notch on each side for the perforated-ticket feel.
 */
export function CouponStrip({ offer, code, caption, onPress }: CouponStripProps) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        marginHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'stretch',
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: colors.accent[50],
        borderWidth: 1,
        borderColor: colors.accent[200],
      }}
    >
      {/* Left: offer */}
      <View
        style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 14, justifyContent: 'center' }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="pricetag" size={14} color={colors.accent[600]} />
          <Text
            style={{
              marginLeft: 6,
              fontSize: 16,
              fontWeight: '900',
              letterSpacing: -0.2,
              color: colors.accent[700],
            }}
          >
            {offer}
          </Text>
        </View>
        {caption ? (
          <Text style={{ marginTop: 2, fontSize: 11.5, color: colors.ink.muted }}>{caption}</Text>
        ) : null}
      </View>

      {/* Perforated divider */}
      <View style={{ justifyContent: 'center', alignItems: 'center' }}>
        <View
          style={{
            position: 'absolute',
            top: -7,
            width: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: colors.surface.muted,
          }}
        />
        <View
          style={{
            width: 0,
            flex: 1,
            borderLeftWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: colors.accent[300],
          }}
        />
        <View
          style={{
            position: 'absolute',
            bottom: -7,
            width: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: colors.surface.muted,
          }}
        />
      </View>

      {/* Right: code chip */}
      <View
        style={{
          paddingVertical: 12,
          paddingHorizontal: 14,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.accent.DEFAULT,
        }}
      >
        <Text
          style={{
            fontSize: 8.5,
            fontWeight: '800',
            letterSpacing: 1.2,
            color: 'rgba(255,255,255,0.85)',
          }}
        >
          USE CODE
        </Text>
        <Text style={{ fontSize: 14, fontWeight: '900', letterSpacing: 0.5, color: '#FFFFFF' }}>
          {code}
        </Text>
      </View>
    </Pressable>
  );
}
