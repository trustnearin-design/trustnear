import { useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { CoralButton, Gradient, MascotImage, ProgressDots } from '../../src/components/ui';
import { colors } from '../../src/theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * 3-slide welcome carousel — first screen the user sees on cold start
 * when not authed. Each slide pairs a Sevak mascot variant with a
 * benefit headline + supporting line. Skip jumps straight to /phone.
 *
 * Why a ScrollView + pagingEnabled instead of FlatList: simpler, no
 * snapping config, no keyExtractor — and only 3 items will ever exist.
 */

const SLIDES = [
  {
    variant: 'searcher' as const,
    eyebrow: 'TRUSTNEAR',
    title: 'Find verified pros\nin 30 seconds',
    body: 'Background-checked, rated, available now — within 2 km of you.',
    tone: 'plum' as const,
  },
  {
    variant: 'verifier' as const,
    eyebrow: 'BOOKED. DONE.',
    title: 'Booked. Done.\nGuaranteed.',
    body: 'Fixed prices, repair warranty, re-do free if you’re not happy.',
    tone: 'coral' as const,
  },
  {
    variant: 'celebrator' as const,
    eyebrow: 'PAY AFTER',
    title: 'Pay after the\nservice ends',
    body: 'Cash, UPI, card or wallet — only when the work is done.',
    tone: 'butter' as const,
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (i !== index) setIndex(i);
  };

  const onNext = () => {
    if (index < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: (index + 1) * SCREEN_WIDTH, animated: true });
    } else {
      router.replace('/(auth)/phone');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.brand[900] }}>
      <StatusBar style="light" />
      <Gradient
        colors={colors.gradient.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      {/* Decorative tint blobs */}
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

      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        {/* Skip button — top right */}
        <View style={{ alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 4 }}>
          <Pressable
            onPress={() => router.replace('/(auth)/phone')}
            hitSlop={12}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: 'rgba(255,255,255,0.14)',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>Skip</Text>
          </Pressable>
        </View>

        {/* Paged slides */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          style={{ flex: 1 }}
        >
          {SLIDES.map((slide, i) => (
            <View
              key={i}
              style={{
                width: SCREEN_WIDTH,
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 28,
              }}
            >
              <View style={{ alignItems: 'center' }}>
                <MascotImage variant={slide.variant} tone={slide.tone} size={220} />
                <Text
                  style={{
                    marginTop: 32,
                    fontSize: 11,
                    fontWeight: '800',
                    letterSpacing: 2,
                    color: colors.support[300],
                  }}
                >
                  {slide.eyebrow}
                </Text>
                <Text
                  style={{
                    marginTop: 12,
                    fontSize: 32,
                    fontWeight: '800',
                    color: '#FFFFFF',
                    textAlign: 'center',
                    lineHeight: 38,
                    letterSpacing: -0.5,
                  }}
                >
                  {slide.title}
                </Text>
                <Text
                  style={{
                    marginTop: 14,
                    fontSize: 15,
                    color: colors.brand[200],
                    textAlign: 'center',
                    lineHeight: 22,
                    maxWidth: 320,
                  }}
                >
                  {slide.body}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Progress + CTA */}
        <View style={{ paddingHorizontal: 24, paddingBottom: 20 }}>
          <View style={{ alignItems: 'center', marginBottom: 22 }}>
            <ProgressDots total={SLIDES.length} activeIndex={index} inverse />
          </View>
          <CoralButton
            label={index === SLIDES.length - 1 ? 'Get started' : 'Continue'}
            onPress={onNext}
            icon="arrow-forward"
          />
        </View>
      </SafeAreaView>
    </View>
  );
}
