import { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { Gradient } from './Gradient';
import { colors } from '../../theme/colors';

const LOGO_DARK_BG = require('../../../assets/splash-icon.png');
const MASCOT_PNG = require('../../../assets/mascot-doorstep.webp');

interface BrandLoadingScreenProps {
  /** Top eyebrow label — e.g. "Detecting your location" or "Finding experts". */
  eyebrow: string;
  /** Secondary line — e.g. address being resolved. Optional. */
  address?: string | null;
  /** Tagline shown below logo. Default: "Trusted home services" */
  tagline?: string;
  /** Whether to show the location-pin icon next to eyebrow. Default true. */
  showPinIcon?: boolean;
}

/**
 * Full-screen branded loading overlay — used while location is being
 * resolved, nearby pros are being fetched, or any first-load moment that
 * would otherwise show a blank map / empty surface.
 *
 * Pattern: Plum gradient background + animated location pin + the master
 * logo wordmark + tagline + mascot character + pulsing "loading dots".
 * Inspired by Toing / Swiggy / Zomato delivery-app launch screens.
 *
 * The brand carries the wait. Users associate the brand with arriving at
 * the answer — not with seeing nothing.
 */
export function BrandLoadingScreen({
  eyebrow,
  address,
  tagline = 'Trusted home services',
  showPinIcon = true,
}: BrandLoadingScreenProps) {
  const pulse = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Soft pulsing location icon at the top.
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Gentle floating mascot.
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulse, float]);

  const pinScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.08] });
  const pinOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
  const mascotTranslateY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });

  return (
    <View style={{ flex: 1, backgroundColor: colors.brand[900] }}>
      <StatusBar style="light" />
      <Gradient
        colors={colors.gradient.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      {/* Coral glow top-right */}
      <View
        style={{
          position: 'absolute',
          top: -120,
          right: -100,
          width: 320,
          height: 320,
          borderRadius: 160,
          backgroundColor: 'rgba(255,122,92,0.18)',
        }}
      />
      {/* Butter glow bottom-left */}
      <View
        style={{
          position: 'absolute',
          bottom: -100,
          left: -80,
          width: 260,
          height: 260,
          borderRadius: 130,
          backgroundColor: 'rgba(245,199,106,0.10)',
        }}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={{ flex: 1, paddingHorizontal: 24 }}>
          {/* Top — eyebrow + address */}
          <View style={{ alignItems: 'center', paddingTop: 24 }}>
            <Animated.View
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                backgroundColor: 'rgba(255,255,255,0.10)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 14,
                transform: [{ scale: pinScale }],
                opacity: pinOpacity,
              }}
            >
              {showPinIcon ? (
                <Ionicons name="location" size={26} color="#FFFFFF" />
              ) : (
                <Ionicons name="search" size={26} color="#FFFFFF" />
              )}
            </Animated.View>
            <Text
              style={{
                fontSize: 22,
                fontWeight: '800',
                color: '#FFFFFF',
                letterSpacing: -0.4,
                textAlign: 'center',
              }}
            >
              {eyebrow}
            </Text>
            {address ? (
              <Text
                style={{
                  marginTop: 8,
                  paddingHorizontal: 20,
                  fontSize: 14,
                  color: colors.brand[200],
                  textAlign: 'center',
                  lineHeight: 20,
                }}
                numberOfLines={3}
              >
                {address}
              </Text>
            ) : null}
          </View>

          {/* Middle — big logo lockup */}
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Image source={LOGO_DARK_BG} style={{ width: 240, height: 240 }} resizeMode="contain" />
            <Text
              style={{
                marginTop: -14,
                fontSize: 13,
                fontWeight: '800',
                letterSpacing: 2.6,
                textTransform: 'uppercase',
                color: colors.accent.DEFAULT,
              }}
            >
              {tagline}
            </Text>

            {/* 3-dot pulse loader */}
            <DotPulser />
          </View>

          {/* Bottom — floating mascot */}
          <Animated.View
            style={{
              alignItems: 'center',
              paddingBottom: 12,
              transform: [{ translateY: mascotTranslateY }],
            }}
          >
            <Image source={MASCOT_PNG} style={{ width: 140, height: 140 }} resizeMode="contain" />
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function DotPulser() {
  const a = useRef(new Animated.Value(0)).current;
  const b = useRef(new Animated.Value(0)).current;
  const c = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const make = (value: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      );
    make(a, 0).start();
    make(b, 160).start();
    make(c, 320).start();
  }, [a, b, c]);

  return (
    <View style={{ flexDirection: 'row', marginTop: 18 }}>
      {[a, b, c].map((v, i) => (
        <Animated.View
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: colors.accent.DEFAULT,
            marginHorizontal: 4,
            opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
            transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.2] }) }],
          }}
        />
      ))}
    </View>
  );
}
